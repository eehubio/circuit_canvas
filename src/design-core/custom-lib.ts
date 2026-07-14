/**
 * design-core/custom-lib.ts — 定制器件库
 * 用户经向导（AI 提取 / 手工填写）创建的器件：管脚定义 + 封装参数，
 * 存 localStorage；符号注册为覆盖（真实管脚名），封装经合成 KiCad 名走既有解析器
 * （2D 焊盘 / 3D / 导出全链路自动生效）。
 */
import type { ComponentSearchResult } from '../providers/types';
import type { ComponentCategory } from './document/types';
import { registerSymbolOverride, registerFootprintOverride, type ParsedSymbol } from './geometry/lib-file-registry';
import { padFootprintFor, type PadFootprint } from './geometry/footprint-pads';

export const KICAD_PIN_TYPES = [
  'input', 'output', 'bidirectional', 'tri_state', 'passive', 'free',
  'unspecified', 'power_in', 'power_out', 'open_collector', 'open_emitter', 'no_connect',
] as const;
export type KicadPinType = (typeof KICAD_PIN_TYPES)[number];

export type PinSide = 'left' | 'right' | 'top' | 'bottom';
export interface CustomPin { num: string; name: string; type: KicadPinType; desc?: string; side?: PinSide }
export interface CustomPkg {
  family: 'dual' | 'quad' | 'qfn' | 'header' | 'chip';
  bodyW: number; bodyH: number; pitch: number;
  /** 模块轮廓（丝印外形）：焊盘可能只占模块的一部分，轮廓独立指定 */
  outlineW?: number; outlineH?: number;
  /** 焊盘阵列相对轮廓中心的偏移（mm） */
  padsOffsetX?: number; padsOffsetY?: number;
}
export interface CustomPart {
  id: string;
  mpn: string;
  description?: string;
  category: ComponentCategory;
  pins: CustomPin[];
  pkg: CustomPkg;
  footprintName: string;
  createdAt: number;
}

const LS_KEY = 'cc_custom_parts';

/** 封装参数 → 合成 KiCad 规范名（既有名字解析器直接生成真实焊盘） */
export function synthFootprintName(pkg: CustomPkg, pinCount: number): string {
  const dims = `${pkg.bodyW}x${pkg.bodyH}mm_P${pkg.pitch}mm`;
  switch (pkg.family) {
    case 'dual': return `SOP-${pinCount}_${dims}`;
    case 'quad': return `QFP-${pinCount}_${dims}`;
    case 'qfn': return `QFN-${pinCount}_${dims}`;
    case 'header': return `PinHeader_1x${String(pinCount).padStart(2, '0')}_P${pkg.pitch}mm`;
    case 'chip': return pkg.bodyW >= 3 ? '1206' : pkg.bodyW >= 1.9 ? '0805' : pkg.bodyW >= 1.4 ? '0603' : '0402';
  }
}

/** 按管脚名/属性推断默认边（电源上、地下、输入左、输出右）——用户可在向导中改 */
export function defaultSide(p: CustomPin): PinSide {
  const n = p.name.toUpperCase();
  if (/^(GND|VSS|AGND|DGND|PGND|GROUND)/.test(n)) return 'bottom';
  if (p.type === 'power_in' || /^(VCC|VDD|VIN|VBAT|AVDD|3V3|5V)/.test(n)) return 'top';
  if (p.type === 'output' || p.type === 'power_out' || /^(OUT|VOUT|TX|MISO)/.test(n)) return 'right';
  if (p.type === 'input' || /^(IN|VIN|RX|MOSI|CLK|SCL|SCK|EN|NRST|RESET)/.test(n)) return 'left';
  return 'right';
}

