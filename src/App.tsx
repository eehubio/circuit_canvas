/**
 * App.tsx
 * 应用壳 —— 组装搜索面板 / 画布 / 右侧顾问 / 底部 BOM。
 * 所有数据流经 designStore 与 Provider，不再有硬编码逻辑。
 */
import { useState, useEffect, useRef } from 'react';
import { useDesignStore } from './state/designStore';
import { getProviders } from './providers/factory';
import { appConfig } from './config';
import { ComponentSearchPanel } from './modules/component-search/ComponentSearchPanel';
import { BoardCanvas2D } from './modules/board-editor/BoardCanvas2D';
import { BoardView3D } from './modules/board-editor/BoardView3D';
import { BomPanel } from './modules/bom/BomPanel';
import { AdvisorPanel } from './modules/design-review/AdvisorPanel';
import { BlockDiagramPanel } from './modules/block-diagram/BlockDiagramPanel';
import { SchematicPanel } from './modules/schematic/SchematicPanel';
import { exportDocument, importDocumentFromFile, autosave } from './modules/report/persistence';
import { COLORS, CATEGORY_DISPLAY, fmtMoney } from './shared/theme';
import type { BoardShapeKind } from './design-core/document/types';

const providers = getProviders();
const ctx = { userId: 'demo-user', organizationId: 'org-demo' };

const SHAPES: { id: BoardShapeKind; icon: string; name: string }[] = [
  { id: 'rect', icon: '▭', name: '矩形' },
  { id: 'rounded', icon: '▢', name: '圆角' },
  { id: 'circle', icon: '○', name: '圆形' },
  { id: 'lshape', icon: '⌐', name: 'L形' },
];

