import type { Bindings } from '../env';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface ChatOptions {
  messages: Message[];
  context?: string;
  model?: string;
  images?: string[]; // base64-encoded image data
}

const CACHE_TTL = 60 * 6; // 6 minutes for deterministic analyses

function hashKey(s: string): string {
  const data = new TextEncoder().encode(s);
  return Array.from(new Uint8Array(simpleHash(data))).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fast non-cryptographic hash (FNV-1a, 32-bit -> 4 bytes) for cache keys.
function simpleHash(bytes: Uint8Array): Uint8Array {
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = (h * 0x01000193) >>> 0;
  }
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) out[i] = (h >>> (i * 8)) & 0xff;
  return out;
}

/** Call the LLM via Workers AI (`ai` binding), OpenAI fallback, or rule-based fallback.
 * Model resolution order:
 *   1) `CLOUDFLARE_MODEL`  — optional override (set in env / `.dev.vars` / Worker secret)
 *   2) `DEFAULT_MODEL`     — wrangler var (see wrangler.toml [vars] / [env.production.vars])
 *   3) `@cf.meta/llama-3.1-8b-instruct-fast` (hardcoded fallback)
 *
 * When the Cloudflare `AI` binding is unavailable (e.g. `wrangler dev` without
 * Cloudflare), the function falls back to OpenAI if `OPENAI_API_KEY` is set.
 * If neither is available, a deterministic rule-based response is returned.
 */
export async function llmChat(
  env: Bindings,
  system: string,
  user: string,
  model = env.CLOUDFLARE_MODEL || env.DEFAULT_MODEL || '@cf.meta/llama-3.1-8b-instruct-fast'
): Promise<string> {
  const cacheKey = `llm:${hashKey(system + '::' + user)}`;

  if (env.CACHE) {
    const cached = await env.CACHE.get(cacheKey, { type: 'arrayBuffer' });
    if (cached) return JSON.parse(new TextDecoder().decode(cached)) as string;
  }

  const ai = (env as any).AI;
  if (ai) {
    const result: any = await ai.run(model, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
    });
    let text: string = result?.response ?? result?.result ?? result?.answer ?? '';
    if (typeof text !== 'string') text = JSON.stringify(text);

    if (env.CACHE) {
      await env.CACHE.put(
        cacheKey,
        new TextEncoder().encode(JSON.stringify(text)),
        { expirationTtl: CACHE_TTL }
      );
    }
    return text;
  }

  // Fallback: OpenAI API (requires OPENAI_API_KEY)
  if (env.OPENAI_API_KEY) {
    const text = await callOpenAI(env, system, user, model);
    if (env.CACHE) {
      await env.CACHE.put(
        cacheKey,
        new TextEncoder().encode(JSON.stringify(text)),
        { expirationTtl: CACHE_TTL }
      );
    }
    return text;
  }

  // Fallback: deterministic rule-based response
  const fallback = ruleBasedFallback(system, user);
  if (env.CACHE) {
    await env.CACHE.put(
      cacheKey,
      new TextEncoder().encode(JSON.stringify(fallback)),
      { expirationTtl: CACHE_TTL }
    );
  }
  return fallback;
}

