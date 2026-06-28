/**
 * modules/board-editor/footprint3d.ts
 * 参数化 3D 封装模型生成器 —— 用 Three.js 几何体按封装类型生成逼真模型。
 * 无需 STEP 文件：芯片本体+引脚、片式电容、电感、连接器等都参数化构建。
 * 单位 mm，与设计内核一致。
 */
import * as THREE from 'three';
import type { PlacedComponent } from '../../design-core/document/types';

const MAT = {
  blackBody: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.3 }),
  darkBody: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.45, metalness: 0.35 }),
  lead: new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.3, metalness: 0.85 }),
  tin: new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.35, metalness: 0.8 }),
  capBrown: new THREE.MeshStandardMaterial({ color: 0xa97b50, roughness: 0.6, metalness: 0.1 }),
  capBeige: new THREE.MeshStandardMaterial({ color: 0xd8c9a0, roughness: 0.6, metalness: 0.05 }),
  metalCan: new THREE.MeshStandardMaterial({ color: 0xb0b4b8, roughness: 0.25, metalness: 0.9 }),
  pcbGreen: new THREE.MeshStandardMaterial({ color: 0x0a7a3a, roughness: 0.5, metalness: 0.1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 }),
  white: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7, metalness: 0 }),
};

/** SOIC/SOP/QFP 类：黑色本体 + 金属引脚 */
function makeChip(bodyW: number, bodyH: number, bodyT: number, opts: { gull?: boolean; perSideX?: number; perSideY?: number } = {}): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyT, bodyH), MAT.blackBody);
  body.position.y = bodyT / 2 + 0.05;
  g.add(body);
  // 引脚1凹点
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(bodyW * 0.06, bodyW * 0.06, 0.05, 12), MAT.darkBody);
  dot.position.set(-bodyW / 2 + bodyW * 0.18, bodyT + 0.05, -bodyH / 2 + bodyH * 0.18);
  g.add(dot);
  // 引脚（鸥翼）
  const leadLen = 0.5, leadW = 0.3, leadT = 0.15;
  const addLeads = (count: number, along: 'x' | 'z', edge: number) => {
    if (count <= 0) return;
    const span = (along === 'x' ? bodyW : bodyH) * 0.8;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : -span / 2 + (span * i) / (count - 1);
      const lead = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? leadW : leadLen, leadT, along === 'x' ? leadLen : leadW), MAT.lead);
      if (along === 'x') lead.position.set(t, leadT / 2, edge > 0 ? bodyH / 2 + leadLen / 2 : -bodyH / 2 - leadLen / 2);
      else lead.position.set(edge > 0 ? bodyW / 2 + leadLen / 2 : -bodyW / 2 - leadLen / 2, leadT / 2, t);
      g.add(lead);
    }
  };
  const psx = opts.perSideX ?? 0, psy = opts.perSideY ?? 0;
  addLeads(psx, 'x', 1); addLeads(psx, 'x', -1);
  addLeads(psy, 'z', 1); addLeads(psy, 'z', -1);
  return g;
}

/** 片式元件（电容/电阻/电感） */
function makeChipComponent(w: number, h: number, t: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, t, h), mat);
  body.position.y = t / 2 + 0.02;
  g.add(body);
  // 两端电极
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, t * 1.05, h * 1.02), MAT.tin);
    cap.position.set(sx * (w / 2 - w * 0.09), t / 2 + 0.02, 0);
    g.add(cap);
  }
  return g;
}

/** 圆柱电感/钽电容 */
function makeCan(d: number, hgt: number): THREE.Group {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, hgt, 24), MAT.metalCan);
  can.position.y = hgt / 2 + 0.05;
  g.add(can);
  return g;
}

/** SOT-223 */
function makeSot223(): THREE.Group {
  const g = makeChip(6.5, 3.5, 1.6, { perSideX: 3 });
  // 散热焊片
  const tab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.15, 1.5), MAT.lead);
  tab.position.set(0, 0.075, -2.4);
  g.add(tab);
  return g;
}

/** USB-C 连接器：金属壳 */
function makeUsbC(): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 7), MAT.metalCan);
  shell.position.y = 3.2 / 2 + 0.05;
  g.add(shell);
  // 开口
  const slot = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.6, 0.5), MAT.blackBody);
  slot.position.set(0, 3.2 / 2 + 0.05, 3.5);
  g.add(slot);
  return g;
}

/** 排针：黑色塑料基座 + 金属针 */
function makeHeader(cols: number, rows: number): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(cols * 2.54, 2.5, rows * 2.54), MAT.blackBody);
  base.position.y = 2.5 / 2 + 0.05;
  g.add(base);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.64, 6, 0.64), MAT.gold);
    pin.position.set(-((cols - 1) * 2.54) / 2 + c * 2.54, 3, -((rows - 1) * 2.54) / 2 + r * 2.54);
    g.add(pin);
  }
  return g;
}

/** 模组（ESP32 等）：黑色 PCB 模块 + 屏蔽罩 */
function makeModule(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, h), MAT.blackBody);
  pcb.position.y = 0.4 + 0.05;
  g.add(pcb);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 1.5, h * 0.75), MAT.metalCan);
  shield.position.set(0, 0.8 + 0.75 + 0.05, -h * 0.08);
  g.add(shield);
  return g;
}

/**
 * 根据器件生成 3D 模型 Group（局部坐标，y 向上，停在 z=0 平面上方）。
 */
export function buildComponent3D(comp: PlacedComponent): THREE.Group {
  const fp = comp.footprint.name;
  let group: THREE.Group;

  switch (fp) {
    case '0402': group = makeChipComponent(1.0, 0.5, 0.5, comp.display?.family === 'MLCC' ? MAT.capBeige : MAT.darkBody); break;
    case '0603': group = makeChipComponent(1.6, 0.8, 0.8, comp.display?.family === 'MLCC' ? MAT.capBeige : MAT.darkBody); break;
    case '0805': group = makeChipComponent(2.0, 1.25, 1.0, MAT.capBeige); break;
    case '4018': group = makeCan(4.0, 1.8); break;
    case 'SOT-223': group = makeSot223(); break;
    case 'TSOT-23-8': group = makeChip(2.9, 1.6, 1.0, { perSideX: 4 }); break;
    case 'SOIC-8': group = makeChip(4.9, 3.9, 1.5, { perSideX: 4 }); break;
    case 'SOP-16': group = makeChip(10.0, 4.0, 1.5, { perSideX: 8 }); break;
    case 'LQFP-48': group = makeChip(7.0, 7.0, 1.4, { perSideX: 12, perSideY: 12 }); break;
    case 'LQFP-100': group = makeChip(14.0, 14.0, 1.4, { perSideX: 25, perSideY: 25 }); break;
    case 'Module-44': group = makeModule(18.0, 25.5); break;
    case 'USB-C-16P': group = makeUsbC(); break;
    case 'THT-2.54mm': group = makeHeader(5, 2); break;
    default:
      group = makeChip(comp.footprint.geometry.bodyWidthMm, comp.footprint.geometry.bodyHeightMm, 1.2, { perSideX: 4 });
  }
  return group;
}

export { MAT };
