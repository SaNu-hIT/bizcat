/* ============================================================
   BIZCAT — case story orchestrator
   One story selected by ?p=<slug>; scroll drives the world,
   part state, reveals and the closing light.
   ============================================================ */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 820px)').matches || 'ontouchstart' in window;

if (reducedMotion) document.body.classList.add('rm');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- story selection ---------- */
const stories = [...document.querySelectorAll('.case-story')];
const wanted = new URLSearchParams(location.search).get('p');
const story = stories.find((s) => s.id === wanted) || stories[0];
stories.forEach((s) => { if (s !== story) s.remove(); });
story.hidden = false;
document.title = `${story.dataset.client} — A Bizcat Transformation Story`;

/* ---------- word-by-word splitting ---------- */
story.querySelectorAll('.split').forEach((el) => {
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
const sections = [...story.querySelectorAll('.chapter')];
sections.forEach((s, i) => { s.id = `part${i}`; });
const reveals = sections.map((s) => [...s.querySelectorAll('.reveal, .split')].map((el) => ({
  el,
  at: parseFloat(el.dataset.at ?? '0'),
  until: el.dataset.until ? parseFloat(el.dataset.until) : Infinity,
})));

const navChapter = document.getElementById('navChapter');
const navBar = document.getElementById('navBar');
const railLinks = [...document.querySelectorAll('.rail a')];
const nowPin = story.querySelector('.cs-now .pin');
const nowIndex = sections.findIndex((s) => s.classList.contains('cs-now'));

function sectionProgress(section) {
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const runway = section.offsetHeight - vh;
  if (runway > vh * 0.35) return clamp(-rect.top / runway, 0, 1);
  return clamp((vh - rect.top) / (vh + rect.height * 0.35), 0, 1);
}

/* ---------- WebGL world (graceful fallback) ---------- */
let world = null;
(async () => {
  try {
    const { initCaseWorld } = await import('./case-world.js');
    world = initCaseWorld({
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
let currentPart = -1;

function update() {
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const globalP = clamp(window.scrollY / (doc.scrollHeight - vh), 0, 1);

  /* phase 1: all layout reads */
  let active = 0;
  const tops = sections.map((s) => s.getBoundingClientRect().top);
  tops.forEach((t, i) => { if (t <= vh * 0.5) active = i; });
  const progress = sections.map((s, i) => (Math.abs(i - active) <= 1 ? sectionProgress(s) : 0));

  /* phase 2: all writes */
  if (world) world.update(active + progress[active]);

  const part = parseInt(sections[active].dataset.cs, 10);
  if (part !== currentPart) {
    currentPart = part;
    document.body.dataset.chapter = String(part);
    navChapter.textContent = `0${part} / 04`;
    railLinks.forEach((a) => {
      const on = parseInt(a.dataset.csrail, 10) === part;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  navBar.style.transform = `scaleX(${globalP.toFixed(4)})`;

  sections.forEach((s, i) => {
    if (Math.abs(i - active) > 1) return;
    const p = progress[i];
    for (const { el, at, until } of reveals[i]) {
      el.classList.toggle('on', p >= at);
      if (until !== Infinity && !reducedMotion) el.classList.toggle('ghost', p >= until);
    }
  });

  // part 04: light floods in
  if (nowPin && Math.abs(active - nowIndex) <= 1) {
    nowPin.style.setProperty('--veil', clamp(progress[nowIndex] * 6, 0, 1).toFixed(3));
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

/* ---------- rail anchors ---------- */
railLinks.forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.getElementById(`part${a.dataset.csrail}`);
    if (!target) return;
    e.preventDefault();
    // land inside the runway so the part's reveals are already on stage
    const runway = Math.max(target.offsetHeight - window.innerHeight, 0);
    window.scrollTo({
      top: target.offsetTop + runway * 0.5,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});
