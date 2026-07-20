/**
 * Vercel Gateway Proxy for EDA Asset Builder.
 *
 * Frontend calls:
 *   /api/v1/eda-builder/*
 *
 * This proxy forwards to:
 *   ${EDA_BUILDER_URL}/api/v1/eda-builder/*
 *
 * It must not run OCR, KiCad CLI, or CAD generation inside Vercel.
 */
export default async function handler(req, res) {
  const base = (process.env.EDA_BUILDER_URL ?? '').trim().replace(/\/+$/, '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!base) {
    return res.status(501).send(JSON.stringify({
      error: 'EDA_BUILDER_URL 未配置',
      code: 'EDA_BUILDER_NOT_CONFIGURED',
    }));
  }

  const rawPath = req.query.path;
  const rest = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath ?? '');
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (key === 'path') continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)));
    else if (value != null) search.set(key, String(value));
  }
  const query = search.toString() ? `?${search.toString()}` : '';
  const target = `${base}/api/v1/eda-builder/${rest}${query}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.EDA_BUILDER_PROXY_TIMEOUT_MS ?? 30000));

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const upstream = await fetch(target, {
      method: req.method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        ...(req.headers['idempotency-key'] ? { 'Idempotency-Key': req.headers['idempotency-key'] } : {}),
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json; charset=utf-8');
    return res.send(text);
  } catch (err) {
    const code = err?.name === 'AbortError' ? 'EDA_BUILDER_TIMEOUT' : 'EDA_BUILDER_PROXY_FAILED';
    return res.status(502).send(JSON.stringify({ error: 'EDA Builder proxy failed', code, detail: String(err).slice(0, 200) }));
  } finally {
    clearTimeout(timeout);
  }
}
