/**
 * modules/board-editor/BoardView3D.tsx
 * 3D 板视图 —— 以板中心为轴旋转，CSS perspective，板不会被裁切。
 * 左键拖拽旋转，滚轮缩放。仅查看。
 */
import { useState, useRef } from 'react';
import { useDesignStore } from '../../state/designStore';
import { PX_PER_MM, footprintBodyRect } from '../../design-core/geometry';
import { CATEGORY_DISPLAY } from '../../shared/theme';

export function BoardView3D() {
  const doc = useDesignStore((s) => s.doc);
  const [rot, setRot] = useState({ x: 48, z: -12 });
  const [scale, setScale] = useState(1);
  const rotRef = useRef({ active: false, sx: 0, sy: 0, rx: 48, rz: -12 });

  const bw = doc.board.widthMm * PX_PER_MM;
  const bh = doc.board.heightMm * PX_PER_MM;
  const pad = 40;

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    rotRef.current = { active: true, sx: e.clientX, sy: e.clientY, rx: rot.x, rz: rot.z };
    const onMM = (ev: MouseEvent) => {
      if (!rotRef.current.active) return;
      setRot({ x: Math.max(10, Math.min(80, rotRef.current.rx - (ev.clientY - rotRef.current.sy) * 0.3)), z: rotRef.current.rz + (ev.clientX - rotRef.current.sx) * 0.3 });
    };
    const onMU = () => { rotRef.current.active = false; window.removeEventListener('mousemove', onMM); window.removeEventListener('mouseup', onMU); };
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
  };

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#1a2332,#0c1520)', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1600px', cursor: 'grab' }}
      onMouseDown={onDown}
      onWheel={(e) => { setScale((s) => Math.min(3, Math.max(0.4, s * (e.deltaY > 0 ? 0.9 : 1.1)))); }}>
      <svg width={bw + pad * 2} height={bh + pad * 2} viewBox={`${-pad} ${-pad} ${bw + pad * 2} ${bh + pad * 2}`}
        style={{ overflow: 'visible', transform: `scale(${scale}) rotateX(${rot.x}deg) rotateZ(${rot.z}deg)`, transformOrigin: 'center', transition: rotRef.current.active ? 'none' : 'transform .2s' }}>
        <BoardShape3D shape={doc.board.shape} w={bw} h={bh} />
        <text x={bw / 2} y={-12} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="#86efac">{doc.board.widthMm}mm × {doc.board.heightMm}mm</text>
        <g style={{ pointerEvents: 'none' }}>
          {doc.components.map((c) => {
            const body = footprintBodyRect(c.footprint.geometry, { x: c.placement.xMm, y: c.placement.yMm }, c.placement.rotation);
            const disp = CATEGORY_DISPLAY[c.category];
            const x = body.x * PX_PER_MM, y = body.y * PX_PER_MM;
            const w = Math.max(16, body.width * PX_PER_MM), h = Math.max(12, body.height * PX_PER_MM);
            return (
              <g key={c.instanceId} transform={`translate(${x},${y})`}>
                <rect width={w} height={h} rx={2} fill={disp.color} fillOpacity={0.9} stroke="#000" strokeWidth={0.5} style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.5))' }} />
                <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={6} fontWeight={700} fill="#fff">{c.reference}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', padding: '5px 14px', borderRadius: 16, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(134,239,172,.25)', color: '#86efac', fontSize: 11, fontWeight: 600, pointerEvents: 'none' }}>
        🖱 拖拽旋转 · 滚轮缩放 ｜ 俯仰 {Math.round(rot.x)}° · {Math.round(scale * 100)}%
      </div>
      <button onClick={() => { setRot({ x: 48, z: -12 }); setScale(1); }} style={{ position: 'absolute', bottom: 12, right: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(134,239,172,.3)', background: 'rgba(255,255,255,.08)', color: '#86efac', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>⟳ 复位视角</button>
    </div>
  );
}

function BoardShape3D({ shape, w, h }: { shape: string; w: number; h: number }) {
  const fill = '#0f5132', stroke = '#4ade80';
  const sh: React.CSSProperties = { filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.55))' };
  if (shape === 'circle') return <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} fill={fill} stroke={stroke} strokeWidth={2.5} style={sh} />;
  if (shape === 'lshape') { const cw = w * 0.45, ch = h * 0.4; return <path d={`M0,0 H${w} V${h - ch} H${w - cw} V${h} H0 Z`} fill={fill} stroke={stroke} strokeWidth={2.5} style={sh} />; }
  return <rect x={0} y={0} width={w} height={h} rx={shape === 'rounded' ? 18 : 6} fill={fill} stroke={stroke} strokeWidth={2.5} style={sh} />;
}
