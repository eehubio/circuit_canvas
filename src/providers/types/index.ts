/**
 * providers/types/index.ts
 * Provider 层接口契约。页面只依赖这些接口，不感知数据来自 Mock 还是 ezPLM。
 */
import type { ComponentCategory, Money } from '../../design-core/document/types';
import type { FootprintGeometry } from '../../design-core/geometry/types';

/* ---------- 通用 ---------- */
export interface AccessContext {
  userId: string;
  organizationId?: string;
  projectId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------- 元器件 ---------- */
export interface ComponentSearchQuery {
  keyword?: string;
  category?: ComponentCategory;
  orgOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface OrganizationMaterialInfo {
  organizationId: string;
  materialId: string;
  internalPartNumber?: string;
  approved: boolean;
  stockQuantity?: number;
  preferred: boolean;
  lastPurchasePrice?: Money;
  projectUsageCount?: number;
}

export interface ComponentSearchResult {
  componentId: string;
  mpn: string;
  manufacturer: string;
  category: ComponentCategory;
  defaultFootprintName: string;
  family: string;
  description: string;
  unitPrice?: Money;
  pins: number;
  attributes?: Record<string, string>;
  org?: OrganizationMaterialInfo; // 命中组织物料时附带
}

export interface FootprintOption {
  footprintId: string;
  name: string;
  geometry: FootprintGeometry;
  confidence: number;
  source: string; // KiCad 库来源
  category: string;
}

export interface ComponentAlternative {
  mpn: string;
  manufacturer: string;
  note: string;
  channel: string;
}

export interface PeripheralCircuitRecommendation {
  name: string;
  parts: string;
  why: string;
  /** 可一键加入画布的器件 componentId（若库中存在） */
  quickAddComponentId?: string;
}

export interface ComponentDataProvider {
  searchComponents(query: ComponentSearchQuery, ctx: AccessContext): Promise<Paginated<ComponentSearchResult>>;
  getComponentDetail(componentId: string, ctx: AccessContext): Promise<ComponentSearchResult | null>;
  getFootprintOptions(componentId: string, ctx: AccessContext): Promise<FootprintOption[]>;
  getAlternatives(componentId: string, ctx: AccessContext): Promise<ComponentAlternative[]>;
  getOrganizationContext(componentId: string, organizationId: string): Promise<OrganizationMaterialInfo | null>;
  /** 浏览全部封装（含分类） */
  listFootprints(category?: string): Promise<FootprintOption[]>;
}

/* ---------- 参考设计 / 子电路知识 ---------- */
export interface ReferenceDesignProvider {
  getRecommendedPeripheralCircuits(category: ComponentCategory, ctx: AccessContext): Promise<PeripheralCircuitRecommendation[]>;
}

/* ---------- 身份 ---------- */
export interface CurrentUser {
  userId: string;
  displayName: string;
  organizationId?: string;
}

export interface IdentityProvider {
  getCurrentUser(): Promise<CurrentUser>;
  getAccessContext(): Promise<AccessContext>;
}

/* ---------- 项目（写回 ezPLM 的契约） ---------- */
export interface ProjectProvider {
  saveDesignDocument(projectId: string, docJson: string, ctx: AccessContext): Promise<{ ref: string }>;
  loadDesignDocument(projectId: string, ctx: AccessContext): Promise<string | null>;
}

/* ---------- AI ---------- */
export interface AiSchemeRequest {
  prompt: string;
}
export interface AiSchemeResult {
  componentIds: string[];
  rationale: string;
}
export interface AiModelProvider {
  generateScheme(req: AiSchemeRequest, ctx: AccessContext): Promise<AiSchemeResult>;
}

/* ---------- Provider 集合 ---------- */
export interface ProviderRegistry {
  identity: IdentityProvider;
  components: ComponentDataProvider;
  referenceDesigns: ReferenceDesignProvider;
  project: ProjectProvider;
  ai: AiModelProvider;
}