/** 管脚定义 → 带真实管脚名的符号（四边布置，10px 栅格对齐） */
export function buildCustomSymbol(pins: CustomPin[]): ParsedSymbol {
  const usable = pins.filter((p) => p.type !== 'no_connect');
  const G = 10; // 栅格
  const by = (side: PinSide) => usable.filter((p) => (p.side ?? defaultSide(p)) === side);
  const L = by('left'), R = by('right'), T = by('top'), B = by('bottom');
  const rows = Math.max(L.length, R.length, 1);
  const cols = Math.max(T.length, B.length, 0);
  const w = Math.max(120, (cols + 1) * 2 * G);
  const h = Math.max(60, (rows + 1) * 2 * G);
  const pinsOut: ParsedSymbol['pins'] = [];
  L.forEach((p, i) => {
    const y = 2 * G + i * 2 * G;
    pinsOut.push({ tipX: -G, tipY: y, endX: 0, endY: y, name: p.name, number: p.num, nameX: 3, nameY: y + 2.5, numX: -G / 2, numY: y - 2 });
  });
  R.forEach((p, i) => {
    const y = 2 * G + i * 2 * G;
    pinsOut.push({ tipX: w + G, tipY: y, endX: w, endY: y, name: p.name, number: p.num, nameX: w - 3, nameY: y + 2.5, numX: w + G / 2, numY: y - 2 });
  });
  T.forEach((p, i) => {
    const x = 2 * G + i * 2 * G;
    pinsOut.push({ tipX: x, tipY: -G, endX: x, endY: 0, name: p.name, number: p.num, nameX: x + 3, nameY: 10, numX: x + 3, numY: -G / 2 });
  });
  B.forEach((p, i) => {
    const x = 2 * G + i * 2 * G;
    pinsOut.push({ tipX: x, tipY: h + G, endX: x, endY: h, name: p.name, number: p.num, nameX: x + 3, nameY: h - 5, numX: x + 3, numY: h + G / 2 + 3 });
  });
  return { w, h, rects: [{ x: 0, y: 0, w, h }], polys: [], circles: [], pins: pinsOut };
}

/** 定制封装：焊盘阵列（按合成名解析）+ 独立模块轮廓 + 焊盘偏移
 *  焊盘可能只占模块的一部分（如带屏蔽罩的模组），故轮廓与焊盘范围解耦 */
export function buildCustomFootprint(pkg: CustomPkg, pinCount: number): PadFootprint | null {
  const base = padFootprintFor(synthFootprintName(pkg, pinCount));
  if (!base) return null;
  const dx = pkg.padsOffsetX ?? 0;
  const dy = pkg.padsOffsetY ?? 0;
  const outW = pkg.outlineW && pkg.outlineW > 0 ? pkg.outlineW : base.bodyW;
  const outH = pkg.outlineH && pkg.outlineH > 0 ? pkg.outlineH : base.bodyH;
  return {
    bodyW: outW,
    bodyH: outH,
    pads: base.pads.map((pd) => ({ ...pd, x: pd.x + dx, y: pd.y + dy })),
    pin1: base.pin1 ? { x: base.pin1.x + dx, y: base.pin1.y + dy } : undefined,
  };
}

/** 定制器件的封装注册名（唯一，避免与库中同名封装冲突） */
export function customFootprintName(part: { mpn: string; pkg: CustomPkg; pins: unknown[] }): string {
  const hasOutline = (part.pkg.outlineW ?? 0) > 0 || (part.pkg.padsOffsetX ?? 0) !== 0 || (part.pkg.padsOffsetY ?? 0) !== 0;
  // 无自定义轮廓时直接用标准合成名（可复用库内解析与 3D）
  return hasOutline ? `CUSTOM_${part.mpn}` : synthFootprintName(part.pkg, part.pins.length);
}

export function loadCustomParts(): CustomPart[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as CustomPart[];
  } catch {
    return [];
  }
}

function registerPart(part: CustomPart) {
  registerSymbolOverride(part.mpn, buildCustomSymbol(part.pins));
  const fp = buildCustomFootprint(part.pkg, part.pins.length);
  if (fp) registerFootprintOverride(part.footprintName, fp);
}

export function saveCustomPart(part: CustomPart) {
  const list = loadCustomParts().filter((p) => p.id !== part.id);
  list.unshift(part);
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 100)));
  registerPart(part);
}

export function deleteCustomPart(id: string) {
  localStorage.setItem(LS_KEY, JSON.stringify(loadCustomParts().filter((p) => p.id !== id)));
}

/** 启动时注册所有定制符号覆盖 */
export function bootCustomLib() {
  for (const p of loadCustomParts()) registerPart(p);
}

/** 转搜索结果对象 → addComponent 直接上画布 */
export function customPartToResult(p: CustomPart): ComponentSearchResult {
  return {
    componentId: `custom_${p.id}`,
    mpn: p.mpn,
    manufacturer: '自建',
    category: p.category,
    defaultFootprintName: p.footprintName,
    family: 'Custom',
    description: p.description ?? '定制器件',
    pins: p.pins.length,
  } as ComponentSearchResult;
}
