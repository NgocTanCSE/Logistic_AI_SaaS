import { llmChat, llmJson } from '../src/lib/llm';

/*
 * Minimal test runner (no framework deps). Verifies the Workers-AI "call AI"
 * path, caching, model override, error handling, and JSON parsing — all
 * with a mocked env.AI.run, NO network, NO external API keys.
 */
let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log('  \u2713', name, extra !== undefined ? JSON.stringify(extra) : ''); }
  else { fail++; console.log('  \u2717 FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

const baseEnv: any = {
  JWT_SECRET: 'x', AI_API_KEY: 'x',
  CACHE: { get: async () => null, put: async () => undefined },
};

async function run() {
  // 1. Workers AI path, cache miss -> AI.run called with correct model + messages + result
  let aiArgs: any = null;
  const aiEnv: any = {
    ...baseEnv,
    AI: { run: async (model: string, opts: any) => { aiArgs = { model, messages: opts.messages }; return { response: 'cloudflare-ai-reply' }; } },
  };
  const text1 = await llmChat(aiEnv, 'sys', 'hello');
  ok('Workers AI miss -> returns response', text1 === 'cloudflare-ai-reply', { text: text1 });
  ok('Workers AI default model passed to AI.run', aiArgs?.model === '@cf.meta/llama-3.1-8b-instruct-fast', aiArgs);
  ok('Workers AI payload messages len 2', Array.isArray(aiArgs?.messages) && aiArgs.messages.length === 2, aiArgs);

  // 2. CLOUDFLARE_MODEL override
  aiArgs = null;
  const overrideEnv: any = {
    ...baseEnv,
    CLOUDFLARE_MODEL: '@cf/meta/llama-3.1-8b-instruct-fp8',
    AI: { run: async (model: string, opts: any) => { aiArgs = { model, messages: opts.messages }; return { response: 'override-reply' }; } },
  };
  const text2 = await llmChat(overrideEnv, 'sys', 'hello');
  ok('CLOUDFLARE_MODEL override -> AI.run(model)', aiArgs?.model === '@cf/meta/llama-3.1-8b-instruct-fp8', aiArgs);
  ok('CLOUDFLARE_MODEL override returns reply', text2 === 'override-reply', { text2 });

  // 3. No AI binding -> throws
  let threw = false; let errMsg = '';
  try { await llmChat(baseEnv, 'sys', 'hello'); } catch (e: any) { threw = true; errMsg = e.message; }
  ok('No AI binding -> throws', threw && /No AI backend available/.test(errMsg), { errMsg });

  // 4. cache HIT -> returns cached, AI.run NOT called
  let aiCallCount = 0;
  const cached = 'cached-from-store';
  const hitEnv: any = {
    ...baseEnv,
    CACHE: { get: async () => new TextEncoder().encode(JSON.stringify(cached)), put: async () => undefined },
    AI: { run: async () => { aiCallCount++; return { response: 'should-not-use' }; } },
  };
  const text4 = await llmChat(hitEnv, 'sys', 'hello');
  ok('cache HIT -> returns cached text', text4 === cached, { text: text4 });
  ok('cache HIT -> AI.run NOT called', aiCallCount === 0, { calls: aiCallCount });

  // 5. llmJson parses fenced JSON
  const jsonEnv: any = {
    ...baseEnv,
    AI: { run: async () => ({ response: '```json\n{"weight":12.5}\n```' }) },
  };
  const parsed = await llmJson<{ weight: number }>(jsonEnv, 'sys', 'hello');
  ok('llmJson parses fenced JSON', parsed?.weight === 12.5, parsed);

  // 6. AI returns non-string -> stringified
  const nonStrEnv: any = {
    ...baseEnv,
    AI: { run: async () => ({ response: { nested: 'object' } }) },
  };
  const text6 = await llmChat(nonStrEnv, 'sys', 'hello');
  ok('AI non-string response -> stringified', text6 === JSON.stringify({ nested: 'object' }), { text6 });
}

run().then(() => {
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
});
