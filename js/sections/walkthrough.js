/**
 * Walkthrough section — Part I.
 *
 * As the reader scrolls scene-by-scene through the film, the sticky
 * left panel renders a "scene poster" matching the active step:
 *   - scene number
 *   - scene title (large)
 *   - location
 *   - dominant-color glow behind it
 *   - a small chip noting the world (dream/reality/memory)
 *
 * This is paired with the scrubber up top, which simultaneously shows
 * the film timestamp and phase. Together the reader experiences
 * something close to "watching" the film.
 */

const WORLD_LABEL = {
  dream: "Dream",
  reality: "Reality",
  memory: "Memory",
  hollywood: "Dream — Hollywood",
};

export async function initWalkthrough({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const scenes = data.scenes || [];
  const sceneById = new Map(scenes.map((s) => [String(s.scene_id), s]));

  // Build a single "poster" element that we update on each step
  viz.innerHTML = `
    <div class="scene-poster" id="poster-${sectionEl.id}">
      <div class="scene-poster__bg" aria-hidden="true"></div>
      <p class="scene-poster__num"></p>
      <h3 class="scene-poster__title"></h3>
      <p class="scene-poster__location"></p>
      <span class="scene-poster__chip"></span>
    </div>
  `;

  const poster = viz.querySelector(".scene-poster");
  const numEl = viz.querySelector(".scene-poster__num");
  const titleEl = viz.querySelector(".scene-poster__title");
  const locEl = viz.querySelector(".scene-poster__location");
  const chipEl = viz.querySelector(".scene-poster__chip");

  function showStep(idx, opts = {}) {
    setActiveStep(idx, opts);
    const step = sectionEl.querySelectorAll(".step")[idx];
    if (!step) return;
    const sceneId = step.dataset.sceneId;
    const scene = sceneId ? sceneById.get(sceneId) : null;

    const num = step.dataset.sceneId
      ? `Scene ${String(step.dataset.sceneId).padStart(2, "0")} of 37`
      : `Step ${idx + 1}`;
    numEl.textContent = num;

    titleEl.textContent = scene?.scene_title || step.dataset.sceneTitle || "";

    const loc = scene?.location ? scene.location.replace(/_/g, " ") : "";
    locEl.textContent = loc;

    const world = step.dataset.world;
    chipEl.textContent = WORLD_LABEL[world] || "";

    if (caption) {
      const dur = scene?.duration_sec;
      caption.textContent = dur ? `Scene runtime: ${dur} seconds` : "";
    }
  }

  const scroller = scrollama();
  scroller
    .setup({
      step: `#${sectionEl.id} .step`,
      offset: 0.55,
    })
    .onStepEnter(({ index }) => showStep(index));

  showStep(0, { silent: true });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => scroller.resize(), 150);
  });
}
