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
