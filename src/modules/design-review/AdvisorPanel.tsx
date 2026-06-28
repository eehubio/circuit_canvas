/**
 * modules/design-review/AdvisorPanel.tsx
 * AI 顾问 —— 实时展示设计审查、子电路推荐、PCB规格。数据来自 store + ReferenceDesignProvider。
 */
import { useEffect, useState } from 'react';
import { useDesignStore } from '../../state/designStore';
import { getProviders } from '../../providers/factory';
import { recommendLayers } from '../../design-core/document/services';
import { CATEGORY_DISPLAY, COLORS } from '../../shared/theme';
import type { PeripheralCircuitRecommendation } from '../../providers/types';
import type { ComponentCategory, ReviewLevel } from '../../design-core/document/types';

const providers = getProviders();
const ctx = { userId: 'demo-user', organizationId: 'org-demo' };

const LEVEL: Record<ReviewLevel, { bg: string; color: string; label: string }> = {
  high: { bg: '#fef2f2', color: '#dc2626', label: '高' },
  mid: { bg: '#fffbeb', color: '#b45309', label: '中' },
  low: { bg: '#f0fdf4', color: '#16a34a', label: '低' },
  info: { bg: '#f1f5f9', color: '#64748b', label: 'ℹ' },
};

export function AdvisorPanel() {
  const doc = useDesignStore((s) => s.doc);
  const addComponent = useDesignStore((s) => s.addComponent);
  const [subs, setSubs] = useState<Record<string, PeripheralCircuitRecommendation[]>>({});

  const cats = Array.from(new Set(doc.components.map((c) => c.category)));

  useEffect(() => {
    (async () => {
      const out: Record<string, PeripheralCircuitRecommendation[]> = {};
      for (const cat of cats) out[cat] = await providers.referenceDesigns.getRecommendedPeripheralCircuits(cat as ComponentCategory, ctx);
      setSubs(out);
    })();
  }, [cats.join(',')]);

  const quickAdd = async (componentId: string) => {
    const detail = await providers.components.getComponentDetail(componentId, ctx);
    if (detail) addComponent(detail);
  };

  const layers = recommendLayers(doc);
  const highCount = doc.reviewResults.filter((r) => r.level === 'high').length;

  return (
    <div>
      {/* 子电路推荐 */}
      <Section title="🧩 子电路推荐" badge={cats.length || undefined}>
        {doc.components.length === 0 ? <Empty text="添加器件后推荐配套子电路" /> :
          cats.map((cat) => (
            <div key={cat} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, marginBottom: 4 }}>{CATEGORY_DISPLAY[cat as ComponentCategory].name}</div>
              {(subs[cat] ?? []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 8px', marginBottom: 3, borderRadius: 6, background: '#f8fafc' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155' }}>{r.name}</div>
                    <div style={{ fontSize: 9.5, color: '#64748b' }}>{r.parts}</div>
                  </div>
                  {r.quickAddComponentId && <button onClick={() => quickAdd(r.quickAddComponentId!)} style={miniBtn}>+ 上板</button>}
                </div>
              ))}
            </div>
          ))}
      </Section>

      {/* PCB规格 */}
      <Section title="📋 PCB设计规格">
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse', marginTop: 6 }}>
          <tbody>
            {[
              ['层数', `${layers}层`, layers === 4 ? '密度高,建议4层' : '2层可满足'],
              ['板厚', '1.6mm', '标准'],
              ['铜厚', '1oz', '大电流局部2oz'],
              ['线宽/距', '6/6mil', '标准工艺'],
              ['板框', `${doc.board.widthMm}×${doc.board.heightMm}mm`, doc.board.shape === 'lshape' ? '异形(费用+)' : '常规'],
            ].map(([k, v, n]) => (
              <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{k}</td>
                <td style={{ padding: '4px 6px', fontWeight: 700, color: COLORS.green }}>{v}</td>
                <td style={{ padding: '4px 6px', color: '#64748b' }}>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
          <b>布局要点</b>：晶振贴MCU包地 · 去耦电容贴引脚 · USB差分等长(90Ω) · 电源回路最小化 · 连接器靠板边
        </div>
      </Section>

      {/* 风险 */}
      <Section title="⚠️ 设计风险" badge={highCount ? `${highCount}高` : undefined} badgeColor="#dc2626">
        {doc.reviewResults.map((r) => {
          const st = LEVEL[r.level];
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', marginBottom: 3, borderRadius: 5, background: st.bg }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: st.color, width: 14, textAlign: 'center' }}>{st.label}</span>
              <span style={{ fontSize: 10.5, color: '#334155' }}>{r.title}{r.detail ? ` — ${r.detail}` : ''}</span>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Section({ title, badge, badgeColor, children }: { title: string; badge?: string | number; badgeColor?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 8, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: open ? '#f7fcf9' : '#fff' }}>
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{title}</span>
        {badge != null && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: badgeColor ?? COLORS.green, color: '#fff', fontWeight: 700 }}>{badge}</span>}
        <span style={{ fontSize: 9, color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ padding: '4px 12px 12px', borderTop: '1px solid #f1f5f9' }}>{children}</div>}
    </div>
  );
}
const Empty = ({ text }: { text: string }) => <div style={{ fontSize: 11, color: '#94a3b8', paddingTop: 6 }}>{text}</div>;
const miniBtn: React.CSSProperties = { fontSize: 9, padding: '2px 7px', borderRadius: 4, border: '1px solid #c6e2d0', background: '#fff', color: COLORS.green, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
