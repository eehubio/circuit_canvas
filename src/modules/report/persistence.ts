/**
 * modules/report/persistence.ts
 * 设计文档的导入/导出/自动保存。
 */
import { serializeDocument, deserializeDocument } from '../../design-core/document/factory';
import type { CircuitCanvasDocument } from '../../design-core/document/types';

const AUTOSAVE_KEY = 'cc:autosave';

export function exportDocument(doc: CircuitCanvasDocument) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([serializeDocument(doc)], { type: 'application/json' }));
  a.download = `${doc.name || 'design'}.cc.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importDocumentFromFile(file: File): Promise<CircuitCanvasDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(deserializeDocument(String(reader.result))); }
      catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

export function autosave(doc: CircuitCanvasDocument) {
  try { localStorage.setItem(AUTOSAVE_KEY, serializeDocument(doc)); } catch { /* ignore */ }
}

export function loadAutosave(): CircuitCanvasDocument | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? deserializeDocument(raw) : null;
  } catch { return null; }
}

/** 生成 Markdown 方案报告并下载。 */
export function exportMarkdownReport(doc: CircuitCanvasDocument) {
  const total = doc.bom.reduce((s, l) => s + (l.unitPrice?.amount ?? 0) * l.quantity, 0);
  const lines: string[] = [];
  lines.push(`# ${doc.name} — 方案设计报告`);
  lines.push('');
  lines.push(`> 生成时间：${new Date().toLocaleString('zh-CN')} · Circuit Canvas v3`);
  lines.push('');
  lines.push('## 一、PCB 规格');
  lines.push('');
  lines.push('| 项目 | 参数 |');
  lines.push('|---|---|');
  lines.push(`| 板框尺寸 | ${doc.board.widthMm} × ${doc.board.heightMm} mm |`);
  lines.push(`| 板框形状 | ${doc.board.shape} |`);
  lines.push(`| 定位孔 | ${doc.board.mountingHolesEnabled ? '四角 Ø3.2mm' : '无'} |`);
  lines.push(`| 器件数量 | ${doc.components.length} |`);
  lines.push('');
  lines.push('## 二、BOM 清单');
  lines.push('');
  lines.push('| # | 位号 | 型号 | 厂商 | 封装 | 层 | 单价 | 数量 |');
  lines.push('|---|---|---|---|---|---|---|---|');
  doc.components.forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.reference} | ${c.mpn} | ${c.manufacturer} | ${c.footprint.name} | ${c.placement.side} | ¥${(c.unitPrice?.amount ?? 0).toFixed(2)} | ${c.quantity} |`);
  });
  lines.push('');
  lines.push(`**BOM 估算总价：¥${total.toFixed(2)}**`);
  lines.push('');
  lines.push('## 三、设计审查');
  lines.push('');
  for (const r of doc.reviewResults) {
    const mark = r.level === 'high' ? '🔴' : r.level === 'mid' ? '🟡' : 'ℹ️';
    lines.push(`- ${mark} **${r.title}**${r.detail ? ` — ${r.detail}` : ''}`);
  }
  lines.push('');
  lines.push('## 四、系统框图与原理图');
  lines.push('');
  lines.push('框图与原理图请在应用中使用「导出SVG」功能获取矢量图，插入本报告。');
  lines.push('');
  const md = lines.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  a.download = `${doc.name || 'design'}-报告.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}
