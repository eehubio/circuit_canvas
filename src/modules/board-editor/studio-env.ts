import * as THREE from 'three';

/**
 * 生成 studio 风格环境贴图（PMREM）——给金属提供有层次的反射，
 * 而非平白一片灰。关键是环境里有明暗分区（亮顶 + 亮条 + 较暗侧壁），
 * 金属表面才会出现高光滚动与明暗过渡，接近 KiCad 原生渲染观感。
 *
 * 无需 HDR 文件，纯程序化搭建，一次性烘焙。
 */
export function buildStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();

  // 底色：中性偏冷的灰蓝，作为环境基调（比纯白更能显出金属反射的层次）
  env.background = new THREE.Color(0x8a95a2);

  // 大天球：上半亮、下半暗的垂直渐变（模拟摄影棚顶光 + 地面反射）
  const skyGeo = new THREE.SphereGeometry(60, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0xffffff) },      // 顶部强光
      mid: { value: new THREE.Color(0xaeb8c4) },      // 中部中灰
      bot: { value: new THREE.Color(0x4a525c) },      // 底部暗
    },
    vertexShader: `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main() {
        float h = vDir.y * 0.5 + 0.5;              // 0=底 1=顶
        vec3 c = h > 0.5 ? mix(mid, top, (h - 0.5) * 2.0) : mix(bot, mid, h * 2.0);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  env.add(new THREE.Mesh(skyGeo, skyMat));

  // 顶部两条高光柔光板（softbox）：金属壳面上会映出明亮长条高光，是"锃亮"感的关键
  const strip = (x: number, z: number, rot: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    m.position.set(x, 30, z);
    m.rotation.set(-Math.PI / 2, rot, 0);
    return m;
  };
  env.add(strip(-8, 4, 0.25));
  env.add(strip(10, -6, -0.3));

  // 侧面一块中性反光板，给侧壁一点亮部过渡
  const side = new THREE.Mesh(new THREE.PlaneGeometry(20, 18), new THREE.MeshBasicMaterial({ color: 0xd8dee6 }));
  side.position.set(-26, 8, 0);
  side.rotation.y = Math.PI / 2;
  env.add(side);

  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  return rt.texture;
}
