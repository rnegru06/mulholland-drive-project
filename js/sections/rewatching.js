/**
 * Section 6 — Rewatching With Knowledge (STUB)
 *
 * Final design: a dual-coded scene list — what you *think* you see
 * on first watch vs what it *means* on rewatch.
 *
 * For now this stub shows a sample of three scenes with their
 * dream/reality reading so the section structure is in place.
 */

export async function initRewatching({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const scenes = data.scenes || [];

  // Pick three scenes with rich dream-vs-reality contrast
  const targets = ["3", "10", "24"]; // Winkie's, Castigliane Espresso, Silencio
  const picks = targets
    .map((id) => scenes.find((s) => s.scene_id === id))
    .filter(Boolean);

  viz.innerHTML = `
    <div class="rewatch-stub">
      ${picks.map((s) => `
        <div class="rewatch-row">
          <p class="rewatch-title">${s.scene_title}</p>
          <p class="rewatch-first"><span>first watch</span>${s.description}</p>
          <p class="rewatch-second"><span>on rewatch</span>${s.notes || "(annotation pending)"}</p>
        </div>
      `).join("")}
    </div>
    <style>
      .rewatch-stub {
        width: 100%;
        max-width: 720px;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .rewatch-row {
        border-left: 2px solid var(--accent-red);
        padding-left: 1.5rem;
      }
      .rewatch-title {
        font-family: var(--serif);
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 0.6rem;
      }
      .rewatch-first, .rewatch-second {
        font-size: 0.95rem;
        margin: 0 0 0.5rem;
        color: var(--fg);
        line-height: 1.5;
      }
      .rewatch-first span, .rewatch-second span {
        display: inline-block;
        font-family: var(--mono);
        font-size: 0.65rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-dim);
        margin-right: 0.7rem;
        padding: 0.1em 0.6em;
        border: 1px solid var(--rule);
        border-radius: 2px;
      }
    </style>
  `;
  caption.textContent = "Section 6 — to be replaced with the dual-coded annotation walk";

  const scroller = scrollama();
  scroller
    .setup({ step: `#${sectionEl.id} .step`, offset: 0.6 })
    .onStepEnter(({ index }) => setActiveStep(index));

  window.addEventListener("resize", () => scroller.resize());
}
