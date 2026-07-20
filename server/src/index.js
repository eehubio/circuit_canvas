/**
 * server/src/index.js
 * Circuit Canvas standalone 后端骨架。
 *
 * 实现诊断第十三节定义的第一批 API 契约，与前端 Provider 接口对应：
 *   GET  /api/v1/me
 *   GET  /api/v1/components/search
 *   GET  /api/v1/components/:id
 *   GET  /api/v1/components/:id/footprints
 *   GET  /api/v1/components/:id/alternatives
 *   GET  /api/v1/reference-designs/peripheral-circuits?category=
 *   GET  /api/v1/projects/:id/design
 *   PUT  /api/v1/projects/:id/design
 *
 * 当前用内存 + 文件存储占位；正式版替换为 PostgreSQL + ezPLM 元器件库。
 * 前端切到此后端：设置 VITE_APP_MODE=standalone、VITE_API_BASE_URL=http://localhost:8787/api
 */
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPONENTS, ALTERNATIVES, SUBCIRCUITS, FOOTPRINTS } from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '.data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const v1 = express.Router();

/* ---------- EDA Asset Builder Gateway Proxy ---------- */
async function proxyEdaBuilder(req, res) {
  const base = (process.env.EDA_BUILDER_URL ?? '').trim().replace(/\/+$/, '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!base) {
    return res.status(501).send(JSON.stringify({
      error: 'EDA_BUILDER_URL 未配置',
      code: 'EDA_BUILDER_NOT_CONFIGURED',
      hint: 'Run services/eda-builder and set EDA_BUILDER_URL=http://localhost:8000',
    }));
  }

  const rest = req.originalUrl.replace(/^\/api\/v1\/eda-builder/, '') || '/';
  const target = `${base}/api/v1/eda-builder${rest}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.EDA_BUILDER_PROXY_TIMEOUT_MS ?? 30000));
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      ...(req.headers['idempotency-key'] ? { 'Idempotency-Key': req.headers['idempotency-key'] } : {}),
    };
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      signal: controller.signal,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
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

v1.use('/eda-builder', proxyEdaBuilder);

/* ---------- 身份 ---------- */
v1.get('/me', (_req, res) => {
  res.json({ userId: 'local-user', displayName: '本地用户', organizationId: 'org-local' });
});

/* ---------- 元器件 ---------- */
v1.get('/components/search', (req, res) => {
  const { keyword = '', category, orgOnly } = req.query;
  let items = [...COMPONENTS];
  if (orgOnly === 'true') items = items.filter((c) => c.isOrg);
  if (category) items = items.filter((c) => c.category === category);
  if (keyword) {
    const q = String(keyword).toLowerCase();
    items = items.filter((c) =>
      c.mpn.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) ||
      c.family.toLowerCase().includes(q) || c.manufacturer.toLowerCase().includes(q));
  }
  items.sort((a, b) => (b.isOrg ? 1 : 0) - (a.isOrg ? 1 : 0));
  res.json({ items, total: items.length, page: 1, pageSize: items.length });
});

v1.get('/components/:id', (req, res) => {
  const c = COMPONENTS.find((x) => x.component_id === req.params.id);
  if (!c) return res.status(404).json({ error: 'component not found' });
  res.json(c);
});

v1.get('/components/:id/footprints', (req, res) => {
  const c = COMPONENTS.find((x) => x.component_id === req.params.id);
  if (!c) return res.status(404).json({ error: 'component not found' });
  res.json(FOOTPRINTS.filter((f) => f.name === c.default_footprint));
});

/** 封装库浏览 */
v1.get('/footprints', (req, res) => {
  const { category } = req.query;
  res.json(category ? FOOTPRINTS.filter((f) => f.category === category) : FOOTPRINTS);
});

/** 组织物料上下文 */
v1.get('/organizations/:orgId/materials/:componentId', (req, res) => {
  const c = COMPONENTS.find((x) => x.component_id === req.params.componentId);
  if (!c || !c.isOrg) return res.status(404).json({ error: 'not an org material' });
  res.json({
    organization_id: req.params.orgId,
    material_id: c.componentId,
    internal_part_number: `INT-${c.componentId.toUpperCase()}`,
    approved: true,
    preferred: true,
    stock_quantity: 500,
    project_usage_count: 3,
  });
});

v1.get('/components/:id/alternatives', (req, res) => {
  const c = COMPONENTS.find((x) => x.component_id === req.params.id);
  res.json(c ? ALTERNATIVES[c.mpn] ?? [] : []);
});

/* ---------- 参考设计 / 子电路 ---------- */
v1.get('/reference-designs/peripheral-circuits', (req, res) => {
  res.json(SUBCIRCUITS[req.query.category] ?? []);
});

/* ---------- 项目设计文档（写回） ---------- */
const designPath = (id) => path.join(DATA_DIR, `design-${id}.json`);

v1.get('/projects/:id/design', (req, res) => {
  const p = designPath(req.params.id);
  if (!fs.existsSync(p)) return res.json(null);
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

v1.put('/projects/:id/design', (req, res) => {
  fs.writeFileSync(designPath(req.params.id), JSON.stringify(req.body, null, 2));
  res.json({ ref: `local:design-${req.params.id}`, savedAt: new Date().toISOString() });
});

app.use('/api/v1', v1);
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Circuit Canvas API on http://localhost:${PORT}`));
