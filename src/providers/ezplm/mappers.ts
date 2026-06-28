/**
 * providers/ezplm/mappers.ts
 * ezPLM DTO → 内部领域模型 的映射层。
 * 拿到真实接口后，主要在这里调整字段名/枚举映射。
 */
import type {
  EzplmComponentDto, EzplmFootprintDto, EzplmAlternativeDto,
  EzplmOrgMaterialDto, EzplmPeripheralCircuitDto,
} from './contracts';
import type {
  ComponentSearchResult, FootprintOption, ComponentAlternative,
  OrganizationMaterialInfo, PeripheralCircuitRecommendation,
} from '../types';
import type { ComponentCategory } from '../../design-core/document/types';
import type { FootprintGeometry } from '../../design-core/geometry/types';
import { geometryFor } from '../mock/data';

/** ezPLM 类别 → 内部类别。真实接口的类别取值在此归一化。 */
const CATEGORY_MAP: Record<string, ComponentCategory> = {
  mcu: 'mcu', processor: 'mcu', 微控制器: 'mcu',
  power: 'power', pmic: 'power', 电源: 'power',
  passive: 'passive', 无源: 'passive', resistor: 'passive', capacitor: 'passive',
  connector: 'connector', 连接器: 'connector',
  ic: 'ic', 集成电路: 'ic',
};

export function mapCategory(raw: string): ComponentCategory {
  return CATEGORY_MAP[raw?.toLowerCase?.() ?? raw] ?? 'ic';
}

export function mapOrgMaterial(dto: EzplmOrgMaterialDto | null | undefined): OrganizationMaterialInfo | undefined {
  if (!dto) return undefined;
  return {
    organizationId: dto.organization_id,
    materialId: dto.material_id,
    internalPartNumber: dto.internal_part_number,
    approved: dto.approved,
    preferred: dto.preferred,
    stockQuantity: dto.stock_quantity,
    lastPurchasePrice: dto.last_purchase_price,
    projectUsageCount: dto.project_usage_count,
  };
}

export function mapComponent(dto: EzplmComponentDto): ComponentSearchResult {
  return {
    componentId: dto.component_id,
    mpn: dto.mpn,
    manufacturer: dto.manufacturer,
    category: mapCategory(dto.category),
    defaultFootprintName: dto.default_footprint,
    family: dto.family,
    description: dto.description,
    unitPrice: dto.unit_price,
    pins: dto.pin_count,
    attributes: dto.attributes,
    org: mapOrgMaterial(dto.org_material),
  };
}

export function mapFootprint(dto: EzplmFootprintDto): FootprintOption {
  const geometry: FootprintGeometry = {
    footprintId: dto.footprint_id,
    bodyWidthMm: dto.body_width_mm,
    bodyHeightMm: dto.body_height_mm,
    courtyardWidthMm: dto.courtyard_width_mm,
    courtyardHeightMm: dto.courtyard_height_mm,
    assemblyHeightMm: dto.assembly_height_mm,
    padCount: dto.pad_count,
    rotationStep: 90,
    anchor: { x: 0, y: 0 },
  };
  return {
    footprintId: dto.footprint_id,
    name: dto.name,
    geometry,
    confidence: dto.confidence,
    source: dto.kicad_source,
    category: dto.category,
  };
}

/** 真实接口缺失几何时的兜底：用本地几何库按封装名估算。 */
export function fallbackFootprint(footprintName: string): FootprintOption {
  return {
    footprintId: footprintName,
    name: footprintName,
    geometry: geometryFor(footprintName),
    confidence: 0.5,
    source: 'fallback',
    category: 'unknown',
  };
}

export function mapAlternative(dto: EzplmAlternativeDto): ComponentAlternative {
  return { mpn: dto.mpn, manufacturer: dto.manufacturer, note: dto.note, channel: dto.channel };
}

export function mapPeripheralCircuit(dto: EzplmPeripheralCircuitDto): PeripheralCircuitRecommendation {
  return { name: dto.name, parts: dto.parts, why: dto.reason, quickAddComponentId: dto.quick_add_component_id };
}
