/**
 * server/src/data.js
 * 后端演示数据。字段名遵循 ezPLM DTO 契约 (snake_case)，
 * 使前端 EzplmComponentDataProvider 在 standalone 模式可直接消费。
 * 正式版替换为 PostgreSQL 查询 / ezPLM 元器件库代理。
 */
const C = (component_id, mpn, manufacturer, category, default_footprint, family, description, price, pin_count, isOrg) => ({
  component_id, mpn, manufacturer, category, default_footprint, family, description,
  unit_price: { amount: price, currency: 'CNY' }, pin_count,
  org_material: isOrg ? { organization_id: 'org-local', material_id: component_id, internal_part_number: `INT-${component_id.toUpperCase()}`, approved: true, preferred: true, stock_quantity: 500, project_usage_count: 3 } : null,
  isOrg,
});

export const COMPONENTS = [
  C('stm32f103', 'STM32F103C8T6', 'ST', 'mcu', 'LQFP-48', 'STM32F1', 'ARM Cortex-M3 72MHz 64KB Flash', 8.5, 48, true),
  C('esp32s3', 'ESP32-S3-WROOM-1', 'Espressif', 'mcu', 'Module-44', 'ESP32', 'Wi-Fi+BLE5 双核 240MHz', 15.8, 44, false),
  C('lm1117', 'LM1117-3.3', 'TI', 'power', 'SOT-223', 'LDO', '3.3V 800mA LDO', 0.85, 4, true),
  C('tps5430', 'TPS5430DDAR', 'TI', 'power', 'SOIC-8', 'Buck', '5.5-36V 3A 降压', 5.2, 8, true),
  C('cap100nf', 'CL10B104KB8NNNC', 'Samsung', 'passive', '0402', 'MLCC', '100nF 50V X7R', 0.02, 2, true),
  C('res10k', 'RC0402FR-0710KL', 'Yageo', 'passive', '0402', 'Resistor', '10KΩ 1%', 0.008, 2, true),
  C('usbc', 'TYPE-C-31-M-12', 'Korean Hroparts', 'connector', 'USB-C-16P', 'USB-C', 'USB Type-C 母座', 1.2, 16, true),
  C('header2x5', 'PZ254V-12-05P2', 'Ckmtw', 'connector', 'THT-2.54mm', 'Pin Header', '2.54mm 2x5P', 0.3, 10, true),
  C('ch340', 'CH340G', 'WCH', 'ic', 'SOP-16', 'USB-UART', 'USB转串口', 2.8, 16, true),
  C('w25q64', 'W25Q64JVSIQ', 'Winbond', 'ic', 'SOIC-8', 'NOR Flash', '64Mbit SPI Flash', 3.5, 8, false),
  C('tja1050', 'TJA1050T/CM', 'NXP', 'ic', 'SOIC-8', 'CAN Transceiver', '高速CAN收发器', 4.1, 8, false),
];

export const FOOTPRINTS = [
  { footprint_id: 'LQFP-48', name: 'LQFP-48', kicad_source: 'KiCad/Package_QFP', confidence: 1, category: 'qfp', body_width_mm: 7, body_height_mm: 7, courtyard_width_mm: 9.2, courtyard_height_mm: 9.2, assembly_height_mm: 1.6, pad_count: 48 },
  { footprint_id: 'SOT-223', name: 'SOT-223', kicad_source: 'KiCad/Package_TO_SOT_SMD', confidence: 1, category: 'sot', body_width_mm: 6.5, body_height_mm: 3.5, courtyard_width_mm: 8, courtyard_height_mm: 4.5, pad_count: 4 },
  { footprint_id: '0402', name: '0402', kicad_source: 'KiCad/Resistor_SMD', confidence: 1, category: 'smd_chip', body_width_mm: 1, body_height_mm: 0.5, courtyard_width_mm: 1.5, courtyard_height_mm: 0.9, pad_count: 2 },
  { footprint_id: 'SOIC-8', name: 'SOIC-8', kicad_source: 'KiCad/Package_SO', confidence: 1, category: 'soic', body_width_mm: 4.9, body_height_mm: 3.9, courtyard_width_mm: 6, courtyard_height_mm: 5, pad_count: 8 },
];

export const ALTERNATIVES = {
  'STM32F103C8T6': [
    { mpn: 'GD32F103C8T6', manufacturer: 'GigaDevice', note: '引脚兼容，主频更高', channel: '立创商城' },
    { mpn: 'CH32F103C8T6', manufacturer: 'WCH', note: '国产替代，价格低50%', channel: '立创商城' },
  ],
  'LM1117-3.3': [{ mpn: 'AMS1117-3.3', manufacturer: 'AMS', note: '直接替代，价格低60%', channel: '立创商城' }],
  'CH340G': [{ mpn: 'CP2102N', manufacturer: 'Silicon Labs', note: '更稳定，免晶振', channel: '得捷/贸泽' }],
};

export const SUBCIRCUITS = {
  mcu: [
    { name: '时钟电路', parts: '8MHz晶振 + 2×22pF', reason: '提供时钟源' },
    { name: '复位电路', parts: '10KΩ上拉 + 100nF + 按键', reason: '上电/手动复位', quick_add_component_id: 'res10k' },
    { name: '去耦网络', parts: '每VDD 100nF + 10μF', reason: '抑制电源噪声', quick_add_component_id: 'cap100nf' },
  ],
  power: [{ name: '输入保护', parts: '保险丝 + TVS', reason: '过流过压保护' }],
  connector: [{ name: 'ESD防护', parts: 'USBLC6-2SC6', reason: '静电防护' }],
  ic: [{ name: '去耦电容', parts: '电源引脚100nF', reason: '高频去耦', quick_add_component_id: 'cap100nf' }],
  passive: [],
};
