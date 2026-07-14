/**
 * api/ds2kicad.js — DS2KiCad 提取引擎代理
 *
 * DS2KiCad（eehubio/ds2kicad）：确定性 PDF 解析（pdfjs 文本层 + 管脚表正则）+ 按需 Gemini，
 * 输出带置信度与逐字段溯源的器件信息，远优于裸大模型提示词。
 *
 * Vercel 环境变量：DS2KICAD_URL = 你部署的 ds2kicad 实例地址（如 https://ds2kicad.vercel.app）
 *
 * GET  /api/ds2kicad?path=status                    → { configured }
 * POST /api/ds2kicad  body {pdfUrl} 或 {pdfBase64, fileName}
 *   → 透传 ds2kicad /api/extract 响应：{ mock, part, packages, recommendedPackageIndex, pins, figures, meta }
 */
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const base = (process.env.DS2KICAD_URL ?? '').trim().replace(/\/+$/, '') || undefined;

  if (req.method === 'GET') {
    return res.status(200).send(JSON.stringify({ configured: !!base }));
  }
  if (!base) {
    return res.status(501).send(JSON.stringify({ error: 'DS2KICAD_URL 未配置' }));
  }
  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const r = await fetch(`${base}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const text = await r.text();
    return res.status(r.status).send(text);
  } catch (err) {
    return res.status(502).send(JSON.stringify({ error: 'ds2kicad 调用失败', detail: String(err).slice(0, 200) }));
  }
}
