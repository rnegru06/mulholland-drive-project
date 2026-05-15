/**
 * Theme switching for the Mulholland Drive scrollytelling site.
 *
 * The body's `data-world` attribute drives all theme variables in CSS.
 * When the world changes, we trigger a horizontal "sweep" overlay that
 * visually carries the eye left-to-right, mirroring the film's
 * dream/reality fractures.
 */

const sweep = document.getElementById("theme-sweep");
let currentWorld = document.body.dataset.world || "dream";
let sweepTimer = null;

/**
 * Set the global theme world ('dream' | 'reality' | 'memory').
 * Plays the sweep animation if the world actually changed.
 */
export function setWorld(world) {
  if (!world || world === currentWorld) return;
  currentWorld = world;
  document.body.dataset.world = world;
  triggerSweep();
}

function triggerSweep() {
  if (!sweep) return;
  sweep.classList.remove("sweeping");
  // Force a reflow so the animation can restart even when re-triggered.
  // eslint-disable-next-line no-unused-expressions
  void sweep.offsetWidth;
  sweep.classList.add("sweeping");

  clearTimeout(sweepTimer);
  sweepTimer = setTimeout(() => sweep.classList.remove("sweeping"), 1200);
}

export function getWorld() {
  return currentWorld;
}
