// El disco de Aurevix: funda, vinilo y la app. Plano de producto en estudio, guiado por el scroll.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from './node_modules/three/examples/jsm/environments/RoomEnvironment.js';

const qs = new URLSearchParams(location.search);
const W = Number(qs.get('w') || 1280);
const H = Number(qs.get('h') || 720);
const PR = Number(qs.get('pr') || 1.5);
const MOBILE = H > W;
const LIME = '#c8f560';
const INK = '#0c0c0e';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(PR);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0e11);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(MOBILE ? 40 : 28, W / H, 0.05, 200);

// ---------------------------------------------------------------- estudio (ciclorama)
{
  const shape = new THREE.Shape();
  const geo = new THREE.PlaneGeometry(80, 40, 1, 40);
  // curva el plano: suelo que sube en pared sin esquina
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + 20; // 0..40
    const r = 6;
    let ny, nz;
    if (y < 14) {
      ny = -4.2;
      nz = 14 - y;
    } else if (y < 14 + (Math.PI / 2) * r) {
      const a = (y - 14) / r;
      ny = -4.2 + r - Math.cos(a) * r;
      nz = -Math.sin(a) * r;
    } else {
      ny = -4.2 + r + (y - 14 - (Math.PI / 2) * r);
      nz = -r;
    }
    pos.setY(i, ny);
    pos.setZ(i, nz - 6);
  }
  geo.computeVertexNormals();
  void shape;
  const cyc = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.92 }));
  cyc.receiveShadow = true;
  scene.add(cyc);
}

// ---------------------------------------------------------------- luces
const key = new THREE.SpotLight(0xffffff, 1400, 60, 0.6, 1, 1.5);
key.position.set(-9, 14, 12);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 8;
key.shadow.bias = -0.0002;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xdad6ff, 0.45);
fill.position.set(10, 3, 10);
scene.add(fill);
const rimL = new THREE.PointLight(0xc8f560, 160, 26, 2);
rimL.position.set(8, 4, -5);
const rimV = new THREE.PointLight(0xb98cff, 200, 26, 2);
rimV.position.set(-9, 6, -6);
scene.add(rimL, rimV);

// ---------------------------------------------------------------- texturas pintadas
await Promise.all([
  new FontFace('Brico', 'url(BricolageGrotesque_800ExtraBold.ttf)').load().then((f) => document.fonts.add(f)),
  new FontFace('Inst', 'url(InstrumentSans_600SemiBold.ttf)').load().then((f) => document.fonts.add(f)),
]);

function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}
function drawA(g, cx, cy, s, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx - s / 2, cy + s / 2);
  g.lineTo(cx, cy - s / 2);
  g.lineTo(cx + s / 2, cy + s / 2);
  g.lineTo(cx + s * 0.22, cy + s / 2);
  g.lineTo(cx, cy + s * 0.02);
  g.lineTo(cx - s * 0.22, cy + s / 2);
  g.closePath();
  g.fill();
}

// funda: tinta, la A enorme en lima recortada por el borde, nombre y rejilla de puntos
const sleeveArt = canvas(2048, (g, S) => {
  g.fillStyle = INK;
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(243,241,234,0.08)';
  for (let x = 40; x < S; x += 64) for (let y = 40; y < S; y += 64) g.fillRect(x, y, 6, 6);
  drawA(g, S * 0.62, S * 0.52, S * 1.05, LIME);
  g.fillStyle = '#f3f1ea';
  g.font = `800 ${S * 0.085}px Brico`;
  g.fillText('AUREVIX', S * 0.06, S * 0.14);
  g.fillText('MUSIC', S * 0.06, S * 0.225);
  g.font = `600 ${S * 0.03}px Inst`;
  g.fillStyle = 'rgba(243,241,234,0.7)';
  g.fillText('Música publicada por quien la hace', S * 0.06, S * 0.93);
});
sleeveArt.colorSpace = THREE.SRGBColorSpace;
const sleeveBack = canvas(1024, (g, S) => {
  g.fillStyle = '#121216';
  g.fillRect(0, 0, S, S);
  g.fillStyle = LIME;
  g.fillRect(S * 0.06, S * 0.06, S * 0.2, S * 0.012);
});
sleeveBack.colorSpace = THREE.SRGBColorSpace;

