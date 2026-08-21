/* ============================================================
   BIZCAT — WebGL environment
   One continuous world; the camera travels through ten zones,
   one per narrative section. Restrained wireframe + particle
   language: dark/fragmented -> ordered -> bright -> quiet.
   ============================================================ */

import * as THREE from './three.module.min.js';

const ZONE_SPACING = 90;

/* Per-zone atmosphere: [background/fog color, fog density, dust tint] */
const ATMOS = [
  ['#04040a', 0.030, '#6a6a78'], // 0 question — near black
  ['#06060d', 0.026, '#7a7a88'], // 1 now — faint structure
  ['#0a070f', 0.027, '#8a7a80'], // 2 missing — uneasy
  ['#061019', 0.024, '#5a86e8'], // 3 diagnosis — strategic blue
  ['#080d1a', 0.021, '#5a86e8'], // 4 engine — ordered blue
  ['#0b0910', 0.024, '#a89a8a'], // 5 proof — archive dark
  ['#e9dfcb', 0.016, '#b0722e'], // 6 result — bright clarity
  ['#171009', 0.020, '#e8b478'], // 7 journey — warm human
  ['#0d0912', 0.022, '#e8b478'], // 8 portal
  ['#050508', 0.030, '#55555f'], // 9 manifesto — quiet black
];

function lineMat(color, opacity) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}

function gridLines(size, div, color, opacity) {
  const pts = [];
  const half = size / 2, step = size / div;
  for (let i = 0; i <= div; i++) {
    const v = -half + i * step;
    pts.push(-half, 0, v, half, 0, v);
    pts.push(v, 0, -half, v, 0, half);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, lineMat(color, opacity));
}

