/**
 * design-core/geometry/board-outline.ts
 * L 形板轮廓：可配置切角尺寸 + 5 个凸角圆角（凹角保持直角）。
 * 2D SVG 与 3D THREE.Shape 共用同一套顶点/圆角数学，保证视图一致。
 */

export interface Pt { x: number; y: number }

/** L 形 6 顶点（顺时针，右下切角），index 3 为凹角 */
export function lshapeVertices(x: number, y: number, w: number, h: number, cutW: number, cutH: number): Pt[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h - cutH },
    { x: x + w - cutW, y: y + h - cutH }, // 凹角
    { x: x + w - cutW, y: y + h },
    { x, y: y + h },
  ];
}

const CONCAVE_IDX = 3;

/** 每个顶点的入/出切点（凸角圆角半径 r，凹角 r=0），r 自动夹取到相邻边长的一半 */
function cornerPoints(verts: Pt[], i: number, r: number): { a: Pt; v: Pt; b: Pt; r: number } {
  const v = verts[i];
  const p = verts[(i + verts.length - 1) % verts.length];
  const n = verts[(i + 1) % verts.length];
  const din = { x: v.x - p.x, y: v.y - p.y };
  const dout = { x: n.x - v.x, y: n.y - v.y };
  const lin = Math.hypot(din.x, din.y) || 1;
  const lout = Math.hypot(dout.x, dout.y) || 1;
  const ri = i === CONCAVE_IDX ? 0 : Math.max(0, Math.min(r, lin / 2 - 0.01, lout / 2 - 0.01));
  return {
    a: { x: v.x - (din.x / lin) * ri, y: v.y - (din.y / lin) * ri },
    v,
    b: { x: v.x + (dout.x / lout) * ri, y: v.y + (dout.y / lout) * ri },
    r: ri,
  };
}

/** SVG path d（二次贝塞尔近似圆角，小半径下与圆弧视觉无差） */
export function lshapeRoundedPathD(x: number, y: number, w: number, h: number, cutW: number, cutH: number, r: number): string {
  const verts = lshapeVertices(x, y, w, h, cutW, cutH);
  const cs = verts.map((_, i) => cornerPoints(verts, i, r));
  let d = `M${cs[0].b.x.toFixed(2)},${cs[0].b.y.toFixed(2)}`;
  for (let i = 1; i <= verts.length; i++) {
    const c = cs[i % verts.length];
    d += ` L${c.a.x.toFixed(2)},${c.a.y.toFixed(2)}`;
    if (c.r > 0.01) d += ` Q${c.v.x.toFixed(2)},${c.v.y.toFixed(2)} ${c.b.x.toFixed(2)},${c.b.y.toFixed(2)}`;
    else if (i < verts.length) d += ` L${c.b.x.toFixed(2)},${c.b.y.toFixed(2)}`;
  }
  return d + ' Z';
}

/** 供 THREE.Shape 使用：依次产出 lineTo/quadraticCurveTo 指令 */
export function lshapeRoundedSegments(x: number, y: number, w: number, h: number, cutW: number, cutH: number, r: number): { move: Pt; segs: ({ type: 'L'; p: Pt } | { type: 'Q'; c: Pt; p: Pt })[] } {
  const verts = lshapeVertices(x, y, w, h, cutW, cutH);
  const cs = verts.map((_, i) => cornerPoints(verts, i, r));
  const segs: ({ type: 'L'; p: Pt } | { type: 'Q'; c: Pt; p: Pt })[] = [];
  for (let i = 1; i <= verts.length; i++) {
    const c = cs[i % verts.length];
    segs.push({ type: 'L', p: c.a });
    if (c.r > 0.01) segs.push({ type: 'Q', c: c.v, p: c.b });
    else segs.push({ type: 'L', p: c.b });
  }
  return { move: cs[0].b, segs };
}