// etiqueta del disco
const labelArt = canvas(1024, (g, S) => {
  g.fillStyle = LIME;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  g.fill();
  drawA(g, S / 2, S * 0.36, S * 0.26, INK);
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.font = `800 ${S * 0.09}px Brico`;
  g.fillText('AUREVIX', S / 2, S * 0.66);
  g.font = `600 ${S * 0.045}px Inst`;
  g.fillText('CARA A  ·  33⅓', S / 2, S * 0.75);
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.025, 0, Math.PI * 2);
  g.fillStyle = '#050506';
  g.fill();
});
labelArt.colorSpace = THREE.SRGBColorSpace;

// surcos: relieve (bump) en anillos y dirección anisótropa tangencial (el brillo radial del vinilo)
const grooveBump = canvas(2048, (g, S) => {
  const c = S / 2;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  const rnd = (n) => (Math.sin(n * 12.9898) * 43758.5453) % 1;
  for (let r = c * 0.35; r < c * 0.985; r += 2.2) {
    // pistas: separaciones más lisas entre canciones
    const gap = [0.5, 0.63, 0.75, 0.86].some((k) => Math.abs(r / c - k) < 0.008);
    g.strokeStyle = gap ? '#7a7a7a' : Math.abs(rnd(r)) > 0.5 ? '#9a9a9a' : '#5e5e5e';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.stroke();
  }
});
const aniso = (() => {
  const S = 512;
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x - S / 2 + 0.5;
      const dy = y - S / 2 + 0.5;
      const a = Math.atan2(dy, dx) + Math.PI / 2;
      const i = (y * S + x) * 4;
      data[i] = (Math.cos(a) * 0.5 + 0.5) * 255;
      data[i + 1] = (Math.sin(a) * 0.5 + 0.5) * 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, S, S);
  t.needsUpdate = true;
  return t;
})();

// ---------------------------------------------------------------- el disco
const record = new THREE.Group();
scene.add(record);
const spin = new THREE.Group(); // gira sobre su eje
record.add(spin);
{
  const R = 3;
  const vinyl = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c,
    roughness: 0.42,
    metalness: 0.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.18,
    bumpMap: grooveBump,
    bumpScale: 0.6,
    anisotropy: 0.6,
    anisotropyMap: aniso,
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.05, 160, 1), [
    new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.4, clearcoat: 1 }),
    vinyl,
    vinyl,
  ]);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  disc.receiveShadow = true;
  spin.add(disc);
  // UV de las tapas del cilindro: centradas, sirven para los mapas radiales
  for (const z of [0.0262, -0.0262]) {
    const lbl = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.32, 96),
      new THREE.MeshPhysicalMaterial({ map: labelArt, roughness: 0.55, clearcoat: 0.3 }),
    );
    lbl.position.z = z;
    if (z < 0) lbl.rotation.y = Math.PI;
    spin.add(lbl);
  }
}

// ---------------------------------------------------------------- la funda
const sleeve = new THREE.Group();
scene.add(sleeve);
{
  const side = 6.5;
  const paper = new THREE.MeshPhysicalMaterial({ color: 0x1b1b20, roughness: 0.75, sheen: 0.2 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(side, side, 0.09, 2, 0.03), [
    paper,
    paper,
    paper,
    paper,
    new THREE.MeshPhysicalMaterial({ map: sleeveArt, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    new THREE.MeshPhysicalMaterial({ map: sleeveBack, roughness: 0.7 }),
  ]);
  body.castShadow = true;
  body.receiveShadow = true;
  sleeve.add(body);
}

// ---------------------------------------------------------------- el móvil con la app
const phone = new THREE.Group();
scene.add(phone);
const screenTex = await new THREE.TextureLoader().loadAsync('phone.png');
screenTex.colorSpace = THREE.SRGBColorSpace;
screenTex.anisotropy = 8;
{
  const w = 3.0;
  const h = 6.5;
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, 0.32, 6, 0.42),
    new THREE.MeshPhysicalMaterial({ color: 0x2b2a31, metalness: 0.9, roughness: 0.28, clearcoat: 0.4 }),
  );
  frame.castShadow = true;
  phone.add(frame);
  const glass = new THREE.Mesh(
    new RoundedBoxGeometry(w - 0.12, h - 0.12, 0.02, 6, 0.36),
    new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.05, clearcoat: 1 }),
  );
  glass.position.z = 0.16;
  phone.add(glass);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.32, h - 0.34),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
  );
  screen.position.z = 0.172;
  phone.add(screen);
}

