/**
 * state/designStore.ts
 * 设计状态管理 (Zustand + immer)。
 * 持有当前 CircuitCanvasDocument，提供器件增删改、撤销重做、放置等动作。
 * 编辑器状态(选中/缩放)与文档数据分离。
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CircuitCanvasDocument, PlacedComponent, BoardShapeKind } from '../design-core/document/types';
import { createDocument, touchDocument } from '../design-core/document/factory';
import type { ComponentSearchResult } from '../providers/types';
import { searchResultToPlaced, nextReference, buildBom, runDesignReview } from '../design-core/document/services';
import { solvePlacement, DEFAULT_PLACEMENT_RULES, autoPlaceAll } from '../design-core/placement';
import { clampComponentToBoard, hasOverlap, findOverlaps } from '../design-core/collision';
import { appConfig } from '../config';

const HISTORY_LIMIT = 60;

interface DesignState {
  doc: CircuitCanvasDocument;
  // editor-only state
  selectedId: string | null;
  multiSel: string[];
  overlaps: Set<string>;
  // history
  past: CircuitCanvasDocument[];
  future: CircuitCanvasDocument[];

  // actions
  addComponent: (r: ComponentSearchResult) => void;
  removeComponent: (instanceId: string) => void;
  moveComponent: (instanceId: string, xMm: number, yMm: number) => void;
  rotateComponent: (instanceId: string) => void;
  setBoardSize: (w: number, h: number) => void;
  setBoardShape: (shape: BoardShapeKind) => void;
  toggleMountingHoles: () => void;
  select: (id: string | null) => void;
  toggleMulti: (id: string) => void;
  clearAll: () => void;
  placeScheme: (results: ComponentSearchResult[]) => void;
  loadDocument: (doc: CircuitCanvasDocument) => void;
  undo: () => void;
  redo: () => void;
  recompute: () => void;
  // block diagram + connections
  setFunctionalBlocks: (blocks: CircuitCanvasDocument['functionalBlocks']) => void;
  setConnections: (conns: CircuitCanvasDocument['connections']) => void;
  generateBlocksFromComponents: () => void;
}

function snapshot(state: DesignState) {
  state.past.push(JSON.parse(JSON.stringify(state.doc)));
  if (state.past.length > HISTORY_LIMIT) state.past.shift();
  state.future = [];
}

function refreshDerived(doc: CircuitCanvasDocument): CircuitCanvasDocument {
  return { ...doc, bom: buildBom(doc), reviewResults: runDesignReview(doc) };
}

export const useDesignStore = create<DesignState>()(
  immer((set, _get) => ({
    doc: refreshDerived(createDocument({ source: appConfig.mode })),
    selectedId: null,
    multiSel: [],
    overlaps: new Set<string>(),
    past: [],
    future: [],

    addComponent: (r) =>
      set((s) => {
        snapshot(s);
        const placed = searchResultToPlaced(r, nextReference(r.category, s.doc.components));
        const pos = solvePlacement(placed, { board: s.doc.board, existing: s.doc.components, rules: DEFAULT_PLACEMENT_RULES });
        placed.placement.xMm = pos.x;
        placed.placement.yMm = pos.y;
        s.doc.components.push(placed);
        s.doc = touchDocument(refreshDerived(s.doc));
        s.overlaps = findOverlaps(s.doc.components);
      }),

    removeComponent: (id) =>
      set((s) => {
        snapshot(s);
        s.doc.components = s.doc.components.filter((c) => c.instanceId !== id);
        s.doc = touchDocument(refreshDerived(s.doc));
        s.selectedId = s.selectedId === id ? null : s.selectedId;
        s.overlaps = findOverlaps(s.doc.components);
      }),

    moveComponent: (id, xMm, yMm) =>
      set((s) => {
        const c = s.doc.components.find((x) => x.instanceId === id);
        if (!c) return;
        c.placement.xMm = xMm;
        c.placement.yMm = yMm;
        const clamped = clampComponentToBoard(c, s.doc.board);
        c.placement.xMm = clamped.x;
        c.placement.yMm = clamped.y;
        s.overlaps = findOverlaps(s.doc.components);
      }),

    rotateComponent: (id) =>
      set((s) => {
        snapshot(s);
        const c = s.doc.components.find((x) => x.instanceId === id);
        if (!c) return;
        c.placement.rotation = (c.placement.rotation + (c.footprint.geometry.rotationStep || 90)) % 360;
        const clamped = clampComponentToBoard(c, s.doc.board);
        c.placement.xMm = clamped.x;
        c.placement.yMm = clamped.y;
        s.doc = touchDocument(s.doc);
        s.overlaps = findOverlaps(s.doc.components);
      }),

    setBoardSize: (w, h) =>
      set((s) => {
        s.doc.board.widthMm = w;
        s.doc.board.heightMm = h;
        s.doc = touchDocument(s.doc);
      }),

    setBoardShape: (shape) =>
      set((s) => {
        s.doc.board.shape = shape;
        s.doc = touchDocument(s.doc);
      }),

    toggleMountingHoles: () =>
      set((s) => {
        s.doc.board.mountingHolesEnabled = !s.doc.board.mountingHolesEnabled;
        s.doc = touchDocument(s.doc);
        s.overlaps = findOverlaps(s.doc.components);
      }),

    select: (id) => set((s) => { s.selectedId = id; }),
    toggleMulti: (id) =>
      set((s) => {
        s.multiSel = s.multiSel.includes(id) ? s.multiSel.filter((x) => x !== id) : [...s.multiSel, id];
      }),

    clearAll: () =>
      set((s) => {
        snapshot(s);
        s.doc.components = [];
        s.doc = touchDocument(refreshDerived(s.doc));
        s.selectedId = null;
        s.multiSel = [];
        s.overlaps = new Set();
      }),

    placeScheme: (results) =>
      set((s) => {
        snapshot(s);
        let placed: PlacedComponent[] = [];
        for (const r of results) {
          const p = searchResultToPlaced(r, nextReference(r.category, placed));
          placed.push(p);
        }
        placed = autoPlaceAll(placed, s.doc.board, DEFAULT_PLACEMENT_RULES);
        s.doc.components = placed;
        s.doc = touchDocument(refreshDerived(s.doc));
        s.overlaps = findOverlaps(s.doc.components);
      }),

    loadDocument: (doc) =>
      set((s) => {
        snapshot(s);
        s.doc = refreshDerived(doc);
        s.selectedId = null;
        s.multiSel = [];
        s.overlaps = findOverlaps(doc.components);
      }),

    undo: () =>
      set((s) => {
        const prev = s.past.pop();
        if (!prev) return;
        s.future.push(JSON.parse(JSON.stringify(s.doc)));
        s.doc = prev;
        s.overlaps = findOverlaps(prev.components);
        s.selectedId = null;
      }),

    redo: () =>
      set((s) => {
        const next = s.future.pop();
        if (!next) return;
        s.past.push(JSON.parse(JSON.stringify(s.doc)));
        s.doc = next;
        s.overlaps = findOverlaps(next.components);
      }),

    recompute: () => set((s) => { s.doc = refreshDerived(s.doc); s.overlaps = findOverlaps(s.doc.components); }),

    setFunctionalBlocks: (blocks) => set((s) => { s.doc.functionalBlocks = blocks; }),
    setConnections: (conns) => set((s) => { s.doc.connections = conns; }),

    generateBlocksFromComponents: () =>
      set((s) => {
        // 按类别聚合生成功能块（一个类别一个块）
        // 框图只保留功能性核心器件，过滤掉无源辅助器件（阻容感）
        const byCat = new Map<string, typeof s.doc.components>();
        for (const c of s.doc.components) {
          if (c.category === 'passive') continue; // 跳过阻容感
          const arr = byCat.get(c.category) ?? [];
          arr.push(c);
          byCat.set(c.category, arr);
        }
        const labels: Record<string, string> = { mcu: '主控', power: '电源', passive: '无源', connector: '接口', ic: '外设IC' };
        const colors: Record<string, string> = { mcu: '#1a6b3c', power: '#b45309', passive: '#4b5563', connector: '#6d28d9', ic: '#0e7490' };
        let i = 0;
        const blocks = Array.from(byCat.entries()).map(([cat, comps]) => {
          const b = {
            id: `blk_${cat}`,
            label: labels[cat] ?? cat,
            sublabel: comps.map((c) => c.reference).join(' '),
            shape: 'rounded',
            x: 60 + (i % 3) * 200,
            y: 40 + Math.floor(i / 3) * 130,
            w: 150,
            h: 70,
            color: colors[cat] ?? '#4b5563',
            componentIds: comps.map((c) => c.instanceId),
          };
          i++;
          return b;
        });
        // 自动连线：电源→主控/外设、接口→主控、主控→外设
        const find = (cat: string) => blocks.find((b) => b.id === `blk_${cat}`);
        const conns: typeof s.doc.connections = [];
        const mk = (from: string, to: string, label: string) => conns.push({ id: `c_${from}_${to}`, fromId: from, toId: to, label, style: 'single' as const });
        if (find('power') && find('mcu')) mk('blk_power', 'blk_mcu', 'VCC');
        if (find('power') && find('ic')) mk('blk_power', 'blk_ic', 'VCC');
        if (find('connector') && find('mcu')) mk('blk_connector', 'blk_mcu', 'IO');
        if (find('mcu') && find('ic')) mk('blk_mcu', 'blk_ic', 'BUS');
        s.doc.functionalBlocks = blocks;
        s.doc.connections = conns;
      }),
  }))
);
