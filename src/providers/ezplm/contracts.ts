/**
 * providers/ezplm/contracts.ts
 * ezPLM 后端 API 的数据传输对象 (DTO) 契约。
 *
 * ⚠️ 这是基于诊断报告第十三节的「第一批 API」做的合理假设。
 * 拿到 ezPLM 真实接口文档后，只需修改此文件的字段名 + mappers.ts 的映射，
 * Provider 实现与上层 UI / 内核不用动。
 *
 * 约定的端点（baseUrl 由 config.apiBaseUrl 提供）：
 *   GET  /v1/me
 *   GET  /v1/components/search?keyword=&category=&orgOnly=&page=&pageSize=
 *   GET  /v1/components/{id}
 *   GET  /v1/components/{id}/footprints
 *   GET  /v1/components/{id}/alternatives
 *   GET  /v1/organizations/{orgId}/materials/{componentId}
 *   GET  /v1/reference-designs/peripheral-circuits?category=
 *   GET  /v1/projects/{id}/design
 *   PUT  /v1/projects/{id}/design
 */

export interface EzplmMoney {
  amount: number;
  currency: string;
}

export interface EzplmMeDto {
  user_id: string;
  display_name: string;
  organization_id?: string;
}

export interface EzplmOrgMaterialDto {
  organization_id: string;
  material_id: string;
  internal_part_number?: string;
  approved: boolean;
  preferred: boolean;
  stock_quantity?: number;
  last_purchase_price?: EzplmMoney;
  project_usage_count?: number;
}

export interface EzplmComponentDto {
  component_id: string;
  mpn: string;
  manufacturer: string;
  /** ezPLM 类别字段（可能是中文/编码，由 mapper 归一化为内部 ComponentCategory） */
  category: string;
  default_footprint: string;
  family: string;
  description: string;
  unit_price?: EzplmMoney;
  pin_count: number;
  attributes?: Record<string, string>;
  org_material?: EzplmOrgMaterialDto | null;
}

export interface EzplmPagedDto<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface EzplmFootprintDto {
  footprint_id: string;
  name: string;
  /** 焊盘外框尺寸（mm），用于 courtyard */
  courtyard_width_mm: number;
  courtyard_height_mm: number;
  body_width_mm: number;
  body_height_mm: number;
  assembly_height_mm?: number;
  pad_count: number;
  kicad_source: string;
  confidence: number;
  category: string;
}

export interface EzplmAlternativeDto {
  mpn: string;
  manufacturer: string;
  note: string;
  channel: string;
}

export interface EzplmPeripheralCircuitDto {
  name: string;
  parts: string;
  reason: string;
  quick_add_component_id?: string;
}
