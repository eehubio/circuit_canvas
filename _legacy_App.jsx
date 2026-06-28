import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ================================================================
   DATA
   ================================================================ */
const CATEGORIES = [
  { id: "mcu", name: "微控制器", icon: "🔲",
    items: [
      { id: "stm32f103", mpn: "STM32F103C8T6", manufacturer: "ST", pkg: "LQFP-48", family: "STM32F1", price: 8.5, org: true, desc: "ARM Cortex-M3 72MHz 64KB Flash", pins: 48, attrs: { core: "Cortex-M3", freq: "72MHz", flash: "64KB", ram: "20KB" } },
      { id: "stm32f407", mpn: "STM32F407VET6", manufacturer: "ST", pkg: "LQFP-100", family: "STM32F4", price: 28.0, org: true, desc: "ARM Cortex-M4 168MHz 512KB Flash", pins: 100, attrs: { core: "Cortex-M4F", freq: "168MHz", flash: "512KB", ram: "192KB" } },
      { id: "esp32s3", mpn: "ESP32-S3-WROOM-1", manufacturer: "Espressif", pkg: "Module-44", family: "ESP32", price: 15.8, org: false, desc: "Wi-Fi+BLE5 双核Xtensa 240MHz", pins: 44, attrs: { core: "Xtensa LX7", freq: "240MHz", wireless: "Wi-Fi+BLE5" } },
      { id: "gd32f303", mpn: "GD32F303CCT6", manufacturer: "GigaDevice", pkg: "LQFP-48", family: "GD32F3", price: 6.2, org: false, desc: "ARM Cortex-M4 120MHz 256KB Flash", pins: 48, attrs: { core: "Cortex-M4", freq: "120MHz", flash: "256KB" } },
    ]},
  { id: "power", name: "电源管理", icon: "⚡",
    items: [
      { id: "lm1117", mpn: "LM1117-3.3", manufacturer: "TI", pkg: "SOT-223", family: "LDO", price: 0.85, org: true, desc: "3.3V 800mA 低压差线性稳压器", pins: 4, attrs: { vout: "3.3V", iout: "800mA", vin: "4.75-15V" } },
      { id: "tps5430", mpn: "TPS5430DDAR", manufacturer: "TI", pkg: "SOIC-8", family: "Buck", price: 5.2, org: true, desc: "5.5-36V输入 3A同步降压", pins: 8, attrs: { vin: "5.5-36V", vout: "1.22-33V", iout: "3A" } },
      { id: "ams1117", mpn: "AMS1117-3.3", manufacturer: "AMS", pkg: "SOT-223", family: "LDO", price: 0.35, org: false, desc: "3.3V 1A 低压差线性稳压器", pins: 4, attrs: { vout: "3.3V", iout: "1A", dropout: "1.3V" } },
      { id: "mp2315", mpn: "MP2315GJ-Z", manufacturer: "MPS", pkg: "TSOT-23-8", family: "Buck", price: 3.8, org: false, desc: "4.5-24V 3A 同步降压转换器", pins: 8, attrs: { vin: "4.5-24V", iout: "3A", freq: "500kHz" } },
    ]},
  { id: "passive", name: "无源器件", icon: "◇",
    items: [
      { id: "cap100nf", mpn: "CL10B104KB8NNNC", manufacturer: "Samsung", pkg: "0402", family: "MLCC", price: 0.02, org: true, desc: "100nF 50V X7R 陶瓷贴片电容", pins: 2, attrs: { cap: "100nF", voltage: "50V", dielectric: "X7R" } },
      { id: "res10k", mpn: "RC0402FR-0710KL", manufacturer: "Yageo", pkg: "0402", family: "Resistor", price: 0.008, org: true, desc: "10KΩ ±1% 1/16W 贴片电阻", pins: 2, attrs: { resistance: "10KΩ", tolerance: "1%", power: "1/16W" } },
      { id: "ind4u7", mpn: "SWPA4018S4R7MT", manufacturer: "Sunlord", pkg: "SMD-4018", family: "Inductor", price: 0.45, org: true, desc: "4.7μH 2.1A 功率电感", pins: 2, attrs: { inductance: "4.7μH", current: "2.1A", dcr: "85mΩ" } },
    ]},
  { id: "connector", name: "连接器", icon: "⊞",
    items: [
      { id: "usbc", mpn: "TYPE-C-31-M-12", manufacturer: "Korean Hroparts", pkg: "SMD-16P", family: "USB-C", price: 1.2, org: true, desc: "USB Type-C 母座 16Pin SMD", pins: 16, attrs: { type: "USB-C", pins: "16P", mount: "SMD" } },
      { id: "header2x5", mpn: "PZ254V-12-05P2", manufacturer: "Ckmtw", pkg: "THT-2.54mm", family: "Pin Header", price: 0.3, org: true, desc: "2.54mm 2x5P 直插排针", pins: 10, attrs: { pitch: "2.54mm", rows: "2x5", mount: "THT" } },
    ]},
  { id: "ic", name: "集成电路", icon: "◻",
    items: [
      { id: "ch340", mpn: "CH340G", manufacturer: "WCH", pkg: "SOP-16", family: "USB-UART", price: 2.8, org: true, desc: "USB转串口桥接芯片", pins: 16, attrs: { interface: "USB→UART", speed: "2Mbps", esd: "±2kV" } },
      { id: "w25q64", mpn: "W25Q64JVSIQ", manufacturer: "Winbond", pkg: "SOIC-8", family: "NOR Flash", price: 3.5, org: false, desc: "64Mbit SPI NOR Flash", pins: 8, attrs: { capacity: "64Mbit", interface: "SPI", speed: "133MHz" } },
      { id: "tja1050", mpn: "TJA1050T/CM", manufacturer: "NXP", pkg: "SOIC-8", family: "CAN Transceiver", price: 4.1, org: false, desc: "高速CAN总线收发器", pins: 8, attrs: { speed: "1Mbps", nodes: "110", esd: "±8kV" } },
    ]},
];

const ALL_ITEMS = CATEGORIES.flatMap(c => c.items.map(i => ({ ...i, category: c.id, categoryName: c.name })));
const REF_PREFIX = { mcu: "U", power: "U", passive: "C", connector: "J", ic: "U" };
const SHAPE_CFG = {
  mcu:       { w: 110, h: 88, color: "#1a6b3c" },
  power:     { w: 76,  h: 52, color: "#b45309" },
  passive:   { w: 44,  h: 24, color: "#4b5563" },
  connector: { w: 56,  h: 64, color: "#6d28d9" },
  ic:        { w: 86,  h: 56, color: "#0e7490" },
};

/* ================================================================
   FOOTPRINT LIBRARY  (with categories)
   ================================================================ */
const FOOTPRINT_CATS = [
  { id: "smd_chip", name: "贴片阻容", icon: "▭", items: [
    { id: "fp0201", name: "0201", desc: "0.6×0.3mm 贴片", source: "KiCad/Resistor_SMD" },
    { id: "fp0402", name: "0402", desc: "1.0×0.5mm 贴片", source: "KiCad/Resistor_SMD" },
    { id: "fp0603", name: "0603", desc: "1.6×0.8mm 贴片", source: "KiCad/Resistor_SMD" },
    { id: "fp0805", name: "0805", desc: "2.0×1.25mm 贴片", source: "KiCad/Resistor_SMD" },
    { id: "fp1206", name: "1206", desc: "3.2×1.6mm 贴片", source: "KiCad/Resistor_SMD" },
  ]},
  { id: "sot", name: "小外形晶体管", icon: "◮", items: [
    { id: "fpsot23", name: "SOT-23", desc: "3引脚小外形", source: "KiCad/Package_TO_SOT_SMD" },
    { id: "fpsot223", name: "SOT-223", desc: "4引脚功率封装", source: "KiCad/Package_TO_SOT_SMD" },
    { id: "fpsot89", name: "SOT-89", desc: "3引脚中功率", source: "KiCad/Package_TO_SOT_SMD" },
  ]},
  { id: "soic", name: "SOIC/SOP", icon: "▤", items: [
    { id: "fpsoic8", name: "SOIC-8", desc: "8引脚 1.27mm间距", source: "KiCad/Package_SO" },
    { id: "fpsoic16", name: "SOIC-16", desc: "16引脚 1.27mm间距", source: "KiCad/Package_SO" },
    { id: "fpsop16", name: "SOP-16", desc: "16引脚窄体", source: "KiCad/Package_SO" },
    { id: "fptssop20", name: "TSSOP-20", desc: "20引脚 0.65mm间距", source: "KiCad/Package_SO" },
  ]},
  { id: "qfp", name: "QFP/QFN", icon: "▦", items: [
    { id: "fplqfp48", name: "LQFP-48", desc: "48引脚 0.5mm间距", source: "KiCad/Package_QFP" },
    { id: "fplqfp100", name: "LQFP-100", desc: "100引脚 0.5mm间距", source: "KiCad/Package_QFP" },
    { id: "fpqfn32", name: "QFN-32", desc: "32引脚 带散热盘", source: "KiCad/Package_DFN_QFN" },
  ]},
  { id: "tht", name: "直插类", icon: "⫧", items: [
    { id: "fpdip8", name: "DIP-8", desc: "8引脚双列直插", source: "KiCad/Package_DIP" },
    { id: "fpto220", name: "TO-220", desc: "功率器件直插", source: "KiCad/Package_TO_SOT_THT" },
    { id: "fpheader254", name: "PinHeader 2.54", desc: "2.54mm排针", source: "KiCad/Connector_PinHeader" },
  ]},
  { id: "conn", name: "连接器封装", icon: "⊟", items: [
    { id: "fpusbc", name: "USB-C-16P", desc: "Type-C 16Pin SMD", source: "KiCad/Connector_USB" },
    { id: "fpmicrousb", name: "Micro-USB-B", desc: "Micro USB 母座", source: "KiCad/Connector_USB" },
    { id: "fpsma", name: "SMA-Edge", desc: "SMA 板边连接器", source: "KiCad/Connector_Coaxial" },
  ]},
];

/* ================================================================
   AI KNOWLEDGE BASE  (sub-circuits / alternatives / power / tools)
   ================================================================ */
const SUBCIRCUIT_RULES = {
  mcu: [
    { name: "时钟电路", parts: "8MHz/16MHz晶振 + 2×22pF负载电容", why: "为MCU提供精确时钟源" },
    { name: "复位电路", parts: "10KΩ上拉电阻 + 100nF电容 + 复位按键", why: "上电复位与手动复位" },
    { name: "去耦网络", parts: "每个VDD引脚100nF + 整体10μF钽电容", why: "抑制电源噪声，保证供电稳定" },
    { name: "调试接口", parts: "SWD排针(2.54mm 2×5P)", why: "程序烧录与在线调试" },
    { name: "BOOT配置", parts: "BOOT0下拉10KΩ电阻", why: "选择启动模式" },
  ],
  power: [
    { name: "输入保护", parts: "自恢复保险丝 + TVS二极管(SMAJ5.0A)", why: "过流过压保护" },
    { name: "输入滤波", parts: "10μF + 100nF 并联输入电容", why: "抑制输入纹波" },
    { name: "输出滤波", parts: "22μF输出电容 + 磁珠", why: "降低输出噪声" },
  ],
  connector: [
    { name: "ESD防护", parts: "USBLC6-2SC6 ESD保护芯片", why: "静电防护，保护数据线" },
    { name: "CC配置", parts: "2×5.1KΩ CC下拉电阻 (USB-C)", why: "USB-C设备模式识别" },
  ],
  ic: [
    { name: "去耦电容", parts: "每个电源引脚就近放置100nF", why: "高频去耦" },
    { name: "SPI上拉", parts: "CS引脚10KΩ上拉 (Flash类)", why: "防止总线悬空误操作" },
  ],
};

const ALTERNATIVES_DB = {
  "STM32F103C8T6": [
    { mpn: "GD32F103C8T6", maker: "GigaDevice", note: "引脚兼容，主频更高(108MHz)，价格约低30%", channel: "立创商城/淘宝" },
    { mpn: "CH32F103C8T6", maker: "WCH", note: "引脚兼容，国产替代，价格约低50%", channel: "立创商城" },
    { mpn: "APM32F103C8T6", maker: "Geehy", note: "引脚兼容，工业级", channel: "立创商城/得捷" },
  ],
  "LM1117-3.3": [
    { mpn: "AMS1117-3.3", maker: "AMS", note: "直接替代，价格约低60%", channel: "立创商城" },
    { mpn: "ME6211C33", maker: "Microne", note: "低静态电流，适合电池供电", channel: "立创商城" },
  ],
  "CH340G": [
    { mpn: "CP2102N", maker: "Silicon Labs", note: "更稳定的驱动，免晶振", channel: "得捷/贸泽" },
    { mpn: "CH340C", maker: "WCH", note: "内置晶振版本，省一个晶振", channel: "立创商城" },
  ],
  "ESP32-S3-WROOM-1": [
    { mpn: "ESP32-C3-WROOM-02", maker: "Espressif", note: "RISC-V单核，成本更低，适合简单应用", channel: "立创商城/官方" },
  ],
  "W25Q64JVSIQ": [
    { mpn: "GD25Q64C", maker: "GigaDevice", note: "引脚兼容，国产替代", channel: "立创商城" },
    { mpn: "BY25Q64AS", maker: "Boya", note: "引脚兼容，价格更低", channel: "立创商城" },
  ],
};

const DESIGN_TOOLS = {
  simulation: [
    { name: "LTspice", desc: "免费SPICE电路仿真（模拟电路/电源）", url: "analog.com/ltspice" },
    { name: "Falstad", desc: "在线交互式电路仿真，适合快速验证", url: "falstad.com/circuit" },
    { name: "Proteus", desc: "MCU系统级仿真（支持STM32/51）", url: "labcenter.com" },
  ],
  software: [
    { name: "STM32CubeIDE", desc: "ST官方IDE，含图形化配置", url: "st.com/stm32cubeide" },
    { name: "PlatformIO", desc: "跨平台嵌入式开发（VSCode插件）", url: "platformio.org" },
    { name: "ESP-IDF", desc: "乐鑫官方开发框架", url: "docs.espressif.com" },
  ],
  resources: [
    { name: "立创EDA", desc: "国产在线PCB设计工具，与立创商城打通", url: "lceda.cn" },
    { name: "KiCad", desc: "开源PCB设计软件，封装库丰富", url: "kicad.org" },
    { name: "嘉立创", desc: "PCB打样（2层板低至几元）", url: "jlc.com" },
    { name: "Saturn PCB Toolkit", desc: "PCB参数计算（阻抗/走线宽度/过孔）", url: "saturnpcb.com" },
  ],
};

/* PCB board shapes for irregular boards */
const PCB_SHAPES = [
  { id: "rect", name: "矩形", icon: "▭" },
  { id: "rounded", name: "圆角矩形", icon: "▢" },
  { id: "circle", name: "圆形", icon: "○" },
  { id: "lshape", name: "L形(异形)", icon: "⌐" },
  { id: "import3d", name: "3D导入", icon: "⬆" },
];

/* ================================================================
   AI DESIGN REPORT GENERATOR  →  Markdown
   ================================================================ */
