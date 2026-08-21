/* ============================================================
   BIZCAT — VARIANT 02 orchestrator
   Discrete state (reveals, nav, rail, stages) runs on the
   scroll-rAF pattern from variant 1. Continuous transforms
   (parallax, exits, slices, cube, posters, veil) run through a
   critically-damped follower so the imagery trails the scroll.
   ============================================================ */

import { initFG } from './fg.js';

// added first so a failed module load leaves the static page visible
document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// viewport width only — touch-screen laptops must keep the full experience
const isMobile = window.matchMedia('(max-width: 820px)').matches;

if (reducedMotion) document.body.classList.add('rm');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ---------- ?shot=N deterministic screenshot mode ---------- */
const shotParam = new URLSearchParams(location.search).get('shot');
const SNAP = shotParam !== null;
if (SNAP) document.body.classList.add('shot');

/* ---------- word-by-word splitting ---------- */
document.querySelectorAll('.split').forEach((el) => {
  let wi = 0;
  el.querySelectorAll('.ln').forEach((ln) => {
    const words = ln.textContent.trim().split(/\s+/).filter(Boolean);
    ln.textContent = '';
    words.forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = word;
      w.style.setProperty('--wd', `${(wi++) * 0.072}s`);
      ln.appendChild(w);
      if (i < words.length - 1) ln.appendChild(document.createTextNode(' '));
    });
  });
});

/* ---------- registries ---------- */
const sections = [...document.querySelectorAll('main .scene')];
const reveals = sections.map((s) => [...s.querySelectorAll('.reveal, .split')].map((el) => ({
  el,
  at: parseFloat(el.dataset.at ?? '0'),
  until: el.dataset.until ? parseFloat(el.dataset.until) : Infinity,
})));

const navChapter = document.getElementById('navChapter');
const navBar = document.getElementById('navBar');
const railLinks = [...document.querySelectorAll('.rail a')];

const coverSection = document.getElementById('s0');
const fracturePin = document.querySelector('.sc-fracture .pin');
const healStack = document.querySelector('.heal-stack');
const engineVisual = document.querySelector('.engine-visual');
const cubePieces = [...document.querySelectorAll('.cube-svg .piece')];
const services = [...document.querySelectorAll('.sc-engine .service'), document.querySelector('.engine-close')];
const trackNodes = [...document.querySelectorAll('.track-node')];
const posters = [...document.querySelectorAll('.sc-gallery .poster')];
const projNow = document.getElementById('projNow');
const resultSection = document.querySelector('.sc-result');
const resultPin = resultSection ? resultSection.querySelector('.pin') : null;
const mosaicEl = document.querySelector('.mosaic');
const mosaicTiles = mosaicEl ? [...mosaicEl.querySelectorAll('.tile')] : [];

// story links inside off-stage posters stay out of the Tab order, but the
// posters stay in the accessibility tree for screen-reader browsing
const posterLinks = posters.map((p) => p.querySelector('.story-link'));
if (!reducedMotion) posterLinks.forEach((l) => { if (l) l.tabIndex = -1; });
const posterImgs = posters.map((p) => p.querySelector('.plate-primary img'));
const posterKb = posters.map(() => -1);

/* cover exit sequence: {el, at, span}, scrubbed by scene-0 progress */
const EXITS = [];
if (coverSection && !reducedMotion) {
  const q = (sel) => coverSection.querySelector(sel);
  const lns = [...coverSection.querySelectorAll('.display-xl .ln')];
  // base: stylesheet filter the exit blur must compose with, not replace
  const add = (el, at, span, base = '') => { if (el) EXITS.push({ el, at, span, base, locked: false }); };
  add(q('.cover-copy .meta'), 0.04, 0.1);
  add(lns[0], 0.1, 0.12);
  add(lns[1], 0.16, 0.12);
  add(lns[2], 0.22, 0.12);
  add(q('.scroll-cue'), 0.02, 0.06);
  add(q('.plate-side'), 0.3, 0.14);
  add(q('.plate-back'), 0.34, 0.14, 'blur(3px) brightness(0.6) ');
  add(q('.cover-primary'), 0.42, 0.2);
}

