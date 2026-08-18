/* ============================================================
   BIZCAT — journey orchestrator
   Scroll drives everything: camera position, chapter state,
   typographic reveals, engine + archive scrubbing, atmosphere.
   ============================================================ */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 820px)').matches || 'ontouchstart' in window;

if (reducedMotion) document.body.classList.add('rm');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

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
      w.style.setProperty('--wd', `${(wi++) * 0.085}s`);
      ln.appendChild(w);
      if (i < words.length - 1) ln.appendChild(document.createTextNode(' '));
    });
  });
});

/* ---------- section registry ---------- */
const sections = [...document.querySelectorAll('main .chapter')];
const reveals = sections.map((s) => [...s.querySelectorAll('.reveal, .split')].map((el) => ({
  el,
  at: parseFloat(el.dataset.at ?? '0'),
  until: el.dataset.until ? parseFloat(el.dataset.until) : Infinity,
})));

const services = [...document.querySelectorAll('.ch-engine .service'), document.querySelector('.engine-close')];
const trackNodes = [...document.querySelectorAll('.track-node')];
const projects = [...document.querySelectorAll('.ch-proof .project')];
const projNow = document.getElementById('projNow');
const navChapter = document.getElementById('navChapter');
const navBar = document.getElementById('navBar');
const railLinks = [...document.querySelectorAll('.rail a')];
const resultPin = document.querySelector('.ch-result .pin');
const missingPin = document.querySelector('.ch-missing .pin');

const engineSection = document.getElementById('ch04');
const proofSection = document.getElementById('ch05');

// story links inside off-stage projects must stay out of the Tab order,
// but the projects themselves stay in the accessibility tree so screen
// readers can still browse the whole archive
const projLinks = projects.map((p) => p.querySelector('.story-link'));
if (!reducedMotion) projLinks.forEach((l) => { if (l) l.tabIndex = -1; });

/* Local progress through a section (0 at pin start, 1 at pin end). */
function sectionProgress(section) {
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const runway = section.offsetHeight - vh;
  if (runway > vh * 0.35) return clamp(-rect.top / runway, 0, 1);
  // short/natural sections: progress = how far it has entered the viewport
  return clamp((vh - rect.top) / (vh + rect.height * 0.35), 0, 1);
}

/* Presence window for item i of n inside a scrubbed sequence. */
function beatPresence(p, i, n, holdLast) {
  const seg = 1 / n;
  const local = (p - i * seg) / seg;
  // the first beat is already on stage when its chapter opens
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

function styleProject(el, e, local, link) {
  el.style.opacity = e.toFixed(3);
  const drift = (0.5 - local) * 14; // diagonal travel: right/down -> left/up
  el.style.transform = `translate(${(drift * (1 - e * 0.4)).toFixed(2)}vw, ${(drift * 0.32).toFixed(2)}vh)`;
  el.style.pointerEvents = e > 0.5 ? 'auto' : 'none';
  if (link) {
    const t = e > 0.5 ? 0 : -1;
    if (link.tabIndex !== t) link.tabIndex = t;
  }
}

/* ---------- WebGL world (graceful fallback) ---------- */
let world = null;
(async () => {
  try {
    const { initWorld } = await import('./world.js');
    world = initWorld({
      canvas: document.getElementById('world'),
      isMobile,
      reducedMotion,
    });
    update();
  } catch (err) {
    document.body.classList.add('no-webgl');
    console.warn('WebGL unavailable — running in still mode.', err);
  }
})();

/* ---------- master update ---------- */
let currentChapter = -1;

function update() {
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const globalP = clamp(window.scrollY / (doc.scrollHeight - vh), 0, 1);

  /* ---- phase 1: all layout reads (one clean layout pass) ---- */
  let active = 0;
  const tops = sections.map((s) => s.getBoundingClientRect().top);
  tops.forEach((t, i) => { if (t <= vh * 0.5) active = i; });
  const progress = sections.map((s, i) => (Math.abs(i - active) <= 1 ? sectionProgress(s) : 0));

  /* ---- phase 2: all writes ---- */
  if (world) world.update(active + progress[active]);

  // chapter state (sections share data-ch for the final act)
  const ch = parseInt(sections[active].dataset.ch, 10);
  if (ch !== currentChapter) {
    currentChapter = ch;
    document.body.dataset.chapter = String(ch);
    navChapter.textContent = `0${ch} / 07`;
    railLinks.forEach((a) => {
      const on = parseInt(a.dataset.rail, 10) === ch;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  navBar.style.transform = `scaleX(${globalP.toFixed(4)})`;

  // reveals per section (neighbourhood only)
  sections.forEach((s, i) => {
    if (Math.abs(i - active) > 1) return;
    const p = progress[i];
    for (const { el, at, until } of reveals[i]) {
      el.classList.toggle('on', p >= at);
      if (until !== Infinity && !reducedMotion) el.classList.toggle('ghost', p >= until);
    }
  });

  // chapter 02: shards recede once the statements arrive
  if (missingPin && Math.abs(active - 2) <= 1) missingPin.classList.toggle('late', progress[2] > 0.34);

  // chapter 04: the transformation engine sequence
  if (!reducedMotion && engineSection && Math.abs(active - 4) <= 1) {
    const seqP = clamp((progress[4] - 0.05) / 0.95, 0, 1);
    services.forEach((el, i) => {
      const { e, local } = beatPresence(seqP, i, services.length, true);
      styleBeat(el, e, local);
    });
    const lit = Math.floor(seqP * services.length);
    trackNodes.forEach((n, i) => n.classList.toggle('lit', i <= lit - 1 || seqP > 0.95));
  }

  // chapter 05: the archive walk
  if (!reducedMotion && proofSection && Math.abs(active - 5) <= 1) {
    const seqP = clamp((progress[5] - 0.02) / 0.98, 0, 1);
    let visible = 0, best = -1;
    projects.forEach((el, i) => {
      const { e, local } = beatPresence(seqP, i, projects.length, true);
      styleProject(el, e, local, projLinks[i]);
      if (e > best) { best = e; visible = i; }
    });
    const label = String(visible + 1).padStart(2, '0');
    if (projNow && projNow.textContent !== label) projNow.textContent = label;
  }

  // chapter 06: light floods in
  if (resultPin && Math.abs(active - 6) <= 1) {
    resultPin.style.setProperty('--veil', clamp(progress[6] * 5, 0, 1).toFixed(3));
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

/* ---------- anchors ---------- */
document.querySelectorAll('[data-anchor]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });
});

/* ---------- chapter 07: pathways ---------- */
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

/* ---------- the portal ---------- */
const portalBtn = document.getElementById('portalBtn');
const portalProject = document.getElementById('portalProject');
if (portalBtn && portalProject) {
  let hideTimer = 0;
  portalBtn.addEventListener('click', () => {
    clearTimeout(hideTimer);
    const open = !portalProject.classList.contains('open');
    if (open) {
      portalProject.removeAttribute('hidden');
      void portalProject.offsetWidth; // flush layout so the entrance transition runs
      portalProject.classList.add('open');
    } else {
      portalProject.classList.remove('open');
      hideTimer = setTimeout(() => portalProject.setAttribute('hidden', ''), 600);
    }
    portalBtn.setAttribute('aria-expanded', String(open));
  });
}
