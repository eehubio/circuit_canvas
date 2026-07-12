/**
 * providers/ezplm-live/index.ts
 * ezPLM 实时数据 Provider —— 经 /api/ezplm 签名代理调用真实接口。
 *
 * 官方接口仅两个只读端点：
 *   GET parts?keyword=              系统库物料（白名单供应商）
 *   GET reference-designs?partlibId= 参考设计
 *
 * 手册确认的字段：id / mpn / manufacturer / footprint / symbol / pdf / attributes，
 * 但未给出 footprint/pdf/attributes 的精确结构 —— 本文件的映射按【防御式】编写，
 * 兼容 字符串 / {name|url} 对象 / 数组 多种形态。首次真实调用后如需微调，只改本文件。
 */
import type { ComponentSearchResult } from '../types';
import type { ComponentCategory } from '../../design-core/document/types';
import { PAD_FOOTPRINTS } from '../../design-core/geometry/footprint-pads';

const EZ_PREFIX = 'ez_';

/* ---------- 可用性探测（status 不消耗上游配额，结果缓存） ---------- */
let availableCache: boolean | null = null;

export async function ezplmLiveAvailable(): Promise<boolean> {
  if (availableCache !== null) return availableCache;
  try {
    const r = await fetch('/api/ezplm?path=status');
    const j = await r.json();
    availableCache = !!j.configured;
  } catch {
    availableCache = false; // 本地 vite dev 无 serverless 函数时走这里
  }
  return availableCache;
}

/* ---------- 防御式取值工具 ---------- */
type Raw = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

/** footprint 字段：string | {name|footprint|value} | [first] */
function pickName(v: unknown): string | undefined {
  if (typeof v === 'string') return str(v);
  if (Array.isArray(v)) return pickName(v[0]);
  if (v && typeof v === 'object') {
    const o = v as Raw;
    return str(o.name) ?? str(o.footprint) ?? str(o.value) ?? str(o.title);
  }
  return undefined;
}

/** pdf/symbol 等文件字段：string(url) | {url|link|file|path} */
function pickUrl(v: unknown): string | undefined {
  if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : undefined;
  if (Array.isArray(v)) return pickUrl(v[0]);
  if (v && typeof v === 'object') {
    const o = v as Raw;
    return pickUrl(o.url) ?? pickUrl(o.link) ?? pickUrl(o.file) ?? pickUrl(o.path) ?? pickUrl(o.href);
  }
  return undefined;
}

/** attributes：对象 | [{name|key|label, value}] → 扁平键值对（取前 10 项） */
function pickAttrs(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(v)) {
    for (const item of v) {
      if (item && typeof item === 'object') {
        const o = item as Raw;
        const k = str(o.name) ?? str(o.key) ?? str(o.label);
        const val = str(o.value) ?? (typeof o.value === 'number' ? String(o.value) : undefined);
        if (k && val) out[k] = val;
      }
      if (Object.keys(out).length >= 10) break;
    }
  } else if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v as Raw)) {
      const sv = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : undefined;
      if (sv) out[k] = sv;
      if (Object.keys(out).length >= 10) break;
    }
  }
  return out;
}

