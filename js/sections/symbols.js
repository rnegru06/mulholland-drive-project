/**
 * Section 4 — Symbols as Breadcrumbs (STUB)
 *
 * Final design: scrolling film timeline with icons appearing for
 * the blue box, key, coffee cups, phones — clustering visibly
 * before the break.
 *
 * For now this stub lists the top motifs by appearance count
 * so the data link is visible.
 */

export async function initSymbols({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const symbols = data.symbols || [];

  const top = [...symbols]
    .sort((a, b) => (+b.total_appearances || 0) - (+a.total_appearances || 0))
    .slice(0, 6);

  viz.innerHTML = `
    <ul class="symbols-stub">
      ${top.map((s) => `
        <li>
          <span class="dot" style="background: ${s.color || "#888"};"></span>
          <span class="name">${s.symbol_name.replace(/_/g, " ")}</span>
          <span class="count">${s.total_appearances} appearances</span>
        </li>
      `).join("")}
    </ul>
    <style>
      .symbols-stub {
        list-style: none;
        padding: 0;
        margin: 0;
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .symbols-stub li {
        display: grid;
        grid-template-columns: 24px 1fr auto;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--rule);
        border-radius: 3px;
      }
      .symbols-stub .dot {
        width: 14px; height: 14px; border-radius: 50%;
        box-shadow: 0 0 12px currentColor;
      }
      .symbols-stub .name {
        font-family: var(--serif);
        font-size: 1.1rem;
        text-transform: capitalize;
      }
      .symbols-stub .count {
        font-family: var(--mono);
        font-size: 0.8rem;
        color: var(--fg-dim);
      }
    </style>
  `;
  caption.textContent = "Section 4 — to be replaced with timeline-clustered icons";

  const scroller = scrollama();
  scroller
    .setup({ step: `#${sectionEl.id} .step`, offset: 0.6 })
    .onStepEnter(({ index }) => setActiveStep(index));

  window.addEventListener("resize", () => scroller.resize());
}