/* drift plates: broken pose from inline props, aligned pose computed */
const driftPlates = [...document.querySelectorAll('.drift-plate')].map((el, i, arr) => ({
  el,
  depth: parseFloat(el.dataset.depth || '1'),
  dx: parseFloat(el.style.getPropertyValue('--dx')) || 0,   // vw
  dy: parseFloat(el.style.getPropertyValue('--dy')) || 0,   // vh
  rot: parseFloat(el.style.getPropertyValue('--rot')) || 0, // deg
  ax: (i - (arr.length - 1) / 2) * 16,                      // aligned row slot, vw
}));

const coverPlates = [...document.querySelectorAll('.cover-plates .plate')].map((el) => ({
  el,
  depth: parseFloat(el.dataset.depth || '0.5'),
}));

/* ---------- presence helpers (ported from variant 1) ---------- */
function beatPresence(p, i, n, holdLast) {
  const seg = 1 / n;
  const local = (p - i * seg) / seg;
  const enter = i === 0 ? (local >= 0 ? 1 : 0) : smoothstep(0, 0.3, local);
  const exit = holdLast && i === n - 1 ? 1 : 1 - smoothstep(0.82, 1.12, local);
  return { e: Math.min(enter, exit), local };
}

function styleBeat(el, e, local) {
  el.style.opacity = e.toFixed(3);
  const dir = local < 0.5 ? 1 : -1;
  el.style.transform = `translateY(${((1 - e) * 3.2 * dir).toFixed(2)}rem)`;
  el.style.pointerEvents = e > 0.5 ? 'auto' : 'none';
}

function stylePoster(el, e, local, link, i) {
  el.style.opacity = e.toFixed(3);
  const dir = i % 2 === 0 ? 1 : -1; // alternate entry edges
  const drift = (0.5 - local) * 12 * dir;
  el.style.transform = `translate(${(drift * (1 - e * 0.4)).toFixed(2)}vw, ${(Math.abs(drift) * 0.3).toFixed(2)}vh)`;
  el.style.pointerEvents = e > 0.5 ? 'auto' : 'none';
  if (link) {
    const t = e > 0.5 ? 0 : -1;
    if (link.tabIndex !== t) link.tabIndex = t;
  }
}

/* ---------- foreground stages ---------- */
const fg = initFG({ reducedMotion });

/* ---------- scroll state ---------- */
let active = 0;
let currentScene = -1;
const rawP = sections.map(() => 0);   // raw progress, scroll-synced
const P = sections.map(() => 0);      // smoothed progress (follower)

function sectionProgress(section) {
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const runway = section.offsetHeight - vh;
  if (runway > vh * 0.35) return clamp(-rect.top / runway, 0, 1);
  return clamp((vh - rect.top) / (vh + rect.height * 0.35), 0, 1);
}

