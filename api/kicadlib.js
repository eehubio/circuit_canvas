/**
 * api/kicadlib.js — KiCad 官方封装库代理（gitlab.com/kicad/libraries）
 *
 * 一万多个封装 + 大体积 3D 不打包进前端，按需拉取：
 *   GET ?path=libs                     → 封装库列表（*.pretty 目录名）
 *   GET ?path=list&lib=Package_SO      → 该库内全部封装名
 *   GET ?path=mod&lib=X&name=Y         → .kicad_mod 原文（前端解析注册）
 *   GET ?path=step&lib=X&name=Y        → kicad-packages3D 的 .step 二进制（3D 管道用）
 *
 * 数据源：
 *   https://gitlab.com/kicad/libraries/kicad-footprints   （封装，GPL 数据文件按需引用，不复制进本仓库）
 *   https://gitlab.com/kicad/libraries/kicad-packages3D   （3D 模型）
 * 目录列表走 GitLab 公共 API（无需鉴权），内存缓存 1 小时。
 */
const GL_API = 'https://gitlab.com/api/v4/projects';
const FP_PROJECT = encodeURIComponent('kicad/libraries/kicad-footprints');
const P3D_RAW = 'https://gitlab.com/kicad/libraries/kicad-packages3D/-/raw/master';
const FP_RAW = 'https://gitlab.com/kicad/libraries/kicad-footprints/-/raw/master';

const SAFE = /^[A-Za-z0-9._\-]+$/; // 库名/封装名白名单（防路径穿越）
const cache = new Map(); // key → { at, data }
const TTL = 60 * 60 * 1000;

function getCached(key) {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL ? hit.data : null;
}

async function glTree(path) {
  // GitLab tree API 分页拉全（每页 100，上限 30 页 = 3000 项，单库足够）
  const out = [];
  for (let page = 1; page <= 30; page++) {
    const r = await fetch(`${GL_API}/${FP_PROJECT}/repository/tree?path=${encodeURIComponent(path)}&per_page=100&page=${page}&ref=master`, {
      headers: { 'User-Agent': 'circuit-canvas' },
    });
    if (!r.ok) throw new Error(`GitLab API ${r.status}`);
    const items = await r.json();
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

export default async function handler(req, res) {
  const { path, lib, name } = req.query ?? {};
  try {
    if (path === 'libs') {
      let data = getCached('libs');
      if (!data) {
        const tree = await glTree('');
        data = tree.filter((t) => t.type === 'tree' && t.name.endsWith('.pretty')).map((t) => t.name.replace(/\.pretty$/, ''));
        cache.set('libs', { at: Date.now(), data });
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(JSON.stringify({ libs: data }));
    }

    if (path === 'list') {
      if (!SAFE.test(String(lib))) return res.status(400).send(JSON.stringify({ error: 'bad lib' }));
      const key = `list:${lib}`;
      let data = getCached(key);
      if (!data) {
        const tree = await glTree(`${lib}.pretty`);
        data = tree.filter((t) => t.type === 'blob' && t.name.endsWith('.kicad_mod')).map((t) => t.name.replace(/\.kicad_mod$/, ''));
        cache.set(key, { at: Date.now(), data });
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(JSON.stringify({ items: data }));
    }

    if (path === 'mod') {
      if (!SAFE.test(String(lib)) || !SAFE.test(String(name))) return res.status(400).send(JSON.stringify({ error: 'bad params' }));
      const r = await fetch(`${FP_RAW}/${lib}.pretty/${name}.kicad_mod`, { headers: { 'User-Agent': 'circuit-canvas' } });
      if (!r.ok) return res.status(r.status).send(JSON.stringify({ error: `fetch ${r.status}` }));
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(await r.text());
    }

    if (path === 'step') {
      if (!SAFE.test(String(lib)) || !SAFE.test(String(name))) return res.status(400).send(JSON.stringify({ error: 'bad params' }));
      // 3D 库目录名与封装库同名（Package_SO.3dshapes/…）；.step 优先，.wrl 不支持
      const r = await fetch(`${P3D_RAW}/${lib}.3dshapes/${encodeURIComponent(String(name))}.step`, { headers: { 'User-Agent': 'circuit-canvas' } });
      if (!r.ok) return res.status(404).send(JSON.stringify({ error: 'no step model' }));
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4 * 1024 * 1024) return res.status(413).send(JSON.stringify({ error: 'step too large (>4MB)' }));
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(buf);
    }

    return res.status(400).send(JSON.stringify({ error: 'unknown path' }));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(502).send(JSON.stringify({ error: 'KiCad 库拉取失败', detail: String(err).slice(0, 160) }));
  }
}