/** Call OpenAI Chat Completions API (fallback when Cloudflare AI is unavailable). */
async function callOpenAI(env: Bindings, system: string, user: string, model: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.startsWith('@cf.') ? 'gpt-4o-mini' : model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json<any>();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Vision-aware chat: accepts text messages + base64 images and returns
 * the LLM response. Uses OpenAI's vision endpoint when AI_API_KEY is set;
 * otherwise falls back to text-only llmChat.
 */
export async function llmChatVision(
  env: Bindings,
  system: string,
  user: string,
  images: string[] = [],
  model = env.CLOUDFLARE_MODEL || env.DEFAULT_MODEL || '@cf.meta/llama-3.1-8b-instruct-fast'
): Promise<string> {
  if (images.length > 0 && env.OPENAI_API_KEY) {
    const cacheKey = `llm:${hashKey(system + '::' + user + '::' + images.join(','))}`;
    if (env.CACHE) {
      const cached = await env.CACHE.get(cacheKey, { type: 'arrayBuffer' });
      if (cached) return JSON.parse(new TextDecoder().decode(cached)) as string;
    }

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: user },
    ];
    for (const img of images) {
      content.push({
        type: 'image_url',
        image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Vision API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json<any>();
    const text: string = data?.choices?.[0]?.message?.content || '';
    if (env.CACHE) {
      await env.CACHE.put(
        cacheKey,
        new TextEncoder().encode(JSON.stringify(text)),
        { expirationTtl: CACHE_TTL }
      );
    }
    return text;
  }

  // No vision backend available — return text-only response with a note
  return await llmChat(env, system, user + '\n\n(Lưu ý: ảnh đã được tải lên nhưng backend AI hiện không hỗ trợ phân tích hình ảnh. Chỉ mô tả văn bản của bạn được xử lý.)', model);
}

/** Rule-based fallback that explains SmartLogi app features when no AI backend is available. */
function ruleBasedFallback(system: string, user: string): string {
  const text = user.toLowerCase();

  // Feature explanation queries
  if (text.includes('đơn hàng') || text.includes('order')) {
    return 'Trong SmartLogi, quản lý đơn hàng bao gồm: tạo đơn mới (GET/POST /api/v1/orders), cập nhật trạng thái (PATCH /api/v1/orders/:id), hủy đơn (POST /api/v1/orders/:id/cancel), xem tracking events (GET /api/v1/orders/:id/tracking), và xác định vị trí xe giao (GET /api/v1/tracking/:code). Các trạng thái: NEW, UNASSIGNED, PENDING_PICKUP, IN_TRANSIT, DELIVERED, RETURNED, RETURN_REQUESTED, CANCELLED.';
  }
  if (text.includes('tồn kho') || text.includes('inventory')) {
    return 'Hệ thống tồn kho SmartLogi hỗ trợ: kiểm kê (GET/POST /api/v1/inventory), nhận hàng (POST /api/v1/inventory/receive), điều chỉnh (POST /api/v1/inventory/adjust), chu trình cycle-count (GET/POST /api/v1/inventory/cycle-counts), và quản lý kho/bins/racks/zone (GET/POST /api/v1/warehouses).';
  }
  if (text.includes('vận chuyển') || text.includes('logistics') || text.includes('trip')) {
    return 'Logistics bao gồm quản lý chuyến đi (GET/POST /api/v1/logistics/trips), xe cộ (GET /api/v1/logistics/vehicles/fleet), tài xế (GET/POST /api/v1/drivers), và tối ưu tuyến đường AI (POST /api/v1/routing/solve). Hệ thống tích hợp GPS theo dõi thời gian thực.';
  }
  if (text.includes('tài khoản') || text.includes('auth') || text.includes('login') || text.includes('đăng nhập')) {
    return 'Xác thực SmartLogi qua IAM Service: đăng nhập (POST /api/v1/tenant/auth/login), đăng xuất, refresh token (POST /api/v1/auth/refresh-token), OAuth Google (GET /api/v1/auth/google), và quản lý API keys (GET/POST /api/v1/api-keys). JWT Bearer token được truyền qua header Authorization.';
  }
  if (text.includes('admin') || text.includes('quản trị') || text.includes('dashboard')) {
    return 'Bảng điều khiển admin cung cấp: quản lý người dùng (GET /api/v1/tenant/users), vai trò & permissions (GET /api/v1/roles), thiết lập tenant (GET /api/v1/tenant/settings), hóa đơn & thanh toán (GET /api/v1/tenant/billing), và cấu hình hệ thống.';
  }
  if (text.includes('ai') || text.includes('predict') || text.includes('dự báo')) {
    return 'AI Worker cung cấp: chat phân tích (POST /api/v1/ai/v1/chat), dự báo nhu cầu (POST /api/v1/ai/v1/predict/demand), dự báo thời gian giao hàng (POST /api/v1/ai/v1/predict/delivery-time), dự báo churn (POST /api/v1/ai/v1/predict/churn), phát hiện bất thường (POST /api/v1/ai/v1/detect/anomalies), phân tích payload (POST /api/v1/ai/v1/analyze), và quản lý models/feedbacks.';
  }
  if (text.includes('track') || text.includes('theo dõi') || text.includes('tracking')) {
    return 'Theo dõu đơn hàng công khai qua: GET /api/v1/public/track/:trackingCode (customer-api) — không cần xác thực. Trang theo dõu: /track/:code trên customer-portal.';
  }
  if (text.includes('webhook') || text.includes('notification')) {
    return 'Hệ thống webhook & thông báo: đăng ký webhook (POST /api/v1/webhooks), gửi thông báo (POST /api/v1/notifications), và xử lý webhook ngoại vi (WEBHOOK_SERVICE_URL).';
  }
  if (text.includes('gps') || text.includes('vị trí')) {
    return 'Thu thập dữ liệu GPS: POST /api/v1/gps/ingest với GPS_AUTH_TOKEN. Dữ liệu được streaming real-time tới logistics-service qua Kafka (KAFKA_BROKERS).';
  }
  if (text.includes('help') || text.includes('giúp') || text.includes('gì')) {
    return 'Tôi là trợ lý AI SmartLogi. Tôi có thể giải thích các chức năng: đơn hàng, tồn kho, vận chuyển, tài khoản/auth, admin dashboard, AI dự báo, tracking, webhook, và GPS. Hãy hỏi tôi về bất kỳ chức năng nào!';
  }

  // Default helpful response
  return 'Tôi là trợ lý AI phân tích logistics của SmartLogi. Tôi có thể giúp bạn: (1) giải thích các chức năng hệ thống — hỏi về "đơn hàng", "tồn kho", "vận chuyển", "admin", "AI"; (2) phân tích dữ liệu đơn hàng/tồn kho/vận chuyển; (3) dự báo nhu cầu và thời gian giao hàng. Bạn muốn hỏi gì?\n\n(Lưu ý: Đang ở chế độ fallback - backend AI chính chưa kết nối. Cài đặt OPENAI_API_KEY hoặc Cloudflare Workers AI để nhận phản hồi đầy đủ.)';
}

/**
 * Prompt the LLM and return a parsed JSON object of type T.
 * Instructs the model to emit ONLY valid JSON (no markdown fences).
 */
export async function llmJson<T>(
  env: Bindings,
  system: string,
  user: string,
  model?: string
): Promise<T> {
  const preamble =
    system +
    '\nYou MUST respond with a single valid JSON object enclosed in ```json fences. ' +
    'Do not include any prose, notes, or commentary outside the JSON.';
  const raw = await llmChat(env, preamble, user, model);
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as T;
}