export default function App() {
  const doc = useDesignStore((s) => s.doc);
  const selectedId = useDesignStore((s) => s.selectedId);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const clearAll = useDesignStore((s) => s.clearAll);
  const rotate = useDesignStore((s) => s.rotateComponent);
  const remove = useDesignStore((s) => s.removeComponent);
  const setBoardSize = useDesignStore((s) => s.setBoardSize);
  const setBoardShape = useDesignStore((s) => s.setBoardShape);
  const placeScheme = useDesignStore((s) => s.placeScheme);
  const loadDocument = useDesignStore((s) => s.loadDocument);

  const [rightTab, setRightTab] = useState<'comp' | 'advisor'>('comp');
  const [bottom, setBottom] = useState<'bom' | 'block' | 'schematic' | null>(null);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [fullscreen, setFullscreen] = useState<'block' | 'schematic' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selObj = doc.components.find((c) => c.instanceId === selectedId);

  // autosave
  useEffect(() => { autosave(doc); }, [doc]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.key === 'r' || e.key === 'R') && selectedId) { e.preventDefault(); rotate(selectedId); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); remove(selectedId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, undo, redo, rotate, remove]);

  const genScheme = async () => {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    const result = await providers.ai.generateScheme({ prompt: aiPrompt }, ctx);
    const details = (await Promise.all(result.componentIds.map((id) => providers.components.getComponentDetail(id, ctx)))).filter(Boolean);
    placeScheme(details as NonNullable<typeof details[number]>[]);
    setAiBusy(false);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { loadDocument(await importDocumentFromFile(f)); } catch (err) { alert('导入失败：' + (err as Error).message); }
    e.target.value = '';
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system,'Segoe UI',Roboto,'Noto Sans SC',sans-serif", background: '#F8F9FA', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff', borderBottom: `2px solid ${COLORS.green}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.green }}>元器件查一查、摆一摆</span>
          <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>v3 · {appConfig.mode}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportDocument(doc)} style={hbtn}>⬇ 导出设计</button>
          <button onClick={() => fileRef.current?.click()} style={hbtn}>⬆ 导入设计</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left */}
        <aside style={{ width: 330, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#f4f7f5', borderRight: '1px solid #dbe6dd' }}>
          <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
            {/* AI scheme */}
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: '1px solid #c6e2d0', background: '#f7fcf9' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 6 }}>🤖 AI 生成方案</div>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2}
                placeholder="如：USB转串口调试器 / WiFi物联网节点 / 12V车载CAN控制器"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #dbe6dd', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
              <button onClick={genScheme} disabled={aiBusy} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,#245b3a,${COLORS.green})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: aiBusy ? 'wait' : 'pointer' }}>
                {aiBusy ? '⟳ 生成中...' : '生成方案上画布'}
              </button>
            </div>
            <ComponentSearchPanel />
          </div>
        </aside>

        {/* Center */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {/* Toolbar */}
          <div style={{ background: '#fff', borderBottom: '2px solid #E8F3EE', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={undo} style={tbtn}>↩ 撤销</button>
            <button onClick={redo} style={tbtn}>↪ 重做</button>
            <button onClick={clearAll} style={tbtn}>🧹 清除</button>
            <div style={{ width: 1, height: 18, background: '#E8F3EE', margin: '0 4px' }} />
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #E8F3EE' }}>
              {(['2d', '3d'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', border: 'none', background: view === v ? COLORS.green : '#fff', color: view === v ? '#fff' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{v === '2d' ? '2D 布局' : '3D 视图'}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{view === '3d' ? '拖拽旋转 · 滚轮缩放' : '选中后 R 旋转 · Delete 删除 · Ctrl+点击多选'}</span>
          </div>

          <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex' }}>
            {view === '2d' ? <BoardCanvas2D /> : <BoardView3D />}

            {/* Selected bar — anchored to canvas area bottom */}
            {selObj && !fullscreen && (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', boxShadow: '0 4px 20px rgba(0,0,0,.12)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, pointerEvents: 'auto' }}>
                  <span style={{ fontWeight: 700, color: COLORS.green }}>{selObj.reference}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selObj.mpn}</span>
                  <span style={{ color: '#64748b' }}>{selObj.footprint.name}</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{fmtMoney(selObj.unitPrice?.amount)}</span>
                  <button onClick={() => rotate(selObj.instanceId)} style={smbtn}>旋转</button>
                  <button onClick={() => remove(selObj.instanceId)} style={{ ...smbtn, borderColor: '#fecaca', background: '#fef2f2', color: '#dc2626' }}>移除</button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ display: 'flex', background: '#fff', borderTop: '1px solid #E8F3EE', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: COLORS.green }}>📐 PCB</span>
              <NumInput value={doc.board.widthMm} onChange={(v) => setBoardSize(v, doc.board.heightMm)} />
              <span style={{ color: '#cbd5e1' }}>×</span>
              <NumInput value={doc.board.heightMm} onChange={(v) => setBoardSize(doc.board.widthMm, v)} />
              <div style={{ width: 1, height: 16, background: '#E8F3EE', margin: '0 2px' }} />
              {SHAPES.map((s) => (
                <button key={s.id} title={s.name} onClick={() => setBoardShape(s.id)}
                  style={{ width: 26, height: 22, borderRadius: 4, border: `1.5px solid ${doc.board.shape === s.id ? COLORS.green : '#E8F3EE'}`, background: doc.board.shape === s.id ? COLORS.greenBg : '#fff', color: doc.board.shape === s.id ? COLORS.green : '#94a3b8', fontSize: 12, cursor: 'pointer' }}>{s.icon}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {([['bom', '🧾 BOM清单'], ['block', '📊 系统框图'], ['schematic', '⚡ 原理图']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setBottom(bottom === id ? null : id)} style={{ padding: '8px 16px', border: 'none', background: bottom === id ? COLORS.greenBg : '#fff', color: bottom === id ? COLORS.green : '#2C3E50', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderTop: bottom === id ? `2px solid ${COLORS.green}` : '2px solid transparent' }}>{label}</button>
            ))}
          </div>
          {bottom && !(bottom === 'block' && fullscreen === 'block') && !(bottom === 'schematic' && fullscreen === 'schematic') && (
            <div style={{ height: bottom === 'bom' ? 270 : 340, borderTop: '1px solid #E8F3EE', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
              {bottom === 'bom' && <BomPanel />}
              {bottom === 'block' && <BlockDiagramPanel isFullscreen={false} onToggleFullscreen={() => setFullscreen('block')} />}
              {bottom === 'schematic' && <SchematicPanel isFullscreen={false} onToggleFullscreen={() => setFullscreen('schematic')} />}
            </div>
          )}
        </div>

        {/* Right */}
        <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #e2e8f0' }}>
          <div style={{ background: COLORS.green, padding: '6px 8px 0', display: 'flex', gap: 4 }}>
            {([['comp', '🔧 当前元件'], ['advisor', '🤖 AI顾问']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setRightTab(id)} style={{ flex: 1, padding: '9px 0', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: '6px 6px 0 0', background: rightTab === id ? '#fff' : 'rgba(255,255,255,.12)', color: rightTab === id ? COLORS.green : 'rgba(255,255,255,.85)' }}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12, background: '#f8fafc' }}>
            {rightTab === 'advisor' ? <AdvisorPanel /> : selObj ? <CompDetail iid={selObj.instanceId} /> : <div style={{ textAlign: 'center', padding: 40, color: '#7F8C8D', fontSize: 12 }}>点击画布中的元件查看详情</div>}
          </div>
        </aside>
      </div>

      {/* Fullscreen overlays */}
      {fullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setFullscreen(null)}>
          <div style={{ width: '100%', maxWidth: 1200, height: '90vh', background: '#fff', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            {fullscreen === 'block' && <BlockDiagramPanel isFullscreen onToggleFullscreen={() => setFullscreen(null)} />}
            {fullscreen === 'schematic' && <SchematicPanel isFullscreen onToggleFullscreen={() => setFullscreen(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function CompDetail({ iid }: { iid: string }) {
  const c = useDesignStore((s) => s.doc.components.find((x) => x.instanceId === iid));
  const [alts, setAlts] = useState<{ mpn: string; manufacturer: string; note: string; channel: string }[]>([]);
  useEffect(() => { if (c) providers.components.getAlternatives(c.componentId, ctx).then(setAlts); }, [c?.componentId]);
  if (!c) return null;
  const disp = CATEGORY_DISPLAY[c.category];
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{c.reference}</div>
      <div style={{ fontSize: 14, fontFamily: 'monospace', color: COLORS.green, fontWeight: 600 }}>{c.mpn}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginTop: 12 }}>
        {[['封装', c.footprint.name], ['厂商', c.manufacturer], ['类别', disp.name], ['旋转', `${c.placement.rotation}°`], ['单价', fmtMoney(c.unitPrice?.amount)], ['来源', c.source]].map(([k, v]) => (
          <div key={k} style={{ padding: '6px 8px', borderRadius: 6, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{k}</div>
            <div style={{ fontWeight: 600, color: k === '单价' ? '#059669' : '#334155' }}>{v}</div>
          </div>
        ))}
      </div>
      {c.display?.description && <div style={{ fontSize: 12, color: '#475569', marginTop: 12 }}>{c.display.description}</div>}
      {alts.length > 0 && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 6 }}>💡 替代料与采购渠道</div>
          {alts.map((a, i) => (
            <div key={i} style={{ padding: '6px 8px', marginBottom: 4, borderRadius: 6, background: '#fff', border: '1px solid #fef3c7' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700 }}>{a.mpn} <span style={{ fontSize: 9.5, color: '#94a3b8' }}>{a.manufacturer}</span></div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{a.note}</div>
              <div style={{ fontSize: 9.5, color: '#0369a1' }}>📦 {a.channel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', borderRadius: 6, padding: '3px 6px', border: '1px solid #E8F3EE' }}>
      <input type="number" value={value} min={20} max={500} step={5} onChange={(e) => onChange(Math.max(20, Math.min(500, Number(e.target.value) || 20)))}
        style={{ width: 44, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, color: COLORS.green, outline: 'none', textAlign: 'center', fontFamily: 'monospace' }} />
      <span style={{ color: '#94a3b8', fontSize: 10 }}>mm</span>
    </div>
  );
}

const hbtn: React.CSSProperties = { padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const tbtn: React.CSSProperties = { padding: '7px 14px', borderRadius: 6, border: '1px solid #E8F3EE', background: '#fff', fontSize: 13, fontWeight: 500, color: '#2C3E50', cursor: 'pointer' };
const smbtn: React.CSSProperties = { padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#475569' };
