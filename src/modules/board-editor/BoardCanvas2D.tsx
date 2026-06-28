/**
 * modules/board-editor/BoardCanvas2D.tsx
 * 2D 画布：渲染板框 + 器件（带丝印），支持拖拽/选中/缩放/平移。
 * 坐标系：板坐标(mm) → 像素用 PX_PER_MM。
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { useDesignStore } from '../../state/designStore';
import { PX_PER_MM, footprintBodyRect } from '../../design-core/geometry';
import { CATEGORY_DISPLAY } from '../../shared/theme';
import type { PlacedComponent } from '../../design-core/document/types';

const ORIGIN = { x: 60, y: 40 }; // 板框左上角在 svg 中的像素偏移

export function BoardCanvas2D() {
  const doc = useDesignStore((s) => s.doc);
  const selectedId = useDesignStore((s) => s.selectedId);
  const multiSel = useDesignStore((s) => s.multiSel);
  const overlaps = useDesignStore((s) => s.overlaps);
  const select = useDesignStore((s) => s.select);
  const toggleMulti = useDesignStore((s) => s.toggleMulti);
  const move = useDesignStore((s) => s.moveComponent);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0, moved: false });
  const dragRef = useRef({ active: false, id: '', sx: 0, sy: 0, startX: 0, startY: 0 });

  const bw = doc.board.widthMm * PX_PER_MM;
  const bh = doc.board.heightMm * PX_PER_MM;

  // wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => {
        const next = Math.min(5, Math.max(0.2, prev * delta));
        setPan((p) => ({ x: mx - (mx - p.x) * (next / prev), y: my - (my - p.y) * (next / prev) }));
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // global mouse for drag/pan
  useEffect(() => {
    const onMM = (e: MouseEvent) => {
      if (dragRef.current.active) {
        const d = dragRef.current;
        const dxMm = (e.clientX - d.sx) / zoom / PX_PER_MM;
        const dyMm = (e.clientY - d.sy) / zoom / PX_PER_MM;
        move(d.id, d.startX + dxMm, d.startY + dyMm);
      } else if (panRef.current.active) {
        const dx = e.clientX - panRef.current.sx, dy = e.clientY - panRef.current.sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panRef.current.moved = true;
        setPan({ x: panRef.current.px + dx, y: panRef.current.py + dy });
      }
    };
    const onMU = () => { dragRef.current.active = false; panRef.current.active = false; };
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    return () => { window.removeEventListener('mousemove', onMM); window.removeEventListener('mouseup', onMU); };
  }, [zoom, move]);

  const onCompDown = useCallback((e: React.MouseEvent, c: PlacedComponent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) { toggleMulti(c.instanceId); return; }
    select(c.instanceId);
    dragRef.current = { active: true, id: c.instanceId, sx: e.clientX, sy: e.clientY, startX: c.placement.xMm, startY: c.placement.yMm };
  }, [select, toggleMulti]);

  const onBgDown = (e: React.MouseEvent) => {
    if (e.button === 0) panRef.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false };
  };
  const onBgClick = () => { if (!panRef.current.moved) select(null); };

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#F8F9FA' }}>
      <svg width="100%" height="100%" onMouseDown={onBgDown} onClick={onBgClick}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth=".5" /></pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          <BoardOutline shape={doc.board.shape} x={ORIGIN.x} y={ORIGIN.y} w={bw} h={bh} />
          <text x={ORIGIN.x + bw / 2} y={ORIGIN.y - 8} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#6b7280">
            {doc.board.widthMm}mm × {doc.board.heightMm}mm
          </text>
          {doc.components.map((c) => (
            <ComponentGlyph key={c.instanceId} comp={c}
              selected={selectedId === c.instanceId}
              multi={multiSel.includes(c.instanceId)}
              overlap={overlaps.has(c.instanceId)}
              onMouseDown={(e) => onCompDown(e, c)} />
          ))}
          {doc.components.length === 0 && (
            <text x={ORIGIN.x + bw / 2} y={ORIGIN.y + bh / 2} textAnchor="middle" fontSize={12} fill="#94a3b8">从左侧添加器件，自动按电气规则摆放</text>
          )}
        </g>
      </svg>
      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(255,255,255,.92)', borderRadius: 8, padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: 11 }}>
        <button onClick={() => setZoom((z) => Math.max(0.2, z * 0.8))} style={zbtn}>−</button>
        <span onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ minWidth: 42, textAlign: 'center', fontWeight: 600, cursor: 'pointer' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z * 1.25))} style={zbtn}>+</button>
      </div>
    </div>
  );
}

const zbtn: React.CSSProperties = { width: 24, height: 24, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#475569' };

function BoardOutline({ shape, x, y, w, h }: { shape: string; x: number; y: number; w: number; h: number }) {
  const fill = '#f8fdf9', stroke = '#2D5F3F';
  if (shape === 'circle') {
    const r = Math.min(w, h) / 2;
    return <circle cx={x + w / 2} cy={y + h / 2} r={r} fill={fill} stroke={stroke} strokeWidth={2} />;
  }
  if (shape === 'lshape') {
    const cutW = w * 0.45, cutH = h * 0.4;
    return <path d={`M${x},${y} H${x + w} V${y + h - cutH} H${x + w - cutW} V${y + h} H${x} Z`} fill={fill} stroke={stroke} strokeWidth={2} />;
  }
  return <rect x={x} y={y} width={w} height={h} rx={shape === 'rounded' ? 18 : 6} fill={fill} stroke={stroke} strokeWidth={2} />;
}

function ComponentGlyph({ comp, selected, multi, overlap, onMouseDown }: {
  comp: PlacedComponent; selected: boolean; multi: boolean; overlap: boolean; onMouseDown: (e: React.MouseEvent) => void;
}) {
  const disp = CATEGORY_DISPLAY[comp.category];
  const body = footprintBodyRect(comp.footprint.geometry, { x: comp.placement.xMm, y: comp.placement.yMm }, comp.placement.rotation);
  // px
  const px = ORIGIN.x + body.x * PX_PER_MM;
  const py = ORIGIN.y + body.y * PX_PER_MM;
  const pw = Math.max(20, body.width * PX_PER_MM);
  const ph = Math.max(14, body.height * PX_PER_MM);
  const stroke = overlap ? '#ef4444' : selected ? '#2563eb' : '#94a3b8';

  return (
    <g transform={`translate(${px},${py})`} onMouseDown={onMouseDown} onClick={(e) => e.stopPropagation()} style={{ cursor: 'grab' }}>
      {multi && <rect x={-5} y={-5} width={pw + 10} height={ph + 10} rx={4} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" />}
      <rect width={pw} height={ph} rx={3} fill={overlap ? '#fff5f5' : '#fff'} stroke={stroke} strokeWidth={selected || overlap ? 2 : 1} strokeDasharray={overlap ? '4 2' : undefined} />
      <text x={pw / 2} y={-5} textAnchor="middle" fontSize={8} fontFamily="monospace" fontWeight={700} fill={disp.color}>{comp.reference}</text>
      <text x={pw / 2} y={ph / 2} textAnchor="middle" dominantBaseline="middle" fontSize={pw > 60 ? 8 : 6.5} fontFamily="monospace" fontWeight={700} fill="#1e293b">
        {comp.mpn.length > 14 ? comp.mpn.slice(0, 12) + '..' : comp.mpn}
      </text>
      <text x={pw / 2} y={ph / 2 + 10} textAnchor="middle" fontSize={6} fontFamily="monospace" fill="#94a3b8">{comp.footprint.name}</text>
    </g>
  );
}

export { ORIGIN };
