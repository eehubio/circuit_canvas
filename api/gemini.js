/**
 * api/gemini.js — Vercel Serverless Function：Gemini 代理
 * Key 存服务端环境变量 GEMINI_API_KEY（不带 VITE_ 前缀，不进前端 bundle）。
 *
 * GET  /api/gemini?path=status   → { configured }
 * POST /api/gemini  body {prompt} → { text }
 */
// 模型候选：不同 Key 可用模型不同，按序尝试并缓存可用者；GEMINI_MODEL 环境变量可强制指定
const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
let workingModel = null;

function modelUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

async function callGemini(apiKey, prompt, temperature = 0.35) {
  const forced = process.env.GEMINI_MODEL;
  const candidates = forced ? [forced] : workingModel ? [workingModel, ...MODEL_CANDIDATES.filter((m) => m !== workingModel)] : MODEL_CANDIDATES;
  let lastErr = 'no model tried';
  for (const model of candidates) {
    const r = await fetch(`${modelUrl(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 2048 } }),
    });
    if (r.ok) {
      workingModel = model;
      const j = await r.json();
      return { model, text: j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '' };
    }
    lastErr = `${model}: HTTP ${r.status} ${(await r.text()).slice(0, 180)}`;
    if (r.status !== 404 && r.status !== 400) break; // 非模型不存在类错误（如 401/429）不再换模型
  }
  throw new Error(lastErr);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const apiKey = process.env.GEMINI_API_KEY;

  if (req.method === 'GET') {
    const path = req.query?.path ?? '';
    if (path === 'status') {
      return res.status(200).send(JSON.stringify({ configured: !!apiKey }));
    }
    // 诊断：真实调用一次上游，返回可用模型或具体错误（浏览器直接打开可见）
    if (path === 'diag') {
      if (!apiKey) return res.status(200).send(JSON.stringify({ ok: false, error: 'GEMINI_API_KEY 未配置' }));
      try {
        const out = await callGemini(apiKey, '只回复两个字：正常', 0);
        return res.status(200).send(JSON.stringify({ ok: true, model: out.model, reply: out.text.slice(0, 40) }));
      } catch (e) {
        return res.status(200).send(JSON.stringify({ ok: false, error: String(e.message ?? e) }));
      }
    }
    return res.status(400).send(JSON.stringify({ error: 'POST {prompt} or GET ?path=status|diag' }));
  }
  if (!apiKey) {
    return res.status(501).send(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    const prompt = String(body.prompt ?? '');
    if (!prompt) return res.status(400).send(JSON.stringify({ error: 'prompt required' }));

    const out = await callGemini(apiKey, prompt);
    return res.status(200).send(JSON.stringify({ text: out.text, model: out.model }));
  } catch (err) {
    return res.status(502).send(JSON.stringify({ error: 'gemini request failed', detail: String(err).slice(0, 300) }));
  }
}