/** 封装名归一化：能对上内置焊盘库的用内置名（画布上有真实焊盘），否则保留原名 */
function normalizeFootprint(name: string | undefined): string {
  if (!name) return 'SOIC-8';
  const known = Object.keys(PAD_FOOTPRINTS);
  const exact = known.find((k) => k.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  const up = name.toUpperCase().replace(/\s/g, '');
  const hit = known.find((k) => up.includes(k.toUpperCase().replace(/\s/g, '')));
  if (hit) return hit;
  // 常见别名
  if (/0402/.test(up)) return '0402';
  if (/0603/.test(up)) return '0603';
  if (/SOT-?223/.test(up)) return 'SOT-223';
  if (/SOT-?23/.test(up)) return 'TSOT-23-8';
  if (/SOI?C-?8\b|SOP-?8\b/.test(up)) return 'SOIC-8';
  if (/SOI?C-?16|SOP-?16|SSOP-?16|TSSOP-?16/.test(up)) return 'SOP-16';
  if (/L?QFP-?48/.test(up)) return 'LQFP-48';
  if (/L?QFP-?100|L?QFP-?64/.test(up)) return 'LQFP-100';
  return name; // 未知封装：保留原名，几何走通用兜底
}

/** 类别推断：手册未提供 category 字段，按型号/描述/参数关键词判断 */
function inferCategory(text: string): ComponentCategory {
  const t = text.toUpperCase();
  if (/(STM32|GD32|ESP32|CH32|APM32|RP2\d{3}|MCU|单片机|微控制)/.test(t)) return 'mcu';
  if (/(LDO|DC-?DC|BUCK|BOOST|稳压|电源管理|REGULATOR|TPS\d|MP\d{4}|AMS1117|LM1117)/.test(t)) return 'power';
  if (/(连接器|CONNECTOR|USB|排针|HEADER|TYPE-?C|插座)/.test(t)) return 'connector';
  if (/(电容|电阻|电感|CAPACITOR|RESISTOR|INDUCTOR|MLCC|^RC\d{4}|^CL\d{2})/.test(t)) return 'passive';
  return 'ic';
}

/** 单个物料映射 */
export function mapEzplmPart(raw: Raw): ComponentSearchResult {
  const id = str(raw.id) ?? str(raw.partlibId) ?? String(Math.random()).slice(2);
  const mpn = str(raw.mpn) ?? str(raw.model) ?? str(raw.partNumber) ?? str(raw.name) ?? id;
  const manufacturer = str(raw.manufacturer) ?? str(raw.vendor) ?? str(raw.brand) ?? '—';
  const fpRaw = pickName(raw.footprint);
  const footprint = normalizeFootprint(fpRaw);
  const attrs = pickAttrs(raw.attributes);
  const description = str(raw.description) ?? str(raw.productName) ?? str(raw.title) ?? Object.entries(attrs).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(' ');
  const category = inferCategory([mpn, manufacturer, description, fpRaw ?? '', Object.values(attrs).join(' ')].join(' '));
  return {
    componentId: EZ_PREFIX + id,
    mpn,
    manufacturer,
    category,
    defaultFootprintName: footprint,
    family: str(raw.family) ?? 'ezPLM',
    description: description || `${manufacturer} ${mpn}`,
    pins: typeof raw.pins === 'number' ? raw.pins : 8,
    attributes: attrs,
    coreParams: attrs,
    datasheetUrl: pickUrl(raw.pdf) ?? pickUrl(raw.datasheet),
    imageUrl: pickUrl(raw.image) ?? pickUrl(raw.photo),
    // org 标记 → source='EZPLM'，BOM 中显示「本组织·ezPLM」徽标
    org: {
      organizationId: 'ezplm',
      materialId: id,
      internalPartNumber: str(raw.materialCode),
      approved: true,
      preferred: false,
      stockQuantity: typeof raw.stock === 'number' ? raw.stock : undefined,
    },
  };
}

/* ---------- 接口调用 ---------- */

export async function searchEzplmParts(keyword: string, pageSize = 20): Promise<{ available: boolean; items: ComponentSearchResult[] }> {
  if (!(await ezplmLiveAvailable())) return { available: false, items: [] };
  try {
    const r = await fetch(`/api/ezplm?path=parts&keyword=${encodeURIComponent(keyword)}&pageSize=${pageSize}`);
    if (!r.ok) return { available: r.status !== 501, items: [] };
    const j = await r.json();
    const list: Raw[] = Array.isArray(j?.data) ? j.data : [];
    return { available: true, items: list.map(mapEzplmPart) };
  } catch {
    return { available: false, items: [] };
  }
}

export interface ReferenceDesign { name: string; link?: string; image?: string; description?: string; }

export async function getEzplmReferenceDesigns(componentId: string, pageSize = 10): Promise<ReferenceDesign[]> {
  if (!componentId.startsWith(EZ_PREFIX)) return [];
  if (!(await ezplmLiveAvailable())) return [];
  const partlibId = componentId.slice(EZ_PREFIX.length);
  try {
    const r = await fetch(`/api/ezplm?path=reference-designs&partlibId=${encodeURIComponent(partlibId)}&pageSize=${pageSize}`);
    if (!r.ok) return [];
    const j = await r.json();
    const list: Raw[] = Array.isArray(j?.data) ? j.data : [];
    return list.map((d) => ({
      name: str(d.name) ?? '参考设计',
      link: pickUrl(d.link) ?? pickUrl(d.url),
      image: pickUrl(d.image),
      description: str(d.description),
    }));
  } catch {
    return [];
  }
}

export function isEzplmPart(componentId: string): boolean {
  return componentId.startsWith(EZ_PREFIX);
}
