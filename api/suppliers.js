/**
 * api/suppliers.js — 供应商价格/库存聚合代理（Mouser / Arrow / element14）
 *
 * Vercel 环境变量（服务端专用，不带 VITE_ 前缀）：
 *   MOUSER_API_KEY                      — Mouser Search API
 *   ARROW_LOGIN + ARROW_API_KEY         — Arrow ItemService（两个都要）
 *   ELEMENT14_API_KEY                   — element14/Farnell Product Search
 *
 * GET /api/suppliers?path=status → { mouser, arrow, element14 }（各自是否已配置）
 * GET /api/suppliers?mpn=XXX     → { offers: [{vendor, configured, found, price, currency, stock, url}] }
 *
 * 注意：Arrow/element14 的响应映射按公开文档编写，属防御式实现；
 * 你申请到 Key 后首次调用如字段有偏差，只需校准本文件对应的 mapXxx 函数。
 */

const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : undefined; };

/* ---------- Mouser ---------- */
async function queryMouser(key, mpn) {
  const r = await fetch(`https://api.mouser.com/api/v1/search/keyword?apiKey=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SearchByKeywordRequest: { keyword: mpn, records: 3, startingRecord: 0 } }),
  });
  if (!r.ok) throw new Error(`mouser ${r.status}`);
  const j = await r.json();
  const parts = j?.SearchResults?.Parts ?? [];
  const exact = parts.find((p) => String(p?.ManufacturerPartNumber ?? '').toUpperCase() === mpn.toUpperCase()) ?? parts[0];
  if (!exact) return { found: false };
  const brk = (exact.PriceBreaks ?? [])[0];
  return {
    found: true,
    price: num(brk?.Price),
    currency: brk?.Currency ?? 'CNY',
    stock: num(exact.AvailabilityInStock ?? exact.Availability),
    url: exact.ProductDetailUrl || `https://www.mouser.cn/c/?q=${encodeURIComponent(mpn)}`,
  };
}

/* ---------- Arrow（防御式，拿到 Key 后可能需按真实响应校准） ---------- */
async function queryArrow(login, key, mpn) {
  const r = await fetch(`https://api.arrow.com/itemservice/v4/en/search/token?login=${encodeURIComponent(login)}&apikey=${encodeURIComponent(key)}&search_token=${encodeURIComponent(mpn)}&rows=3`);
  if (!r.ok) throw new Error(`arrow ${r.status}`);
  const j = await r.json();
  const parts = j?.itemserviceresult?.data?.[0]?.PartList ?? [];
  const part = parts[0];
  if (!part) return { found: false };
  const src = (part.InvOrg?.webSites ?? []).flatMap((w) => w?.sources ?? []);
  const pd = src.flatMap((sc) => sc?.sourceParts ?? [])[0];
  const price = pd?.Prices?.resaleList?.[0]?.price ?? pd?.prices?.[0]?.price;
  const stock = pd?.Availability?.[0]?.fohQuantity;
  return {
    found: true,
    price: num(price),
    currency: 'USD',
    stock: num(stock),
    url: `https://www.arrow.com/en/products/search?q=${encodeURIComponent(mpn)}`,
  };
}

/* ---------- element14 / Farnell（防御式） ---------- */
async function queryElement14(key, mpn) {
  const url = `https://api.element14.com/catalog/products?term=manuPartNumber:${encodeURIComponent(mpn)}&storeInfo.id=cn.element14.com&resultsSettings.offset=0&resultsSettings.numberOfResults=3&resultsSettings.responseGroup=medium&callInfo.responseDataFormat=json&callInfo.apiKey=${encodeURIComponent(key)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`element14 ${r.status}`);
  const j = await r.json();
  const products = j?.manufacturerPartNumberSearchReturn?.products ?? j?.keywordSearchReturn?.products ?? [];
  const p = products[0];
  if (!p) return { found: false };
  return {
    found: true,
    price: num(p.prices?.[0]?.cost),
    currency: 'CNY',
    stock: num(p.stock?.level ?? p.inv),
    url: `https://cn.element14.com/search?st=${encodeURIComponent(mpn)}`,
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const { path, mpn } = req.query ?? {};
  const mouserKey = process.env.MOUSER_API_KEY;
  const arrowLogin = process.env.ARROW_LOGIN;
  const arrowKey = process.env.ARROW_API_KEY;
  const e14Key = process.env.ELEMENT14_API_KEY;

  if (path === 'status') {
    return res.status(200).send(JSON.stringify({ mouser: !!mouserKey, arrow: !!(arrowLogin && arrowKey), element14: !!e14Key }));
  }
  if (!mpn) return res.status(400).send(JSON.stringify({ error: 'usage: ?mpn=XXX' }));

  const jobs = [
    { vendor: 'Mouser', configured: !!mouserKey, run: () => queryMouser(mouserKey, String(mpn)) },
    { vendor: 'Arrow', configured: !!(arrowLogin && arrowKey), run: () => queryArrow(arrowLogin, arrowKey, String(mpn)) },
    { vendor: 'element14', configured: !!e14Key, run: () => queryElement14(e14Key, String(mpn)) },
  ];
  const offers = await Promise.all(jobs.map(async (jb) => {
    if (!jb.configured) return { vendor: jb.vendor, configured: false, found: false };
    try {
      const out = await jb.run();
      return { vendor: jb.vendor, configured: true, ...out };
    } catch (e) {
      return { vendor: jb.vendor, configured: true, found: false, error: String(e.message ?? e).slice(0, 120) };
    }
  }));
  res.setHeader('Cache-Control', 'public, max-age=600');
  return res.status(200).send(JSON.stringify({ offers }));
}
