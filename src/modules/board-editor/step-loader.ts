/**
 * modules/board-editor/step-loader.ts
 * 真实 STEP 3D 模型加载 —— OpenCascade WASM (occt-import-js) 浏览器端转换。
 *
 * - 懒加载：只在 3D 视图遇到带 stepUrl 的器件时才加载 WASM（~11MB，一次）
 * - STEP 经 /api/ezplm?path=file 代理拉取（CORS 规避）
 * - 转换成功注册缓存并 bump 版本 → BoardView3D 重建时替换参数化模型
 * - 任一环节失败 → 静默回退参数化模型（不影响使用）
 */
import * as THREE from 'three';
import { useLibFileStore } from '../../design-core/geometry/lib-file-registry';

type OcctModule = {
  ReadStepFile: (content: Uint8Array, params: null) => {
    success: boolean;
    meshes: {
      attributes: { position: { array: number[] }; normal?: { array: number[] } };
      index?: { array: number[] };
      color?: number[];
    }[];
  };
};

let occtPromise: Promise<OcctModule> | null = null;

async function getOcct(): Promise<OcctModule> {
  if (!occtPromise) {
    occtPromise = (async () => {
      const [{ default: occtimportjs }, wasmMod] = await Promise.all([
        import('occt-import-js'),
        import('occt-import-js/dist/occt-import-js.wasm?url'),
      ]);
      return (await occtimportjs({ locateFile: () => wasmMod.default })) as OcctModule;
    })();
  }
  return occtPromise;
}

const modelCache = new Map<string, THREE.Group>(); // key: stepUrl
const bytesCache = new Map<string, Uint8Array>();   // 预取的文件字节（规避签名链接过期）
const inflight = new Set<string>();
const failed = new Set<string>();
let lastError = '';

/** 3D 视图悬浮提示用的汇总状态 */
export function stepStats() {
  return { ready: modelCache.size, loading: inflight.size, failed: failed.size, lastError };
}

/** 器件上画布时预取 STEP 文件字节（签名链接约半小时过期，趁新鲜先拿字节；转换仍懒执行） */
export function ensureStepBytes(url: string | undefined) {
  if (!url || bytesCache.has(url) || modelCache.has(url) || inflight.has(url) || failed.has(url)) return;
  fetch(`/api/ezplm?path=file&url=${encodeURIComponent(url)}`).then(async (r) => {
    if (!r.ok) return; // 预取失败不算失败，转换时会重试并报错
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 16 && buf[0] !== 0x7b) bytesCache.set(url, buf); // 0x7b='{' 代理 JSON 错误
  }).catch(() => { /* 预取失败静默 */ });
}

export function stepModelFor(url: string | undefined): THREE.Group | undefined {
  if (!url) return undefined;
  const g = modelCache.get(url);
  return g ? (g.clone() as THREE.Group) : undefined;
}

/** 按需拉取并转换 STEP（幂等）；完成后 bump 版本触发 3D 重建 */
export function ensureStepModel(url: string | undefined) {
  if (!url || modelCache.has(url) || inflight.has(url) || failed.has(url)) return;
  inflight.add(url);
  useLibFileStore.getState().bump(); // 让「转换中」状态可见
  (async () => {
    try {
      let buf = bytesCache.get(url);
      if (!buf) {
        const resp = await fetch(`/api/ezplm?path=file&url=${encodeURIComponent(url)}`);
        if (!resp.ok) throw new Error(`文件拉取失败 HTTP ${resp.status}（签名链接可能已过期，重新搜索该器件可刷新）`);
        buf = new Uint8Array(await resp.arrayBuffer());
        if (buf.length > 0 && buf[0] === 0x7b) throw new Error('代理返回错误: ' + new TextDecoder().decode(buf.slice(0, 120)));
      }
      const occt = await getOcct().catch((e) => { throw new Error('WASM 引擎加载失败: ' + String(e).slice(0, 120)); });
      const result = occt.ReadStepFile(buf, null);
      if (!result?.success || !result.meshes?.length) throw new Error('STEP 解析失败（文件格式异常）');

      const group = new THREE.Group();
      for (const m of result.meshes) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
        if (m.attributes.normal) geo.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
        else geo.computeVertexNormals();
        if (m.index) geo.setIndex(m.index.array);
        const color = Array.isArray(m.color) && m.color.length >= 3
          ? new THREE.Color(m.color[0], m.color[1], m.color[2])
          : new THREE.Color(0x2a2a30);
        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.55 });
        group.add(new THREE.Mesh(geo, mat));
      }
      // KiCad 3D 模型约定 Z 轴朝上；场景 Y 轴朝上 → 绕 X 轴 -90°
      group.rotation.x = -Math.PI / 2;
      // 底面贴板：算包围盒把最低点抬到 y=0
      const box = new THREE.Box3().setFromObject(group);
      group.position.y = -box.min.y;
      const wrapper = new THREE.Group();
      wrapper.add(group);
      modelCache.set(url, wrapper);
      useLibFileStore.getState().bump();
    } catch (e) {
      failed.add(url);
      lastError = String(e instanceof Error ? e.message : e).slice(0, 160);
      console.warn('[step] STEP 模型加载失败，使用参数化模型:', url.slice(0, 80), lastError);
      useLibFileStore.getState().bump(); // 失败状态也要驱动 UI 更新
    } finally {
      inflight.delete(url);
    }
  })();
}
