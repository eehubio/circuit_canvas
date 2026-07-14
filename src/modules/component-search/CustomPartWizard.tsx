/**
 * modules/component-search/CustomPartWizard.tsx
 * 定制器件构建向导：
 *   路径A（AI 提取）：上传 PDF / 输入 URL / 粘贴文本 → Gemini 提取管脚定义与物理尺寸 → 填入表单
 *   路径B（手工）：KiCad 式向导 —— 管脚表（编号/名称/电气属性/描述）+ 封装参数（族/外形/间距）
 * 表单统一可编辑；保存 → 定制库（localStorage）+ 符号覆盖注册，封装经合成 KiCad 名走既有解析器。
 */
import { useMemo, useState } from 'react';
import { COLORS } from '../../shared/theme';
import { geminiAvailable, geminiComplete, extractJson } from '../../providers/gemini';
import { padFootprintFor } from '../../design-core/geometry/footprint-pads';
import {
  KICAD_PIN_TYPES, type CustomPin, type CustomPkg, type CustomPart,
  synthFootprintName, saveCustomPart,
} from '../../design-core/custom-lib';
import type { ComponentCategory } from '../../design-core/document/types';

const FAMILIES: [CustomPkg['family'], string][] = [
  ['dual', '双列贴片 (SOP/TSSOP)'], ['quad', '四边鸥翼 (QFP)'], ['qfn', '四边无脚 (QFN)'], ['header', '单排针 (2.54)'], ['chip', '两端贴片 (阻容)'],
];
const CATS: [ComponentCategory, string][] = [['ic', '集成电路'], ['mcu', '微控制器'], ['power', '电源'], ['connector', '连接器'], ['passive', '无源']];

