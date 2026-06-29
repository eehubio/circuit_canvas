/**
 * design-core/document/types.ts
 * 统一设计文档模型 (CircuitCanvasDocument)。
 * 这是本地保存、后端存储、ezPLM 附件、版本比较、AI 输入、KiCad 导出的统一格式。
 */
import type { FootprintGeometry, BoardSide, Polygon, Point } from '../geometry/types';

export const SCHEMA_VERSION = '3.0.0';

export type RunMode = 'demo' | 'standalone' | 'integrated';
export type ComponentCategory = 'mcu' | 'power' | 'passive' | 'connector' | 'ic';
export type ComponentSource = 'EZPLM' | 'LOCAL' | 'CUSTOM' | 'MOCK';

export interface Money {
  amount: number;
  currency: string; // 'CNY' | 'USD' ...
}

/* ---------- 板框 ---------- */
export type BoardShapeKind = 'rect' | 'rounded' | 'circle' | 'lshape' | 'polygon';

export interface MountingHole {
  position: Point;
  diameterMm: number;
}

export interface PlacementZone {
  id: string;
  label: string;
  category?: ComponentCategory;
  /** 相对板框的归一化矩形 [x0,y0,x1,y1] (0..1) */
  normRect: [number, number, number, number];
}

export interface KeepoutZone {
  id: string;
  label: string;
  polygon: Polygon;
}

export interface BoardDefinition {
  id: string;
  widthMm: number;
  heightMm: number;
  shape: BoardShapeKind;
  outline?: Polygon; // polygon/lshape 时使用
  mountingHoles: MountingHole[];
  keepoutZones: KeepoutZone[];
  placementZones: PlacementZone[];
  layerCount?: number;
  /** 是否启用四角定位孔 */
  mountingHolesEnabled?: boolean;
}

/* ---------- 已放置器件 ---------- */
export interface PlacedComponent {
  instanceId: string;
  componentId: string;
  mpn: string;
  reference: string; // 位号 U1/C1/J1
  category: ComponentCategory;
  manufacturer: string;

  footprint: {
    footprintId: string;
    name: string;
    geometry: FootprintGeometry;
    confidence?: number;
  };

  placement: {
    xMm: number;
    yMm: number;
    rotation: number;
    side: BoardSide;
    locked: boolean;
  };

  functionalBlockId?: string;
  quantity: number;
  unitPrice?: Money;
  source: ComponentSource;

  /** 透传的展示属性（描述、关键参数等），不参与几何计算 */
  display?: {
    description?: string;
    family?: string;
    attributes?: Record<string, string>;
    pins?: number;
  };
}

/* ---------- 功能块 / 框图 ---------- */
export interface FunctionalBlock {
  id: string;
  label: string;
  sublabel?: string;
  shape: string; // rect | rounded | diamond | circle | hexagon | ...
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  componentIds?: string[]; // 关联的器件 instanceId
}

export type ConnectionStyle = 'single' | 'double' | 'none' | 'bus';

export interface LogicalConnection {
  id: string;
  fromId: string; // FunctionalBlock.id 或 PlacedComponent.instanceId
  toId: string;
  label: string;
  style: ConnectionStyle;
  color?: string;
}

/* ---------- BOM ---------- */
export interface BomLine {
  reference: string;
  mpn: string;
  manufacturer: string;
  footprint: string;
  quantity: number;
  unitPrice?: Money;
  description?: string;
}

/* ---------- 设计审查 ---------- */
export type ReviewLevel = 'high' | 'mid' | 'low' | 'info';

export interface ReviewFinding {
  id: string;
  level: ReviewLevel;
  title: string;
  detail?: string;
  category: 'completeness' | 'placement' | 'thermal' | 'emc' | 'sourcing' | 'mechanical';
}

/* ---------- 顶层文档 ---------- */
export interface CircuitCanvasDocument {
  schemaVersion: string;
  id: string;
  name: string;

  context: {
    tenantId?: string;
    organizationId?: string;
    workspaceId?: string;
    projectId?: string;
    source: RunMode;
  };

  board: BoardDefinition;
  components: PlacedComponent[];
  functionalBlocks: FunctionalBlock[];
  connections: LogicalConnection[];
  bom: BomLine[];
  reviewResults: ReviewFinding[];

  metadata: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    revision: number;
  };
}
