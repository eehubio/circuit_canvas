/**
 * design-core/custom-lib.ts — 定制器件库
 * 用户经向导（AI 提取 / 手工填写）创建的器件：管脚定义 + 封装参数，
 * 存 localStorage；符号注册为覆盖（真实管脚名），封装经合成 KiCad 名走既有解析器
 * （2D 焊盘 / 3D / 导出全链路自动生效）。
 */
import type { ComponentSearchResult } from '../providers/types';
import type { ComponentCategory } from './document/types';
import { registerSymbolOverride, type ParsedSymbol } from './geometry/lib-file-registry';

export const KICAD_PIN_TYPES = [
  'input', 'output', 'bidirectional', 'tri_state', 'passive', 'free',
  'unspecified', 'power_in', 'power_out', 'open_collector', 'open_emitter', 'no_connect',
] as const;
export type KicadPinType = (typeof KICAD_PIN_TYPES)[number];

export interface CustomPin { num: string; name: string; type: KicadPinType; desc?: string }
export interface CustomPkg { family: 'dual' | 'quad' | 'qfn' | 'header' | 'chip'; bodyW: number; bodyH: number; pitch: number }
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

/** 管脚定义 → 带真实管脚名的符号（ParsedSymbol，注册为覆盖后原理图直接使用） */
export function buildCustomSymbol(pins: CustomPin[]): ParsedSymbol {
  const usable = pins.filter((p) => p.type !== 'no_connect');
  const leftN = Math.ceil(usable.length / 2);
  const rows = Math.max(leftN, usable.length - leftN, 1);
  const w = 120, h = Math.max(60, 20 + (rows - 1) * 20 + 20);
  const mkPin = (p: CustomPin, i: number, side: 'L' | 'R') => {
    const y = 20 + i * 20;
    const tipX = side === 'L' ? -10 : w + 10;
    const endX = side === 'L' ? 0 : w;
    return {
      tipX, tipY: y, endX, endY: y, name: p.name, number: p.num,
      nameX: side === 'L' ? endX + 3 : endX - 3, nameY: y + 2.5,
      numX: (tipX + endX) / 2, numY: y - 2,
    };
  };
  return {
    w, h,
    rects: [{ x: 0, y: 0, w, h }],
    polys: [], circles: [],
    pins: [
      ...usable.slice(0, leftN).map((p, i) => mkPin(p, i, 'L')),
      ...usable.slice(leftN).map((p, i) => mkPin(p, i, 'R')),
    ],
  };
}

export function loadCustomParts(): CustomPart[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as CustomPart[];
  } catch {
    return [];
  }
}

export function saveCustomPart(part: CustomPart) {
  const list = loadCustomParts().filter((p) => p.id !== part.id);
  list.unshift(part);
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 100)));
  registerSymbolOverride(part.mpn, buildCustomSymbol(part.pins));
}

export function deleteCustomPart(id: string) {
  localStorage.setItem(LS_KEY, JSON.stringify(loadCustomParts().filter((p) => p.id !== id)));
}

/** 启动时注册所有定制符号覆盖 */
export function bootCustomLib() {
  for (const p of loadCustomParts()) registerSymbolOverride(p.mpn, buildCustomSymbol(p.pins));
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