export function CustomPartWizard({ initialMpn, onSaved, onClose }: { initialMpn?: string; onSaved: (p: CustomPart) => void; onClose: () => void }) {
  const [mpn, setMpn] = useState(initialMpn ?? '');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<ComponentCategory>('ic');
  const [pins, setPins] = useState<CustomPin[]>([{ num: '1', name: 'VCC', type: 'power_in' }, { num: '2', name: 'GND', type: 'power_in' }]);
  const [pkg, setPkg] = useState<CustomPkg>({ family: 'dual', bodyW: 4.9, bodyH: 3.9, pitch: 1.27 });
  const [aiUrl, setAiUrl] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  const fpName = synthFootprintName(pkg, pins.length);
  const fp = useMemo(() => padFootprintFor(fpName), [fpName]);

  const EXTRACT_PROMPT = `请从以上器件资料中提取信息，严格输出 JSON（勿输出其它文字）：
{"mpn":"型号","description":"30字内功能描述","category":"ic|mcu|power|connector|passive",
"pins":[{"num":"1","name":"VCC","type":"power_in","desc":"电源"}],
"package":{"family":"dual|quad|qfn|header|chip","bodyW":本体宽mm,"bodyH":本体长mm,"pitch":引脚间距mm}}
pin type 取值：${KICAD_PIN_TYPES.join('|')}`;

  const applyExtract = (j: { mpn?: string; description?: string; category?: string; pins?: CustomPin[]; package?: Partial<CustomPkg> }) => {
    if (j.mpn) setMpn(j.mpn);
    if (j.description) setDesc(j.description);
    if (j.category && CATS.some(([c]) => c === j.category)) setCat(j.category as ComponentCategory);
    if (Array.isArray(j.pins) && j.pins.length) {
      setPins(j.pins.slice(0, 100).map((p, i) => ({
        num: String(p.num ?? i + 1), name: String(p.name ?? `P${i + 1}`),
        type: KICAD_PIN_TYPES.includes(p.type) ? p.type : 'passive', desc: p.desc,
      })));
    }
    const pk = j.package;
    if (pk) {
      setPkg((prev) => ({
        family: FAMILIES.some(([f]) => f === pk.family) ? pk.family as CustomPkg['family'] : prev.family,
        bodyW: Number(pk.bodyW) || prev.bodyW,
        bodyH: Number(pk.bodyH) || prev.bodyH,
        pitch: Number(pk.pitch) || prev.pitch,
      }));
    }
  };

  const runAi = async (payload: { fileBase64?: string; mimeType?: string; url?: string; text?: string }) => {
    setAiBusy(true); setAiMsg('');
    try {
      if (!(await geminiAvailable())) { setAiMsg('未配置 GEMINI_API_KEY'); setAiBusy(false); return; }
      let text: string;
      if (payload.text) {
        text = await geminiComplete(`以下是器件资料文本：\n${payload.text.slice(0, 60000)}\n\n${EXTRACT_PROMPT}`);
      } else {
        const r = await fetch('/api/gemini', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: EXTRACT_PROMPT, ...payload }),
        });
        if (!r.ok) throw new Error(`提取失败 HTTP ${r.status}`);
        text = String((await r.json()).text ?? '');
      }
      applyExtract(extractJson(text));
      setAiMsg('✓ 已提取，请核对下方表单后保存');
    } catch (e) {
      setAiMsg('提取失败：' + (e as Error).message);
    }
    setAiBusy(false);
  };

  const onPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3.5 * 1024 * 1024) { setAiMsg('PDF 需小于 3.5MB（代理请求体限制），过大请复制关键页文本粘贴'); return; }
    const b64 = await new Promise<string>((res) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(',')[1]); rd.readAsDataURL(f); });
    runAi({ fileBase64: b64, mimeType: 'application/pdf' });
    e.target.value = '';
  };

  const save = () => {
    if (!mpn.trim() || !pins.length) { setAiMsg('型号与管脚不能为空'); return; }
    const part: CustomPart = {
      id: Math.random().toString(36).slice(2, 10), mpn: mpn.trim(), description: desc.trim() || undefined,
      category: cat, pins, pkg, footprintName: fpName, createdAt: Date.now(),
    };
    saveCustomPart(part);
    onSaved(part);
  };

  const inp = { padding: '5px 8px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 11.5, outline: 'none' } as const;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1a4a2e', marginBottom: 12 }}>🛠 定制器件构建向导</div>

        {/* 路径A：AI 提取 */}
        <div style={{ padding: 12, borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6d28d9', marginBottom: 8 }}>🤖 AI 提取（Datasheet PDF / 网页链接 / 粘贴文本）→ 自动填表</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ padding: '6px 12px', borderRadius: 6, border: '1px dashed #c4b5fd', background: '#fff', fontSize: 11, fontWeight: 700, color: '#6d28d9', cursor: 'pointer' }}>
              📄 上传 PDF<input type="file" accept="application/pdf" onChange={onPdf} style={{ display: 'none' }} />
            </label>
            <input value={aiUrl} onChange={(e) => setAiUrl(e.target.value)} placeholder="或粘贴器件页面 URL…" style={{ ...inp, flex: 1, minWidth: 200 }} />
            <button disabled={aiBusy || !aiUrl.trim()} onClick={() => runAi({ url: aiUrl.trim() })} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#6d28d9', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: aiBusy || !aiUrl.trim() ? 0.5 : 1 }}>提取</button>
          </div>
          <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="或直接粘贴 datasheet 关键文本（管脚表/封装尺寸）…" rows={2}
            style={{ ...inp, width: '100%', marginTop: 8, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
          {aiText.trim() && <button disabled={aiBusy} onClick={() => runAi({ text: aiText })} style={{ marginTop: 6, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#6d28d9', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{aiBusy ? '提取中…' : '从文本提取'}</button>}
          {aiMsg && <div style={{ marginTop: 6, fontSize: 10.5, color: aiMsg.startsWith('✓') ? '#16a34a' : '#b91c1c' }}>{aiMsg}</div>}
        </div>

        {/* 基本信息 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={mpn} onChange={(e) => setMpn(e.target.value)} placeholder="型号 *" style={{ ...inp, flex: 1, fontFamily: 'monospace', fontWeight: 700 }} />
          <select value={cat} onChange={(e) => setCat(e.target.value as ComponentCategory)} style={inp}>
            {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="功能描述" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />

        {/* 管脚表 */}
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>管脚定义（{pins.length} 个）</div>
        <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #f1f5f9', borderRadius: 8, marginBottom: 8 }}>
          {pins.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 8px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
              <input value={p.num} onChange={(e) => setPins(pins.map((x, k) => k === i ? { ...x, num: e.target.value } : x))} style={{ ...inp, width: 40, textAlign: 'center' }} />
              <input value={p.name} onChange={(e) => setPins(pins.map((x, k) => k === i ? { ...x, name: e.target.value } : x))} placeholder="名称" style={{ ...inp, width: 90, fontFamily: 'monospace' }} />
              <select value={p.type} onChange={(e) => setPins(pins.map((x, k) => k === i ? { ...x, type: e.target.value as CustomPin['type'] } : x))} style={{ ...inp, width: 118 }}>
                {KICAD_PIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={p.desc ?? ''} onChange={(e) => setPins(pins.map((x, k) => k === i ? { ...x, desc: e.target.value } : x))} placeholder="描述" style={{ ...inp, flex: 1 }} />
              <button onClick={() => setPins(pins.filter((_, k) => k !== i))} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={() => setPins([...pins, { num: String(pins.length + 1), name: `P${pins.length + 1}`, type: 'passive' }])}
          style={{ padding: '5px 12px', borderRadius: 6, border: '1px dashed #cbd5e1', background: '#fff', fontSize: 11, color: '#475569', cursor: 'pointer', marginBottom: 14 }}>＋ 添加管脚</button>

        {/* 封装参数 + 预览 */}
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>封装参数</div>
            <select value={pkg.family} onChange={(e) => setPkg({ ...pkg, family: e.target.value as CustomPkg['family'] })} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 6 }}>
              {FAMILIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {pkg.family !== 'chip' && pkg.family !== 'header' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                本体 <input type="number" step={0.1} value={pkg.bodyW} onChange={(e) => setPkg({ ...pkg, bodyW: Number(e.target.value) })} style={{ ...inp, width: 58 }} />
                × <input type="number" step={0.1} value={pkg.bodyH} onChange={(e) => setPkg({ ...pkg, bodyH: Number(e.target.value) })} style={{ ...inp, width: 58 }} /> mm
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#64748b' }}>
              间距 <input type="number" step={0.05} value={pkg.pitch} onChange={(e) => setPkg({ ...pkg, pitch: Number(e.target.value) })} style={{ ...inp, width: 58 }} /> mm
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{fpName}</div>
          </div>
          <div style={{ width: 200 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>封装预览（{fp?.pads.length ?? 0} 焊盘）</div>
            <div style={{ height: 130, background: '#f0f6f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {fp ? (() => {
                const exW = Math.max(...fp.pads.map((pd) => Math.abs(pd.x) + pd.w / 2)) * 2 + 1;
                const exH = Math.max(...fp.pads.map((pd) => Math.abs(pd.y) + pd.h / 2)) * 2 + 1;
                return (
                  <svg viewBox={`${-exW / 2} ${-exH / 2} ${exW} ${exH}`} style={{ width: '90%', height: '90%' }} preserveAspectRatio="xMidYMid meet">
                    <rect x={-fp.bodyW / 2} y={-fp.bodyH / 2} width={fp.bodyW} height={fp.bodyH} fill="none" stroke="#1f5c3b" strokeWidth={exW * 0.008} />
                    {fp.pads.map((pd, i) => pd.round
                      ? <circle key={i} cx={pd.x} cy={pd.y} r={pd.w / 2} fill="#c08a2d" />
                      : <rect key={i} x={pd.x - pd.w / 2} y={pd.y - pd.h / 2} width={pd.w} height={pd.h} rx={Math.min(pd.w, pd.h) * 0.2} fill="#c08a2d" />)}
                  </svg>
                );
              })() : <span style={{ fontSize: 10, color: '#94a3b8' }}>参数不足</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer' }}>取消</button>
          <button onClick={save} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: COLORS.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>保存到定制库</button>
        </div>
      </div>
    </div>
  );
}
