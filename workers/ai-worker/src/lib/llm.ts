import type { Bindings } from '../env';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

/** Call the LLM via Workers AI (`ai` binding).
 * Model resolution order:
 *   1) `CLOUDFLARE_MODEL`  — optional override (set in env / `.dev.vars` / Worker secret)
 *   2) `DEFAULT_MODEL`     — wrangler var (see wrangler.toml [vars] / [env.production.vars])
 *   3) @cf.meta/llama-3.1-8b-instruct-fast (hardcoded fallback)
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
  if (!ai) throw new Error('No AI backend available: Workers AI `AI` binding is required');
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
