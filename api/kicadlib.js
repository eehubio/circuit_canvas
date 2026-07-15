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
const SYM_PROJECT = encodeURIComponent('kicad/libraries/kicad-symbols');
const P3D_PROJECT = encodeURIComponent('kicad/libraries/kicad-packages3D');
const SYM_RAW = 'https://gitlab.com/kicad/libraries/kicad-symbols/-/raw/master';

const SAFE = /^[A-Za-z0-9._\-]+$/; // 库名/封装名白名单（防路径穿越）
const cache = new Map(); // key → { at, data }
const TTL = 60 * 60 * 1000;

function getCached(key) {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL ? hit.data : null;
}

/** 从 .kicad_sym 全文提取顶层 (symbol "NAME" …) 平衡括号块 */
function extractSymbolBlock(text, name) {
  const needle = `(symbol "${name}"`;
  const i = text.indexOf(needle);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '(') depth++;
    else if (text[j] === ')') { depth--; if (depth === 0) return text.slice(i, j + 1); }
  }
  return null;
}

let symProj = null; // { id, branch } 模块级缓存
async function resolveSymProject() {
  if (symProj) return symProj;
  const r = await fetch(`https://gitlab.com/api/v4/groups/${encodeURIComponent('kicad/libraries')}/projects?per_page=100`, { headers: { 'User-Agent': 'circuit-canvas' } });
  if (!r.ok) throw new Error(`group api ${r.status}`);
  const projects = await r.json();
  const p = (Array.isArray(projects) ? projects : []).find((x) => x.path === 'kicad-symbols')
    ?? (Array.isArray(projects) ? projects : []).find((x) => /symbol/i.test(String(x.path)));
  if (!p) throw new Error('kicad/libraries 组中未找到符号项目：' + (Array.isArray(projects) ? projects.map((x) => x.path).slice(0, 8).join(',') : typeof projects));
  symProj = { id: p.id, branch: p.default_branch || 'master' };
  return symProj;
}

