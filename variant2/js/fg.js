/* ============================================================
   BIZCAT V2 — foreground SVG stage controller
   Stages are pre-authored inside the fixed #fg host and toggled
   by class, never re-parented. Driven by the scroll engine's
   active-scene signal (single source of truth — no separate
   IntersectionObserver that could disagree with it).
   ============================================================ */

const RETIRE_MS = 900; // transition fallback if transitionend never fires

export function initFG({ reducedMotion }) {
  const host = document.getElementById('fg');
  if (!host || reducedMotion) return { setScene() {} };

  const stages = new Map();
  host.querySelectorAll('.fg-stage').forEach((el) => {
    stages.set(parseInt(el.dataset.scene, 10), { el, timer: 0 });
  });

  let current = -1;

  function retire(stage) {
    stage.el.classList.remove('in');
    stage.el.classList.add('retire');
    clearTimeout(stage.timer);
    stage.timer = setTimeout(() => stage.el.classList.remove('retire'), RETIRE_MS);
  }

  function enter(stage) {
    clearTimeout(stage.timer);
    stage.el.classList.remove('retire');
    void stage.el.offsetWidth; // flush so the entrance transition runs
    stage.el.classList.add('in');
  }

  function setScene(scene) {
    if (scene === current) return;
    const prev = stages.get(current);
    if (prev) retire(prev);
    const next = stages.get(scene);
    if (next) enter(next);
    current = scene;
  }

  return { setScene };
}
