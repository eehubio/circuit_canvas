/**
 * KiCad 原理图（.kicad_sch）解析 —— 服务于工程 zip 导入：
 *
 * .kicad_sch 自包含所有用到的符号定义（lib_symbols 区块），无需再访问符号库。
 * 提取两类信息：
 *   1. libSymbols：  libId("Device:LED") → 符号定义原文（喂给 parseKicadSym 注册 override）
 *   2. instances：   原理图器件实例的 位号(Reference) → libId 映射（与 PCB 导入的位号对齐）
 *
 * 用平衡括号文本扫描而非全量 S 表达式解析：sch 文件可达数 MB，只取所需区块更稳更快。
 */

export interface SchInstance { ref: string; libId: string; x: number; y: number; rot: number; mirror?: string; unit?: number }

export interface KicadSchResult {
  /** libId → 符号定义块原文（顶层 (symbol "Lib:Name" …)） */
  libSymbols: Record<string, string>;
  /** 器件实例：位号 → libId（跳过电源符号 #PWR / power:*，用于符号挂载） */
  refToLibId: Record<string, string>;
  /** 全部实例（含电源符号，用于原样渲染） */
  instances: SchInstance[];
  /** 连线段（mm 坐标折线） */
  wires: [number, number][][];
  junctions: [number, number][];
  labels: { text: string; x: number; y: number; rot: number }[];
  noConnects: [number, number][];
}

/** 从 idx 处（指向 '('）提取平衡括号块 */
function balancedBlock(text: string, idx: number): string | null {
  let depth = 0;
  for (let j = idx; j < text.length; j++) {
    if (text[j] === '(') depth++;
    else if (text[j] === ')') { depth--; if (depth === 0) return text.slice(idx, j + 1); }
  }
  return null;
}