async function symLibText(lib) {
  const key = `symfile:${lib}`;
  let data = getCached(key);
  if (!data) {
    const pj = await resolveSymProject();
    const r = await fetch(`${GL_API}/${pj.id}/repository/files/${encodeURIComponent(lib + '.kicad_sym')}/raw?ref=${encodeURIComponent(pj.branch)}`, { headers: { 'User-Agent': 'circuit-canvas' } });
    if (!r.ok) throw new Error(`symbol lib ${r.status}`);
    data = await r.text();
    cache.set(key, { at: Date.now(), data });
  }
  return data;
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
      // lib = 3dshapes 目录基名（来自 mod 内 (model) 引用），name = 模型文件基名
      if (!SAFE.test(String(lib)) || !SAFE.test(String(name))) return res.status(400).send(JSON.stringify({ error: 'bad params' }));
      let r = await fetch(`${P3D_RAW}/${lib}.3dshapes/${encodeURIComponent(String(name))}.step`, { headers: { 'User-Agent': 'circuit-canvas' } });
      if (!r.ok) {
        // 模糊匹配兜底：官方 3D 文件名与封装名可能不完全一致（大小写/后缀变体）
        const key3d = `3dtree:${lib}`;
        let names = getCached(key3d);
        if (!names) {
          const out = [];
          for (let page = 1; page <= 30; page++) {
            const tr2 = await fetch(`${GL_API}/${P3D_PROJECT}/repository/tree?path=${encodeURIComponent(lib + '.3dshapes')}&per_page=100&page=${page}&ref=master`, { headers: { 'User-Agent': 'circuit-canvas' } });
            if (!tr2.ok) break;
            const items = await tr2.json();
            out.push(...items);
            if (items.length < 100) break;
          }
          names = out.filter((t) => t.type === 'blob' && t.name.endsWith('.step')).map((t) => t.name.replace(/\.step$/, ''));
          cache.set(key3d, { at: Date.now(), data: names });
        }
        const want = String(name).toLowerCase();
        const hit = names.find((n) => n.toLowerCase() === want)
          ?? names.find((n) => n.toLowerCase().startsWith(want) || want.startsWith(n.toLowerCase()))
          ?? names.find((n) => n.toLowerCase().includes(want) || want.includes(n.toLowerCase()));
        if (!hit) return res.status(404).send(JSON.stringify({ error: `3D 库中无匹配模型（${lib}.3dshapes 共 ${names.length} 个）` }));
        r = await fetch(`${P3D_RAW}/${lib}.3dshapes/${encodeURIComponent(hit)}.step`, { headers: { 'User-Agent': 'circuit-canvas' } });
        if (!r.ok) return res.status(404).send(JSON.stringify({ error: 'no step model' }));
      }
      let buf = Buffer.from(await r.arrayBuffer());
      // kicad-packages3D 用 Git LFS：raw 端点返回的是指针文本，需经 LFS Batch API 换真实地址
      const head = buf.slice(0, 200).toString('utf8');
      if (head.startsWith('version https://git-lfs')) {
        const oid = head.match(/oid sha256:([0-9a-f]{64})/)?.[1];
        const size = Number(head.match(/size (\d+)/)?.[1] ?? 0);
        if (!oid) return res.status(502).send(JSON.stringify({ error: 'bad lfs pointer' }));
        if (size > 4 * 1024 * 1024) return res.status(413).send(JSON.stringify({ error: `step too large (${(size / 1048576).toFixed(1)}MB > 4MB)` }));
        const batch = await fetch('https://gitlab.com/kicad/libraries/kicad-packages3D.git/info/lfs/objects/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.git-lfs+json', 'Accept': 'application/vnd.git-lfs+json', 'User-Agent': 'circuit-canvas' },
          body: JSON.stringify({ operation: 'download', transfers: ['basic'], objects: [{ oid, size }] }),
        });
        if (!batch.ok) return res.status(502).send(JSON.stringify({ error: `lfs batch ${batch.status}` }));
        const bj = await batch.json();
        const href = bj?.objects?.[0]?.actions?.download?.href;
        const hdrs = bj?.objects?.[0]?.actions?.download?.header ?? {};
        if (!href) return res.status(502).send(JSON.stringify({ error: 'lfs no href' }));
        const real = await fetch(href, { headers: { ...hdrs, 'User-Agent': 'circuit-canvas' } });
        if (!real.ok) return res.status(502).send(JSON.stringify({ error: `lfs dl ${real.status}` }));
        buf = Buffer.from(await real.arrayBuffer());
      }
      if (buf.length > 4 * 1024 * 1024) return res.status(413).send(JSON.stringify({ error: 'step too large (>4MB)' }));
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(buf);
    }

    if (path === 'symlibs') {
      let data = getCached('symlibs');
      let diag = '';
      if (!data || !data.length) {
        let sample = [];
        try {
          const pj = await resolveSymProject();
          for (const sub of ['', 'symbols']) {
            const out = [];
            for (let page = 1; page <= 10; page++) {
              const qs = `per_page=100&page=${page}&ref=${encodeURIComponent(pj.branch)}` + (sub ? `&path=${encodeURIComponent(sub)}` : '');
              const r = await fetch(`${GL_API}/${pj.id}/repository/tree?${qs}`, { headers: { 'User-Agent': 'circuit-canvas' } });
              if (!r.ok) { sample = [`HTTP ${r.status} (id=${pj.id} ref=${pj.branch})`]; break; }
              const items = await r.json();
              if (!Array.isArray(items)) { sample = ['非数组响应']; break; }
              out.push(...items);
              if (items.length < 100) break;
            }
            const libs = out.filter((t) => t.type === 'blob' && String(t.name).endsWith('.kicad_sym')).map((t) => t.name.replace(/\.kicad_sym$/, ''));
            if (libs.length) { data = libs; break; }
            if (out.length && !sample.length) sample = out.slice(0, 5).map((t) => `${t.type}:${t.name}`);
          }
        } catch (e) {
          sample = [String(e && e.message ? e.message : e).slice(0, 120)];
        }
        if (data && data.length) {
          cache.set('symlibs', { at: Date.now(), data }); // 只缓存非空
        } else {
          diag = `符号库定位失败；样本：${sample.join(', ') || '（空树）'}`;
        }
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', data && data.length ? 's-maxage=3600, stale-while-revalidate=86400' : 'no-store');
      return res.status(200).send(JSON.stringify(data && data.length ? { libs: data } : { libs: [], error: diag }));
    }

    if (path === 'symlist') {
      if (!SAFE.test(String(lib))) return res.status(400).send(JSON.stringify({ error: 'bad lib' }));
      const key = `symlist:${lib}`;
      let data = getCached(key);
      if (!data) {
        const text = await symLibText(lib);
        // 顶层符号名（排除 _N_M 子单元定义）
        data = [...text.matchAll(/\(symbol "([^"]+)"/g)].map((m) => m[1]).filter((n) => !/_\d+_\d+$/.test(n));
        data = [...new Set(data)];
        cache.set(key, { at: Date.now(), data });
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(JSON.stringify({ items: data }));
    }

    if (path === 'sym') {
      if (!SAFE.test(String(lib))) return res.status(400).send(JSON.stringify({ error: 'bad lib' }));
      const text = await symLibText(lib);
      let block = extractSymbolBlock(text, String(name));
      if (!block) return res.status(404).send(JSON.stringify({ error: 'symbol not found' }));
      // 一层 extends 继承：几何在父符号里，把父块的子单元拼进来
      const ext = block.match(/\(extends "([^"]+)"\)/);
      if (ext) {
        const parent = extractSymbolBlock(text, ext[1]);
        if (parent) {
          // 取父块中的子 symbol 定义（单元几何），重命名前缀为子符号名
          const units = [];
          const re = new RegExp(`\\(symbol "${ext[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+_\\d+)"`, 'g');
          let m;
          while ((m = re.exec(parent))) {
            let depth = 0;
            for (let j = m.index; j < parent.length; j++) {
              if (parent[j] === '(') depth++;
              else if (parent[j] === ')') { depth--; if (depth === 0) { units.push(parent.slice(m.index, j + 1).replace(new RegExp(`"${ext[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_`, 'g'), `"${name}_`)); break; } }
            }
          }
          if (units.length) block = block.replace(/\)\s*$/, '\n' + units.join('\n') + ')');
        }
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(`(kicad_symbol_lib ${block})`);
    }

    return res.status(400).send(JSON.stringify({ error: 'unknown path' }));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(502).send(JSON.stringify({ error: 'KiCad 库拉取失败', detail: String(err).slice(0, 160) }));
  }
}
