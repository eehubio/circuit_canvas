/**
 * 器件功能归属与信号流排序 —— 服务两处自动布局：
 *  1. PCB 放置：辅助器件（去耦电容/上拉电阻/晶振负载电容…）锚定到所属核心器件旁
 *  2. 原理图：核心器件按信号流（输入→电源→主控→外设→输出）排列，阻容跟随各自核心
 *
 * 归属判定 = 关键词规则（描述/型号中的功能线索） + 方案顺序兜底（AI 输出通常
 * 把辅件紧跟在所属核心之后列出）。
 */
import type { ComponentCategory } from '../document/types';

export interface AffinityItem {
  reference: string;
  category: ComponentCategory;
  mpn: string;
  description?: string;
}

const CORE_CATS: ComponentCategory[] = ['mcu', 'power', 'ic', 'sensor', 'rf', 'connector'];

export function isCore(c: { category: ComponentCategory }): boolean {
  return CORE_CATS.includes(c.category);
}

/** 信号流序：数值越小越靠左。输入接口 → 电源 → 主控 → 外设 IC → 输出/其他接口 */
export function signalFlowRank(c: AffinityItem): number {
  const hay = `${c.mpn} ${c.description ?? ''}`;
  if (c.category === 'connector') {
    if (/USB|电源输入|DC|输入|IN\b|供电/i.test(hay)) return 0;
    if (/输出|OUT\b|显示|屏/i.test(hay)) return 4;
    return 4; // 其余接口默认放输出侧
  }
  if (c.category === 'power') return 1;
  if (c.category === 'mcu') return 2;
  if (c.category === 'ic' || c.category === 'sensor' || c.category === 'rf') return 3;
  return 5;
}

/** 辅件 → 核心归属：返回 aux.reference → core.reference */
export function resolveAffinity(items: AffinityItem[]): Record<string, string> {
  const cores = items.filter(isCore);
  if (!cores.length) return {};
  const mcu = cores.find((c) => c.category === 'mcu');
  const powerCore = cores.find((c) => c.category === 'power');
  const usbConn = cores.find((c) => c.category === 'connector' && /USB/i.test(`${c.mpn} ${c.description ?? ''}`));

  const out: Record<string, string> = {};
  items.forEach((it, idx) => {
    if (isCore(it)) return;
    const hay = `${it.mpn} ${it.description ?? ''}`;

    // ── 关键词规则（优先级从高到低） ──
    let core: AffinityItem | undefined;
    // 型号词干直指某核心（描述里出现核心型号前 4+ 位）
    core = cores.find((cr) => cr.mpn.length >= 4 && hay.toUpperCase().includes(cr.mpn.slice(0, Math.min(8, cr.mpn.length)).toUpperCase()));
    if (!core && /晶振|CRYSTAL|XTAL|负载电容|OSC/i.test(hay)) core = mcu;
    if (!core && /USB|VBUS|CC1|CC2|D\+|D-/i.test(hay)) core = usbConn ?? mcu;
    if (!core && /LDO|稳压|电源(滤波|输入|输出)|VIN|降压|升压|BUCK|BOOST/i.test(hay)) core = powerCore ?? mcu;
    if (!core && /去耦|退耦|DECOUPL|BYPASS|VDD|VCC滤波/i.test(hay)) core = mcu ?? powerCore;
    if (!core && /上拉|下拉|I2C|SDA|SCL|复位|RESET|BOOT|SWD/i.test(hay)) core = mcu;

    // ── 顺序兜底：方案列表中最近的前置核心 ──
    if (!core) {
      for (let j = idx - 1; j >= 0; j--) if (isCore(items[j])) { core = items[j]; break; }
    }
    if (!core) core = mcu ?? cores[0];
    out[it.reference] = core.reference;
  });
  return out;
}
