// 3D simulace RoboArmu. Čte úhly serv z window.armState (S0–S5, 0–180°),
// které nastavuje script.js z posuvníků, resetu a tance.
// Převod úhlu serva na natočení dílu je přibližný (podle výchozí pozice na fotkách).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("sim");
const wrap = canvas.parentElement;
const deg = THREE.MathUtils.degToRad;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  wrap.classList.add("no-webgl");
}

if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.5, 4.2, 6.5);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.6, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 14;
  controls.maxPolarAngle = deg(88);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x10141c, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(4, 8, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x3ee6ff, 40, 20, 2);
  rim.position.set(-4, 4, -3);
  scene.add(rim);
  const rimViolet = new THREE.PointLight(0x8b5cf6, 35, 20, 2);
  rimViolet.position.set(4, 2.5, -4);
  scene.add(rimViolet);

  /* ---------- Materiály (černé díly, stříbrné kleště, zelená deska jako na fotkách) ---------- */
  // Styl jako 3D rameno na portfoliu: tmavý kov, svítící klouby, oranžové kleště
  const black = new THREE.MeshStandardMaterial({ color: 0x3a4260, metalness: 0.9, roughness: 0.22 });
  const servoMat = new THREE.MeshStandardMaterial({ color: 0x1c2132, metalness: 0.85, roughness: 0.32 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 1, roughness: 0.2 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x3ee6ff, emissive: 0x3ee6ff, emissiveIntensity: 2.2 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff8a3d, emissiveIntensity: 2.4 });

  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  };
  const cyl = (r, h, mat, x = 0, y = 0, z = 0, axis = "y") => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), mat);
    m.position.set(x, y, z);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = Math.PI / 2;
    return m;
  };
  // Servo MG996R: černý kvádr s osou (kroužek), osa kloubu je v počátku skupiny
  const servo = (axis = "z") => {
    const g = new THREE.Group();
    g.add(box(0.42, 0.8, 0.22, servoMat, 0, -0.2, 0));
    g.add(cyl(0.09, 0.3, glow, 0, 0, 0, axis));
    return g;
  };

  scene.fog = new THREE.Fog(0x0c0e18, 10, 24);
  const grid = new THREE.GridHelper(30, 60, 0x2b3a6b, 0x1d2546);
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  scene.add(grid);
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(62,230,255,.5)");
    grad.addColorStop(0.45, "rgba(139,92,246,.16)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.005;
  scene.add(floorGlow);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.02, 8, 64), glow);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.13;
  scene.add(ring);

  /* ---------- Kinematický řetězec ---------- */
  // S5 základna (otáčení kolem svislé osy)
  scene.add(box(1.5, 0.12, 1.5, black, 0, 0.06, 0));
  scene.add(cyl(0.55, 0.35, servoMat, 0, 0.29, 0));
  const base = new THREE.Group();
  base.position.y = 0.48;
  scene.add(base);
  base.add(cyl(0.65, 0.08, black, 0, 0, 0));
  base.add(box(0.12, 0.7, 0.75, black, -0.3, 0.38, 0));
  base.add(box(0.12, 0.7, 0.75, black, 0.3, 0.38, 0));

  // S4 rameno (sklon dopředu/dozadu, osa X)
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.72;
  base.add(shoulder);
  shoulder.add(servo("x").rotateZ(Math.PI / 2));
  [-0.26, 0.26].forEach((x) => shoulder.add(box(0.06, 1.75, 0.34, black, x, 0.85, 0)));
  shoulder.add(box(0.58, 0.08, 0.34, black, 0, 1.6, 0));

  // S3 předloktí
  const elbow = new THREE.Group();
  elbow.position.y = 1.7;
  shoulder.add(elbow);
  elbow.add(servo("x").rotateZ(Math.PI / 2));
  [-0.24, 0.24].forEach((x) => elbow.add(box(0.06, 1.35, 0.3, black, x, 0.6, 0)));
  elbow.add(box(0.54, 0.4, 0.3, black, 0, 1.15, 0));

  // S2 sklon kleští
  const wrist = new THREE.Group();
  wrist.position.y = 1.35;
  elbow.add(wrist);
  wrist.add(servo("x").rotateZ(Math.PI / 2));
  wrist.add(box(0.5, 0.45, 0.28, black, 0, 0.3, 0));

  // S1 natočení kleští (rotace kolem osy zápěstí)
  const roll = new THREE.Group();
  roll.position.y = 0.5;
  wrist.add(roll);
  roll.add(box(0.42, 0.36, 0.22, servoMat, 0, 0.12, 0));
  roll.add(cyl(0.16, 0.08, glow, 0, 0.34, 0));
  roll.add(box(0.7, 0.1, 0.24, silver, 0, 0.42, 0));

  // S0 kleště: dva prsty
  const fingers = [-1, 1].map((side) => {
    const f = new THREE.Group();
    f.position.set(side * 0.3, 0.46, 0);
    f.add(box(0.06, 0.65, 0.18, silver, 0, 0.32, 0));
    f.add(box(0.03, 0.4, 0.19, orange, -side * 0.04, 0.42, 0));
    roll.add(f);
    return { f, side };
  });

  /* ---------- Převod úhlů serv na pózu ---------- */
  // Výchozí pozice z firmwaru: S0 130, S1 100, S2 150, S3 0, S4 180, S5 70
  const pose = (a) => ({
    base: deg(a[5] - 90),            // S5: 90° = rovně
    shoulder: deg((90 - a[4]) * 0.75),  // S4: 90° = rameno svisle
    elbow: deg(135 - a[3]),          // S3: 0° = předloktí šikmo dolů (45° pod vodorovnou), 1° serva = 1° kloubu
    wrist: deg((150 - a[2]) * 0.9),  // S2: 150° = kleště v ose předloktí
    roll: deg(a[1] - 100),           // S1: 100° = kleště vodorovně
    grip: THREE.MathUtils.clamp((130 - a[0]) / 80, 0, 1), // S0: 130 zavřeno, 50 otevřeno
  });
  const cur = pose(window.armState);

  const resize = () => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(wrap);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);

  const clock = new THREE.Clock();
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const k = 1 - Math.pow(0.0005, Math.min(clock.getDelta(), 0.05));
    const t = pose(window.armState);
    for (const key in cur) cur[key] += (t[key] - cur[key]) * k;

    base.rotation.y = cur.base;
    shoulder.rotation.x = cur.shoulder;
    elbow.rotation.x = cur.elbow;
    wrist.rotation.x = cur.wrist;
    roll.rotation.y = cur.roll;
    fingers.forEach(({ f, side }) => { f.rotation.z = side * cur.grip * 0.45; });

    controls.update();
    renderer.render(scene, camera);
  };
  frame();
}