function generateDesignReport(canvas, pcbSize, pcbShape) {
  const date = new Date().toLocaleDateString("zh-CN");
  const cats = {};
  canvas.forEach(c => { if (!cats[c.category]) cats[c.category] = []; cats[c.category].push(c); });
  const total = canvas.reduce((s, c) => s + c.price, 0);
  const hasMcu = !!cats.mcu, hasPower = !!cats.power, hasConn = !!cats.connector;
  const pinTotal = canvas.reduce((s, c) => s + (c.pins || 0), 0);
  const density = canvas.length / ((pcbSize.w * pcbSize.h) / 1000); // parts per 10cm²

  let md = `# 电路方案设计报告\n\n`;
  md += `> 生成时间：${date} ｜ 工具：Circuit Canvas v2 AI方案设计\n\n`;

  /* ---- 1. 方案概述 ---- */
  md += `## 一、方案概述\n\n`;
  md += `| 项目 | 内容 |\n|---|---|\n`;
  md += `| 器件总数 | ${canvas.length} 个（${Object.keys(cats).length} 类） |\n`;
  md += `| 估算BOM成本 | ¥${total.toFixed(2)}（单件，1+价格） |\n`;
  md += `| PCB尺寸 | ${pcbSize.w}mm × ${pcbSize.h}mm（${pcbShape === "rect" ? "矩形" : pcbShape === "circle" ? "圆形" : pcbShape === "lshape" ? "L形异形" : "圆角矩形"}） |\n`;
  md += `| 总引脚数 | ${pinTotal} |\n\n`;
  md += `### 器件清单\n\n| 位号 | 型号 | 厂商 | 封装 | 单价 |\n|---|---|---|---|---|\n`;
  canvas.forEach(c => { md += `| ${c.refDes} | ${c.mpn} | ${c.manufacturer} | ${c.pkg} | ¥${c.price.toFixed(2)} |\n`; });
  md += `\n`;

  /* ---- 2. 子电路推荐 ---- */
  md += `## 二、子电路推荐\n\n根据当前器件组合，建议补充以下子电路：\n\n`;
  Object.keys(cats).forEach(cat => {
    const rules = SUBCIRCUIT_RULES[cat];
    if (!rules) return;
    const catName = CATEGORIES.find(c => c.id === cat)?.name || cat;
    md += `### ${catName}（${cats[cat].map(c => c.refDes).join("、")}）\n\n`;
    rules.forEach(r => { md += `- **${r.name}**：${r.parts}\n  - 作用：${r.why}\n`; });
    md += `\n`;
  });

  /* ---- 3. 替代料与购买渠道 ---- */
  md += `## 三、替代料与采购优化\n\n`;
  let hasAlt = false;
  canvas.forEach(c => {
    const alts = ALTERNATIVES_DB[c.mpn];
    if (!alts) return;
    hasAlt = true;
    md += `### ${c.refDes} ${c.mpn}\n\n| 替代型号 | 厂商 | 说明 | 渠道 |\n|---|---|---|---|\n`;
    alts.forEach(a => { md += `| ${a.mpn} | ${a.maker} | ${a.note} | ${a.channel} |\n`; });
    md += `\n`;
  });
  if (!hasAlt) md += `当前器件暂无推荐替代料记录。建议在立创商城搜索同规格参数进行比价。\n\n`;
  md += `**主要采购渠道对比**：\n\n`;
  md += `| 渠道 | 优势 | 适用场景 |\n|---|---|---|\n`;
  md += `| 立创商城 | 国产料齐全、当天发货 | 打样/小批量 |\n`;
  md += `| 得捷(DigiKey) | 原装正品、全球料号 | 进口料/研发 |\n`;
  md += `| 贸泽(Mouser) | 新品上架快 | 进口料/研发 |\n`;
  md += `| 华强北/深贸 | 价格低 | 大批量（需验货） |\n\n`;

  /* ---- 4. 电源供电方案 ---- */
  md += `## 四、电源供电方案\n\n`;
  if (hasPower) {
    const powerParts = cats.power.map(c => c.mpn).join("、");
    md += `当前方案已包含电源器件：${powerParts}。\n\n`;
  }
  md += `### 推荐供电架构\n\n`;
  md += "```\n";
  md += `输入电源(5V USB / 12V DC)\n  ├── TVS保护 + 自恢复保险丝\n  ├── DC-DC降压(若输入>6V): TPS5430 → 5V\n  └── LDO: LM1117/ME6211 → 3.3V\n        ├── MCU供电 (独立磁珠隔离)\n        ├── 模拟电路供电 (LC滤波)\n        └── 外设供电\n`;
  md += "```\n\n";
  md += `**设计要点**：\n\n`;
  md += `- 估算总功耗后预留 50% 余量选择电源芯片\n`;
  md += `- 数字/模拟电源用磁珠或0Ω电阻分割\n`;
  md += `- LDO输入输出电容按数据手册要求选择（注意ESR）\n`;
  md += `- 大电流路径走线加宽（1A对应约1mm线宽，1oz铜厚）\n\n`;

  /* ---- 5. PCB设计方案与规格 ---- */
  md += `## 五、PCB设计方案与规格\n\n`;
  const layers = canvas.length > 15 || pinTotal > 200 ? 4 : 2;
  md += `| 规格项 | 推荐值 | 说明 |\n|---|---|---|\n`;
  md += `| 层数 | ${layers}层 | ${layers === 4 ? "器件密度较高，建议4层(信号-GND-PWR-信号)" : "当前密度2层板可满足(注意铺地)"} |\n`;
  md += `| 板厚 | 1.6mm | 标准厚度，连接器兼容性好 |\n`;
  md += `| 铜厚 | 1oz (35μm) | 常规信号；大电流区域可局部2oz |\n`;
  md += `| 最小线宽/线距 | 6/6mil | 嘉立创标准工艺免加价 |\n`;
  md += `| 最小过孔 | 0.3/0.45mm | 标准工艺 |\n`;
  md += `| 表面处理 | 有铅喷锡/沉金 | 沉金适合细间距QFN/BGA |\n`;
  md += `| 阻焊颜色 | 绿色 | 其他颜色可能加价 |\n\n`;
  md += `**布局注意事项**：\n\n`;
  md += `- 晶振紧靠MCU（<10mm），下方禁止走线，包地处理\n`;
  md += `- 去耦电容紧贴IC电源引脚，先经电容再入引脚\n`;
  md += `- USB差分对等长等距（90Ω差分阻抗），避免直角\n`;
  md += `- 电源回路面积最小化，开关节点(SW)远离敏感信号\n`;
  md += `- 连接器布置在板边，受力方向考虑固定孔\n`;
  if (density > 3) md += `- ⚠ 当前器件密度较高(${density.toFixed(1)}个/10cm²)，建议增大板框或采用4层板\n`;
  md += `\n`;

  /* ---- 6. 设计风险 ---- */
  md += `## 六、设计风险评估\n\n`;
  md += `| 风险项 | 等级 | 说明与对策 |\n|---|---|---|\n`;
  if (!hasMcu) md += `| 缺少主控 | 🔴高 | 方案中无MCU/处理器，请确认是否遗漏 |\n`;
  if (!hasPower) md += `| 缺少电源管理 | 🔴高 | 未发现电源器件，需补充供电方案 |\n`;
  if (hasMcu && !cats.passive) md += `| 缺少去耦电容 | 🔴高 | MCU必须配置去耦网络，否则工作不稳定 |\n`;
  if (hasConn) md += `| ESD风险 | 🟡中 | 对外接口(USB等)建议增加ESD保护器件 |\n`;
  md += `| 物料停产风险 | 🟡中 | 投产前在官网确认生命周期状态，关键料备选2家以上 |\n`;
  md += `| 热设计 | 🟡中 | LDO压差大时注意散热，计算结温(Tj = Ta + P×Rθja) |\n`;
  md += `| EMC | 🟢低 | 遵循布局注意事项可控；量产前建议预测试 |\n\n`;

  /* ---- 7. 设计工具与资源 ---- */
  md += `## 七、设计工具与资源推荐\n\n`;
  md += `### 电路仿真\n\n`;
  DESIGN_TOOLS.simulation.forEach(t => { md += `- **${t.name}** — ${t.desc}（${t.url}）\n`; });
  md += `\n### 软件开发\n\n`;
  DESIGN_TOOLS.software.forEach(t => { md += `- **${t.name}** — ${t.desc}（${t.url}）\n`; });
  md += `\n### PCB设计与制造\n\n`;
  DESIGN_TOOLS.resources.forEach(t => { md += `- **${t.name}** — ${t.desc}（${t.url}）\n`; });
  md += `\n---\n\n*本报告由 Circuit Canvas AI 自动生成，仅供设计参考，量产前请结合数据手册复核。*\n`;

  return md;
}

/* ================================================================
   PCB BOARD RULES & PLACEMENT ENGINE
   ================================================================ */
const PX_PER_MM = 4;                         // 1mm = 4px
const PCB = {
  wMM: 100, hMM: 80,                         // default 10cm × 8cm
  ox: 60,   oy: 40,                           // board origin offset in SVG
  get w()  { return this.wMM * PX_PER_MM; },
  get h()  { return this.hMM * PX_PER_MM; },
  margin: 8,
  edgeSnap: 4,
  gap: 12,
};

// Placement zones (relative to board origin, in px)
const ZONES = {
  connector: items => {                        // connectors → board edges
    const family = (items[0]?.family || "").toLowerCase();
    if (family.includes("usb")) return { edge: "left",  ratio: 0.3 };
    if (family.includes("header") || family.includes("pin")) return { edge: "right", ratio: 0.5 };
    return { edge: "bottom", ratio: 0.5 };
  },
  power:   { xRange: [0.05, 0.35], yRange: [0.05, 0.35] },   // top-left
  mcu:     { xRange: [0.30, 0.70], yRange: [0.25, 0.65] },   // center
  ic:      { xRange: [0.50, 0.90], yRange: [0.20, 0.70] },   // right half
  passive: { xRange: [0.15, 0.85], yRange: [0.15, 0.85] },   // near parent IC
};

function getShapeRect(comp) {
  const s = SHAPE_CFG[comp.category] || SHAPE_CFG.ic;
  return { x: comp.x, y: comp.y, w: s.w, h: s.h };
}

function rectsOverlap(a, b, gap = PCB.gap) {
  return !(a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x ||
           a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y);
}

function isInsideBoard(x, y, w, h) {
  return x >= PCB.ox + PCB.margin &&
         y >= PCB.oy + PCB.margin &&
         x + w <= PCB.ox + PCB.w - PCB.margin &&
         y + h <= PCB.oy + PCB.h - PCB.margin;
}

function clampToBoard(x, y, w, h) {
  return {
    x: Math.max(PCB.ox + PCB.margin, Math.min(x, PCB.ox + PCB.w - PCB.margin - w)),
    y: Math.max(PCB.oy + PCB.margin, Math.min(y, PCB.oy + PCB.h - PCB.margin - h)),
  };
}

/** Find non-overlapping position within a zone */
function findPosition(cat, item, existingComps) {
  const s = SHAPE_CFG[cat] || SHAPE_CFG.ic;
  const existing = existingComps.map(getShapeRect);

  // Connectors: snap to board edge
  if (cat === "connector") {
    const zoneInfo = ZONES.connector([item]);
    let cx, cy;
    if (zoneInfo.edge === "left") {
      cx = PCB.ox + PCB.edgeSnap;
      cy = PCB.oy + PCB.h * zoneInfo.ratio - s.h / 2;
    } else if (zoneInfo.edge === "right") {
      cx = PCB.ox + PCB.w - s.w - PCB.edgeSnap;
      cy = PCB.oy + PCB.h * zoneInfo.ratio - s.h / 2;
    } else {
      cx = PCB.ox + PCB.w * zoneInfo.ratio - s.w / 2;
      cy = PCB.oy + PCB.h - s.h - PCB.edgeSnap;
    }
    // Nudge if overlapping
    const pos = nudgeUntilFree(cx, cy, s.w, s.h, existing);
    return clampToBoard(pos.x, pos.y, s.w, s.h);
  }

  // Other components: place in designated zone
  const zone = ZONES[cat] || ZONES.passive;
  const x0 = PCB.ox + PCB.w * zone.xRange[0];
  const x1 = PCB.ox + PCB.w * zone.xRange[1] - s.w;
  const y0 = PCB.oy + PCB.h * zone.yRange[0];
  const y1 = PCB.oy + PCB.h * zone.yRange[1] - s.h;

  // Passive near the last-placed MCU/IC (decoupling cap rule)
  if (cat === "passive") {
    const parentIC = [...existingComps].reverse().find(c => c.category === "mcu" || c.category === "ic");
    if (parentIC) {
      const ps = SHAPE_CFG[parentIC.category];
      const nearX = parentIC.x + ps.w + PCB.gap + 4;
      const nearY = parentIC.y;
      const pos = nudgeUntilFree(nearX, nearY, s.w, s.h, existing);
      const clamped = clampToBoard(pos.x, pos.y, s.w, s.h);
      return clamped;
    }
  }

  // Grid search within zone for first free spot
  for (let y = y0; y <= y1; y += s.h + PCB.gap) {
    for (let x = x0; x <= x1; x += s.w + PCB.gap) {
      const cand = { x, y, w: s.w, h: s.h };
      if (!existing.some(e => rectsOverlap(cand, e))) {
        return clampToBoard(x, y, s.w, s.h);
      }
    }
  }
  // Fallback: nudge from zone center
  const fallX = (x0 + x1) / 2, fallY = (y0 + y1) / 2;
  const pos = nudgeUntilFree(fallX, fallY, s.w, s.h, existing);
  return clampToBoard(pos.x, pos.y, s.w, s.h);
}

function nudgeUntilFree(x, y, w, h, existing, maxTries = 30) {
  const cand = { x, y, w, h };
  for (let i = 0; i < maxTries; i++) {
    if (!existing.some(e => rectsOverlap(cand, e))) return { x: cand.x, y: cand.y };
    // Spiral nudge
    const angle = i * 2.4;
    const r = (PCB.gap + Math.max(w, h) * 0.5) * (1 + i * 0.3);
    cand.x = x + Math.cos(angle) * r;
    cand.y = y + Math.sin(angle) * r;
  }
  return { x: cand.x, y: cand.y };
}

/* ================================================================
   SEARCH RESULT CARD  (collapsible)
   ================================================================ */
