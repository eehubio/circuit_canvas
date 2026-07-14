/**
 * modules/bom/BomPanel.tsx
 * BOM 清单 —— 从 store 的 doc.bom 渲染，支持 CSV 导出。
 */
import { useDesignStore } from '../../state/designStore';
import { bomTotal } from '../../design-core/document/services';
import { fmtMoney, COLORS } from '../../shared/theme';
import { useEffect, useState } from 'react';
import { fetchDigikeyOffer, type DigikeyOffer } from '../../providers/digikey';

export function BomPanel({ isFullscreen, onToggleFullscreen }: { isFullscreen?: boolean; onToggleFullscreen?: () => void } = {}) {
  const bom = useDesignStore((s) => s.doc.bom);
  const components = useDesignStore((s) => s.doc.components);
  const total = bom.reduce((sum, l) => sum + (dkOf(l.mpn)?.unitPrice ?? l.unitPrice?.amount ?? 0) * l.quantity, 0);
  const srcOf = (ref: string) => components.find((c) => c.reference === ref)?.source;

  // DigiKey 实时价格：逐型号查询（provider 内按 mpn 缓存，避免重复消耗配额）
  const [dkPrices, setDkPrices] = useState<Record<string, DigikeyOffer>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const l of bom) {
        if (dkPrices[l.mpn]) continue;
        const o = await fetchDigikeyOffer(l.mpn);
        if (!alive) return;
        if (o?.found && o.unitPrice != null) setDkPrices((prev) => ({ ...prev, [l.mpn]: o }));
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bom]);
  const dkOf = (mpn: string): DigikeyOffer | undefined => dkPrices[mpn];

  const exportCsv = () => {
    const header = '序号,位号,型号,厂商,封装,单价,数量';
    const rows = bom.map((l, i) => `${i + 1},${l.reference},${l.mpn},${l.manufacturer},${l.footprint},${l.unitPrice?.amount ?? ''},${l.quantity}`);
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'bom.csv';
    a.click();
  };

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>🧾 BOM清单 <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>共 {bom.length} 项</span></span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={exportCsv} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #c6e2d0', background: COLORS.greenBg, color: COLORS.green, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>导出 CSV</button>
          {onToggleFullscreen && <button onClick={onToggleFullscreen} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{isFullscreen ? '↙ 退出全屏' : '⛶ 全屏'}</button>}
        </div>
      </div>
      {bom.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>暂无器件</div> : (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['#', '位号', '型号', '厂商', '封装', '来源', '单价', '数量'].map((h) => <th key={h} style={{ textAlign: h === '单价' || h === '数量' ? 'right' : 'left', padding: '8px 10px', fontWeight: 600, color: '#64748b', fontSize: 11, borderBottom: '2px solid #e2e8f0' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {bom.map((l, i) => (
              <tr key={l.reference + i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{i + 1}</td>
                <td style={{ padding: '7px 10px', fontWeight: 600, color: COLORS.green }}>{l.reference}</td>
                <td style={{ padding: '7px 10px', fontFamily: 'monospace' }}>{l.mpn}</td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>{l.manufacturer}</td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>{l.footprint}</td>
                <td style={{ padding: '7px 10px' }}>
                  {srcOf(l.reference) === 'EZPLM'
                    ? <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>ezPLM</span>
                    : <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>演示·网络估价</span>}
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>
                  {dkOf(l.mpn)
                    ? <span title={`DigiKey 实时 · 库存 ${dkOf(l.mpn)!.stock?.toLocaleString() ?? '—'}`} style={{ color: '#0369a1' }}>¥{dkOf(l.mpn)!.unitPrice!.toFixed(2)} <span style={{ fontSize: 8.5, padding: '0 4px', borderRadius: 3, background: '#e0f2fe', fontWeight: 700 }}>DK</span></span>
                    : <span style={{ color: '#059669' }}>{fmtMoney(l.unitPrice?.amount)}</span>}
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>{l.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={6} style={{ padding: 10, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>BOM 总价（DigiKey 实时价优先）</td>
            <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: 14, borderTop: '2px solid #e2e8f0' }}>{fmtMoney(total)}</td>
            <td style={{ borderTop: '2px solid #e2e8f0' }} />
          </tr></tfoot>
        </table>
      )}
    </div>
  );
}