/* ---------- master update: reads + discrete writes ---------- */
function update() {
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const globalP = clamp(window.scrollY / (doc.scrollHeight - vh), 0, 1);

  /* phase 1: reads */
  const tops = sections.map((s) => s.getBoundingClientRect().top);
  active = 0;
  tops.forEach((t, i) => { if (t <= vh * 0.5) active = i; });
  sections.forEach((s, i) => {
    const near = Math.abs(i - active) <= 1;
    const p = near ? sectionProgress(s) : (i < active ? 1 : 0);
    rawP[i] = p;
    if (!near) P[i] = p; // far scenes snap — never lerp from stale values
  });

  /* phase 2: discrete writes */
  navBar.style.transform = `scaleX(${globalP.toFixed(4)})`;

  if (active !== currentScene) {
    currentScene = active;
    document.body.dataset.scene = String(active);
    const railIdx = Math.min(active, 7);
    navChapter.textContent = `0${railIdx} / 07`;
    railLinks.forEach((a) => {
      const on = parseInt(a.dataset.rail, 10) === railIdx;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    fg.setScene(active);
    sections.forEach((s, i) => s.classList.toggle('live', Math.abs(i - active) <= 1));
    // writeResult only runs near scene 6 — clear the rail swap when jumping far away
    if (active !== 6) document.body.classList.remove('over-lit');
  }

  sections.forEach((s, i) => {
    if (Math.abs(i - active) > 1) return;
    const p = rawP[i];
    for (const { el, at, until } of reveals[i]) {
      el.classList.toggle('on', p >= at);
      if (until !== Infinity && !reducedMotion) el.classList.toggle('ghost', p >= until);
    }
  });

  if (fracturePin && Math.abs(active - 2) <= 1) fracturePin.classList.toggle('late', rawP[2] > 0.34);

  wake();
}

/* ============================================================
   Follower: critically-damped smoothing of scene progress,
   feeding the continuous writers below.
   ============================================================ */

let running = false;
let lastT = 0;
let settled = 0;

function wake() {
  if (reducedMotion) return;
  if (SNAP) { P.forEach((_, i) => { P[i] = rawP[i]; }); writeContinuous(); return; }
  settled = 0;
  if (running) return;
  running = true;
  lastT = performance.now();
  requestAnimationFrame(tick);
}

function tick(now) {
  if (!running) return;
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  const k = 1 - Math.exp(-3.4 * dt); // low rate = long, easy glide behind the scroll
  let maxDelta = 0;
  for (let i = 0; i < P.length; i++) {
    const d = rawP[i] - P[i];
    const ad = Math.abs(d);
    if (ad > maxDelta) maxDelta = ad;
    P[i] += d * k;
  }
  writeContinuous();
  if (maxDelta < 0.0004) {
    settled += dt;
    if (settled > 0.25) { running = false; return; }
  } else {
    settled = 0;
  }
  requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) running = false;
  else wake();
});

/* ---------- continuous writers (smoothed progress) ---------- */

function writeContinuous() {
  if (Math.abs(active - 0) <= 1) writeCover(P[0]);
  if (!isMobile && Math.abs(active - 1) <= 1) writeDrift(P[1]);
  if (healStack && Math.abs(active - 3) <= 1) {
    healStack.style.setProperty('--hf', (1 - smoothstep(0.15, 0.72, P[3])).toFixed(3));
  }
  if (Math.abs(active - 4) <= 1) writeEngine(P[4]);
  if (Math.abs(active - 5) <= 1) writeGallery(P[5]);
  if (resultPin && Math.abs(active - 6) <= 1) writeResult(P[6]);
}

function writeCover(t) {
  for (const x of EXITS) {
    if (t > 0.02 && !x.locked) {
      x.locked = true;
      x.el.style.transition = 'none';
    } else if (t <= 0.02 && x.locked) {
      x.locked = false;
      x.el.style.transition = '';
      x.el.style.opacity = '';
      x.el.style.filter = '';
      continue;
    }
    if (!x.locked) continue;
    const a = 1 - smoothstep(x.at, x.at + x.span, t);
    x.el.style.opacity = a.toFixed(3);
    x.el.style.filter = isMobile ? '' : `${x.base}blur(${((1 - a) * 10).toFixed(1)}px)`;
  }
  // background plates drift up slightly faster than the scroll
  for (const { el, depth } of coverPlates) {
    el.style.translate = `0 ${(-46 * depth * t).toFixed(1)}px`;
  }
}

function writeDrift(p) {
  const conv = smoothstep(0.78, 0.96, p);
  for (const d of driftPlates) {
    const wander = (p - 0.5) * 70 * d.depth * (1 - conv);
    const x = lerp(d.dx, d.ax, conv);
    const y = lerp(d.dy, 28, conv); // aligned row lands in the lower third, clear of the copy
    const r = d.rot * (1 - conv);
    d.el.style.transform =
      `translate(-50%, -50%) translate(${x.toFixed(2)}vw, ${y.toFixed(2)}vh) ` +
      `translateY(${wander.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`;
  }
}