function ResultCard({ item, expanded, onToggle, onAdd, placed }) {
  const isOrg = item.org;
  return (
    <div style={{
      marginBottom: 8, borderRadius: 8, border: `1px solid ${isOrg ? '#c6e2d0' : '#e5e7eb'}`,
      background: placed ? '#f3f4f6' : isOrg ? '#f0f9f4' : '#fff',
      opacity: placed ? 0.5 : 1, transition: 'all .2s', overflow: 'hidden',
      pointerEvents: placed ? 'none' : 'auto',
    }}>
      {/* --- collapsed row --- */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', gap: 8 }}
        onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {isOrg && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontWeight: 600, flexShrink: 0 }}>本组织</span>}
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.mpn}</span>
            {placed && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 600, flexShrink: 0 }}>已放置</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{item.pkg}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>|</span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{item.manufacturer}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>|</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>¥{item.price.toFixed(2)}</span>
          </div>
        </div>
        {!placed && (
          <button onClick={e => { e.stopPropagation(); onAdd(item); }}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#1f5c3b', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            title="添加到画布">+</button>
        )}
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#64748b', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* --- expanded detail --- */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 6px' }}>{item.desc}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 11 }}>
            <div><span style={{ color: '#9ca3af' }}>封装：</span><span style={{ color: '#334155' }}>{item.pkg}</span></div>
            <div><span style={{ color: '#9ca3af' }}>引脚数：</span><span style={{ color: '#334155' }}>{item.pins}</span></div>
            <div><span style={{ color: '#9ca3af' }}>族/系列：</span><span style={{ color: '#334155' }}>{item.family}</span></div>
            <div><span style={{ color: '#9ca3af' }}>厂商：</span><span style={{ color: '#334155' }}>{item.manufacturer}</span></div>
            <div><span style={{ color: '#9ca3af' }}>最低单价(1+)：</span><span style={{ color: '#059669', fontWeight: 700 }}>¥{item.price.toFixed(2)}</span></div>
            <div><span style={{ color: '#9ca3af' }}>分类：</span><span style={{ color: '#334155' }}>{item.categoryName}</span></div>
          </div>
          {item.attrs && (
            <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>关键属性</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.entries(item.attrs).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>{k}: {v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   CANVAS COMPONENT (with silkscreen & 3D)
   ================================================================ */
function CanvasComp({ comp, is3D, selected, onSelect, onDrag, onDragEnd, zoom }) {
  const s = SHAPE_CFG[comp.category] || SHAPE_CFG.ic;
  const dragRef = useRef({ active: false, moved: false, sx: 0, sy: 0, startX: 0, startY: 0 });

  const onMD = e => {
    if (e.ctrlKey || e.metaKey) {
      onSelect(comp.iid, true);   // multi-select toggle, no drag
      e.stopPropagation();
      return;
    }
    dragRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, startX: comp.x, startY: comp.y };
    onSelect(comp.iid, false);
    e.stopPropagation();
  };

  useEffect(() => {
    const z = zoom || 1;
    const onMM = e => {
      if (!dragRef.current.active) return;
      dragRef.current.moved = true;
      const dx = (e.clientX - dragRef.current.sx) / z;
      const dy = (e.clientY - dragRef.current.sy) / z;
      onDrag(comp.iid, dragRef.current.startX + dx, dragRef.current.startY + dy);
    };
    const onMU = () => {
      if (dragRef.current.active && dragRef.current.moved && onDragEnd) onDragEnd();
      dragRef.current.active = false;
    };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, [comp.iid, zoom, onDragEnd]);

  const pinCount = Math.min(5, Math.ceil(comp.pins / 2));
  const pinGap = (s.h - 12) / Math.max(1, pinCount - 1);
  const isPassive = comp.category === "passive";
  const rot = comp.rotation || 0;
  const cx = s.w / 2, cy = s.h / 2;

  return (
    <g transform={`translate(${comp.x},${comp.y})`} onMouseDown={onMD} onClick={e => e.stopPropagation()} style={{ cursor: "grab" }}>
      <g transform={rot ? `rotate(${rot},${cx},${cy})` : undefined}>
      {/* 3D shadow layers */}
      {is3D && <>
        <rect x={4} y={6} width={s.w} height={s.h} rx={3} fill="rgba(0,0,0,.18)" />
        <rect x={2} y={3} width={s.w} height={s.h} rx={3} fill="rgba(0,0,0,.08)" />
      </>}
      {/* Body */}
      <rect width={s.w} height={s.h} rx={3}
        fill={is3D ? s.color : (comp.overlap ? "#fff5f5" : "#fff")}
        stroke={comp.overlap ? "#ef4444" : selected ? "#2563eb" : (is3D ? "rgba(0,0,0,.15)" : "#94a3b8")}
        strokeWidth={comp.overlap ? 2 : selected ? 2 : 1}
        strokeDasharray={comp.overlap ? "4 2" : "none"}
        style={{ filter: is3D ? "drop-shadow(2px 3px 5px rgba(0,0,0,.35))" : comp.overlap ? "drop-shadow(0 0 6px rgba(239,68,68,.4))" : selected ? "drop-shadow(0 0 4px rgba(37,99,235,.3))" : "none" }} />
      {is3D && <rect x={2} y={2} width={s.w - 4} height={s.h - 4} rx={2} fill="none" stroke="rgba(255,255,255,.18)" />}
      {/* Pins */}
      {isPassive ? <>
        <rect x={-7} y={s.h / 2 - 1.5} width={9} height={3} rx={1} fill={is3D ? "#a3a3a3" : "#d1d5db"} />
        <rect x={s.w - 2} y={s.h / 2 - 1.5} width={9} height={3} rx={1} fill={is3D ? "#a3a3a3" : "#d1d5db"} />
      </> : [...Array(pinCount)].map((_, i) => (
        <g key={i}>
          <rect x={-7} y={6 + i * pinGap} width={9} height={2.5} rx={1} fill={is3D ? "#a3a3a3" : "#d1d5db"} />
          <rect x={s.w - 2} y={6 + i * pinGap} width={9} height={2.5} rx={1} fill={is3D ? "#a3a3a3" : "#d1d5db"} />
        </g>
      ))}
      {/* Pin-1 dot */}
      {!isPassive && <circle cx={9} cy={9} r={2.5} fill={is3D ? "rgba(255,255,255,.3)" : "#d1d5db"} />}
      {/* ── SILKSCREEN LABELS ── */}
      {/* Ref Des */}
      <text x={s.w / 2} y={-6} textAnchor="middle" fontSize={8} fontFamily="monospace" fontWeight={700}
        fill={is3D ? "#86efac" : "#1f5c3b"} style={is3D ? { textShadow: "0 1px 2px rgba(0,0,0,.6)" } : {}}>
        {comp.refDes}
      </text>
      {/* MPN */}
      <text x={s.w / 2} y={s.h / 2 - (isPassive ? 0 : 4)} textAnchor="middle" dominantBaseline="middle"
        fontSize={s.w > 70 ? 8.5 : 6.5} fontFamily="monospace" fontWeight={700}
        fill={is3D ? "#fff" : "#1e293b"}>
        {comp.mpn.length > 16 ? comp.mpn.slice(0, 14) + ".." : comp.mpn}
      </text>
      {/* Package */}
      {!isPassive && (
        <text x={s.w / 2} y={s.h / 2 + 10} textAnchor="middle" dominantBaseline="middle"
          fontSize={6.5} fontFamily="monospace"
          fill={is3D ? "rgba(255,255,255,.6)" : "#94a3b8"}>
          {comp.pkg}
        </text>
      )}
      </g>
    </g>
  );
}

/* ================================================================
   BOM TABLE  (with price column)
   ================================================================ */
function BomPanel({ items }) {
  const total = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const exportCSV = () => {
    const hdr = "序号,名称,型号,厂商,封装,单价(1+),数量";
    const rows = items.map((it, i) => `${i + 1},${it.mpn},${it.mpn},${it.manufacturer},${it.pkg},${it.price},${it.qty || 1}`);
    const csv = [hdr, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bom.csv";
    a.click();
  };
  return (
    <div style={{ padding: 16, height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>🧾 BOM清单</span>
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>共 {items.length} 种元器件</span>
        </div>
        <button onClick={exportCSV} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #c6e2d0", background: "#f0f9f4", color: "#1f5c3b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>导出 CSV</button>
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>暂无元器件数据</div>
      ) : (
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["#", "名称", "型号", "厂商", "封装", "单价(1+)", "数量"].map(h => (
                <th key={h} style={{ textAlign: h === "单价(1+)" || h === "数量" ? "right" : "left", padding: "8px 10px", fontWeight: 600, color: "#64748b", borderBottom: "2px solid #e2e8f0", fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.iid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "7px 10px", color: "#94a3b8" }}>{idx + 1}</td>
                <td style={{ padding: "7px 10px", color: "#1e293b", fontWeight: 500 }}>{it.mpn}</td>
                <td style={{ padding: "7px 10px", fontFamily: "monospace", color: "#475569", fontSize: 11 }}>{it.mpn}</td>
                <td style={{ padding: "7px 10px", color: "#64748b" }}>{it.manufacturer}</td>
                <td style={{ padding: "7px 10px", color: "#64748b" }}>{it.pkg}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: "#059669", fontWeight: 700 }}>¥{it.price.toFixed(2)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", color: "#334155" }}>{it.qty || 1}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#1e293b", borderTop: "2px solid #e2e8f0" }}>BOM 估算总价</td>
              <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "#dc2626", fontSize: 14, borderTop: "2px solid #e2e8f0" }}>¥{total.toFixed(2)}</td>
              <td style={{ borderTop: "2px solid #e2e8f0" }}></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

/* ================================================================
   BLOCK DIAGRAM  (interactive editor)
   ================================================================ */
const BD_W = 160, BD_H = 56;
const BD_COLORS = ["#1a6b3c","#b45309","#0e7490","#6d28d9","#be185d","#4b5563","#0369a1","#a16207"];
let bdIdCounter = 0;
function bdId() { return `bd_${++bdIdCounter}_${Date.now()}`; }

const BD_SHAPES = [
  { id: "rounded",  label: "圆角矩形", icon: "▢" },
  { id: "rect",     label: "矩形",     icon: "□" },
  { id: "diamond",  label: "菱形",     icon: "◇" },
  { id: "ellipse",  label: "椭圆",     icon: "○" },
  { id: "hexagon",  label: "六边形",   icon: "⬡" },
  { id: "parallelogram", label: "平行四边形", icon: "▱" },
  { id: "cylinder", label: "圆柱",     icon: "⌸" },
  { id: "triangle", label: "三角形",   icon: "△" },
];

function BdShape({ shape, x, y, w, h, fill, fillOpacity, stroke, strokeWidth, strokeDasharray }) {
  const props = { fill, fillOpacity, stroke, strokeWidth, strokeDasharray };
  switch (shape) {
    case "rect":
      return <rect x={x} y={y} width={w} height={h} {...props} />;
    case "diamond":
      return <polygon points={`${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}`} {...props} />;
    case "ellipse":
      return <ellipse cx={x+w/2} cy={y+h/2} rx={w/2} ry={h/2} {...props} />;
    case "hexagon": {
      const inset = w * 0.2;
      return <polygon points={`${x+inset},${y} ${x+w-inset},${y} ${x+w},${y+h/2} ${x+w-inset},${y+h} ${x+inset},${y+h} ${x},${y+h/2}`} {...props} />;
    }
    case "parallelogram": {
      const sk = w * 0.15;
      return <polygon points={`${x+sk},${y} ${x+w},${y} ${x+w-sk},${y+h} ${x},${y+h}`} {...props} />;
    }
    case "cylinder": {
      const ry = Math.min(10, h * 0.18);
      return <g>
        <rect x={x} y={y+ry} width={w} height={h-2*ry} fill={fill} fillOpacity={fillOpacity} stroke="none" />
        <ellipse cx={x+w/2} cy={y+h-ry} rx={w/2} ry={ry} {...props} />
        <line x1={x} y1={y+ry} x2={x} y2={y+h-ry} stroke={stroke} strokeWidth={strokeWidth} />
        <line x1={x+w} y1={y+ry} x2={x+w} y2={y+h-ry} stroke={stroke} strokeWidth={strokeWidth} />
        <ellipse cx={x+w/2} cy={y+ry} rx={w/2} ry={ry} {...props} />
      </g>;
    }
    case "triangle":
      return <polygon points={`${x},${y+h} ${x+w/2},${y} ${x+w},${y+h}`} {...props} />;
    default: // rounded
      return <rect x={x} y={y} width={w} height={h} rx={10} {...props} />;
  }
}

function BlockDiagramPanel({ items, isFullscreen, onToggleFullscreen, nodes, setNodes, arrows, setArrows, bdInited, setBdInited }) {
  const [sel, setSel] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [editLabel, setEditLabel] = useState(null);
  const [labelText, setLabelText] = useState("");
  const [editNodeLabel, setEditNodeLabel] = useState(null);
  const [nodeLabelText, setNodeLabelText] = useState("");
  const svgRef = useRef(null);
  const dragRef = useRef({ active: false, id: null, ox: 0, oy: 0 });
  const resizeRef = useRef({ active: false, id: null, handle: "", startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0 });
  const [bdZoom, setBdZoom] = useState(1);
  const [bdPan, setBdPan] = useState({ x: 0, y: 0 });
  const bdPanRef = useRef({ active: false, sx: 0, sy: 0, sp: { x: 0, y: 0 } });

  // Auto-generate from canvas items on first load
  useEffect(() => {
    if (items.length === 0) { setBdInited(false); return; }
    if (bdInited) return;
    const groups = {};
    items.forEach(i => { if (!groups[i.category]) groups[i.category] = []; groups[i.category].push(i); });
    const cats = Object.keys(groups);
    const cols = Math.min(cats.length, 3);
    const gx = 50, gy = 30;
    const newNodes = cats.map((cat, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const sc = SHAPE_CFG[cat]; const catObj = CATEGORIES.find(c => c.id === cat);
      const sub = groups[cat].map(i => `${i.refDes}`).join(", ");
      return { id: bdId(), label: catObj?.name || cat, sublabel: sub, x: gx + col * (BD_W + gx), y: gy + row * (BD_H + gy), w: BD_W, h: BD_H, color: sc?.color || "#64748b", shape: "rounded" };
    });
    const newArrows = [];
    for (let i = 1; i < newNodes.length; i++) {
      newArrows.push({ id: bdId(), fromId: newNodes[i - 1].id, toId: newNodes[i].id, label: "" });
    }
    setNodes(newNodes);
    setArrows(newArrows);
    setBdInited(true);
    // Auto fit view after a tick (need DOM to measure SVG size)
    setTimeout(() => fitViewTo(newNodes), 50);
  }, [items, bdInited]);

  const fitViewTo = useCallback((targetNodes) => {
    const ns = targetNodes || nodes;
    if (ns.length === 0) return;
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : el.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const vw = rect.width, vh = rect.height;
    // Bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ns.forEach(n => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h); });
    const cw = maxX - minX, ch = maxY - minY;
    if (cw <= 0 || ch <= 0) return;
    const pad = 60;
    const z = Math.min((vw - pad * 2) / cw, (vh - pad * 2) / ch, 2);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setBdZoom(z);
    setBdPan({ x: vw / 2 - cx * z, y: vh / 2 - cy * z });
  }, [nodes]);

  const fitView = useCallback(() => fitViewTo(nodes), [fitViewTo, nodes]);

  const addNode = () => {
    const ci = nodes.length % BD_COLORS.length;
    setNodes(prev => [...prev, { id: bdId(), label: "新模块", sublabel: "", x: 40 + Math.random() * 200, y: 30 + Math.random() * 100, w: BD_W, h: BD_H, color: BD_COLORS[ci], shape: "rounded" }]);
  };

  const deleteSelected = () => {
    if (!sel) return;
    if (sel.type === "node") {
      setNodes(prev => prev.filter(n => n.id !== sel.id));
      setArrows(prev => prev.filter(a => a.fromId !== sel.id && a.toId !== sel.id));
    } else {
      setArrows(prev => prev.filter(a => a.id !== sel.id));
    }
    setSel(null);
  };

  // Drag nodes
  const onNodeMouseDown = (e, id) => {
    e.stopPropagation();
    if (connecting) {
      finishConnect(id);
      return;
    }
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    dragRef.current = { active: true, id, sx: e.clientX, sy: e.clientY, startX: node.x, startY: node.y };
    setSel({ type: "node", id });
  };

  const startResize = (e, id, handle) => {
    e.stopPropagation();
    const n = nodes.find(nd => nd.id === id);
    if (!n) return;
    resizeRef.current = { active: true, id, handle, startX: e.clientX, startY: e.clientY, origX: n.x, origY: n.y, origW: n.w, origH: n.h };
  };

  // Wheel zoom
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setBdZoom(prev => {
        const next = Math.min(5, Math.max(0.2, prev * delta));
        setBdPan(p => ({ x: mx - (mx - p.x) * (next / prev), y: my - (my - p.y) * (next / prev) }));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const MIN_W = 60, MIN_H = 36;
    const onMM = e => {
      // Pan (left-drag on empty canvas)
      if (bdPanRef.current.active && !dragRef.current.active && !resizeRef.current.active) {
        const dx = e.clientX - bdPanRef.current.sx, dy = e.clientY - bdPanRef.current.sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          bdPanRef.current.moved = true;
          setBdPan({ x: bdPanRef.current.sp.x + dx, y: bdPanRef.current.sp.y + dy });
        }
      }
      if (connecting && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setMousePos({ x: (e.clientX - rect.left - bdPan.x) / bdZoom, y: (e.clientY - rect.top - bdPan.y) / bdZoom });
      }
      if (resizeRef.current.active) {
        const r = resizeRef.current;
        const dx = (e.clientX - r.startX) / bdZoom, dy = (e.clientY - r.startY) / bdZoom;
        setNodes(prev => prev.map(n => {
          if (n.id !== r.id) return n;
          let { x, y, w, h } = { x: r.origX, y: r.origY, w: r.origW, h: r.origH };
          if (r.handle.includes("e")) w = Math.max(MIN_W, r.origW + dx);
          if (r.handle.includes("s")) h = Math.max(MIN_H, r.origH + dy);
          if (r.handle.includes("w")) { const nw = Math.max(MIN_W, r.origW - dx); x = r.origX + r.origW - nw; w = nw; }
          if (r.handle.includes("n")) { const nh = Math.max(MIN_H, r.origH - dy); y = r.origY + r.origH - nh; h = nh; }
          return { ...n, x, y, w, h };
        }));
        return;
      }
      if (!dragRef.current.active) return;
      const d = dragRef.current;
      const nx = d.startX + (e.clientX - d.sx) / bdZoom;
      const ny = d.startY + (e.clientY - d.sy) / bdZoom;
      setNodes(prev => prev.map(n => n.id === d.id ? { ...n, x: Math.max(0, nx), y: Math.max(0, ny) } : n));
    };
    const onMU = () => { dragRef.current.active = false; resizeRef.current.active = false; bdPanRef.current.active = false; };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, [connecting, bdZoom, bdPan]);

  const handlePortDown = (e, nodeId, px, py) => {
    e.stopPropagation();
    if (connecting) {
      // Complete connection via click
      finishConnect(nodeId);
    } else {
      // Start new connection
      setConnecting({ fromId: nodeId, px, py });
      setSel(null);
    }
  };

  const finishConnect = (targetId) => {
    if (!connecting) return;
    if (connecting.fromId !== targetId && !arrows.some(a => a.fromId === connecting.fromId && a.toId === targetId)) {
      setArrows(prev => [...prev, { id: bdId(), fromId: connecting.fromId, toId: targetId, label: "" }]);
    }
    setConnecting(null);
    setMousePos(null);
  };

  const handlePortUp = (e, nodeId) => {
    e.stopPropagation();
    if (connecting) finishConnect(nodeId);
  };

  const onArrowClick = (e, arrowId) => {
    e.stopPropagation();
    setSel({ type: "arrow", id: arrowId });
  };

  const startEditLabel = (arrow) => {
    setEditLabel(arrow.id);
    setLabelText(arrow.label);
  };

  const finishEditLabel = () => {
    if (editLabel) {
      setArrows(prev => prev.map(a => a.id === editLabel ? { ...a, label: labelText } : a));
    }
    setEditLabel(null);
  };

  const onSvgClick = () => {
    // Skip deselect if we just finished panning
    if (bdPanRef.current.moved) { bdPanRef.current.moved = false; return; }
    if (connecting) { setConnecting(null); setMousePos(null); return; }
    setSel(null);
  };

  // Node center for arrows
  const nc = (id) => { const n = nodes.find(n => n.id === id); return n ? { x: n.x + n.w / 2, y: n.y + n.h / 2 } : { x: 0, y: 0 }; };
  // Edge point closest to target
  const edgePoint = (from, to) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const n = nodes.find(n => n.id === from.id);
    if (!n) return { x: 0, y: 0 };
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    const angle = Math.atan2(dy, dx);
    const hw = n.w / 2, hh = n.h / 2;
    const absCos = Math.abs(Math.cos(angle)), absSin = Math.abs(Math.sin(angle));
    let ex, ey;
    if (absCos * hh > absSin * hw) {
      ex = cx + (dx > 0 ? hw : -hw);
      ey = cy + (dx > 0 ? hw : -hw) * Math.tan(angle);
    } else {
      ey = cy + (dy > 0 ? hh : -hh);
      ex = cx + (dy > 0 ? hh : -hh) / Math.tan(angle);
    }
    return { x: ex, y: ey };
  };

  const regenFromCanvas = () => { setBdInited(false); };

  return (
    <div style={{ padding: 12, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginRight: 4 }}>📊 系统框图</span>
        <button onClick={addNode} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #c6e2d0", background: "#f0f9f4", color: "#1f5c3b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ 添加模块</button>
        <button onClick={deleteSelected} disabled={!sel}
          style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #fecaca", background: sel ? "#fef2f2" : "#f8f8f8", color: sel ? "#dc2626" : "#c4c4c4", fontSize: 11, fontWeight: 600, cursor: sel ? "pointer" : "default" }}>
          🗑 删除{sel?.type === "arrow" ? "箭头" : "选中"}
        </button>
        <button onClick={regenFromCanvas} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #E8F3EE", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🔄 重新生成</button>
        <button onClick={fitView} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #E8F3EE", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>⊡ 适应画布</button>
        {onToggleFullscreen && (
          <button onClick={onToggleFullscreen}
            style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #E8F3EE", background: isFullscreen ? "#eff6ff" : "#fff", color: isFullscreen ? "#2563eb" : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {isFullscreen ? "↙ 退出全屏" : "⛶ 全屏编辑"}
          </button>
        )}
        {/* Arrow type selector */}
        {sel?.type === "arrow" && (() => {
          const selArrow = arrows.find(a => a.id === sel.id);
          const curType = selArrow?.style || "single";
          const types = [
            { id: "single", icon: "→",  tip: "单向箭头" },
            { id: "double", icon: "⇄", tip: "双向箭头" },
            { id: "none",   icon: "—",  tip: "无箭头" },
            { id: "bus",    icon: "⇶", tip: "总线" },
          ];
          return (
            <>
              <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 2px" }} />
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>样式</span>
              {types.map(t => (
                <button key={t.id} title={t.tip} onClick={() => setArrows(prev => prev.map(a => a.id === sel.id ? { ...a, style: t.id } : a))}
                  style={{ width: 28, height: 24, borderRadius: 4, border: `1.5px solid ${curType === t.id ? "#2563eb" : "#e2e8f0"}`,
                    background: curType === t.id ? "#eff6ff" : "#fff", color: curType === t.id ? "#2563eb" : "#64748b",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t.icon}
                </button>
              ))}
              <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 2px" }} />
              <button title="反转方向" onClick={() => setArrows(prev => prev.map(a => a.id === sel.id ? { ...a, fromId: a.toId, toId: a.fromId } : a))}
                style={{ padding: "4px 10px", borderRadius: 4, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                🔃 反转
              </button>
            </>
          );
        })()}
        {/* Node shape selector */}
        {sel?.type === "node" && (() => {
          const selNode = nodes.find(n => n.id === sel.id);
          const curShape = selNode?.shape || "rounded";
          return (
            <>
              <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 2px" }} />
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>形状</span>
              {BD_SHAPES.map(s => (
                <button key={s.id} title={s.label} onClick={() => setNodes(prev => prev.map(n => n.id === sel.id ? { ...n, shape: s.id } : n))}
                  style={{ width: 26, height: 24, borderRadius: 4, border: `1.5px solid ${curShape === s.id ? "#2563eb" : "#e2e8f0"}`,
                    background: curShape === s.id ? "#eff6ff" : "#fff", color: curShape === s.id ? "#2563eb" : "#64748b",
                    fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  {s.icon}
                </button>
              ))}
            </>
          );
        })()}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#94a3b8" }}>
          {connecting ? "🟢 点击目标模块完成连线 · ESC取消" : "拖拽移动 · 双击编辑名称 · 选中后改形状/拖角缩放"}
        </span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onContextMenu={e => e.preventDefault()}>
        <svg ref={svgRef} width="100%" height="100%" style={{ background: "#fafbfc", borderRadius: 8, border: "1px solid #e2e8f0", cursor: connecting ? "crosshair" : "default" }}
          onClick={onSvgClick}
          onMouseDown={e => { if (!connecting) { e.preventDefault(); bdPanRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, sp: { ...bdPan } }; } }}
          onKeyDown={e => { if (e.key === "Escape") { setConnecting(null); setMousePos(null); } }}
          tabIndex={0}>
          <defs>
            <marker id="arw2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 1L8 5L0 9z" fill="#64748b" />
            </marker>
            <marker id="arw2sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 1L8 5L0 9z" fill="#2563eb" />
            </marker>
            <marker id="arw2bus" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 1L8 5L0 9z" fill="#0369a1" />
            </marker>
            <marker id="arw2bussel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 1L8 5L0 9z" fill="#2563eb" />
            </marker>
          </defs>
          <g transform={`translate(${bdPan.x},${bdPan.y}) scale(${bdZoom})`}>

        {/* Arrows */}
        {arrows.map(a => {
          const fromN = nodes.find(n => n.id === a.fromId);
          const toN = nodes.find(n => n.id === a.toId);
          if (!fromN || !toN) return null;
          const fc = { x: fromN.x + fromN.w / 2, y: fromN.y + fromN.h / 2, id: a.fromId };
          const tc = { x: toN.x + toN.w / 2, y: toN.y + toN.h / 2, id: a.toId };
          const fp = edgePoint(fc, tc);
          const tp = edgePoint({ ...tc, id: a.toId }, fc);
          const tp2 = edgePoint(tc, fc);
          const isSel = sel?.type === "arrow" && sel.id === a.id;
          const mx = (fp.x + tp2.x) / 2, my = (fp.y + tp2.y) / 2;
          const aStyle = a.style || "single";
          const isBus = aStyle === "bus";

          // Determine markers based on style
          let mStart = undefined, mEnd = undefined;
          if (aStyle === "single") { mEnd = isSel ? "url(#arw2sel)" : "url(#arw2)"; }
          else if (aStyle === "double") { mStart = isSel ? "url(#arw2sel)" : "url(#arw2)"; mEnd = isSel ? "url(#arw2sel)" : "url(#arw2)"; }
          else if (aStyle === "bus") { mEnd = isSel ? "url(#arw2bussel)" : "url(#arw2bus)"; }
          // "none" → no markers

          const lineColor = isSel ? "#2563eb" : isBus ? "#0369a1" : "#94a3b8";
          const lineWidth = isSel ? (isBus ? 4 : 2.5) : isBus ? 3.5 : 1.8;
          const dashArr = aStyle === "none" ? undefined : undefined;

          return (
            <g key={a.id}>
              <line x1={fp.x} y1={fp.y} x2={tp2.x} y2={tp2.y} stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }}
                onClick={e => onArrowClick(e, a.id)} onDoubleClick={e => { e.stopPropagation(); startEditLabel(a); }} />
              <line x1={fp.x} y1={fp.y} x2={tp2.x} y2={tp2.y}
                stroke={lineColor} strokeWidth={lineWidth}
                markerStart={mStart} markerEnd={mEnd}
                style={{ pointerEvents: "none" }} />
              {/* Bus slash mark */}
              {isBus && (() => {
                const angle = Math.atan2(tp2.y - fp.y, tp2.x - fp.x);
                const perpAngle = angle + Math.PI / 2;
                const slashLen = 8;
                return <line
                  x1={mx - Math.cos(perpAngle) * slashLen} y1={my - Math.sin(perpAngle) * slashLen}
                  x2={mx + Math.cos(perpAngle) * slashLen} y2={my + Math.sin(perpAngle) * slashLen}
                  stroke={isSel ? "#2563eb" : "#0369a1"} strokeWidth={2} style={{ pointerEvents: "none" }} />;
              })()}
              {/* Label */}
              {editLabel === a.id ? (
                <foreignObject x={mx - 50} y={my - 12} width={100} height={24}>
                  <input autoFocus value={labelText} onChange={e => setLabelText(e.target.value)}
                    onBlur={finishEditLabel} onKeyDown={e => { if (e.key === "Enter") finishEditLabel(); e.stopPropagation(); }}
                    style={{ width: "100%", fontSize: 10, border: "1px solid #93c5fd", borderRadius: 3, padding: "2px 4px", textAlign: "center", outline: "none", background: "#fff" }} />
                </foreignObject>
              ) : a.label ? (
                <text x={mx} y={my - (isBus ? 12 : 4)} textAnchor="middle" fontSize={9} fill={isSel ? "#2563eb" : isBus ? "#0369a1" : "#64748b"} fontFamily="monospace"
                  style={{ cursor: "pointer" }} onDoubleClick={e => { e.stopPropagation(); startEditLabel(a); }}>
                  {a.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Drawing line while connecting */}
        {connecting && mousePos && (
          <line x1={connecting.px} y1={connecting.py} x2={mousePos.x} y2={mousePos.y}
            stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" markerEnd="url(#arw2sel)" style={{ pointerEvents: "none" }} />
        )}

        {/* Nodes */}
        {nodes.map(n => {
          const isSel = sel?.type === "node" && sel.id === n.id;
          const isConnSrc = connecting?.fromId === n.id;
          const shape = n.shape || "rounded";
          return (
            <g key={n.id} onMouseDown={e => onNodeMouseDown(e, n.id)}
              onClick={e => e.stopPropagation()}
              onMouseUp={e => { if (connecting) { e.stopPropagation(); finishConnect(n.id); } }}
              style={{ cursor: connecting ? "pointer" : "grab" }}>
              <BdShape shape={shape} x={n.x} y={n.y} w={n.w} h={n.h}
                fill={n.color} fillOpacity={0.1}
                stroke={isSel ? "#2563eb" : isConnSrc ? "#22c55e" : n.color}
                strokeWidth={isSel || isConnSrc ? 2.5 : 2} />
              {/* Label */}
              {editNodeLabel === n.id ? (
                <foreignObject x={n.x + 4} y={n.y + 6} width={n.w - 8} height={22}>
                  <input autoFocus value={nodeLabelText} onChange={e => setNodeLabelText(e.target.value)}
                    onBlur={() => { setNodes(prev => prev.map(nd => nd.id === n.id ? { ...nd, label: nodeLabelText } : nd)); setEditNodeLabel(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { setNodes(prev => prev.map(nd => nd.id === n.id ? { ...nd, label: nodeLabelText } : nd)); setEditNodeLabel(null); } e.stopPropagation(); }}
                    style={{ width: "100%", fontSize: 12, fontWeight: 700, border: "1px solid #93c5fd", borderRadius: 3, padding: "1px 4px", textAlign: "center", outline: "none", background: "#fff", color: n.color }} />
                </foreignObject>
              ) : (
                <text x={n.x + n.w / 2} y={n.y + (n.h > 50 ? 24 : n.h / 2 - 2)} textAnchor="middle" fontSize={12} fontWeight={700} fill={n.color}
                  style={{ cursor: "text" }}
                  onDoubleClick={e => { e.stopPropagation(); setEditNodeLabel(n.id); setNodeLabelText(n.label); }}>
                  {n.label}
                </text>
              )}
              {n.sublabel && <text x={n.x + n.w / 2} y={n.y + (n.h > 50 ? 40 : n.h / 2 + 12)} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">{n.sublabel.length > 24 ? n.sublabel.slice(0, 22) + ".." : n.sublabel}</text>}

              {/* Connection ports */}
              {[
                { cx: n.x + n.w, cy: n.y + n.h / 2 },
                { cx: n.x,       cy: n.y + n.h / 2 },
                { cx: n.x + n.w / 2, cy: n.y + n.h },
                { cx: n.x + n.w / 2, cy: n.y },
              ].map((p, pi) => (
                <circle key={pi} cx={p.cx} cy={p.cy} r={connecting ? 8 : 6}
                  fill={connecting ? "#22c55e" : n.color} opacity={connecting ? 0.7 : 0}
                  stroke="#fff" strokeWidth={2}
                  style={{ cursor: "pointer", transition: "opacity .15s, r .15s" }}
                  onMouseEnter={e => { e.target.setAttribute("opacity", "0.9"); }}
                  onMouseLeave={e => { if (!connecting) e.target.setAttribute("opacity", "0"); else e.target.setAttribute("opacity", "0.7"); }}
                  onMouseDown={e => handlePortDown(e, n.id, p.cx, p.cy)}
                  onMouseUp={e => handlePortUp(e, n.id)} />
              ))}

              {/* Resize handles (only on selected node) */}
              {isSel && !connecting && [
                { key: "nw", cx: n.x,       cy: n.y,       cursor: "nw-resize", handle: "nw" },
                { key: "ne", cx: n.x + n.w, cy: n.y,       cursor: "ne-resize", handle: "ne" },
                { key: "sw", cx: n.x,       cy: n.y + n.h, cursor: "sw-resize", handle: "sw" },
                { key: "se", cx: n.x + n.w, cy: n.y + n.h, cursor: "se-resize", handle: "se" },
                { key: "n",  cx: n.x + n.w/2, cy: n.y,       cursor: "n-resize",  handle: "n" },
                { key: "s",  cx: n.x + n.w/2, cy: n.y + n.h, cursor: "s-resize",  handle: "s" },
                { key: "w",  cx: n.x,       cy: n.y + n.h/2, cursor: "w-resize",  handle: "w" },
                { key: "e",  cx: n.x + n.w, cy: n.y + n.h/2, cursor: "e-resize",  handle: "e" },
              ].map(h => (
                <rect key={h.key} x={h.cx - 4} y={h.cy - 4} width={8} height={8} rx={2}
                  fill="#fff" stroke="#2563eb" strokeWidth={1.5}
                  style={{ cursor: h.cursor }}
                  onMouseDown={e => { e.stopPropagation(); startResize(e, n.id, h.handle); }} />
              ))}
            </g>
          );
        })}
          </g>
        </svg>
        {/* Zoom indicator */}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "3px 5px", boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e2e8f0", fontSize: 10 }}>
          <button onClick={() => setBdZoom(z => Math.max(0.2, z * 0.8))} style={{ width: 20, height: 20, border: "1px solid #e2e8f0", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <span onClick={fitView} style={{ minWidth: 36, textAlign: "center", fontWeight: 600, color: "#334155", cursor: "pointer" }} title="适应画布">{Math.round(bdZoom * 100)}%</span>
          <button onClick={() => setBdZoom(z => Math.min(5, z * 1.25))} style={{ width: 20, height: 20, border: "1px solid #e2e8f0", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SCHEMATIC PANEL  (editable: drag symbols, add/del/edit nets)
   ================================================================ */
let schIdCounter = 0;
function schId() { return `net_${++schIdCounter}_${Date.now()}`; }

function SchematicPanel({ items, isFullscreen, onToggleFullscreen }) {
  const [pos, setPos] = useState({});          // iid -> {x,y} overrides
  const [nets, setNets] = useState(null);      // null = not generated yet
  const [sel, setSel] = useState(null);        // selected net id
  const [linking, setLinking] = useState(null);// source iid when adding a wire
  const [editNet, setEditNet] = useState(null);
  const [netText, setNetText] = useState("");
  const dragRef = useRef({ active: false, iid: null, sx: 0, sy: 0, startX: 0, startY: 0 });

  /* Auto layout (defaults; user drags override via pos state) */
  const autoLayout = useMemo(() => {
    const out = {};
    const cats = { connector: [], power: [], mcu: [], ic: [], passive: [] };
    items.forEach(i => { (cats[i.category] = cats[i.category] || []).push(i); });
    const colX = { connector: 40, power: 200, mcu: 380, ic: 600, passive: 380 };
    Object.entries(cats).forEach(([cat, list]) => {
      list.forEach((c, i) => { out[c.iid] = { x: colX[cat] ?? 380, y: cat === "passive" ? 230 + i * 50 : 40 + i * 95 }; });
    });
    return out;
  }, [items]);

  const P = iid => pos[iid] || autoLayout[iid] || { x: 100, y: 100 };

  /* Auto-generate nets on first load / regenerate */
  const genNets = useCallback(() => {
    const out = [];
    const by = cat => items.filter(i => i.category === cat);
    const mcus = by("mcu"), powers = by("power"), conns = by("connector"), ics = by("ic"), passives = by("passive");
    powers.forEach(p => [...mcus, ...ics].forEach(t => out.push({ id: schId(), from: p.iid, to: t.iid, label: "3V3", color: "#dc2626" })));
    conns.forEach(cn => (mcus.length ? mcus : ics).forEach(m => out.push({ id: schId(), from: cn.iid, to: m.iid, label: cn.family?.includes("USB") ? "USB_D±" : "IO", color: "#2563eb" })));
    mcus.forEach(m => ics.forEach(i => out.push({ id: schId(), from: m.iid, to: i.iid, label: i.family?.includes("Flash") ? "SPI" : i.family?.includes("CAN") ? "CAN" : "I2C", color: "#059669" })));
    passives.forEach(pv => { const t = [...mcus, ...ics][0]; if (t) out.push({ id: schId(), from: pv.iid, to: t.iid, label: "去耦", color: "#a16207" }); });
    return out;
  }, [items]);

  useEffect(() => { if (nets === null && items.length > 0) setNets(genNets()); }, [items, nets, genNets]);
  useEffect(() => { if (items.length === 0) { setNets(null); setPos({}); } }, [items]);

  /* Symbol drag */
  const onSymDown = (e, iid) => {
    e.stopPropagation();
    if (linking === "__pick__") { setLinking(iid); return; }   // pick link source
    if (linking) {
      // complete link
      if (linking !== iid && !(nets || []).some(n => n.from === linking && n.to === iid)) {
        setNets(prev => [...(prev || []), { id: schId(), from: linking, to: iid, label: "NET", color: "#7c3aed" }]);
      }
      setLinking(null);
      return;
    }
    const p = P(iid);
    dragRef.current = { active: true, iid, sx: e.clientX, sy: e.clientY, startX: p.x, startY: p.y };
  };

  useEffect(() => {
    const onMM = e => {
      if (!dragRef.current.active) return;
      const d = dragRef.current;
      setPos(prev => ({ ...prev, [d.iid]: { x: Math.max(0, d.startX + e.clientX - d.sx), y: Math.max(0, d.startY + e.clientY - d.sy) } }));
    };
    const onMU = () => { dragRef.current.active = false; };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, []);

  const deleteNet = () => { if (sel) { setNets(prev => prev.filter(n => n.id !== sel)); setSel(null); } };
  const finishEdit = () => { if (editNet) setNets(prev => prev.map(n => n.id === editNet ? { ...n, label: netText } : n)); setEditNet(null); };

  if (items.length === 0) return (
    <div style={{ padding: 12, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>⚡ 原理图</span>
        {onToggleFullscreen && <button onClick={onToggleFullscreen} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #E8F3EE", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{isFullscreen ? "↙ 退出全屏" : "⛶ 全屏"}</button>}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>画布上暂无器件，添加器件后自动生成原理图</div>
    </div>
  );

  const maxY = Math.max(...items.map(c => P(c.iid).y), 300);
  const maxX = Math.max(...items.map(c => P(c.iid).x), 700);
  const W = Math.max(780, maxX + 200), H = Math.max(320, maxY + 120);

  const SymBox = ({ c }) => {
    const p = P(c.iid);
    const isPassive = c.category === "passive";
    const w = isPassive ? 60 : 120, h = isPassive ? 30 : 72;
    const isLinkSrc = linking === c.iid;
    return (
      <g transform={`translate(${p.x},${p.y})`} onMouseDown={e => onSymDown(e, c.iid)} onClick={e => e.stopPropagation()}
        style={{ cursor: linking ? "pointer" : "grab" }}>
        {isLinkSrc && <rect x={-6} y={-6} width={w + 12} height={h + 12} rx={4} fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" />}
        {isPassive ? (
          c.family === "MLCC" ? (
            <g>
              <rect x={-2} y={-2} width={62} height={36} fill="transparent" />
              <line x1={0} y1={h / 2} x2={24} y2={h / 2} stroke="#334155" strokeWidth={1.5} />
              <line x1={24} y1={4} x2={24} y2={h - 4} stroke="#334155" strokeWidth={2.5} />
              <line x1={32} y1={4} x2={32} y2={h - 4} stroke="#334155" strokeWidth={2.5} />
              <line x1={32} y1={h / 2} x2={56} y2={h / 2} stroke="#334155" strokeWidth={1.5} />
            </g>
          ) : (
            <g>
              <rect x={-2} y={-2} width={62} height={36} fill="transparent" />
              <line x1={0} y1={h / 2} x2={12} y2={h / 2} stroke="#334155" strokeWidth={1.5} />
              <rect x={12} y={h / 2 - 6} width={32} height={12} fill="none" stroke="#334155" strokeWidth={1.8} />
              <line x1={44} y1={h / 2} x2={56} y2={h / 2} stroke="#334155" strokeWidth={1.5} />
            </g>
          )
        ) : (
          <g>
            <rect width={w} height={h} rx={2} fill="#fffef7" stroke="#334155" strokeWidth={1.8} />
            {[0, 1, 2].map(i => (
              <g key={i}>
                <line x1={-10} y1={14 + i * 22} x2={0} y2={14 + i * 22} stroke="#334155" strokeWidth={1.4} />
                <line x1={w} y1={14 + i * 22} x2={w + 10} y2={14 + i * 22} stroke="#334155" strokeWidth={1.4} />
              </g>
            ))}
          </g>
        )}
        <text x={isPassive ? 28 : w / 2} y={-6} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0e7490" fontFamily="monospace">{c.refDes}</text>
        <text x={isPassive ? 28 : w / 2} y={isPassive ? h + 12 : h / 2 + 3} textAnchor="middle" fontSize={isPassive ? 8 : 9} fontWeight={600} fill="#334155" fontFamily="monospace">
          {c.mpn.length > 14 ? c.mpn.slice(0, 12) + ".." : c.mpn}
        </text>
      </g>
    );
  };

  return (
    <div style={{ padding: 12, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>⚡ 原理图</span>
        <button onClick={() => setLinking(linking ? null : "__pick__")}
          style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${linking ? "#22c55e" : "#c6e2d0"}`, background: linking ? "#f0fdf4" : "#f0f9f4", color: linking ? "#16a34a" : "#1f5c3b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          {linking ? "✕ 取消连线" : "+ 添加连线"}
        </button>
        <button onClick={deleteNet} disabled={!sel}
          style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #fecaca", background: sel ? "#fef2f2" : "#f8f8f8", color: sel ? "#dc2626" : "#c4c4c4", fontSize: 11, fontWeight: 600, cursor: sel ? "pointer" : "default" }}>
          🗑 删除连线
        </button>
        <button onClick={() => { setNets(genNets()); setPos({}); setSel(null); }}
          style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #E8F3EE", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🔄 重新生成</button>
        {onToggleFullscreen && (
          <button onClick={onToggleFullscreen}
            style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #E8F3EE", background: isFullscreen ? "#eff6ff" : "#fff", color: isFullscreen ? "#2563eb" : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {isFullscreen ? "↙ 退出全屏" : "⛶ 全屏"}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#94a3b8" }}>
          {linking ? (linking === "__pick__" ? "🟢 点击起点器件" : "🟢 点击终点器件完成连线") : "拖拽符号移动 · 单击连线选中 · 双击标签编辑"}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto", background: "#fffef9", borderRadius: 8, border: "1px solid #e7e0c9" }}
        onClick={() => { setSel(null); if (linking) setLinking(null); }}>
        <svg width={W} height={H} style={{ minWidth: W }}>
          <defs>
            <pattern id="schgrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="#d9d2b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#schgrid)" />
          {/* Nets */}
          {(nets || []).map(n => {
            const fc = items.find(i => i.iid === n.from), tc = items.find(i => i.iid === n.to);
            if (!fc || !tc) return null;
            const f = P(n.from), t = P(n.to);
            const fIsPassive = fc.category === "passive";
            const x1 = f.x + (fIsPassive ? 56 : 130), y1 = f.y + (fIsPassive ? 15 : 36);
            const x2 = t.x - 10, y2 = t.y + (tc.category === "passive" ? 15 : 36);
            const midX = (x1 + x2) / 2;
            const isSel = sel === n.id;
            const lx = midX, ly = Math.min(y1, y2) - 4;
            return (
              <g key={n.id}>
                {/* hit area */}
                <path d={`M${x1},${y1} H${midX} V${y2} H${x2}`} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); setSel(n.id); }}
                  onDoubleClick={e => { e.stopPropagation(); setEditNet(n.id); setNetText(n.label); }} />
                <path d={`M${x1},${y1} H${midX} V${y2} H${x2}`} fill="none" stroke={isSel ? "#2563eb" : n.color} strokeWidth={isSel ? 2.4 : 1.4} style={{ pointerEvents: "none" }} />
                <circle cx={x1} cy={y1} r={2.5} fill={isSel ? "#2563eb" : n.color} />
                <circle cx={x2} cy={y2} r={2.5} fill={isSel ? "#2563eb" : n.color} />
                {editNet === n.id ? (
                  <foreignObject x={lx - 45} y={ly - 14} width={90} height={22}>
                    <input autoFocus value={netText} onChange={e => setNetText(e.target.value)}
                      onBlur={finishEdit} onKeyDown={e => { if (e.key === "Enter") finishEdit(); e.stopPropagation(); }}
                      style={{ width: "100%", fontSize: 9, border: "1px solid #93c5fd", borderRadius: 3, padding: "1px 4px", textAlign: "center", outline: "none", background: "#fff" }} />
                  </foreignObject>
                ) : n.label ? (
                  <text x={lx} y={ly} textAnchor="middle" fontSize={8} fontWeight={700} fill={isSel ? "#2563eb" : n.color} fontFamily="monospace" style={{ cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); setSel(n.id); }}
                    onDoubleClick={e => { e.stopPropagation(); setEditNet(n.id); setNetText(n.label); }}>{n.label}</text>
                ) : null}
              </g>
            );
          })}
          {/* Symbols */}
          {items.map(c => <SymBox key={c.iid} c={c} />)}
          {/* GND rail */}
          <g>
            <line x1={20} y1={H - 30} x2={W - 20} y2={H - 30} stroke="#334155" strokeWidth={2} />
            <text x={26} y={H - 36} fontSize={9} fontWeight={700} fill="#334155" fontFamily="monospace">GND</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ================================================================
   AI ADVISOR PANEL  (live design guidance in right sidebar)
   ================================================================ */
function Collapse({ title, icon, defaultOpen, badge, badgeColor, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ marginBottom: 8, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", background: open ? "#f7fcf9" : "#fff" }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>{title}</span>
        {badge != null && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: badgeColor || "#f1f5f9", color: "#fff", fontWeight: 700 }}>{badge}</span>}
        <span style={{ fontSize: 9, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding: "4px 12px 12px", borderTop: "1px solid #f1f5f9" }}>{children}</div>}
    </div>
  );
}

function AdvisorPanel({ canvas, pcbSize, pcbShape, onAddItem }) {
  const cats = {};
  canvas.forEach(c => { if (!cats[c.category]) cats[c.category] = []; cats[c.category].push(c); });
  const hasMcu = !!cats.mcu, hasPower = !!cats.power, hasConn = !!cats.connector, hasPassive = !!cats.passive;
  const pinTotal = canvas.reduce((s, c) => s + (c.pins || 0), 0);
  const layers = canvas.length > 15 || pinTotal > 200 ? 4 : 2;
  const density = canvas.length / ((pcbSize.w * pcbSize.h) / 1000);

  /* Risks (live) */
  const risks = [];
  if (canvas.length === 0) risks.push({ lvl: "info", text: "画布为空，添加器件后开始实时分析" });
  if (canvas.length > 0 && !hasMcu) risks.push({ lvl: "high", text: "缺少主控 MCU/处理器" });
  if (canvas.length > 0 && !hasPower) risks.push({ lvl: "high", text: "缺少电源管理器件" });
  if (hasMcu && !hasPassive) risks.push({ lvl: "high", text: "MCU 缺少去耦电容网络" });
  if (hasConn) risks.push({ lvl: "mid", text: "对外接口建议增加 ESD 保护" });
  if (canvas.some(c => c.overlap)) risks.push({ lvl: "high", text: "存在器件重叠，需调整布局" });
  if (density > 3) risks.push({ lvl: "mid", text: `器件密度偏高(${density.toFixed(1)}个/10cm²)，建议增大板框或4层板` });
  if (canvas.length > 0) risks.push({ lvl: "mid", text: "投产前确认物料生命周期状态" });
  const highCount = risks.filter(r => r.lvl === "high").length;

  /* Sub-circuit checklist: check if recommendation already satisfied */
  const satisfied = (rule) => {
    if (rule.name.includes("去耦") && cats.passive?.some(p => p.family === "MLCC")) return true;
    if (rule.name.includes("调试") && cats.connector?.some(c => c.family?.includes("Header") || c.family?.includes("Pin"))) return true;
    return false;
  };

  const lvlStyle = { high: { bg: "#fef2f2", color: "#dc2626", label: "高" }, mid: { bg: "#fffbeb", color: "#b45309", label: "中" }, info: { bg: "#f1f5f9", color: "#64748b", label: "ℹ" } };

  /* Quick-add suggestions mapped to real library items */
  const quickAdd = { "去耦网络": "cap100nf", "复位电路": "res10k", "调试接口": "header2x5", "输入滤波": "cap100nf", "ESD防护": null };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* ① 子电路推荐 */}
      <Collapse title="子电路推荐" icon="🧩" defaultOpen badge={Object.keys(cats).filter(c => SUBCIRCUIT_RULES[c]).length || null} badgeColor="#1f5c3b">
        {canvas.length === 0 ? <div style={{ fontSize: 11, color: "#94a3b8", paddingTop: 6 }}>添加器件后自动推荐配套子电路</div> :
          Object.keys(cats).filter(cat => SUBCIRCUIT_RULES[cat]).map(cat => (
            <div key={cat} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1f5c3b", marginBottom: 4 }}>
                {CATEGORIES.find(c => c.id === cat)?.name}（{cats[cat].map(c => c.refDes).join("、")}）
              </div>
              {SUBCIRCUIT_RULES[cat].map((r, ri) => {
                const done = satisfied(r);
                const addId = quickAdd[r.name];
                return (
                  <div key={ri} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "5px 8px", marginBottom: 3, borderRadius: 6, background: done ? "#f0fdf4" : "#f8fafc", border: `1px solid ${done ? "#bbf7d0" : "#f1f5f9"}` }}>
                    <span style={{ fontSize: 10, marginTop: 1 }}>{done ? "✅" : "⬜"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#334155" }}>{r.name}</div>
                      <div style={{ fontSize: 9.5, color: "#64748b", lineHeight: 1.4 }}>{r.parts}</div>
                    </div>
                    {!done && addId && (
                      <button onClick={() => { const it = ALL_ITEMS.find(i => i.id === addId); if (it) onAddItem(it); }}
                        style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, border: "1px solid #c6e2d0", background: "#fff", color: "#1f5c3b", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>+ 上板</button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </Collapse>

      {/* ② 电源供电方案 */}
      <Collapse title="电源供电方案" icon="⚡" defaultOpen={!hasPower && canvas.length > 0}>
        <div style={{ fontSize: 10.5, lineHeight: 1.7, color: "#475569", paddingTop: 6 }}>
          {hasPower ? (
            <div style={{ marginBottom: 6, padding: "5px 8px", borderRadius: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 10.5 }}>
              ✅ 已配置：{cats.power.map(c => c.mpn).join("、")}
            </div>
          ) : canvas.length > 0 ? (
            <div style={{ marginBottom: 6, padding: "5px 8px", borderRadius: 6, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 10.5, color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
              ⚠ 未发现电源器件
              <button onClick={() => { const it = ALL_ITEMS.find(i => i.id === "lm1117"); if (it) onAddItem(it); }}
                style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}>+ 添加LDO</button>
            </div>
          ) : null}
          <pre style={{ fontSize: 9.5, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", color: "#334155", background: "#f8fafc", padding: 8, borderRadius: 6, overflow: "auto", whiteSpace: "pre" }}>
{`输入(5V USB/12V DC)
 ├ TVS+保险丝保护
 ├ Buck(>6V时): TPS5430→5V
 └ LDO: LM1117→3.3V
    ├ MCU (磁珠隔离)
    ├ 模拟 (LC滤波)
    └ 外设`}</pre>
          <div style={{ marginTop: 4 }}>· 功耗预留50%余量 · 数模电源分割 · 1A≈1mm线宽(1oz)</div>
        </div>
      </Collapse>

      {/* ③ PCB设计规格 */}
      <Collapse title="PCB设计规格" icon="📋">
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse", marginTop: 6 }}>
          <tbody>
            {[
              ["层数", `${layers}层`, layers === 4 ? "密度高,4层" : "2层可满足"],
              ["板厚", "1.6mm", "标准"],
              ["铜厚", "1oz", "大电流局部2oz"],
              ["线宽/距", "6/6mil", "标准工艺"],
              ["过孔", "0.3/0.45", "标准工艺"],
              ["表面", "喷锡/沉金", "QFN建议沉金"],
              ["板框", `${pcbSize.w}×${pcbSize.h}mm`, pcbShape === "lshape" ? "异形(加工费+)" : "常规"],
            ].map(([k, v, n]) => (
              <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "4px 6px", color: "#94a3b8", whiteSpace: "nowrap" }}>{k}</td>
                <td style={{ padding: "4px 6px", fontWeight: 700, color: "#1f5c3b", whiteSpace: "nowrap" }}>{v}</td>
                <td style={{ padding: "4px 6px", color: "#64748b" }}>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 9.5, color: "#64748b", lineHeight: 1.6, marginTop: 6 }}>
          <b>布局要点</b>：晶振贴MCU包地 · 去耦电容贴引脚 · USB差分等长(90Ω) · 电源回路最小化 · 连接器靠板边
        </div>
      </Collapse>

      {/* ④ 风险评估 */}
      <Collapse title="设计风险" icon="⚠️" defaultOpen={highCount > 0} badge={highCount > 0 ? `${highCount}高` : null} badgeColor="#dc2626">
        <div style={{ paddingTop: 6 }}>
          {risks.map((r, ri) => {
            const st = lvlStyle[r.lvl];
            return (
              <div key={ri} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", marginBottom: 3, borderRadius: 5, background: st.bg }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: st.color, flexShrink: 0, width: 14, textAlign: "center" }}>{st.label}</span>
                <span style={{ fontSize: 10.5, color: "#334155", lineHeight: 1.4 }}>{r.text}</span>
              </div>
            );
          })}
        </div>
      </Collapse>

      {/* ⑤ 设计工具 */}
      <Collapse title="设计工具与资源" icon="🛠">
        {[["电路仿真", DESIGN_TOOLS.simulation], ["软件开发", DESIGN_TOOLS.software], ["PCB与制造", DESIGN_TOOLS.resources]].map(([title, list]) => (
          <div key={title} style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1f5c3b", marginBottom: 3 }}>{title}</div>
            {list.map(t => (
              <div key={t.name} style={{ padding: "4px 8px", marginBottom: 3, borderRadius: 5, background: "#f8fafc", fontSize: 10 }}>
                <span style={{ fontWeight: 700, color: "#334155" }}>{t.name}</span>
                <span style={{ color: "#64748b" }}> — {t.desc}</span>
                <div style={{ color: "#0369a1", fontSize: 9, fontFamily: "monospace" }}>{t.url}</div>
              </div>
            ))}
          </div>
        ))}
      </Collapse>
    </div>
  );
}

/* ================================================================
   MAIN APP
   ================================================================ */
export default function CircuitCanvas() {
  const [canvas, setCanvas] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("comp"); // comp | foot | ai
  const [subTab, setSubTab] = useState("search"); // search | category
  const [activeCat, setActiveCat] = useState(null);
  const [expId, setExpId] = useState(null);
  const [is3D, setIs3D] = useState(false);
  const [selComp, setSelComp] = useState(null);
  const [bottomPanel, setBottomPanel] = useState(null); // null | bom | block | schematic
  const [blockFull, setBlockFull] = useState(false);
  const [schFull, setSchFull] = useState(false);        // schematic fullscreen
  const [rightTab, setRightTab] = useState("comp");     // comp | advisor
  const [rot3D, setRot3D] = useState({ x: 48, z: -12 }); // 3D view rotation angles
  const [scale3D, setScale3D] = useState(1);
  const rot3DRef = useRef({ active: false, sx: 0, sy: 0, start: { x: 48, z: -12 } });
  const [bdNodes, setBdNodes] = useState([]);
  const [bdArrows, setBdArrows] = useState([]);
  const [bdInited, setBdInited] = useState(false);
  const [orgOnly, setOrgOnly] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pcbSize, setPcbSize] = useState({ w: 100, h: 80 }); // mm
  const [pcbShape, setPcbShape] = useState("rect");          // rect | rounded | circle | lshape
  const [footCat, setFootCat] = useState(null);              // footprint category filter
  const [footQuery, setFootQuery] = useState("");
  const [multiSel, setMultiSel] = useState([]);              // multi-selected component iids (Ctrl+click)
  const [suggestedWires, setSuggestedWires] = useState([]);  // recommended connections
  const [aiReport, setAiReport] = useState(null);            // generated MD report
  const fileInputRef = useRef(null);
  // Sync mutable PCB object from state each render
  PCB.wMM = pcbSize.w;
  PCB.hMM = pcbSize.h;
  const panRef = useRef({ active: false, sx: 0, sy: 0, startPan: { x: 0, y: 0 } });
  const canvasContainerRef = useRef(null);
  const refs = useRef({ mcu: 0, power: 0, passive: 0, connector: 0, ic: 0 });
  // Undo / Redo
  const historyRef = useRef([[]]);
  const historyIdxRef = useRef(0);

  /** Record history + update state. Accepts value or updater function. */
  const pushHistory = useCallback((nextOrFn) => {
    setCanvas(prev => {
      const next = typeof nextOrFn === "function" ? nextOrFn(prev) : nextOrFn;
      const stack = historyRef.current.slice(0, historyIdxRef.current + 1);
      stack.push(next);
      if (stack.length > 60) stack.shift();
      historyRef.current = stack;
      historyIdxRef.current = stack.length - 1;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    setCanvas(historyRef.current[historyIdxRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    setCanvas(historyRef.current[historyIdxRef.current]);
  }, []);

  const placedIds = new Set(canvas.map(c => c.id));

  const filtered = useMemo(() => {
    let arr = ALL_ITEMS;
    if (orgOnly) arr = arr.filter(i => i.org);
    if (tab === "comp" && subTab === "category" && activeCat) arr = arr.filter(i => i.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(i => i.mpn.toLowerCase().includes(q) || i.pkg.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || i.family.toLowerCase().includes(q) || i.manufacturer.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => (b.org ? 1 : 0) - (a.org ? 1 : 0));
  }, [query, tab, subTab, activeCat, orgOnly]);

  const addItem = useCallback(item => {
    if (placedIds.has(item.id)) return;
    const cat = item.category;
    refs.current[cat] = (refs.current[cat] || 0) + 1;
    const refDes = `${REF_PREFIX[cat] || "X"}${refs.current[cat]}`;
    pushHistory(prev => {
      const pos = findPosition(cat, item, prev);
      return [...prev, { ...item, iid: `${item.id}_${Date.now()}`, x: pos.x, y: pos.y, refDes, rotation: 0 }];
    });
  }, [placedIds, pushHistory]);

  /* ── 封装直接添加到画布（点击或拖拽） ── */
  const fpCatMap = { smd_chip: "passive", sot: "power", soic: "ic", qfp: "mcu", tht: "connector", conn: "connector" };
  const addFootprint = useCallback(fp => {
    const cat = fpCatMap[fp.catId] || "ic";
    refs.current[cat] = (refs.current[cat] || 0) + 1;
    const refDes = `${REF_PREFIX[cat] || "X"}${refs.current[cat]}`;
    const item = { id: `${fp.id}_${Date.now()}`, mpn: fp.name, manufacturer: "—", pkg: fp.name, family: "Footprint", price: 0, org: false, desc: `${fp.desc}（封装库加载）`, pins: 8, category: cat, categoryName: "封装", attrs: { source: fp.source } };
    pushHistory(prev => {
      const pos = findPosition(cat, item, prev);
      return [...prev, { ...item, iid: item.id, x: pos.x, y: pos.y, refDes, rotation: 0 }];
    });
  }, [pushHistory]);

  const handleFootprintDrop = useCallback(e => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data?.fpDrag) addFootprint(data);
    } catch { /* not a footprint payload */ }
  }, [addFootprint]);

  /* ── AI 一键生成方案（按需求描述选件并自动布板） ── */
  const aiGenerateScheme = () => {
    if (!aiInput.trim()) { setAiResults([]); return; }
    setAiLoading(true);
    setTimeout(() => {
      const q = aiInput.toLowerCase();
      // 根据关键词组合一套方案：主控 + 电源 + 接口 + 去耦 + 外设
      const picks = [];
      const pick = id => { const it = ALL_ITEMS.find(i => i.id === id); if (it && !picks.includes(it)) picks.push(it); };
      // 主控选择
      if (q.includes("wifi") || q.includes("蓝牙") || q.includes("物联") || q.includes("iot") || q.includes("esp")) pick("esp32s3");
      else if (q.includes("高性能") || q.includes("f4") || q.includes("图像")) pick("stm32f407");
      else pick("stm32f103");
      // 电源
      pick("lm1117");
      if (q.includes("12v") || q.includes("24v") || q.includes("宽压") || q.includes("车")) pick("tps5430");
      // 接口
      if (q.includes("usb") || q.includes("串口") || q.includes("上位机") || q.includes("调试")) { pick("usbc"); pick("ch340"); }
      else pick("header2x5");
      if (q.includes("can")) pick("tja1050");
      if (q.includes("存储") || q.includes("flash") || q.includes("记录")) pick("w25q64");
      // 去耦
      pick("cap100nf"); pick("res10k");
      // 清空画布并放置整套方案
      refs.current = { mcu: 0, power: 0, passive: 0, connector: 0, ic: 0 };
      let placed = [];
      picks.forEach(item => {
        const cat = item.category;
        refs.current[cat] = (refs.current[cat] || 0) + 1;
        const refDes = `${REF_PREFIX[cat] || "X"}${refs.current[cat]}`;
        const pos = findPosition(cat, item, placed);
        placed = [...placed, { ...item, iid: `${item.id}_${Date.now()}_${placed.length}`, x: pos.x, y: pos.y, refDes, rotation: 0 }];
      });
      pushHistory(placed);
      setAiResults(picks);
      setAiLoading(false);
    }, 900);
  };

  const dragComp = useCallback((iid, x, y) => {
    setCanvas(prev => {
      const idx = prev.findIndex(c => c.iid === iid);
      if (idx < 0) return prev;
      const comp = prev[idx];
      const s = SHAPE_CFG[comp.category] || SHAPE_CFG.ic;
      const clamped = clampToBoard(x, y, s.w, s.h);
      const cand = { x: clamped.x, y: clamped.y, w: s.w, h: s.h };
      const others = prev.filter((_, i) => i !== idx).map(getShapeRect);
      const hasOverlap = others.some(e => rectsOverlap(cand, e, 4));
      const next = [...prev];
      next[idx] = { ...comp, x: clamped.x, y: clamped.y, overlap: hasOverlap };
      return next;
    });
  }, []);

  /** Snapshot current state into history after drag ends */
  const onDragEnd = useCallback(() => {
    setCanvas(prev => {
      const stack = historyRef.current.slice(0, historyIdxRef.current + 1);
      stack.push(prev);
      if (stack.length > 60) stack.shift();
      historyRef.current = stack;
      historyIdxRef.current = stack.length - 1;
      return prev;  // state unchanged, just record history
    });
  }, []);

  const removeComp = useCallback(iid => {
    pushHistory(prev => prev.filter(c => c.iid !== iid));
    setSelComp(null);
  }, [pushHistory]);

  const rotateSelected = useCallback(() => {
    if (!selComp) return;
    pushHistory(prev => prev.map(c => c.iid === selComp ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 } : c));
  }, [selComp, pushHistory]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      // R = rotate selected component
      if (e.key === "r" || e.key === "R") {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        rotateSelected();
      }
      // Ctrl+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      // Delete / Backspace = remove selected
      if ((e.key === "Delete" || e.key === "Backspace") && selComp) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        removeComp(selComp);
      }
      // ESC = close fullscreen block diagram
      if (e.key === "Escape" && blockFull) { setBlockFull(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rotateSelected, undo, redo, selComp, removeComp, blockFull]);

  // ── Zoom (mouse wheel) ──
  const handleWheel = useCallback(e => {
    e.preventDefault();
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const next = Math.min(5, Math.max(0.15, prev * delta));
      // Adjust pan so zoom is centered on mouse pointer
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * (next / prev),
        y: mouseY - (mouseY - p.y) * (next / prev),
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Pan (middle-button / right-button drag) ──
  const handleCanvasMouseDown = useCallback(e => {
    // Middle button (1) or right button (2)
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      if (is3D) {
        // In 3D mode: right/middle drag rotates the view
        rot3DRef.current = { active: true, sx: e.clientX, sy: e.clientY, start: { ...rot3D } };
      } else {
        panRef.current = { active: true, sx: e.clientX, sy: e.clientY, startPan: { ...pan } };
      }
    }
  }, [pan, is3D, rot3D]);

  useEffect(() => {
    const onMM = e => {
      if (rot3DRef.current.active) {
        const dx = e.clientX - rot3DRef.current.sx, dy = e.clientY - rot3DRef.current.sy;
        setRot3D({
          x: Math.max(10, Math.min(80, rot3DRef.current.start.x - dy * 0.3)),
          z: rot3DRef.current.start.z + dx * 0.3,
        });
        return;
      }
      if (!panRef.current.active) return;
      setPan({
        x: panRef.current.startPan.x + (e.clientX - panRef.current.sx),
        y: panRef.current.startPan.y + (e.clientY - panRef.current.sy),
      });
    };
    const onMU = e => {
      panRef.current.active = false;
      rot3DRef.current.active = false;
    };
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, []);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); setRot3D({ x: 48, z: -12 }); };

  const aiSearch = () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      const q = aiInput.toLowerCase();
      let res = ALL_ITEMS.filter(i => i.family.toLowerCase().includes(q) || i.mpn.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || i.categoryName.includes(q));
      if (res.length === 0) {
        const kw = { 稳压: "power", 电源: "power", ldo: "power", buck: "power", "3.3v": "power", "5v": "power", 电阻: "passive", 电容: "passive", 电感: "passive", 单片机: "mcu", mcu: "mcu", arm: "mcu", 处理器: "mcu", usb: "connector", 串口: "ic", flash: "ic", can: "ic" };
        for (const [k, v] of Object.entries(kw)) { if (q.includes(k)) { res = ALL_ITEMS.filter(i => i.category === v); break; } }
      }
      setAiResults(res);
      setAiLoading(false);
    }, 700);
  };

  /* ── AI Design Report (MD) ── */
  const buildReport = () => {
    if (canvas.length === 0) { setAiReport("⚠ 画布上暂无器件，请先添加器件再生成方案报告。"); return; }
    setAiLoading(true);
    setTimeout(() => {
      setAiReport(generateDesignReport(canvas, pcbSize, pcbShape));
      setAiLoading(false);
    }, 900);
  };

  const downloadReport = () => {
    if (!aiReport) return;
    const blob = new Blob([aiReport], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `电路方案设计报告_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── Multi-select & recommended connections ── */
  const toggleMultiSel = useCallback((iid) => {
    setMultiSel(prev => prev.includes(iid) ? prev.filter(i => i !== iid) : [...prev, iid]);
  }, []);

  const recommendWires = () => {
    const sel = canvas.filter(c => multiSel.includes(c.iid));
    if (sel.length < 2) return;
    const wires = [];
    const byCategory = cat => sel.filter(c => c.category === cat);
    const mcus = byCategory("mcu"), powers = byCategory("power"), conns = byCategory("connector"), ics = byCategory("ic"), passives = byCategory("passive");
    // Rule 1: power → everything that needs VCC
    powers.forEach(p => {
      [...mcus, ...ics].forEach(t => wires.push({ from: p.iid, to: t.iid, label: "VCC", color: "#dc2626" }));
    });
    // Rule 2: connector → MCU (data)
    conns.forEach(cn => {
      mcus.forEach(m => wires.push({ from: cn.iid, to: m.iid, label: cn.family?.includes("USB") ? "USB D+/D-" : "IO", color: "#2563eb" }));
      if (mcus.length === 0) ics.forEach(i => wires.push({ from: cn.iid, to: i.iid, label: "DATA", color: "#2563eb" }));
    });
    // Rule 3: MCU → peripheral ICs (SPI/I2C/UART)
    mcus.forEach(m => {
      ics.forEach(i => {
        const proto = i.family?.includes("Flash") ? "SPI" : i.family?.includes("CAN") ? "CAN TX/RX" : i.family?.includes("UART") ? "UART" : "I2C";
        wires.push({ from: m.iid, to: i.iid, label: proto, color: "#059669" });
      });
    });
    // Rule 4: passives → nearest IC/MCU (decoupling)
    passives.forEach(pv => {
      const targets = [...mcus, ...ics, ...powers];
      if (targets.length === 0) return;
      let best = targets[0], bd = Infinity;
      targets.forEach(t => { const d = Math.hypot(t.x - pv.x, t.y - pv.y); if (d < bd) { bd = d; best = t; } });
      wires.push({ from: pv.iid, to: best.iid, label: "去耦", color: "#a16207" });
    });
    setSuggestedWires(wires);
  };

  const clearWires = () => { setSuggestedWires([]); setMultiSel([]); };

  /* ── 3D file import (STEP/STL → board outline demo) ── */
  const handle3DImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Prototype: derive an irregular outline from file (demo: L-shape)
    setPcbShape("lshape");
    alert(`已解析 "${file.name}"\n提取板框轮廓 → 应用异形(L形)板框\n（原型演示：实际版本将解析STEP/STL轮廓）`);
    e.target.value = "";
  };

  /* ── PCB outline path by shape ── */
  const pcbOutline = () => {
    const { ox, oy } = PCB; const w = PCB.w, h = PCB.h;
    switch (pcbShape) {
      case "circle": {
        const r = Math.min(w, h) / 2; const cx = ox + w / 2, cy = oy + h / 2;
        return { type: "circle", cx, cy, r };
      }
      case "lshape": {
        const cutW = w * 0.45, cutH = h * 0.4;
        return { type: "path", d: `M${ox},${oy} H${ox + w} V${oy + h - cutH} H${ox + w - cutW} V${oy + h} H${ox} Z` };
      }
      case "rounded": return { type: "rect", rx: 18 };
      default: return { type: "rect", rx: 6 };
    }
  };

  const selObj = canvas.find(c => c.iid === selComp);

  // ───────── TABS config ─────────
  const tabs = [
    { id: "comp", label: "🔍 元器件" },
    { id: "foot", label: "📦 封装" },
    { id: "ai",   label: "🤖 AI方案" },
  ];

  const G = "#1f5c3b";
  const GL = "#2d7c4e";
  const GB = "#f0f9f4";

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif", background: "#F8F9FA", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ===== HEADER ===== */}
      <header style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "#fff", borderBottom: `2px solid ${G}`, boxShadow: "0 2px 8px rgba(45,95,63,.1)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: G }}>元器件查一查、摆一摆</span>
          <span style={{ fontSize: 10, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 10, fontWeight: 500, marginLeft: 4 }}>优化版 v2</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* 3D Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: is3D ? "#dcfce7" : "#f8fafc", border: `1px solid ${is3D ? "#86efac" : "#e2e8f0"}`, cursor: "pointer", transition: "all .2s" }}
            onClick={() => setIs3D(!is3D)}>
            <span style={{ fontSize: 12, fontWeight: 700, color: is3D ? G : "#94a3b8" }}>3D视图</span>
            <div style={{ width: 36, height: 18, borderRadius: 9, background: is3D ? G : "#cbd5e1", position: "relative", transition: "background .2s" }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 2, left: is3D ? 20 : 2, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
            </div>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ===== LEFT SIDEBAR ===== */}
        <aside style={{ width: 330, flexShrink: 0, display: "flex", flexDirection: "column", background: "#f4f7f5", borderRight: "1px solid #dbe6dd" }}>
          {/* Tab bar */}
          <div style={{ background: G, padding: "8px 8px 0" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", borderRadius: "6px 6px 0 0", background: tab === t.id ? "#fff" : "rgba(255,255,255,.12)", color: tab === t.id ? G : "rgba(255,255,255,.8)", transition: "all .15s" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
            {/* ── 元器件 Tab ── */}
            {tab === "comp" && <>
              {/* Sub-tabs: search / category */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <button onClick={() => setSubTab("search")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${subTab === "search" ? G : "#dbe6dd"}`, background: subTab === "search" ? GB : "#fff", color: subTab === "search" ? G : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>关键词搜索</button>
                <button onClick={() => setSubTab("category")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${subTab === "category" ? G : "#dbe6dd"}`, background: subTab === "category" ? GB : "#fff", color: subTab === "category" ? G : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>分类浏览</button>
              </div>
              {/* Org filter */}
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, cursor: "pointer", fontSize: 12, color: "#475569" }}>
                <input type="checkbox" checked={orgOnly} onChange={e => setOrgOnly(e.target.checked)} style={{ accentColor: G }} />
                仅显示本组织物料
              </label>
              {/* Category chips */}
              {subTab === "category" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
                      style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeCat === c.id ? G : "#dbe6dd"}`, background: activeCat === c.id ? GB : "#fff", color: activeCat === c.id ? G : "#64748b" }}>
                      {c.icon} {c.name} ({c.items.length})
                    </button>
                  ))}
                </div>
              )}
              {/* Search input */}
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="输入型号、封装、关键词..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #dbe6dd", fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", marginBottom: 10, transition: "border .15s" }}
                onFocus={e => e.target.style.borderColor = GL} onBlur={e => e.target.style.borderColor = "#dbe6dd"} />
              {/* Subtitle */}
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                云端元器件库 · <b>110万+</b>元器件 · 找到 {filtered.length} 个结果
              </div>
              {/* Results */}
              {filtered.map(item => (
                <ResultCard key={item.id} item={item} expanded={expId === item.id} onToggle={() => setExpId(expId === item.id ? null : item.id)} onAdd={addItem} placed={placedIds.has(item.id)} />
              ))}
              {filtered.length === 0 && <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>无匹配结果</div>}
            </>}

            {/* ── 封装 Tab ── */}
            {tab === "foot" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: G, marginBottom: 4 }}>云端封装库</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>按分类浏览或关键词搜索 · 数据源: KiCad GitLab</div>
                {/* Category chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {FOOTPRINT_CATS.map(fc => (
                    <button key={fc.id} onClick={() => setFootCat(footCat === fc.id ? null : fc.id)}
                      style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${footCat === fc.id ? G : "#dbe6dd"}`, background: footCat === fc.id ? GB : "#fff", color: footCat === fc.id ? G : "#64748b" }}>
                      {fc.icon} {fc.name} ({fc.items.length})
                    </button>
                  ))}
                </div>
                <input value={footQuery} onChange={e => setFootQuery(e.target.value)} placeholder="搜索封装名称，如 0402、SOIC..." style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #dbe6dd", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10, background: "#fff" }} />
                {/* Footprint list */}
                {(() => {
                  let fps = FOOTPRINT_CATS.flatMap(fc => fc.items.map(i => ({ ...i, catName: fc.name, catId: fc.id })));
                  if (footCat) fps = fps.filter(f => f.catId === footCat);
                  if (footQuery.trim()) { const q = footQuery.toLowerCase(); fps = fps.filter(f => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)); }
                  return fps.length > 0 ? fps.map(f => (
                    <div key={f.id} draggable
                      onDragStart={e => e.dataTransfer.setData("text/plain", JSON.stringify({ ...f, fpDrag: true }))}
                      onClick={() => addFootprint(f)}
                      title="点击或拖拽添加到画布"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 6, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "grab", transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#1f5c3b"; e.currentTarget.style.background = "#f7fcf9"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: "#f0f9f4", border: "1px solid #c6e2d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                        {FOOTPRINT_CATS.find(fc => fc.id === f.catId)?.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{f.desc} · {f.source}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); addFootprint(f); }}
                        style={{ width: 24, height: 24, borderRadius: 5, border: "none", background: "#1f5c3b", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                    </div>
                  )) : <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>无匹配封装</div>;
                })()}
              </div>
            )}

            {/* ── AI Tab ── */}
            {tab === "ai" && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: G, marginBottom: 4 }}>AI智能方案设计</div>
                <div style={{ fontSize: 12, color: "#6b7c72", marginBottom: 12, lineHeight: 1.6 }}>
                  支持功能：模糊搜索 · 族级匹配 · 互联网型号→封装映射 · 已放置器件自动过滤
                </div>
                <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
                  placeholder="描述需求，例：3.3V LDO稳压器、ARM Cortex-M4单片机、CAN收发器..."
                  rows={3}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), aiSearch())}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #dbe6dd", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10, background: "rgba(255,255,255,.9)", boxShadow: "0 12px 24px rgba(24,70,42,.08)" }} />
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <button onClick={aiSearch} disabled={aiLoading}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${G}`, background: "#fff", color: G, fontSize: 13, fontWeight: 700, cursor: aiLoading ? "wait" : "pointer" }}>
                    🔍 搜索器件
                  </button>
                  <button onClick={aiGenerateScheme} disabled={aiLoading}
                    style={{ flex: 1.4, padding: "11px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, #245b3a, ${G}, #2f6d49)`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: aiLoading ? "wait" : "pointer", boxShadow: "0 8px 18px rgba(20,70,38,.25)" }}>
                    {aiLoading ? "⟳ 生成中..." : "🤖 生成方案上画布"}
                  </button>
                </div>

                {/* ── 完整方案报告 ── */}
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid #c6e2d0", background: "#f7fcf9" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G, marginBottom: 4 }}>📋 完整方案报告</div>
                  <div style={{ fontSize: 11, color: "#6b7c72", marginBottom: 8, lineHeight: 1.5 }}>
                    基于画布器件自动生成：子电路推荐 · 替代料/渠道 · 电源方案 · PCB规格 · 风险评估 · 工具资源
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={buildReport} disabled={aiLoading}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: G, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {aiLoading ? "⟳ 生成中..." : "生成方案报告"}
                    </button>
                    {aiReport && (
                      <button onClick={downloadReport}
                        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${G}`, background: "#fff", color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                        ⬇ 下载 MD
                      </button>
                    )}
                  </div>
                </div>

                {/* Report preview */}
                {aiReport && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", maxHeight: 320, overflow: "auto" }}>
                    <pre style={{ fontSize: 10.5, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'DM Mono', monospace" }}>{aiReport}</pre>
                  </div>
                )}

                {aiResults !== null && (
                  <div style={{ marginTop: 16 }}>
                    {aiResults.length > 0 ? <>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>找到 {aiResults.length} 个匹配（含族级模糊匹配）</div>
                      {aiResults.map(item => (
                        <ResultCard key={item.id} item={item} expanded={expId === item.id} onToggle={() => setExpId(expId === item.id ? null : item.id)} onAdd={addItem} placed={placedIds.has(item.id)} />
                      ))}
                    </> : <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>未找到匹配，尝试更宽泛的描述</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ===== MAIN AREA ===== */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ background: "#fff", borderBottom: "2px solid #E8F3EE", padding: "8px 20px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxShadow: "0 2px 8px rgba(45,95,63,.05)" }}>
            <button onClick={undo} title="撤销 (Ctrl+Z)"
              style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #E8F3EE", background: "#fff", fontSize: 13, fontWeight: 500, color: historyIdxRef.current > 0 ? "#2C3E50" : "#c4ccc8", cursor: historyIdxRef.current > 0 ? "pointer" : "default", transition: "all .2s" }}>
              ↩ 撤销
            </button>
            <button onClick={redo} title="重做 (Ctrl+Shift+Z)"
              style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #E8F3EE", background: "#fff", fontSize: 13, fontWeight: 500, color: historyIdxRef.current < historyRef.current.length - 1 ? "#2C3E50" : "#c4ccc8", cursor: historyIdxRef.current < historyRef.current.length - 1 ? "pointer" : "default", transition: "all .2s" }}>
              ↪ 重做
            </button>
            <div style={{ width: 1, height: 24, background: "#E8F3EE", margin: "0 4px" }} />
            <button onClick={() => { pushHistory([]); refs.current = { mcu: 0, power: 0, passive: 0, connector: 0, ic: 0 }; resetView(); }}
              style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #E8F3EE", background: "#fff", fontSize: 13, fontWeight: 500, color: "#2C3E50", cursor: "pointer", transition: "all .2s" }}>
              🧹 一键清除
            </button>
            <button style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #E8F3EE", background: "#fff", fontSize: 13, fontWeight: 500, color: "#2C3E50", cursor: "pointer", transition: "all .2s" }}>
              🖼️ 导出图片
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{is3D ? "右键/中键拖拽旋转3D视角 · 点击百分比复位" : "R旋转 · Delete删除 · Ctrl+点击多选"}</span>
          </div>

          {/* Canvas */}
          <div ref={canvasContainerRef} style={{ flex: 1, position: "relative", overflow: "hidden", background: is3D ? "linear-gradient(180deg,#1a2332 0%,#0c1520 100%)" : "#F8F9FA", transition: "background .3s" }}
            onContextMenu={e => e.preventDefault()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFootprintDrop}>

            {is3D ? (
              /* ═══════ 3D VIEWER: centered board, drag to rotate, never clipped ═══════ */
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: "1600px", cursor: rot3DRef.current.active ? "grabbing" : "grab", userSelect: "none" }}
                onMouseDown={e => { e.preventDefault(); rot3DRef.current = { active: true, sx: e.clientX, sy: e.clientY, start: { ...rot3D } }; }}
                onWheel={e => { e.preventDefault(); setScale3D(s => Math.min(3, Math.max(0.4, s * (e.deltaY > 0 ? 0.9 : 1.1)))); }}>
                <svg width={PCB.w + 80} height={PCB.h + 80}
                  viewBox={`${PCB.ox - 40} ${PCB.oy - 40} ${PCB.w + 80} ${PCB.h + 80}`}
                  style={{
                    overflow: "visible",
                    transform: `scale(${scale3D}) rotateX(${rot3D.x}deg) rotateZ(${rot3D.z}deg)`,
                    transformOrigin: "center center",
                    transition: rot3DRef.current.active ? "none" : "transform .2s ease",
                  }}>
                  {/* Board */}
                  {(() => {
                    const o = pcbOutline();
                    const fill = "#0f5132", stroke = "#4ade80";
                    if (o.type === "circle") return <circle cx={o.cx} cy={o.cy} r={o.r} fill={fill} stroke={stroke} strokeWidth={2.5} style={{ filter: "drop-shadow(0 18px 30px rgba(0,0,0,.55))" }} />;
                    if (o.type === "path") return <path d={o.d} fill={fill} stroke={stroke} strokeWidth={2.5} style={{ filter: "drop-shadow(0 18px 30px rgba(0,0,0,.55))" }} />;
                    return <rect x={PCB.ox} y={PCB.oy} width={PCB.w} height={PCB.h} rx={o.rx} fill={fill} stroke={stroke} strokeWidth={2.5} style={{ filter: "drop-shadow(0 18px 30px rgba(0,0,0,.55))" }} />;
                  })()}
                  {/* Copper grid texture */}
                  <defs>
                    <pattern id="g3d" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0L0 0 0 14" fill="none" stroke="rgba(134,239,172,.12)" strokeWidth=".5" /></pattern>
                  </defs>
                  {(() => {
                    const o = pcbOutline();
                    if (o.type === "circle") return <circle cx={o.cx} cy={o.cy} r={o.r - 2} fill="url(#g3d)" />;
                    if (o.type === "path") return <path d={o.d} fill="url(#g3d)" />;
                    return <rect x={PCB.ox + 2} y={PCB.oy + 2} width={PCB.w - 4} height={PCB.h - 4} rx={o.rx} fill="url(#g3d)" />;
                  })()}
                  {/* Mounting holes */}
                  {pcbShape !== "circle" && [[PCB.ox + 14, PCB.oy + 14], [PCB.ox + PCB.w - 14, PCB.oy + 14], [PCB.ox + 14, PCB.oy + PCB.h - 14], pcbShape !== "lshape" ? [PCB.ox + PCB.w - 14, PCB.oy + PCB.h - 14] : null].filter(Boolean).map(([hx, hy], i) => (
                    <g key={`mh3${i}`}>
                      <circle cx={hx} cy={hy} r={6} fill="none" stroke="#86efac" strokeWidth={1} />
                      <circle cx={hx} cy={hy} r={2.5} fill="#0c1520" />
                    </g>
                  ))}
                  {/* Dimension label */}
                  <text x={PCB.ox + PCB.w / 2} y={PCB.oy - 12} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="#86efac">{PCB.wMM}mm × {PCB.hMM}mm</text>
                  {/* Components (view-only) */}
                  <g style={{ pointerEvents: "none" }}>
                    {canvas.map(c => <CanvasComp key={c.iid} comp={c} is3D={true} selected={false} onSelect={() => {}} onDrag={() => {}} onDragEnd={() => {}} zoom={1} />)}
                  </g>
                  {canvas.length === 0 && <text x={PCB.ox + PCB.w / 2} y={PCB.oy + PCB.h / 2} textAnchor="middle" fontSize={12} fill="#475569">画布为空 · 切回2D添加器件</text>}
                </svg>
                {/* 3D HUD */}
                <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", padding: "5px 14px", borderRadius: 16, background: "rgba(255,255,255,.08)", border: "1px solid rgba(134,239,172,.25)", color: "#86efac", fontSize: 11, fontWeight: 600, pointerEvents: "none" }}>
                  🖱 拖拽旋转 · 滚轮缩放 ｜ 俯仰 {Math.round(rot3D.x)}° · 旋转 {Math.round(((rot3D.z % 360) + 360) % 360)}° · {Math.round(scale3D * 100)}%
                </div>
                <button onClick={() => { setRot3D({ x: 48, z: -12 }); setScale3D(1); }}
                  style={{ position: "absolute", bottom: 12, right: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(134,239,172,.3)", background: "rgba(255,255,255,.08)", color: "#86efac", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  ⟳ 复位视角
                </button>
              </div>
            ) : (
              /* ═══════ 2D EDITOR ═══════ */
              <svg width="100%" height="100%"
                style={{ background: "transparent" }}
                onClick={() => setSelComp(null)}
                onMouseDown={handleCanvasMouseDown}>
                <defs>
                  <pattern id="g1" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth=".5" /></pattern>
                  <pattern id="g2" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0L0 0 0 100" fill="none" stroke="#d1d5db" strokeWidth=".5" /></pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#g1)" />
                <rect width="100%" height="100%" fill="url(#g2)" />
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {/* ── PCB Board Outline (shape-aware) ── */}
                  {(() => {
                    const o = pcbOutline();
                    const fill = "#f8fdf9", stroke = "#2D5F3F";
                    if (o.type === "circle") return <circle cx={o.cx} cy={o.cy} r={o.r} fill={fill} stroke={stroke} strokeWidth={2} />;
                    if (o.type === "path") return <path d={o.d} fill={fill} stroke={stroke} strokeWidth={2} />;
                    return <rect x={PCB.ox} y={PCB.oy} width={PCB.w} height={PCB.h} rx={o.rx} fill={fill} stroke={stroke} strokeWidth={2} />;
                  })()}
                  {/* Mounting holes */}
                  {pcbShape !== "circle" && [[PCB.ox + 14, PCB.oy + 14], [PCB.ox + PCB.w - 14, PCB.oy + 14], [PCB.ox + 14, PCB.oy + PCB.h - 14], pcbShape !== "lshape" ? [PCB.ox + PCB.w - 14, PCB.oy + PCB.h - 14] : null].filter(Boolean).map(([hx, hy], i) => (
                    <g key={`mh${i}`}>
                      <circle cx={hx} cy={hy} r={6} fill="none" stroke="#c6e2d0" strokeWidth={1} />
                      <circle cx={hx} cy={hy} r={2.5} fill="#e2e8f0" />
                    </g>
                  ))}
                  {/* Dimension labels */}
                  <text x={PCB.ox + PCB.w / 2} y={PCB.oy - 8} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#6b7280">
                    {PCB.wMM}mm ({PCB.wMM / 10}cm)
                  </text>
                  <text x={PCB.ox - 10} y={PCB.oy + PCB.h / 2} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#6b7280"
                    transform={`rotate(-90,${PCB.ox - 10},${PCB.oy + PCB.h / 2})`}>
                    {PCB.hMM}mm ({PCB.hMM / 10}cm)
                  </text>
                  {/* Zone hints */}
                  {canvas.length === 0 && <>
                    <rect x={PCB.ox + PCB.w * 0.05} y={PCB.oy + PCB.h * 0.05} width={PCB.w * 0.30} height={PCB.h * 0.30} rx={4} fill="rgba(180,83,9,.04)" stroke="rgba(180,83,9,.15)" strokeWidth={1} strokeDasharray="4 3" />
                    <text x={PCB.ox + PCB.w * 0.20} y={PCB.oy + PCB.h * 0.12} textAnchor="middle" fontSize={9} fill="rgba(180,83,9,.4)">电源区域</text>
                    <rect x={PCB.ox + PCB.w * 0.30} y={PCB.oy + PCB.h * 0.25} width={PCB.w * 0.40} height={PCB.h * 0.40} rx={4} fill="rgba(26,107,60,.04)" stroke="rgba(26,107,60,.15)" strokeWidth={1} strokeDasharray="4 3" />
                    <text x={PCB.ox + PCB.w * 0.50} y={PCB.oy + PCB.h * 0.43} textAnchor="middle" fontSize={9} fill="rgba(26,107,60,.4)">MCU 核心区域</text>
                    <text x={PCB.ox + PCB.edgeSnap + 4} y={PCB.oy + PCB.h * 0.32} fontSize={8} fill="rgba(109,40,217,.4)" transform={`rotate(-90,${PCB.ox + PCB.edgeSnap + 4},${PCB.oy + PCB.h * 0.32})`}>连接器边缘</text>
                  </>}
                  {/* ── Suggested wires (推荐连线) ── */}
                  {suggestedWires.map((w, wi) => {
                    const f = canvas.find(c => c.iid === w.from), t = canvas.find(c => c.iid === w.to);
                    if (!f || !t) return null;
                    const fs = SHAPE_CFG[f.category] || SHAPE_CFG.ic, ts = SHAPE_CFG[t.category] || SHAPE_CFG.ic;
                    const x1 = f.x + fs.w / 2, y1 = f.y + fs.h / 2, x2 = t.x + ts.w / 2, y2 = t.y + ts.h / 2;
                    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                    return (
                      <g key={`sw${wi}`} style={{ pointerEvents: "none" }}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={w.color} strokeWidth={1.6} strokeDasharray="5 3" opacity={0.8} />
                        <circle cx={x1} cy={y1} r={3} fill={w.color} />
                        <circle cx={x2} cy={y2} r={3} fill={w.color} />
                        <rect x={mx - w.label.length * 3.2 - 4} y={my - 8} width={w.label.length * 6.4 + 8} height={14} rx={3} fill="#fff" stroke={w.color} strokeWidth={0.8} opacity={0.95} />
                        <text x={mx} y={my + 2.5} textAnchor="middle" fontSize={8} fontWeight={700} fill={w.color} fontFamily="monospace">{w.label}</text>
                      </g>
                    );
                  })}
                  {/* Multi-select rings */}
                  {multiSel.map(iid => {
                    const c = canvas.find(cc => cc.iid === iid);
                    if (!c) return null;
                    const s = SHAPE_CFG[c.category] || SHAPE_CFG.ic;
                    return <rect key={`ms${iid}`} x={c.x - 5} y={c.y - 5} width={s.w + 10} height={s.h + 10} rx={6} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" style={{ pointerEvents: "none" }} />;
                  })}
                  {/* Components */}
                  {canvas.map(c => <CanvasComp key={c.iid} comp={c} is3D={false} selected={selComp === c.iid} onSelect={(iid, ctrlKey) => { if (ctrlKey) toggleMultiSel(iid); else setSelComp(iid); }} onDrag={dragComp} onDragEnd={onDragEnd} zoom={zoom} />)}
                  {canvas.length === 0 && <text x={PCB.ox + PCB.w / 2} y={PCB.oy + PCB.h * 0.75} textAnchor="middle" fontSize={12} fill="#94a3b8">从左侧面板添加器件，自动按电气规则摆放</text>}
                </g>
              </svg>
            )}

            {/* Zoom indicator (2D only) */}
            {!is3D && (
            <div style={{ position: "absolute", bottom: selObj ? 56 : 12, right: 12, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.92)", borderRadius: 8, padding: "4px 6px", boxShadow: "0 2px 8px rgba(0,0,0,.1)", border: "1px solid #e2e8f0", fontSize: 11 }}>
              <button onClick={() => setZoom(z => Math.max(0.15, z * 0.8))} style={{ width: 24, height: 24, border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span onClick={resetView} style={{ minWidth: 44, textAlign: "center", fontWeight: 600, color: "#334155", cursor: "pointer" }} title="重置视图">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z * 1.25))} style={{ width: 24, height: 24, border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
            )}

            {/* Selected comp bar (2D only) */}
            {selObj && !is3D && (
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 10, padding: "8px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.12)", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: G }}>{selObj.refDes}</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selObj.mpn}</span>
                <span style={{ color: "#64748b" }}>{selObj.pkg}</span>
                <span style={{ color: "#059669", fontWeight: 600 }}>¥{selObj.price.toFixed(2)}</span>
                {selObj.overlap && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#fef2f2", color: "#dc2626", fontWeight: 600 }}>⚠ 重叠</span>}
                <button onClick={() => removeComp(selObj.iid)}
                  style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>移除</button>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ display: "flex", background: "#fff", borderTop: "1px solid #E8F3EE", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: G, whiteSpace: "nowrap" }}>📐 PCB</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f8fafc", borderRadius: 6, padding: "3px 6px", border: "1px solid #E8F3EE" }}>
                <span style={{ color: "#7F8C8D", fontSize: 11 }}>W</span>
                <input type="number" value={pcbSize.w} min={20} max={500} step={5}
                  onChange={e => { const v = Math.max(20, Math.min(500, Number(e.target.value) || 20)); setPcbSize(p => ({ ...p, w: v })); }}
                  style={{ width: 48, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: G, outline: "none", textAlign: "center", fontFamily: "monospace" }} />
                <span style={{ color: "#94a3b8", fontSize: 10 }}>mm</span>
              </div>
              <span style={{ color: "#cbd5e1" }}>×</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f8fafc", borderRadius: 6, padding: "3px 6px", border: "1px solid #E8F3EE" }}>
                <span style={{ color: "#7F8C8D", fontSize: 11 }}>H</span>
                <input type="number" value={pcbSize.h} min={20} max={400} step={5}
                  onChange={e => { const v = Math.max(20, Math.min(400, Number(e.target.value) || 20)); setPcbSize(p => ({ ...p, h: v })); }}
                  style={{ width: 48, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: G, outline: "none", textAlign: "center", fontFamily: "monospace" }} />
                <span style={{ color: "#94a3b8", fontSize: 10 }}>mm</span>
              </div>
              <div style={{ width: 1, height: 16, background: "#E8F3EE", margin: "0 2px" }} />
              {/* PCB Shape selector */}
              {PCB_SHAPES.map(sh => (
                <button key={sh.id} title={sh.name}
                  onClick={() => { if (sh.id === "import3d") { fileInputRef.current?.click(); } else { setPcbShape(sh.id); } }}
                  style={{ width: 26, height: 22, borderRadius: 4, border: `1.5px solid ${pcbShape === sh.id ? G : "#E8F3EE"}`, background: pcbShape === sh.id ? GB : "#fff", color: pcbShape === sh.id ? G : "#94a3b8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  {sh.icon}
                </button>
              ))}
              <input ref={fileInputRef} type="file" accept=".step,.stp,.stl,.dxf" style={{ display: "none" }} onChange={handle3DImport} />
              <div style={{ width: 1, height: 16, background: "#E8F3EE", margin: "0 2px" }} />
              <span style={{ color: "#7F8C8D", fontSize: 11 }}>缩放: {Math.round(zoom * 100)}%</span>
              {canvas.some(c => c.overlap) && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#fef2f2", color: "#dc2626", fontWeight: 600 }}>
                  ⚠ 存在重叠
                </span>
              )}
              {/* Multi-select & wire recommendation */}
              {multiSel.length >= 2 && (
                <button onClick={recommendWires}
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "1px solid #f59e0b", background: "#fffbeb", color: "#b45309", fontWeight: 700, cursor: "pointer" }}>
                  ⚡ 推荐连线 ({multiSel.length})
                </button>
              )}
              {suggestedWires.length > 0 && (
                <button onClick={clearWires}
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, cursor: "pointer" }}>
                  ✕ 清除连线
                </button>
              )}
            </div>
            <div style={{ flex: 1 }} />
            {[
              { id: "bom", icon: "🧾", label: "BOM清单" },
              { id: "block", icon: "📊", label: "绘制框图" },
              { id: "schematic", icon: "⚡", label: "原理图" },
            ].map(b => (
              <button key={b.id} onClick={() => setBottomPanel(bottomPanel === b.id ? null : b.id)}
                style={{ padding: "8px 16px", border: "none", background: bottomPanel === b.id ? GB : "#fff", color: bottomPanel === b.id ? G : "#2C3E50", fontSize: 13, fontWeight: 500, cursor: "pointer", borderTop: bottomPanel === b.id ? `2px solid ${G}` : "2px solid transparent" }}>
                {b.icon} {b.label}
              </button>
            ))}
          </div>

          {/* Bottom Panel */}
          {bottomPanel && !(bottomPanel === "block" && blockFull) && !(bottomPanel === "schematic" && schFull) && (
            <div style={{ height: bottomPanel === "block" ? 340 : 270, borderTop: "1px solid #E8F3EE", background: "#fff", flexShrink: 0, overflow: "hidden" }}>
              {bottomPanel === "bom" && <BomPanel items={canvas} />}
              {bottomPanel === "schematic" && <SchematicPanel items={canvas} wires={suggestedWires} isFullscreen={false} onToggleFullscreen={() => setSchFull(true)} />}
              {bottomPanel === "block" && <BlockDiagramPanel items={canvas} isFullscreen={false} onToggleFullscreen={() => setBlockFull(true)}
                nodes={bdNodes} setNodes={setBdNodes} arrows={bdArrows} setArrows={setBdArrows} bdInited={bdInited} setBdInited={setBdInited} />}
            </div>
          )}
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <aside style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #e2e8f0" }}>
          <div style={{ background: G, padding: "6px 8px 0", display: "flex", gap: 4 }}>
            {[{ id: "comp", label: "🔧 当前元件" }, { id: "advisor", label: "🤖 AI顾问" }].map(t => (
              <button key={t.id} onClick={() => setRightTab(t.id)}
                style={{ flex: 1, padding: "9px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "none", borderRadius: "6px 6px 0 0",
                  background: rightTab === t.id ? "#fff" : "rgba(255,255,255,.12)", color: rightTab === t.id ? G : "rgba(255,255,255,.85)" }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 12, background: "#f8fafc" }}>
            {rightTab === "advisor" ? (
              <AdvisorPanel canvas={canvas} pcbSize={pcbSize} pcbShape={pcbShape} onAddItem={addItem} />
            ) : selObj ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "#fff", borderRadius: 10, padding: 14, border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{selObj.refDes}</div>
                  <div style={{ fontSize: 14, fontFamily: "monospace", color: G, fontWeight: 600, marginTop: 2 }}>{selObj.mpn}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: 12 }}>
                  {[
                    ["封装", selObj.pkg],
                    ["厂商", selObj.manufacturer],
                    ["引脚数", selObj.pins],
                    ["族/系列", selObj.family],
                    ["分类", selObj.categoryName],
                    ["单价(1+)", `¥${selObj.price.toFixed(2)}`],
                    ["旋转", `${selObj.rotation || 0}°`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: "6px 8px", borderRadius: 6, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontWeight: 600, color: k === "单价(1+)" ? "#059669" : "#334155" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{selObj.desc}</div>
                {selObj.attrs && (
                  <div style={{ padding: "10px", borderRadius: 8, background: "#f0f9f4", border: "1px solid #c6e2d0" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: G, marginBottom: 6 }}>关键属性</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {Object.entries(selObj.attrs).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>{k}: {v}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* ── 替代料与购买渠道 ── */}
                {ALTERNATIVES_DB[selObj.mpn] ? (
                  <div style={{ padding: "10px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>💡 替代料推荐（降本/备选）</div>
                    {ALTERNATIVES_DB[selObj.mpn].map((a, ai) => (
                      <div key={ai} style={{ padding: "6px 8px", marginBottom: 4, borderRadius: 6, background: "#fff", border: "1px solid #fef3c7" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 11.5, fontWeight: 700, color: "#1e293b" }}>{a.mpn}</span>
                          <span style={{ fontSize: 9.5, color: "#94a3b8" }}>{a.maker}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4, marginTop: 2 }}>{a.note}</div>
                        <div style={{ fontSize: 9.5, color: "#0369a1", marginTop: 2 }}>📦 渠道：{a.channel}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: "#94a3b8", padding: "8px 10px", borderRadius: 8, background: "#f8fafc", border: "1px dashed #e2e8f0" }}>
                    暂无替代料记录 · 可在立创商城按"{selObj.family}"系列同参数比价
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, borderRadius: 12, border: "1px dashed #d9e6dd", background: "rgba(255,255,255,.7)" }}>
                <div style={{ color: "#7F8C8D", fontSize: 12, marginBottom: 4 }}>暂无选中元件</div>
                <div style={{ color: "#7F8C8D", fontSize: 12, lineHeight: 1.5 }}>点击画布中的元件以查看详细参数</div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ===== BLOCK DIAGRAM FULLSCREEN OVERLAY ===== */}
      {blockFull && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
          onClick={() => setBlockFull(false)}>
          <div style={{
            width: "100%", maxWidth: 1200, height: "90vh",
            background: "#fff", borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,.25)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
            onClick={e => e.stopPropagation()}>
            <BlockDiagramPanel items={canvas} isFullscreen={true} onToggleFullscreen={() => setBlockFull(false)}
              nodes={bdNodes} setNodes={setBdNodes} arrows={bdArrows} setArrows={setBdArrows} bdInited={bdInited} setBdInited={setBdInited} />
          </div>
        </div>
      )}

      {/* ===== SCHEMATIC FULLSCREEN OVERLAY ===== */}
      {schFull && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
          onClick={() => setSchFull(false)}>
          <div style={{
            width: "100%", maxWidth: 1200, height: "90vh",
            background: "#fff", borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,.25)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
            onClick={e => e.stopPropagation()}>
            <SchematicPanel items={canvas} wires={suggestedWires} isFullscreen={true} onToggleFullscreen={() => setSchFull(false)} />
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c6e2d0; border-radius: 3px; }
      `}</style>
    </div>
  );
}