// ---------------------------------------------------------------- coreografía (p de 0 a 1)
const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function pose(p) {
  // 1 · el disco sale de la funda (0 → 0.3)
  const out = seg(p, 0.02, 0.3);
  // 2 · se separa, gira y la cámara se acerca a los surcos (0.3 → 0.62)
  const lift = seg(p, 0.28, 0.5);
  const macro = seg(p, 0.38, 0.58) * (1 - seg(p, 0.6, 0.72));
  // 3 · llega el móvil (0.64 → 0.95)
  const ph = seg(p, 0.64, 0.92);

  sleeve.position.set(lerp(-1.2, -4.8, lift), lerp(-0.2, -1.6, lift), lerp(0, -2.6, lift));
  sleeve.rotation.set(0, lerp(0.42, 0.75, lift), lerp(0, 0.08, lift));
  sleeve.visible = true;

  // el disco se desliza DENTRO del plano de la funda (en sus coordenadas) y luego se separa
  sleeve.updateMatrixWorld();
  const slid = sleeve.localToWorld(V(lerp(0, 3.9, out), lerp(0, 0.12, out), -0.012));
  const floatPos = V(lerp(1.0, 0.4, ph), lerp(1.0, 0.9, ph), lerp(-0.4, -2.6, ph));
  record.position.copy(slid.lerp(floatPos, lift));
  const qFree = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0.22, -0.42 + lerp(0, 0.2, ph), 0.05),
  );
  record.quaternion.copy(sleeve.quaternion).slerp(qFree, lift);
  spin.rotation.z = -p * 9 - lift * 3;

  phone.position.set(lerp(1.6, 0.6, ph), lerp(14, -0.4, ph), lerp(3.2, 1.6, ph));
  phone.visible = ph > 0.001;
  phone.rotation.set(lerp(0.3, -0.04, ph), lerp(-0.6, -0.22, ph), lerp(0.15, 0.02, ph));

  // cámara
  const base = MOBILE ? V(2.4, 3.2, 21) : V(3.5, 2.6, 17.5);
  const close = V(record.position.x + 2.6, record.position.y + 1.6, record.position.z + 4.2);
  const fin = MOBILE ? V(0.6, 1.6, 22.5) : V(-2.5, 1.6, 16);
  let cam = base.clone().lerp(close, macro);
  cam = cam.lerp(fin, ph);
  camera.position.copy(cam);
  // el objeto a la derecha en escritorio (texto a la izquierda) y arriba en el móvil (texto abajo)
  const offA = MOBILE ? V(0, -3.4, 0) : V(-3.6, 0, 0);
  const lookBase = V(MOBILE ? -0.8 : 0.2, 0.3, 0).add(offA);
  const lookMacro = record.position.clone().add(V(-0.6, -0.2, 0));
  const lookFin = MOBILE
    ? phone.position.clone().add(V(-0.3, -2.4, -1))
    : phone.position.clone().add(V(-1.4, 0.4, -1)).add(offA.clone().multiplyScalar(0.6));
  const look = lookBase.clone().lerp(lookMacro, macro).lerp(lookFin, ph);
  camera.lookAt(look);
  camera.fov = (MOBILE ? 40 : 28) - macro * 6;
  camera.updateProjectionMatrix();
  key.target.position.copy(record.position);
}

window.SEGMENTS = [
  { kind: 'dive', i: 0, from: 0, to: 0.34 },
  { kind: 'dive', i: 1, from: 0.34, to: 0.66 },
  { kind: 'dive', i: 2, from: 0.66, to: 1 },
];
window.renderAt = (p) => {
  pose(p);
  renderer.render(scene, camera);
};
window.READY = true;
