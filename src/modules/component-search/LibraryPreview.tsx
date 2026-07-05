/**
 * modules/component-search/LibraryPreview.tsx
 * 器件 PCB 设计库文件预览 —— 原理图符号 / PCB封装 / 3D模型，可预览可下载。
 * 符号与封装为 SVG（可下载）；3D 为参数化 Three.js 模型（截图下载在 3D 视图中进行）。
 */
import { useMemo } from 'react';
import type { PlacedComponent } from '../../design-core/document/types';
import { symbolFor } from '../schematic/symbols';
import { padFootprintFor } from '../../design-core/geometry/footprint-pads';
import { PX_PER_MM } from '../../design-core/geometry';
import { COLORS } from '../../shared/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildKicadMod, buildKicadSym, downloadText } from './kicadExport';

function downloadSvg(svgMarkup: string, filename: string) {
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svgMarkup], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function LibraryPreview({ c }: { c: PlacedComponent }) {
  const sym = useMemo(() => symbolFor(c), [c.componentId]);
  const pads = padFootprintFor(c.footprint.name);

  // 符号 SVG（含边距）；fit=true 用于面板内自适应预览，false 用于下载原尺寸
  const makeSymSvg = (fit: boolean) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={sym.w + 60} height={sym.h + 50} viewBox={`-30 -25 ${sym.w + 60} ${sym.h + 50}`}
      style={fit ? { maxWidth: '100%', maxHeight: 120, height: 'auto' } : undefined}>
      <rect x={-30} y={-25} width={sym.w + 60} height={sym.h + 50} fill="#fffef9" />
      {sym.render(c.reference, c.mpn)}
    </svg>
  );

  // 封装 SVG
  const makeFpSvg = (fit: boolean) => pads ? (() => {
    const halfW = Math.max(...pads.pads.map((p) => Math.abs(p.x) + p.w / 2), pads.bodyW / 2) * PX_PER_MM + 10;
    const halfH = Math.max(...pads.pads.map((p) => Math.abs(p.y) + p.h / 2), pads.bodyH / 2) * PX_PER_MM + 10;
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={halfW * 2} height={halfH * 2} viewBox={`${-halfW} ${-halfH} ${halfW * 2} ${halfH * 2}`}
        style={fit ? { maxWidth: '100%', maxHeight: 120, height: 'auto' } : undefined}>
        <rect x={-halfW} y={-halfH} width={halfW * 2} height={halfH * 2} fill="#f0f9f4" />
        <rect x={-pads.bodyW * PX_PER_MM / 2} y={-pads.bodyH * PX_PER_MM / 2} width={pads.bodyW * PX_PER_MM} height={pads.bodyH * PX_PER_MM} rx={2} fill="none" stroke="#1a6b3c" strokeWidth={1} />
        {pads.pads.map((p, i) => (
          <rect key={i} x={(p.x - p.w / 2) * PX_PER_MM} y={(p.y - p.h / 2) * PX_PER_MM} width={p.w * PX_PER_MM} height={p.h * PX_PER_MM} rx={p.round ? p.w * PX_PER_MM / 2 : 0.8} fill="#c08a2d" stroke="#8a6420" strokeWidth={0.3} />
        ))}
        {pads.pin1 && <circle cx={pads.pin1.x * PX_PER_MM} cy={pads.pin1.y * PX_PER_MM} r={1.8} fill="#dc2626" />}
      </svg>
    );
  })() : null;

  const symSvg = makeSymSvg(true);
  const fpSvg = makeFpSvg(true);

  const dl = (node: React.ReactElement | null, name: string) => {
    if (!node) return;
    downloadSvg(renderToStaticMarkup(node), name);
  };

  return (
    <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, marginBottom: 8 }}>📚 PCB 设计库文件</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={cell}>
          <div style={cellTitle}>原理图符号</div>
          <div style={preview}>{symSvg}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => downloadText(buildKicadSym(c), `${c.mpn}.kicad_sym`)} style={{ ...dlBtn, flex: 1 }}>⬇ .kicad_sym</button>
            <button onClick={() => dl(makeSymSvg(false), `${c.mpn}-symbol.svg`)} style={{ ...dlBtn, flex: 1 }}>⬇ SVG</button>
          </div>
        </div>
        <div style={cell}>
          <div style={cellTitle}>PCB 封装</div>
          <div style={preview}>{fpSvg ?? <span style={{ fontSize: 10, color: '#94a3b8' }}>无焊盘数据</span>}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => { const m = buildKicadMod(c); if (m) downloadText(m, `${c.footprint.name}.kicad_mod`); }} disabled={!fpSvg} style={{ ...dlBtn, flex: 1, opacity: fpSvg ? 1 : 0.5 }}>⬇ .kicad_mod</button>
            <button onClick={() => dl(makeFpSvg(false), `${c.footprint.name}-footprint.svg`)} disabled={!fpSvg} style={{ ...dlBtn, flex: 1, opacity: fpSvg ? 1 : 0.5 }}>⬇ SVG</button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, padding: '8px', borderRadius: 8, background: '#fff', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>3D 模型 (STEP)</div>
          <div style={{ fontSize: 9.5, color: '#94a3b8' }}>当前为参数化模型（3D视图预览）；STEP 需 ezPLM 关联真实模型文件</div>
        </div>
        <button disabled title="接入 ezPLM 元器件库后可下载真实 STEP" style={{ ...dlBtn, opacity: 0.45, cursor: 'not-allowed', padding: '4px 10px' }}>⬇ .step</button>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #f1f5f9', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 };
const cellTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#475569' };
const preview: React.CSSProperties = { minHeight: 70, maxHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fafafa', borderRadius: 6, padding: 4 };
const dlBtn: React.CSSProperties = { fontSize: 10, padding: '4px 0', borderRadius: 5, border: '1px solid #c6e2d0', background: '#f0f9f4', color: '#1f5c3b', fontWeight: 700, cursor: 'pointer' };
