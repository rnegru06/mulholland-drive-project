/**
 * Sticky scrubber bar: film time + current scene + phase chip.
 *
 * The bar appears once the user has scrolled past the hero, and
 * updates whenever a step with `data-film-sec` / `data-scene-title`
 * becomes active. The bottom 2px progress strip shows position
 * within the 147-min runtime.
 */

const TOTAL_RUNTIME_SEC = 8787;

const els = {
  bar: null,
  time: null,
  scene: null,
  phase: null,
  progress: null,
};

let activatedOnce = false;

export function initScrubber() {
  els.bar = document.getElementById("scrubber");
  els.time = document.getElementById("scrubber-time");
  els.scene = document.getElementById("scrubber-scene");
  els.phase = document.getElementById("scrubber-phase");
  els.progress = document.getElementById("scrubber-progress");

  if (!els.bar) return;

  // Reveal the scrubber as soon as the user begins scrolling past the hero.
  const hero = document.querySelector(".hero");
  if (!hero) {
    setActive(true);
    return;
  }
  const obs = new IntersectionObserver(
    ([entry]) => {
      const past = !entry.isIntersecting || entry.intersectionRatio < 0.4;
      setActive(past);
    },
    { threshold: [0, 0.4, 1] },
  );
  obs.observe(hero);
}

function setActive(on) {
  if (!els.bar) return;
  if (on && !activatedOnce) activatedOnce = true;
  els.bar.dataset.active = on ? "true" : "false";
}

function fmt(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PHASE_FROM_WORLD = {
  dream: "Dream",
  reality: "Reality",
  memory: "Memory",
  hollywood: "Dream",
};

/**
 * Update scrubber from a step's data-attributes.
 *   data-film-sec, data-scene-title, data-world
 */
export function updateScrubberFromStep(step) {
  if (!els.bar || !step) return;

  const filmSec = parseFloat(step.dataset.filmSec);
  const sceneTitle = step.dataset.sceneTitle;
  const world = step.dataset.world;

  if (Number.isFinite(filmSec)) {
    els.time.textContent = fmt(filmSec);
    const pct = Math.min(100, Math.max(0, (filmSec / TOTAL_RUNTIME_SEC) * 100));
    els.progress.style.width = `${pct}%`;
  }
  if (sceneTitle) {
    els.scene.textContent = sceneTitle;
  } else if (filmSec === undefined || Number.isNaN(filmSec)) {
    // No film-time data — this is an analytical step, dim the time
    els.scene.textContent = "Analysis";
  }
  if (world && PHASE_FROM_WORLD[world]) {
    els.phase.textContent = PHASE_FROM_WORLD[world];
  }
}
