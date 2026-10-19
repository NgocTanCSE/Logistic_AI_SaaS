import type { Hono, Context } from 'hono';
import type { Bindings, JwtPayload } from '../env';
import { llmChat, llmChatVision, llmJson } from '../lib/llm';
import { solveRouting, Location, Vehicle } from '../lib/vrp';
import { latestModelId } from '../lib/db';

type App = Hono<{ Bindings: Bindings; Variables: { user: JwtPayload | null; tenantId: string } }>;

const SYSTEM =
  'You are SmartLogi AI, a logistics forecasting engine. Reply with a single JSON object only — no prose, no markdown.';

/* =================== Compute routes (predictions, chat, routing) ===================
 * Registered on a sub-app mounted at BOTH `/ai` and `/api/v1/ai` (so clients
 * using baseURL `.../api/v1` hit `/api/v1/ai/v1/...` correctly).
 * Paths here are relative to the mount point.
 */
export const routingHandler = async (c: Context) => {
  const b = await c.req.json();
  const res = solveRouting(b.locations as Location[], b.vehicles as Vehicle[], b.depot_index);
  return c.json(res);
};

export function registerComputeRoutes(app: App) {
  /* ---- POST /ai/v1/chat  (headline: AI chat phân tích, hỗ trợ vision) ---- */
  app.post('/v1/chat', async (c: Context) => {
    const env = c.env as Bindings;
    const body = await c.req.json().catch(() => ({}));
    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const context: string | undefined = body.context;
    const images: string[] | undefined = body.images;
    const system = [
      'Bạn là trợ lý AI phân tích logistics của SmartLogi. Trả lời ngắn gọn, dựa trên dữ liệu đơn hàng, tồn kho và vận chuyển.',
      context ? `Bối cảnh: ${context}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userText = messages.length > 0
      ? messages.map((m) => `[${m.role}] ${m.content}`).join('\n')
      : '';

    let text: string;
    if (images && images.length > 0) {
      text = await llmChatVision(env, system, userText, images, env.DEFAULT_MODEL);
    } else {
      text = await llmChat(env, system, userText, env.DEFAULT_MODEL);
    }
    return c.json({
      ok: true,
      conversation_id: body.conversation_id || crypto.randomUUID(),
      role: 'assistant',
      content: text,
    });
  });

  /* ---- POST /ai/v1/predict/demand ---- */
  app.post('/v1/predict/demand', async (c: Context) => {
    const env = c.env as Bindings;
    const b = await c.req.json();
    const tenantId = c.var.tenantId;
    const features = { day_of_week: b.day_of_week, hour: b.hour, item_count: b.item_count };
    const modelId = await latestModelId(env, tenantId, 'demand');
    let predicted_weight_kg: number;
    try {
      const r = await llmJson<{ predicted_weight_kg: number }>(
        env,
        SYSTEM,
        `Forecast demand weight in kg. day_of_week=${b.day_of_week}, hour=${b.hour}, item_count=${b.item_count}. Return JSON {predicted_weight_kg}.`,
        env.DEFAULT_MODEL
      );
      predicted_weight_kg = Number(r.predicted_weight_kg) || fallbackDemand(b);
    } catch {
      predicted_weight_kg = fallbackDemand(b);
    }
    return c.json({ ok: true, predicted_weight_kg, model_path: modelId || 'llm-demand-v1', features });
  });

  /* ---- POST /ai/v1/predict/delivery-time ---- */
  app.post('/v1/predict/delivery-time', async (c: Context) => {
    const env = c.env as Bindings;
    const b = await c.req.json();
    const tenantId = c.var.tenantId;
    const modelId = await latestModelId(env, tenantId, 'delivery_time');
    let predicted_duration_minutes: number;
    try {
      const r = await llmJson<{ predicted_duration_minutes: number }>(
        env,
        SYSTEM,
        `Estimate delivery duration in minutes. day_of_week=${b.day_of_week}, hour=${b.hour}, is_weekend=${b.is_weekend}. Return JSON {predicted_duration_minutes}.`,
        env.DEFAULT_MODEL
      );
      predicted_duration_minutes = Number(r.predicted_duration_minutes) || fallbackDelivery(b);
    } catch {
      predicted_duration_minutes = fallbackDelivery(b);
    }
    return c.json({
      ok: true,
      predicted_duration_minutes,
      model_path: modelId || 'llm-delivery-v1',
      features: { day_of_week: b.day_of_week, hour: b.hour, is_weekend: b.is_weekend },
    });
  });

  /* ---- POST /ai/v1/predict/churn ---- */
  app.post('/v1/predict/churn', async (c: Context) => {
    const env = c.env as Bindings;
    const b = await c.req.json();
    let result: Record<string, unknown>;
    try {
      const r = await llmJson<{
        churn_probability: number;
        will_churn: boolean;
        risk_level: string;
      }>(
        env,
        SYSTEM,
        `Predict customer churn. total_orders=${b.total_orders}, avg_order_value=${b.avg_order_value}, total_cod=${b.total_cod}, days_since_last_order=${b.days_since_last_order}, customer_lifetime_days=${b.customer_lifetime_days}, orders_per_month=${b.orders_per_month}. Return JSON {churn_probability:0-1, will_churn:true/false, risk_level:"low"|"medium"|"high"}.`,
        env.DEFAULT_MODEL
      );
      result = { ...r, model_path: 'llm-churn-v1' };
    } catch {
      const prob = fallbackChurnProbability(b);
      result = {
        churn_probability: prob,
        will_churn: prob > 0.5,
        risk_level: prob > 0.7 ? 'high' : prob > 0.4 ? 'medium' : 'low',
        model_path: 'llm-churn-v1',
      };
    }
    return c.json({ ok: true, ...result });
  });

  /* ---- POST /ai/v1/detect/anomalies (z-score, fast, no LLM per row) ---- */
  app.post('/v1/detect/anomalies', async (c: Context) => {
    const b = await c.req.json();
    const data: Record<string, unknown>[] = Array.isArray(b.data) ? b.data : b?.data?.items || [];
    const results = detectAnomalies(data);
    return c.json({
      ok: true,
      total_analyzed: results.length,
      anomalies_detected: results.filter((r) => (r as any).is_anomaly).length,
      results,
    });
  });

  /* ---- POST /ai/v1/routing/solve & /routing/solve ----
   * Registered on BOTH the `/v1`-prefixed form (consistent with /v1/chat,
   * /v1/predict/*, /v1/analyze) AND the bare `/routing/solve` form.
   * The bare form is also re-exposed at the Worker root in index.ts so
   * logistics-service can call AI_WORKER_URL/routing/solve directly.
   */
  app.post('/routing/solve', routingHandler);
  app.post('/v1/routing/solve', routingHandler);

  /* ---- POST /ai/v1/analyze (one-shot payload analysis) ---- */
  app.post('/v1/analyze', async (c: Context) => {
    const env = c.env as Bindings;
    const b = await c.req.json();
    const text = await llmJson<Record<string, unknown>>(
      env,
      SYSTEM,
      `Analyze this logistics payload and return JSON with fields: summary, risks[], recommendations[].\n${JSON.stringify(b.payload || b)}`,
      env.DEFAULT_MODEL
    );
    return c.json({ ok: true, ...text });
  });
}

/* ---- deterministic fallbacks (endpoint must never 500) ---- */
function fallbackDemand(b: any): number {
  const base = typeof b.item_count === 'number' ? b.item_count : 1;
  const dow = typeof b.day_of_week === 'number' ? b.day_of_week : 1;
  const hour = typeof b.hour === 'number' ? b.hour : 12;
  const factor = (dow >= 5 ? 0.8 : 1.1) * (hour >= 9 && hour <= 18 ? 1.2 : 0.7);
  return Math.round(base * 12.5 * factor * 100) / 100;
}
function fallbackDelivery(b: any): number {
  const hour = typeof b.hour === 'number' ? b.hour : 12;
  const weekend = b.is_weekend ? 1.4 : 1.0;
  return Math.round(40 * weekend * (hour >= 9 && hour <= 18 ? 1.1 : 0.9));
}
function fallbackChurnProbability(b: any): number {
  const days = typeof b.days_since_last_order === 'number' ? b.days_since_last_order : 30;
  const orders = typeof b.total_orders === 'number' ? b.total_orders : 1;
  const prob = 1 / (1 + Math.exp(-(days / 15 - 4 + Math.log(orders + 1) / 2)));
  return Math.round(prob * 1000) / 1000;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
function detectAnomalies(rows: Record<string, unknown>[]): Array<Record<string, unknown>> {
  if (!rows.length) return [];
  const numericCols = Object.keys(rows[0]).filter((k) => rows.every((r) => typeof r[k] === 'number'));
  const colStats: Record<string, { mean: number; std: number }> = {};
  for (const col of numericCols) {
    const vals = rows.map((r) => Number(r[col]));
    const m = mean(vals);
    colStats[col] = { mean: m, std: stdev(vals, m) };
  }
  return rows.map((row) => {
    let score = 0;
    const zByCol: Record<string, number> = {};
    for (const col of numericCols) {
      const s = colStats[col];
      const z = s.std ? Math.abs((Number(row[col]) - s.mean) / s.std) : 0;
      zByCol[col] = z;
      if (z > score) score = z;
    }
    return { ...row, is_anomaly: score > 3, anomaly_score: Math.round(score * 1000) / 1000, z_scores: zByCol };
  });
}
