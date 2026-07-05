/**
 * modules/schematic/symbols.tsx
 * KiCad 风格原理图符号 —— 按器件类别/族绘制标准符号。
 * 视觉贴近 KiCad 符号库（电阻锯齿、电容双板、LDO 三端、IC 带引脚名等）。
 * 正式版可由 ezPLM 返回 .kicad_sym 解析结果替换，接口保持「给定器件 → 返回符号图元」。
 */
import type { PlacedComponent } from '../../design-core/document/types';

const STROKE = '#334155';
const PIN = '#7c2d12';
const FILL = '#fffef7';

export interface SymbolDef {
  /** 符号包围盒（相对锚点左上角） */
  w: number;
  h: number;
  /** 连接端口（相对符号左上角），供连线吸附 */
  ports: { x: number; y: number; name?: string }[];
  render: (refDes: string, label: string) => React.ReactNode;
}

/** 电阻：KiCad 锯齿符号 */
function resistor(): SymbolDef {
  const w = 60, h = 20;
  const zig = 'M0,10 L8,10 L12,3 L20,17 L28,3 L36,17 L44,3 L48,10 L60,10';
  return {
    w, h, ports: [{ x: 0, y: 10 }, { x: 60, y: 10 }],
    render: (ref, label) => (
      <g>
        <path d={zig} fill="none" stroke={STROKE} strokeWidth={1.5} />
        <text x={w / 2} y={-4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{ref}</text>
        <text x={w / 2} y={h + 12} textAnchor="middle" fontSize={8} fill="#334155" fontFamily="monospace">{label}</text>
      </g>
    ),
  };
}

/** 电容：两平行板 */
function capacitor(): SymbolDef {
  const w = 45, h = 20;
  return {
    w, h, ports: [{ x: 0, y: 10 }, { x: 45, y: 10 }],
    render: (ref, label) => (
      <g>
        <line x1={0} y1={10} x2={19} y2={10} stroke={STROKE} strokeWidth={1.5} />
        <line x1={19} y1={0} x2={19} y2={20} stroke={STROKE} strokeWidth={2.2} />
        <line x1={25} y1={0} x2={25} y2={20} stroke={STROKE} strokeWidth={2.2} />
        <line x1={25} y1={10} x2={45} y2={10} stroke={STROKE} strokeWidth={1.5} />
        <text x={w / 2} y={-4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{ref}</text>
        <text x={w / 2} y={h + 10} textAnchor="middle" fontSize={8} fill="#334155" fontFamily="monospace">{label}</text>
      </g>
    ),
  };
}

/** 电感：四个半圆弧 */
function inductor(): SymbolDef {
  const w = 60, h = 16;
  const arc = 'M6,10 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0';
  return {
    w, h, ports: [{ x: 0, y: 10 }, { x: 60, y: 10 }],
    render: (ref, label) => (
      <g>
        <line x1={0} y1={10} x2={6} y2={10} stroke={STROKE} strokeWidth={1.5} />
        <path d={arc} fill="none" stroke={STROKE} strokeWidth={1.5} />
        <line x1={54} y1={10} x2={60} y2={10} stroke={STROKE} strokeWidth={1.5} />
        <text x={w / 2} y={-4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{ref}</text>
        <text x={w / 2} y={h + 10} textAnchor="middle" fontSize={8} fill="#334155" fontFamily="monospace">{label}</text>
      </g>
    ),
  };
}

/** LDO 稳压器：三端方框 IN / OUT / GND */
function regulator(): SymbolDef {
  const w = 90, h = 55;
  return {
    w, h, ports: [{ x: 0, y: 15, name: 'IN' }, { x: 90, y: 15, name: 'OUT' }, { x: 45, y: 55, name: 'GND' }],
    render: (ref, label) => (
      <g>
        <rect width={w} height={h} rx={2} fill={FILL} stroke={STROKE} strokeWidth={1.8} />
        {/* pins */}
        <line x1={-10} y1={15} x2={0} y2={15} stroke={PIN} strokeWidth={1.4} />
        <line x1={w} y1={15} x2={w + 10} y2={15} stroke={PIN} strokeWidth={1.4} />
        <line x1={45} y1={h} x2={45} y2={h + 10} stroke={PIN} strokeWidth={1.4} />
        <text x={6} y={19} fontSize={7} fill={PIN} fontFamily="monospace">IN</text>
        <text x={w - 6} y={19} textAnchor="end" fontSize={7} fill={PIN} fontFamily="monospace">OUT</text>
        <text x={48} y={h - 4} fontSize={7} fill={PIN} fontFamily="monospace">GND</text>
        <text x={w / 2} y={-4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{ref}</text>
        <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={600} fill="#334155" fontFamily="monospace">{label.length > 12 ? label.slice(0, 11) + '..' : label}</text>
      </g>
    ),
  };
}

/** IC / MCU：方框 + 左右引脚桩 + 引脚名 */
function ic(pinsPerSide: number, pinNames?: { left: string[]; right: string[] }): SymbolDef {
  const pitch = 20, pad = 15;
  const h = Math.max(70, pad * 2 + (pinsPerSide - 1) * pitch);
  const w = 120;
  const ports: { x: number; y: number }[] = [];
  for (let i = 0; i < pinsPerSide; i++) { ports.push({ x: 0, y: pad + i * pitch }); ports.push({ x: w, y: pad + i * pitch }); }
  return {
    w, h, ports,
    render: (ref, label) => (
      <g>
        <rect width={w} height={h} rx={2} fill={FILL} stroke={STROKE} strokeWidth={1.8} />
        {Array.from({ length: pinsPerSide }).map((_, i) => (
          <g key={i}>
            <line x1={-10} y1={pad + i * pitch} x2={0} y2={pad + i * pitch} stroke={PIN} strokeWidth={1.4} />
            <line x1={w} y1={pad + i * pitch} x2={w + 10} y2={pad + i * pitch} stroke={PIN} strokeWidth={1.4} />
            {pinNames?.left[i] && <text x={4} y={pad + i * pitch + 3} fontSize={6.5} fill={PIN} fontFamily="monospace">{pinNames.left[i]}</text>}
            {pinNames?.right[i] && <text x={w - 4} y={pad + i * pitch + 3} textAnchor="end" fontSize={6.5} fill={PIN} fontFamily="monospace">{pinNames.right[i]}</text>}
          </g>
        ))}
        <text x={w / 2} y={-4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{ref}</text>
        <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={600} fill="#334155" fontFamily="monospace">{label.length > 14 ? label.slice(0, 12) + '..' : label}</text>
      </g>
    ),
  };
}

/** 连接器：方框 + 右侧引脚 */
function connector(pins: number): SymbolDef {
  const pitch = 15, pad = 10;
  const h = Math.max(50, pad * 2 + (pins - 1) * pitch);
  const w = 70;
  const ports = Array.from({ length: pins }).map((_, i) => ({ x: w, y: pad + i * pitch }));
  return {
    w, h, ports,
    render: (ref, label) => (
      <g>
        <rect width={w} height={h} rx={2} fill={FILL} stroke={STROKE} strokeWidth={1.8} />
        {Array.from({ length: pins }).map((_, i) => (
          <g key={i}>
            <line x1={w} y1={pad + i * pitch} x2={w + 10} y2={pad + i * pitch} stroke={PIN} strokeWidth={1.4} />
            <text x={w - 5} y={pad + i * pitch + 3} textAnchor="end" fontSize={6.5} fill={PIN} fontFamily="monospace">{i + 1}</text>
          </g>
        ))}
        <text x={w / 2} y={-4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{ref}</text>
        <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontSize={8} fontWeight={600} fill="#334155" fontFamily="monospace">{label.length > 12 ? label.slice(0, 11) + '..' : label}</text>
      </g>
    ),
  };
}

/** 根据器件选符号 */
export function symbolFor(c: PlacedComponent): SymbolDef {
  const fam = c.display?.family ?? '';
  if (c.category === 'passive') {
    if (fam === 'MLCC' || fam.includes('Cap')) return capacitor();
    if (fam.includes('Induct')) return inductor();
    return resistor();
  }
  if (c.category === 'power') {
    if (fam === 'LDO') return regulator();
    return regulator(); // Buck 也用三端框（简化）
  }
  if (c.category === 'connector') {
    if (fam.includes('USB')) return connector(4);
    return connector(Math.min(6, Math.max(2, Math.ceil((c.display?.pins ?? 4) / 2))));
  }
  // mcu / ic
  if (c.category === 'mcu') {
    return ic(4, { left: ['VDD', 'GND', 'PA0', 'PA1'], right: ['SWD', 'TX', 'RX', 'RST'] });
  }
  if (fam.includes('USB-UART') || fam.includes('UART')) {
    return ic(3, { left: ['VCC', 'D+', 'D-'], right: ['TXD', 'RXD', 'GND'] });
  }
  if (fam.includes('Flash')) {
    return ic(3, { left: ['CS', 'CLK', 'DI'], right: ['DO', 'VCC', 'GND'] });
  }
  if (fam.includes('CAN')) {
    return ic(3, { left: ['TXD', 'RXD', 'VCC'], right: ['CANH', 'CANL', 'GND'] });
  }
  return ic(3, { left: ['1', '2', '3'], right: ['4', '5', '6'] });
}