function writeEngine(p) {
  const seqP = clamp((p - 0.05) / 0.95, 0, 1);
  services.forEach((el, i) => {
    const { e, local } = beatPresence(seqP, i, services.length, true);
    styleBeat(el, e, local);
  });
  const lit = Math.floor(seqP * services.length);
  trackNodes.forEach((n, i) => n.classList.toggle('lit', i <= lit - 1 || seqP > 0.95));
  // each service beat flies its cube face into place
  const n = cubePieces.length;
  cubePieces.forEach((piece, i) => {
    const kf = 1 - smoothstep(i / (n + 1), (i + 0.85) / (n + 1), seqP);
    piece.style.setProperty('--k', kf.toFixed(3));
  });
  if (engineVisual) engineVisual.classList.toggle('done', seqP > 0.95);
}

function writeGallery(p) {
  const seqP = clamp((p - 0.02) / 0.98, 0, 1);
  let visible = 0, best = -1;
  posters.forEach((el, i) => {
    const { e, local } = beatPresence(seqP, i, posters.length, true);
    stylePoster(el, e, local, posterLinks[i], i);
    if (e > best) { best = e; visible = i; }
    // ken burns on the primary plate over its on-stage life
    if (e > 0.02 && posterImgs[i]) {
      const kb = Math.round(clamp(local, 0, 1) * 1e4) / 1e4;
      if (kb !== posterKb[i]) {
        posterKb[i] = kb;
        posterImgs[i].style.transform = `scale(${(1.06 - 0.06 * kb).toFixed(4)}) translateY(${((0.5 - kb) * 2).toFixed(2)}%)`;
      }
    }
  });
  const label = String(visible + 1).padStart(2, '0');
  if (projNow && projNow.textContent !== label) projNow.textContent = label;
}

function writeResult(p) {
  const veil = clamp(p * 6, 0, 1);
  resultPin.style.setProperty('--veil', veil.toFixed(3));
  if (veil >= 0.5) resultSection.setAttribute('data-lit', '');
  else resultSection.removeAttribute('data-lit');
  // fixed rail sits over the light veil — swap it to ink while lit
  document.body.classList.toggle('over-lit', veil >= 0.5 && active === 6);
  if (mosaicEl) {
    mosaicEl.style.setProperty('--mg', (1 - smoothstep(0.5, 0.9, p)).toFixed(3));
    mosaicTiles.forEach((tile, i) => {
      const f = smoothstep(0.3 + i * 0.05, 0.55 + i * 0.05, p);
      tile.style.clipPath = `inset(${((1 - f) * 101).toFixed(2)}% 0 0 0)`;
    });
  }
}

/* ---------- scroll / resize loop ---------- */
let ticking = false;
function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { update(); ticking = false; });
}
window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);
update();

/* ---------- anchors: land mid-runway, move focus ---------- */
document.querySelectorAll('[data-anchor]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const runway = Math.max(target.offsetHeight - window.innerHeight, 0);
    window.scrollTo({
      top: target.offsetTop + runway * 0.5,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

/* ---------- pathways ---------- */
const pathButtons = [...document.querySelectorAll('.path-btn')];
const pathLines = [...document.querySelectorAll('.path-line')];
pathButtons.forEach((btn) => {
  btn.setAttribute('aria-pressed', 'false');
  btn.addEventListener('click', () => {
    const need = btn.dataset.need;
    const selected = document.body.dataset.path === need ? 'none' : need;
    document.body.dataset.path = selected;
    pathButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.need === selected)));
    // real DOM mutation so the aria-live region announces the answer
    pathLines.forEach((line) => { line.hidden = line.dataset.answer !== selected; });
  });
});

/* ---------- shot mode: jump to the requested scene state ---------- */
if (SNAP) {
  // synchronous, not rAF — rAF never fires while the tab is hidden,
  // and shot mode must land even in a background pane
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.documentElement.style.scrollBehavior = 'auto'; // instant jumps, no smooth animation
  const n = parseFloat(shotParam) || 0;
  const idx = clamp(Math.floor(n), 0, sections.length - 1);
  const frac = clamp(n - Math.floor(n), 0, 0.999);
  const jump = () => {
    const s = sections[idx];
    const runway = Math.max(s.offsetHeight - window.innerHeight, 0);
    window.scrollTo(0, s.offsetTop + runway * frac);
    update();
  };
  jump();
  window.addEventListener('load', jump);
}
