/**
 * modules/component-search/ComponentSearchPanel.tsx
 * 元器件搜索面板 —— 通过 ComponentDataProvider 检索，结果加入画布。
 */
import { useState, useEffect, useCallback } from 'react';
import { getProviders } from '../../providers/factory';
import { useDesignStore } from '../../state/designStore';
import { CATEGORY_DISPLAY, CATEGORY_LIST, COLORS, fmtMoney } from '../../shared/theme';
import type { ComponentSearchResult } from '../../providers/types';
import type { ComponentCategory } from '../../design-core/document/types';

const providers = getProviders();
const ctx = { userId: 'demo-user', organizationId: 'org-demo' };

export function ComponentSearchPanel() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<ComponentCategory | null>(null);
  const [orgOnly, setOrgOnly] = useState(false);
  const [results, setResults] = useState<ComponentSearchResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const addComponent = useDesignStore((s) => s.addComponent);
  const placedIds = useDesignStore((s) => new Set(s.doc.components.map((c) => c.componentId)));

  const runSearch = useCallback(async () => {
    const res = await providers.components.searchComponents({ keyword, category: category ?? undefined, orgOnly }, ctx);
    setResults(res.items);
  }, [keyword, category, orgOnly]);

  useEffect(() => { runSearch(); }, [runSearch]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {CATEGORY_LIST.map((cat) => (
          <button key={cat} onClick={() => setCategory(category === cat ? null : cat)}
            style={chip(category === cat)}>
            {CATEGORY_DISPLAY[cat].icon} {CATEGORY_DISPLAY[cat].name}
          </button>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
        <input type="checkbox" checked={orgOnly} onChange={(e) => setOrgOnly(e.target.checked)} style={{ accentColor: COLORS.green }} />
        仅显示本组织物料
      </label>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索型号、封装、关键词..."
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #dbe6dd', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>找到 {results.length} 个结果</div>
      {results.map((r) => (
        <ResultCard key={r.componentId} r={r} expanded={expanded === r.componentId}
          onToggle={() => setExpanded(expanded === r.componentId ? null : r.componentId)}
          onAdd={() => addComponent(r)} placed={placedIds.has(r.componentId)} />
      ))}
    </div>
  );
}

function ResultCard({ r, expanded, onToggle, onAdd, placed }: {
  r: ComponentSearchResult; expanded: boolean; onToggle: () => void; onAdd: () => void; placed: boolean;
}) {
  const isOrg = !!r.org;
  return (
    <div style={{ marginBottom: 8, borderRadius: 8, border: `1px solid ${isOrg ? '#c6e2d0' : '#e5e7eb'}`, background: placed ? '#f3f4f6' : isOrg ? '#f0f9f4' : '#fff', opacity: placed ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 8, cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isOrg && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontWeight: 600 }}>本组织</span>}
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.mpn}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 11, color: '#6b7280' }}>
            <span>{r.defaultFootprintName}</span><span>·</span><span>{r.manufacturer}</span><span>·</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>{fmtMoney(r.unitPrice?.amount)}</span>
          </div>
        </div>
        {!placed && <button onClick={(e) => { e.stopPropagation(); onAdd(); }} style={addBtn}>+</button>}
        <span style={{ fontSize: 10, color: '#64748b' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#475569' }}>
          <p style={{ margin: '8px 0' }}>{r.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
            <div>封装：{r.defaultFootprintName}</div><div>引脚：{r.pins}</div>
            <div>族：{r.family}</div><div>厂商：{r.manufacturer}</div>
          </div>
          {r.org && <div style={{ marginTop: 6, padding: '6px 8px', borderRadius: 6, background: '#f0f9f4', fontSize: 10 }}>
            内部料号 {r.org.internalPartNumber} · 库存 {r.org.stockQuantity} · 已用于 {r.org.projectUsageCount} 个项目
          </div>}
        </div>
      )}
    </div>
  );
}

const chip = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  border: `1px solid ${active ? COLORS.green : '#dbe6dd'}`, background: active ? COLORS.greenBg : '#fff', color: active ? COLORS.green : '#64748b',
});
const addBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: 'none', background: COLORS.green, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
