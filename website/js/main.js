/**
 * Mulholland Drive scrollytelling — entry point.
 *
 * Loads the bundled viz_data.json, sets up the sticky timestamp scrubber,
 * and initializes each scrolly section. Each section owns its own
 * visualization + scrollama instance.
 */

import { setWorld } from "./theme.js";
import { initScrubber, updateScrubberFromStep } from "./scrubber.js";
import { initWalkthrough } from "./sections/walkthrough.js";
import { initOpening } from "./sections/opening.js";
import { initTwoWorlds } from "./sections/two-worlds.js";
import { initIdentity } from "./sections/identity.js";
import { initSymbols } from "./sections/symbols.js";
import { initBreak } from "./sections/break.js";
import { initRewatching } from "./sections/rewatching.js";

const SECTIONS = [
  // The walkthroughs share an init function — they each render a "scene poster" viz
  { id: "walkthrough", init: initWalkthrough, options: { phase: "Dream" } },
  { id: "walkthrough-reality", init: initWalkthrough, options: { phase: "Reality" } },
  // The analytical sections
  { id: "opening", init: initOpening },
  { id: "two-worlds", init: initTwoWorlds },
  { id: "identity", init: initIdentity },
  { id: "symbols", init: initSymbols },
  { id: "break", init: initBreak },
  { id: "rewatching", init: initRewatching },
];

async function loadData() {
  const res = await fetch("data/viz_data.json");
  if (!res.ok) throw new Error(`Failed to fetch viz_data.json: ${res.status}`);
  return res.json();
}

function attachStepHandlers(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return null;
  const steps = section.querySelectorAll(".step");
  return {
    section,
    steps,
    /**
     * @param {number} idx
     * @param {{ silent?: boolean }} [opts] - silent skips theme + scrubber updates.
     *   Use silent=true for initial state setup before the user has scrolled.
     */
    setActiveStep(idx, opts = {}) {
      steps.forEach((step, i) => step.classList.toggle("is-active", i === idx));
      if (opts.silent) return;
      const step = steps[idx];
      if (!step) return;
      const world = step.dataset.world;
      if (world) setWorld(world);
      updateScrubberFromStep(step);
    },
  };
}

async function main() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="position:fixed;top:1rem;left:1rem;z-index:99999;background:#9b2926;color:#fff;padding:1rem 1.5rem;font-family:monospace;font-size:0.85rem;border-radius:4px;">
        Failed to load data/viz_data.json. Are you serving the site over HTTP? Try: python3 -m http.server
      </div>`,
    );
    return;
  }

  console.log("Loaded data:",
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])));

  initScrubber();

  for (const { id, init, options = {} } of SECTIONS) {
    const handlers = attachStepHandlers(id);
    if (!handlers) continue;
    try {
      await init({ data, sectionEl: handlers.section, ...handlers, ...options });
    } catch (err) {
      console.error(`Failed to init section "${id}":`, err);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
