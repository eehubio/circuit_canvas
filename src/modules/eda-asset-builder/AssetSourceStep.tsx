import type { EdaSource } from './types';

export function AssetSourceStep({
  source,
  selectedFileName,
  onSource,
  onFile,
}: {
  source: EdaSource;
  selectedFileName?: string;
  onSource: (source: Partial<EdaSource>) => void;
  onFile: (name?: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={seg}>
        {([
          ['pdf_upload', '上传 PDF'],
          ['pdf_url', 'PDF 链接'],
          ['ezplm_component', 'ezPLM 型号'],
          ['manual', '粘贴文本'],
        ] as const).map(([type, label]) => (
          <button key={type} onClick={() => onSource({ type })} style={source.type === type ? activeBtn : btn}>{label}</button>
        ))}
      </div>
      {source.type === 'pdf_upload' && (
        <label style={upload}>
          <span>📄 选择 Datasheet PDF</span>
          <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0]?.name)} />
          <small>{selectedFileName ?? '尚未选择文件；MVP mock 只记录文件名，不上传内容'}</small>
        </label>
      )}
      {source.type === 'pdf_url' && <input value={source.sourceUrl ?? ''} onChange={(e) => onSource({ sourceUrl: e.target.value })} placeholder="https://vendor.com/datasheet.pdf" style={input} />}
      {source.type === 'ezplm_component' && <input value={source.mpn ?? ''} onChange={(e) => onSource({ mpn: e.target.value, componentId: e.target.value })} placeholder="LM358DR / ezPLM componentId" style={input} />}
      {source.type === 'manual' && <textarea value={source.pastedText ?? ''} onChange={(e) => onSource({ pastedText: e.target.value })} rows={6} placeholder="粘贴 Pin Description / Package Information 关键文本" style={input} />}
    </div>
  );
}

const seg = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 } as const;
const btn = { padding: '9px 8px', borderRadius: 8, border: '1px solid #dbe6dd', background: '#fff', cursor: 'pointer', fontWeight: 700 } as const;
const activeBtn = { ...btn, borderColor: '#2f8f55', background: '#e8f6ee', color: '#245b3a' } as const;
const input = { width: '100%', boxSizing: 'border-box' as const, padding: '9px 10px', borderRadius: 8, border: '1px solid #dbe6dd', fontSize: 12 };
const upload = { minHeight: 120, border: '1px dashed #a7d4b7', borderRadius: 12, background: '#f7fcf9', display: 'grid', placeItems: 'center', gap: 6, cursor: 'pointer', color: '#245b3a', fontWeight: 800 } as const;