export function parseKicadSch(text: string): KicadSchResult {
  const libSymbols: Record<string, string> = {};
  const refToLibId: Record<string, string> = {};
  const instances: SchInstance[] = [];
  const wires: [number, number][][] = [];
  const junctions: [number, number][] = [];
  const labels: { text: string; x: number; y: number; rot: number }[] = [];
  const noConnects: [number, number][] = [];

  // ── 1. lib_symbols 区块内的符号定义 ──
  const libIdx = text.indexOf('(lib_symbols');
  if (libIdx >= 0) {
    const libBlock = balancedBlock(text, libIdx);
    if (libBlock) {
      // 区块内逐个顶层 (symbol "Lib:Name" …)
      let pos = '(lib_symbols'.length;
      while (pos < libBlock.length) {
        const i = libBlock.indexOf('(symbol "', pos);
        if (i < 0) break;
        const block = balancedBlock(libBlock, i);
        if (!block) break;
        const m = block.match(/^\(symbol "([^"]+)"/);
        if (m) libSymbols[m[1]] = block;
        pos = i + block.length;
      }
    }
  }

  // ── 2. 器件实例：(symbol (lib_id "X") … (property "Reference" "D22") ──
  // 全文扫描（不依赖 lib_symbols 块配平）；定义块特征是 '(symbol "'，实例块是 '(symbol (' 
  let pos = 0;
  while (pos < text.length) {
    const i = text.indexOf('(symbol', pos);
    if (i < 0) break;
    // 跳过定义式（(symbol "…"）
    const after = text.slice(i + 7, i + 12);
    if (/^\s*"/.test(after)) { pos = i + 7; continue; }
    const block = balancedBlock(text, i);
    if (!block) break;
    const lid = block.match(/\(lib_id\s+"([^"]+)"/)?.[1];
    const ref = block.match(/\(property\s+"Reference"\s+"([^"]+)"/)?.[1];
    if (lid && ref) {
      const at = block.match(/\(at\s+([-\d.]+)\s+([-\d.]+)(?:\s+([-\d.]+))?\)/);
      const mirror = block.match(/\(mirror\s+([xy])\)/)?.[1];
      const unit = block.match(/\(unit\s+(\d+)\)/)?.[1];
      if (at) {
        instances.push({ ref, libId: lid, x: parseFloat(at[1]), y: parseFloat(at[2]), rot: at[3] ? parseFloat(at[3]) : 0, mirror, unit: unit ? parseInt(unit, 10) : undefined });
      }
      if (!ref.startsWith('#') && !lid.startsWith('power:')) refToLibId[ref] = lid;
    }
    pos = i + block.length;
  }

  // ── 3. 连线 / 结点 / 标签 / no_connect ──
  for (const m of text.matchAll(/\(wire\s*\(pts\s*((?:\(xy\s+[-\d.]+\s+[-\d.]+\)\s*)+)\)/g)) {
    const pts = [...m[1].matchAll(/\(xy\s+([-\d.]+)\s+([-\d.]+)\)/g)].map((q) => [parseFloat(q[1]), parseFloat(q[2])] as [number, number]);
    if (pts.length >= 2) wires.push(pts);
  }
  for (const m of text.matchAll(/\(junction\s*\(at\s+([-\d.]+)\s+([-\d.]+)\)/g)) junctions.push([parseFloat(m[1]), parseFloat(m[2])]);
  for (const m of text.matchAll(/\((?:global_)?label\s+"((?:[^"\\]|\\.)*)"\s*(?:\(shape[^)]*\)\s*)?\(at\s+([-\d.]+)\s+([-\d.]+)(?:\s+([-\d.]+))?\)/g)) {
    labels.push({ text: m[1], x: parseFloat(m[2]), y: parseFloat(m[3]), rot: m[4] ? parseFloat(m[4]) : 0 });
  }
  for (const m of text.matchAll(/\(no_connect\s*\(at\s+([-\d.]+)\s+([-\d.]+)\)/g)) noConnects.push([parseFloat(m[1]), parseFloat(m[2])]);

  return { libSymbols, refToLibId, instances, wires, junctions, labels, noConnects };
}

/** 符号定义块 → 原始 mm 几何（原点保持，供原理图原样渲染做实例变换） */
export interface RawSymGeom {
  polys: { x: number; y: number }[][];
  rects: { x1: number; y1: number; x2: number; y2: number }[];
  circles: { cx: number; cy: number; r: number }[];
  arcs: { x1: number; y1: number; xm: number; ym: number; x2: number; y2: number }[];
  pins: { x: number; y: number; ex: number; ey: number; number: string }[];
}

const rawGeomCache = new Map<string, RawSymGeom>();

export function rawSymbolGeom(block: string): RawSymGeom {
  const hit = rawGeomCache.get(block);
  if (hit) return hit;
  const g: RawSymGeom = { polys: [], rects: [], circles: [], arcs: [], pins: [] };
  const nums = (mm: RegExpMatchArray, a: number, b: number): [number, number] => [parseFloat(mm[a]), parseFloat(mm[b])];
  for (const m of block.matchAll(/\(polyline\s*\(pts\s*((?:\(xy\s+[-\d.]+\s+[-\d.]+\)\s*)+)\)/g)) {
    const pts = [...m[1].matchAll(/\(xy\s+([-\d.]+)\s+([-\d.]+)\)/g)].map((q) => ({ x: parseFloat(q[1]), y: parseFloat(q[2]) }));
    if (pts.length >= 2) g.polys.push(pts);
  }
  for (const m of block.matchAll(/\(rectangle\s*\(start\s+([-\d.]+)\s+([-\d.]+)\)\s*\(end\s+([-\d.]+)\s+([-\d.]+)\)/g)) {
    const [x1, y1] = nums(m, 1, 2), [x2, y2] = nums(m, 3, 4);
    g.rects.push({ x1, y1, x2, y2 });
  }
  for (const m of block.matchAll(/\(circle\s*\(center\s+([-\d.]+)\s+([-\d.]+)\)\s*\(radius\s+([-\d.]+)\)/g)) {
    g.circles.push({ cx: parseFloat(m[1]), cy: parseFloat(m[2]), r: parseFloat(m[3]) });
  }
  for (const m of block.matchAll(/\(arc\s*\(start\s+([-\d.]+)\s+([-\d.]+)\)\s*\(mid\s+([-\d.]+)\s+([-\d.]+)\)\s*\(end\s+([-\d.]+)\s+([-\d.]+)\)/g)) {
    const [x1, y1] = nums(m, 1, 2), [xm, ym] = nums(m, 3, 4), [x2, y2] = nums(m, 5, 6);
    g.arcs.push({ x1, y1, xm, ym, x2, y2 });
  }
  for (const m of block.matchAll(/\(pin\s+\w+\s+\w+\s*\(at\s+([-\d.]+)\s+([-\d.]+)(?:\s+([-\d.]+))?\)\s*\(length\s+([-\d.]+)\)[\s\S]{0,400}?\(number\s+"([^"]*)"/g)) {
    const x = parseFloat(m[1]), y = parseFloat(m[2]), ang = m[3] ? parseFloat(m[3]) : 0, len = parseFloat(m[4]);
    const rad = (ang * Math.PI) / 180;
    g.pins.push({ x, y, ex: x + Math.cos(rad) * len, ey: y + Math.sin(rad) * len, number: m[5] });
  }
  rawGeomCache.set(block, g);
  return g;
}
