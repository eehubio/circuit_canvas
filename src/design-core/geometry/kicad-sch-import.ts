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

export interface KicadSchResult {
  /** libId → 符号定义块原文（顶层 (symbol "Lib:Name" …)） */
  libSymbols: Record<string, string>;
  /** 器件实例：位号 → libId（跳过电源符号 #PWR / power:*） */
  refToLibId: Record<string, string>;
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

  // ── 2. 器件实例：顶层 (symbol (lib_id "X") … (property "Reference" "D22") ──
  // 实例块的特征：'(symbol' 后跟的不是名字字符串（区别于定义块）
  let pos = libIdx >= 0 ? libIdx + (balancedBlock(text, libIdx)?.length ?? 0) : 0;
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
    if (lid && ref && !ref.startsWith('#') && !lid.startsWith('power:')) {
      refToLibId[ref] = lid;
    }
    pos = i + block.length;
  }

  return { libSymbols, refToLibId };
}