function frameRect(w, h, color, opacity) {
  const g = new THREE.BufferGeometry();
  const x = w / 2, y = h / 2;
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -x, -y, 0,  x, -y, 0,   x, -y, 0,  x, y, 0,
     x,  y, 0, -x,  y, 0,  -x,  y, 0, -x, -y, 0,
  ], 3));
  return new THREE.LineSegments(g, lineMat(color, opacity));
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function initWorld({ canvas, isMobile, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(ATMOS[0][0]);
  scene.fog = new THREE.FogExp2(ATMOS[0][0], ATMOS[0][1]);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(0, 2, 30);

  const rand = (a, b) => a + Math.random() * (b - a);
  const zoneZ = (i) => -i * ZONE_SPACING;
  const spin = []; // {obj, rx, ry} animated only when near camera

  /* ---------- zone 0 — the question: architecture barely emerging ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(0);
    const floor = gridLines(160, 20, '#3a3a48', 0.10);
    floor.position.y = -7;
    g.add(floor);
    for (let i = 0; i < 5; i++) {
      const b = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(rand(4, 8), rand(14, 30), rand(4, 8))),
        lineMat('#4a4a5c', 0.10)
      );
      b.position.set(rand(-40, 40), rand(0, 6), rand(-55, -20));
      g.add(b);
    }
    scene.add(g);
  }

  /* ---------- zone 1 — now: touchpoints drifting out of sync ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(1);
    for (let i = 0; i < (isMobile ? 10 : 18); i++) {
      const p = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(rand(3, 7), rand(2, 5))),
        lineMat('#7a7a8c', 0.35)
      );
      p.position.set(rand(-26, 26), rand(-10, 12), rand(-30, 14));
      p.rotation.set(rand(-0.7, 0.7), rand(-0.9, 0.9), rand(-0.4, 0.4));
      spin.push({ obj: p, rx: rand(-0.0012, 0.0012), ry: rand(-0.0016, 0.0016) });
      g.add(p);
    }
    scene.add(g);
  }

  /* ---------- zone 2 — missing: fragments failing to connect ---------- */
  const flickerMats = [];
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(2);
    const nodes = [];
    for (let i = 0; i < (isMobile ? 8 : 14); i++) {
      const p = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(rand(2.5, 6), rand(2, 4))),
        lineMat('#8c7a80', 0.4)
      );
      p.position.set(rand(-24, 24), rand(-11, 13), rand(-26, 12));
      p.rotation.set(rand(-1, 1), rand(-1, 1), rand(-0.6, 0.6));
      nodes.push(p.position);
      spin.push({ obj: p, rx: rand(-0.002, 0.002), ry: rand(-0.002, 0.002) });
      g.add(p);
    }
    for (let i = 0; i < nodes.length - 1; i += 2) {
      const geo = new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[i + 1]]);
      const m = lineMat('#e0392e', 0.22);
      m.userData = { base: 0.22, seed: rand(0, Math.PI * 2) };
      flickerMats.push(m);
      g.add(new THREE.Line(geo, m));
    }
    scene.add(g);
  }

  /* ---------- zone 3 — diagnosis: order emerges, data layers ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(3);
    const floor = gridLines(120, 24, '#2e4a80', 0.28);
    floor.position.y = -7;
    g.add(floor);
    for (let i = 0; i < (isMobile ? 12 : 24); i++) {
      const h = rand(2, 12);
      const col = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, h, 1.1)),
        lineMat('#5a86e8', 0.30)
      );
      const gx = (i % 6) - 2.5, gz = Math.floor(i / 6) - 2;
      col.position.set(gx * 7 + rand(-0.5, 0.5), -7 + h / 2, gz * 8 - 14);
      g.add(col);
    }
    const n = isMobile ? 120 : 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-30, 30);
      pos[i * 3 + 1] = Math.floor(rand(0, 4)) * 3.4 - 2;
      pos[i * 3 + 2] = rand(-30, 10);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({
      color: '#7fa5f0', size: 0.22, transparent: true, opacity: 0.7,
      depthWrite: false, sizeAttenuation: true,
    })));
    scene.add(g);
  }

  /* ---------- zone 4 — engine: six nodes feed one core ---------- */
  const engine = new THREE.Group();
  {
    engine.position.z = zoneZ(4);
    const core = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(5, 0)),
      lineMat('#dfe6f5', 0.75)
    );
    engine.add(core);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const nx = Math.cos(a) * 17, ny = Math.sin(a) * 9;
      const node = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.7, 0)),
        lineMat('#5a86e8', 0.8)
      );
      node.position.set(nx, ny, rand(-2, 2));
      engine.add(node);
      const link = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([node.position.clone(), new THREE.Vector3(0, 0, 0)]),
        lineMat('#5a86e8', 0.3)
      );
      engine.add(link);
    }
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.CircleGeometry(19, 48)),
      lineMat('#3a5aa0', 0.25)
    );
    engine.add(ring);
    scene.add(engine);
  }

  /* ---------- zone 5 — proof: an archive corridor of frames ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(5);
    for (let i = 0; i < 9; i++) {
      const f = frameRect(30 - i * 0.8, 18 - i * 0.4, '#a89a8a', 0.22);
      f.position.z = 16 - i * 9;
      g.add(f);
    }
    scene.add(g);
  }

  /* ---------- zone 6 — result: bright, ordered, warm ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(6);
    const floor = gridLines(160, 26, '#b0722e', 0.20);
    floor.position.y = -7;
    g.add(floor);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: '#ffd9a0', transparent: true, opacity: 0.34,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(52, 52, 1);
    glow.position.set(0, 10, -40);
    g.add(glow);
    scene.add(g);
  }

  /* ---------- zone 7 — journey: warm horizon ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(7);
    const floor = gridLines(140, 14, '#8a5a30', 0.09);
    floor.position.y = -7;
    g.add(floor);
    scene.add(g);
  }

  /* ---------- zone 8 — portal ---------- */
  const portal = new THREE.Group();
  {
    portal.position.z = zoneZ(8);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(9, 0.09, 8, 96),
      new THREE.MeshBasicMaterial({
        color: '#e8b478', transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    ring.position.set(0, 2, -26);
    portal.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: '#e8b478', transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.set(34, 34, 1);
    glow.position.copy(ring.position);
    portal.add(glow);
    spin.push({ obj: ring, rx: 0, ry: 0, rz: 0.0012 });
    scene.add(portal);
  }

  /* ---------- global dust ---------- */
  let dust = null;
  {
    const n = isMobile ? 320 : 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-42, 42);
      pos[i * 3 + 1] = rand(-20, 24);
      pos[i * 3 + 2] = rand(24, zoneZ(9) - 40);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: '#8a8a98', size: 0.3, transparent: true, opacity: 0.5,
      depthWrite: false, sizeAttenuation: true,
    });
    dust = new THREE.Points(g, m);
    scene.add(dust);
  }

  /* ---------- atmosphere interpolation ---------- */
  const colA = new THREE.Color(), colB = new THREE.Color();
  function applyAtmosphere(u) {
    const i = Math.max(0, Math.min(ATMOS.length - 1, Math.floor(u)));
    const j = Math.min(ATMOS.length - 1, i + 1);
    // hold each zone's mood, then dissolve late in the section
    const f = THREE.MathUtils.smoothstep(u - i, 0.45, 0.98);
    colA.set(ATMOS[i][0]).lerp(colB.set(ATMOS[j][0]), f);
    scene.background.copy(colA);
    scene.fog.color.copy(colA);
    scene.fog.density = THREE.MathUtils.lerp(ATMOS[i][1], ATMOS[j][1], f);
    colA.set(ATMOS[i][2]).lerp(colB.set(ATMOS[j][2]), f);
    dust.material.color.copy(colA);
  }

  /* ---------- camera path ---------- */
  let u = 0;            // smoothed narrative position (sectionIndex + local)
  let targetU = 0;
  let mouseX = 0, mouseY = 0, mx = 0, my = 0;
  const clock = new THREE.Clock();

  if (!reducedMotion && !isMobile) {
    window.addEventListener('pointermove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function frame() {
    const t = clock.getElapsedTime();
    u += (targetU - u) * (reducedMotion ? 1 : 0.055);
    mx += (mouseX - mx) * 0.04;
    my += (mouseY - my) * 0.04;

    const z = 30 - u * ZONE_SPACING;
    camera.position.set(
      Math.sin(u * 0.65) * 3.2 + mx * 1.6,
      2 + Math.cos(u * 0.5) * 1.4 - my * 1.1,
      z
    );
    camera.lookAt(Math.sin(u * 0.65) * 1.2, 1.2, z - 42);
    applyAtmosphere(u);

    if (!reducedMotion) {
      for (const s of spin) {
        s.obj.rotation.x += s.rx || 0;
        s.obj.rotation.y += s.ry || 0;
        s.obj.rotation.z += s.rz || 0;
      }
      engine.rotation.z = t * 0.05;
      for (const m of flickerMats) {
        m.opacity = m.userData.base * (0.4 + 0.6 * Math.abs(Math.sin(t * 2.1 + m.userData.seed)));
      }
      if (dust) dust.position.y = Math.sin(t * 0.12) * 1.2;
    }

    // cull far zones
    for (const child of scene.children) {
      if (child === dust) continue;
      child.visible = Math.abs(child.position.z - z) < ZONE_SPACING * 1.8;
    }

    renderer.render(scene, camera);
  }

  let raf = 0;
  function loop() {
    // A thrown error inside frame() must not break the requestAnimationFrame
    // chain — that would freeze the WebGL background permanently instead
    // of just skipping one bad frame.
    try { frame(); } catch (err) { console.error('world frame() failed', err); }
    raf = requestAnimationFrame(loop);
  }

  if (reducedMotion) {
    frame(); // single static frame; re-rendered on demand from update()
  } else {
    loop();
  }

  // Debounced: mobile URL-bar show/hide fires resize mid-scroll, and an
  // immediate backbuffer reallocation would hitch the animation.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      if (reducedMotion) frame();
    }, 200);
  });

  document.addEventListener('visibilitychange', () => {
    if (reducedMotion) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) loop();
  });

  return {
    update(sectionPos) {
      targetU = sectionPos;
      if (reducedMotion) frame();
    },
  };
}
