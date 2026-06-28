/**
 * modules/schematic/SchematicPanel.tsx
 * 原理图 —— 自动从器件生成 + 可编辑（拖符号、加删改网络）+ 全屏。
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDesignStore } from '../../state/designStore';
import type { PlacedComponent } from '../../design-core/document/types';

interface Net { id: string; from: string; to: string; label: string; color: string; }

let netCounter = 0;
const nid = () => `net_${++netCounter}_${Date.now()}`;

export function SchematicPanel({ isFullscreen, onToggleFullscreen }: { isFullscreen?: boolean; onToggleFullscreen?: () => void }) {
  const items = useDesignStore((s) => s.doc.components);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [nets, setNets] = useState<Net[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const dragRef = useRef({ active: false, iid: '', sx: 0, sy: 0, startX: 0, startY: 0 });

  const autoLayout = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    const cats: Record<string, PlacedComponent[]> = {};
    items.forEach((i) => { (cats[i.category] = cats[i.category] || []).push(i); });
    const colX: Record<string, number> = { connector: 40, power: 200, mcu: 380, ic: 600, passive: 380 };
    Object.entries(cats).forEach(([cat, list]) => list.forEach((c, i) => { out[c.instanceId] = { x: colX[cat] ?? 380, y: cat === 'passive' ? 230 + i * 50 : 40 + i * 95 }; }));
    return out;
  }, [items]);

  const P = useCallback((iid: string) => pos[iid] || autoLayout[iid] || { x: 100, y: 100 }, [pos, autoLayout]);

  const genNets = useCallback((): Net[] => {
    const out: Net[] = [];
    const by = (cat: string) => items.filter((i) => i.category === cat);
    const mcus = by('mcu'), powers = by('power'), conns = by('connector'), ics = by('ic'), passives = by('passive');
    powers.forEach((p) => [...mcus, ...ics].forEach((t) => out.push({ id: nid(), from: p.instanceId, to: t.instanceId, label: '3V3', color: '#dc2626' })));
    conns.forEach((cn) => (mcus.length ? mcus : ics).forEach((m) => out.push({ id: nid(), from: cn.instanceId, to: m.instanceId, label: cn.display?.family?.includes('USB') ? 'USB' : 'IO', color: '#2563eb' })));
    mcus.forEach((m) => ics.forEach((i) => out.push({ id: nid(), from: m.instanceId, to: i.instanceId, label: i.display?.family?.includes('Flash') ? 'SPI' : 'I2C', color: '#059669' })));
    passives.forEach((pv) => { const t = [...mcus, ...ics][0]; if (t) out.push({ id: nid(), from: pv.instanceId, to: t.instanceId, label: '去耦', color: '#a16207' }); });
    return out;
  }, [items]);

  useEffect(() => { if (nets === null && items.length > 0) setNets(genNets()); }, [items, nets, genNets]);
  useEffect(() => { if (items.length === 0) { setNets(null); setPos({}); } }, [items]);

  useEffect(() => {
    const onMM = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const d = dragRef.current;
      setPos((prev) => ({ ...prev, [d.iid]: { x: Math.max(0, d.startX + e.clientX - d.sx), y: Math.max(0, d.startY + e.clientY - d.sy) } }));
    };
    const onMU = () => { dragRef.current.active = false; };
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    return () => { window.removeEventListener('mousemove', onMM); window.removeEventListener('mouseup', onMU); };
  }, []);

  const onSymDown = (e: React.MouseEvent, iid: string) => {
    e.stopPropagation();
    if (linking === '__pick__') { setLinking(iid); return; }
    if (linking) {
      if (linking !== iid && !(nets || []).some((n) => n.from === linking && n.to === iid)) setNets((prev) => [...(prev || []), { id: nid(), from: linking, to: iid, label: 'NET', color: '#7c3aed' }]);
      setLinking(null);
      return;
    }
    const p = P(iid);
    dragRef.current = { active: true, iid, sx: e.clientX, sy: e.clientY, startX: p.x, startY: p.y };
  };

  const delNet = () => { if (sel) { setNets((prev) => (prev || []).filter((n) => n.id !== sel)); setSel(null); } };
  const finishEdit = () => { if (editId) setNets((prev) => (prev || []).map((n) => n.id === editId ? { ...n, label: editText } : n)); setEditId(null); };

  if (items.length === 0) return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>添加器件后自动生成原理图</div>
    </div>
  );

  const maxY = Math.max(...items.map((c) => P(c.instanceId).y), 300);
  const maxX = Math.max(...items.map((c) => P(c.instanceId).x), 700);
  const W = Math.max(780, maxX + 200), H = Math.max(320, maxY + 120);

  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>⚡ 原理图</span>
        <button onClick={() => setLinking(linking ? null : '__pick__')} style={{ ...tb, ...(linking ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#22c55e' } : {}) }}>{linking ? '✕ 取消' : '+ 连线'}</button>
        <button onClick={delNet} disabled={!sel} style={{ ...tb, opacity: sel ? 1 : 0.5 }}>🗑 删除连线</button>
        <button onClick={() => { setNets(genNets()); setPos({}); setSel(null); }} style={tb}>🔄 重新生成</button>
        <div style={{ flex: 1 }} />
        {onToggleFullscreen && <button onClick={onToggleFullscreen} style={tb}>{isFullscreen ? '↙ 退出全屏' : '⛶ 全屏'}</button>}
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#fffef9', borderRadius: 8, border: '1px solid #e7e0c9' }} onClick={() => { setSel(null); if (linking) setLinking(null); }}>
        <svg width={W} height={H} style={{ minWidth: W }}>
          <defs><pattern id="schg" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="#d9d2b8" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#schg)" />
          {(nets || []).map((n) => {
            const fc = items.find((i) => i.instanceId === n.from), tc = items.find((i) => i.instanceId === n.to);
            if (!fc || !tc) return null;
            const f = P(n.from), t = P(n.to);
            const fp = fc.category === 'passive';
            const x1 = f.x + (fp ? 56 : 130), y1 = f.y + (fp ? 15 : 36);
            const x2 = t.x - 10, y2 = t.y + (tc.category === 'passive' ? 15 : 36);
            const midX = (x1 + x2) / 2;
            const isSel = sel === n.id;
            return (
              <g key={n.id}>
                <path d={`M${x1},${y1} H${midX} V${y2} H${x2}`} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSel(n.id); }} onDoubleClick={(e) => { e.stopPropagation(); setEditId(n.id); setEditText(n.label); }} />
                <path d={`M${x1},${y1} H${midX} V${y2} H${x2}`} fill="none" stroke={isSel ? '#2563eb' : n.color} strokeWidth={isSel ? 2.2 : 1.4} style={{ pointerEvents: 'none' }} />
                <circle cx={x1} cy={y1} r={2.5} fill={isSel ? '#2563eb' : n.color} /><circle cx={x2} cy={y2} r={2.5} fill={isSel ? '#2563eb' : n.color} />
                {editId === n.id ? (
                  <foreignObject x={midX - 45} y={Math.min(y1, y2) - 18} width={90} height={22}>
                    <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={finishEdit} onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(); e.stopPropagation(); }} style={{ width: '100%', fontSize: 9, textAlign: 'center', border: '1px solid #93c5fd', borderRadius: 3, outline: 'none' }} />
                  </foreignObject>
                ) : n.label ? (
                  <text x={midX} y={Math.min(y1, y2) - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={isSel ? '#2563eb' : n.color} fontFamily="monospace" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSel(n.id); }} onDoubleClick={(e) => { e.stopPropagation(); setEditId(n.id); setEditText(n.label); }}>{n.label}</text>
                ) : null}
              </g>
            );
          })}
          {items.map((c) => <SymBox key={c.instanceId} c={c} p={P(c.instanceId)} linking={!!linking} onDown={(e) => onSymDown(e, c.instanceId)} />)}
          <line x1={20} y1={H - 30} x2={W - 20} y2={H - 30} stroke="#334155" strokeWidth={2} />
          <text x={26} y={H - 36} fontSize={9} fontWeight={700} fill="#334155" fontFamily="monospace">GND</text>
        </svg>
      </div>
    </div>
  );
}

function Header({ isFullscreen, onToggleFullscreen }: { isFullscreen?: boolean; onToggleFullscreen?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>⚡ 原理图</span>
      {onToggleFullscreen && <button onClick={onToggleFullscreen} style={tb}>{isFullscreen ? '↙ 退出全屏' : '⛶ 全屏'}</button>}
    </div>
  );
}

function SymBox({ c, p, linking, onDown }: { c: PlacedComponent; p: { x: number; y: number }; linking: boolean; onDown: (e: React.MouseEvent) => void }) {
  const isPassive = c.category === 'passive';
  const w = isPassive ? 60 : 120, h = isPassive ? 30 : 72;
  return (
    <g transform={`translate(${p.x},${p.y})`} onMouseDown={onDown} onClick={(e) => e.stopPropagation()} style={{ cursor: linking ? 'pointer' : 'grab' }}>
      {isPassive ? (
        c.display?.family === 'MLCC' ? (
          <g><rect x={-2} y={-2} width={62} height={36} fill="transparent" /><line x1={0} y1={h / 2} x2={24} y2={h / 2} stroke="#334155" strokeWidth={1.5} /><line x1={24} y1={4} x2={24} y2={h - 4} stroke="#334155" strokeWidth={2.5} /><line x1={32} y1={4} x2={32} y2={h - 4} stroke="#334155" strokeWidth={2.5} /><line x1={32} y1={h / 2} x2={56} y2={h / 2} stroke="#334155" strokeWidth={1.5} /></g>
        ) : (
          <g><rect x={-2} y={-2} width={62} height={36} fill="transparent" /><line x1={0} y1={h / 2} x2={12} y2={h / 2} stroke="#334155" strokeWidth={1.5} /><rect x={12} y={h / 2 - 6} width={32} height={12} fill="none" stroke="#334155" strokeWidth={1.8} /><line x1={44} y1={h / 2} x2={56} y2={h / 2} stroke="#334155" strokeWidth={1.5} /></g>
        )
      ) : (
        <g>
          <rect width={w} height={h} rx={2} fill="#fffef7" stroke="#334155" strokeWidth={1.8} />
          {[0, 1, 2].map((i) => <g key={i}><line x1={-10} y1={14 + i * 22} x2={0} y2={14 + i * 22} stroke="#334155" strokeWidth={1.4} /><line x1={w} y1={14 + i * 22} x2={w + 10} y2={14 + i * 22} stroke="#334155" strokeWidth={1.4} /></g>)}
        </g>
      )}
      <text x={isPassive ? 28 : w / 2} y={-6} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{c.reference}</text>
      <text x={isPassive ? 28 : w / 2} y={isPassive ? h + 12 : h / 2 + 3} textAnchor="middle" fontSize={isPassive ? 8 : 9} fontWeight={600} fill="#334155" fontFamily="monospace">{c.mpn.length > 14 ? c.mpn.slice(0, 12) + '..' : c.mpn}</text>
    </g>
  );
}

const tb: React.CSSProperties = { padding: '4px 10px', borderRadius: 5, border: '1px solid #E8F3EE', background: '#fff', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
