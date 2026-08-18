/* ============================================================
   BIZCAT — case story environment
   Five zones, one story arc: archive dark -> uneasy fragments
   -> strategic blue -> the engine at work -> warm clarity.
   ============================================================ */

import * as THREE from './three.module.min.js';

const ZONE_SPACING = 90;

/* Per-part atmosphere: [background/fog color, fog density, dust tint] */
const ATMOS = [
  ['#0b0910', 0.026, '#a89a8a'], // 0 hero — the archive
  ['#0a070f', 0.027, '#8a7a80'], // 1 where they were — uneasy
  ['#061019', 0.024, '#5a86e8'], // 2 what we saw — strategic blue
  ['#080d1a', 0.021, '#5a86e8'], // 3 what we made — the engine
  // stays dark-warm: the closing light comes from the CSS veil, which fully
  // covers the canvas — a light canvas here would sit behind part 03's
  // cream text during the zone blend and destroy its contrast
  ['#171009', 0.020, '#e8b478'], // 4 where they are now — warm dawn
  ['#050508', 0.030, '#55555f'], // 5 next story — quiet
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
  return new THREE.CanvasTexture(c);
}

export function initCaseWorld({ canvas, isMobile, reducedMotion }) {
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
  const spin = [];

  /* ---------- zone 0 — hero: one frame pulled from the archive ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(0);
    for (let i = 0; i < 7; i++) {
      const f = frameRect(30 - i * 1.2, 18 - i * 0.6, '#a89a8a', 0.2);
      f.position.z = 14 - i * 8;
      g.add(f);
    }
    const floor = gridLines(140, 16, '#3a3440', 0.08);
    floor.position.y = -7;
    g.add(floor);
    scene.add(g);
  }

  /* ---------- zone 1 — where they were: fragments out of sync ---------- */
  const flickerMats = [];
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(1);
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

  /* ---------- zone 2 — what we saw: order emerges ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(2);
    const floor = gridLines(120, 24, '#2e4a80', 0.28);
    floor.position.y = -7;
    g.add(floor);
    for (let i = 0; i < (isMobile ? 10 : 20); i++) {
      const h = rand(2, 12);
      const col = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, h, 1.1)),
        lineMat('#5a86e8', 0.3)
      );
      const gx = (i % 5) - 2, gz = Math.floor(i / 5) - 2;
      col.position.set(gx * 8 + rand(-0.5, 0.5), -7 + h / 2, gz * 8 - 14);
      g.add(col);
    }
    scene.add(g);
  }

  /* ---------- zone 3 — what we made: the engine at work ---------- */
  const engine = new THREE.Group();
  {
    engine.position.z = zoneZ(3);
    const core = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(5, 0)),
      lineMat('#dfe6f5', 0.75)
    );
    engine.add(core);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const node = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.7, 0)),
        lineMat('#5a86e8', 0.8)
      );
      node.position.set(Math.cos(a) * 17, Math.sin(a) * 9, rand(-2, 2));
      engine.add(node);
      engine.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([node.position.clone(), new THREE.Vector3(0, 0, 0)]),
        lineMat('#5a86e8', 0.3)
      ));
    }
    scene.add(engine);
  }

  /* ---------- zone 4 — where they are now: warm clarity ---------- */
  {
    const g = new THREE.Group();
    g.position.z = zoneZ(4);
    const floor = gridLines(160, 26, '#b0722e', 0.2);
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

  /* zone 5 — next story: quiet dark, atmosphere only */

  /* ---------- global dust ---------- */
  let dust = null;
  {
    const n = isMobile ? 260 : 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-42, 42);
      pos[i * 3 + 1] = rand(-20, 24);
      pos[i * 3 + 2] = rand(24, zoneZ(5) - 40);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(g, new THREE.PointsMaterial({
      color: '#8a8a98', size: 0.3, transparent: true, opacity: 0.5,
      depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(dust);
  }

  /* ---------- atmosphere interpolation ---------- */
  const colA = new THREE.Color(), colB = new THREE.Color();
  function applyAtmosphere(u) {
    const i = Math.max(0, Math.min(ATMOS.length - 1, Math.floor(u)));
    const j = Math.min(ATMOS.length - 1, i + 1);
    const f = THREE.MathUtils.smoothstep(u - i, 0.45, 0.98);
    colA.set(ATMOS[i][0]).lerp(colB.set(ATMOS[j][0]), f);
    scene.background.copy(colA);
    scene.fog.color.copy(colA);
    scene.fog.density = THREE.MathUtils.lerp(ATMOS[i][1], ATMOS[j][1], f);
    colA.set(ATMOS[i][2]).lerp(colB.set(ATMOS[j][2]), f);
    dust.material.color.copy(colA);
  }

  /* ---------- camera path ---------- */
  let u = 0;
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
      }
      engine.rotation.z = t * 0.05;
      for (const m of flickerMats) {
        m.opacity = m.userData.base * (0.4 + 0.6 * Math.abs(Math.sin(t * 2.1 + m.userData.seed)));
      }
      if (dust) dust.position.y = Math.sin(t * 0.12) * 1.2;
    }

    for (const child of scene.children) {
      if (child === dust) continue;
      child.visible = Math.abs(child.position.z - z) < ZONE_SPACING * 1.8;
    }

    renderer.render(scene, camera);
  }

  let raf = 0;
  function loop() { frame(); raf = requestAnimationFrame(loop); }

  if (reducedMotion) {
    frame();
  } else {
    loop();
  }

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
