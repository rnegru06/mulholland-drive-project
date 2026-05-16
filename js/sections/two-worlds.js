/**
 * Section 2 — The Two Worlds: a color river.
 *
 * One vertical bar per sampled frame of the film (4,394 of them, every 2s),
 * colored by the dominant color at that timestamp. Read left-to-right is the
 * 147-minute runtime. The "break" — where the dream ends and reality begins —
 * is visible as the river's saturation collapses around minute 113.
 */

const BREAK_SEC = 6780; // ~01:53:00 — Club Silencio / Blue Box

export async function initTwoWorlds({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const colors = data.colors || [];

  if (!colors.length) {
    viz.innerHTML = '<div class="viz-placeholder">colors data unavailable</div>';
    return;
  }

  const totalSec = colors[colors.length - 1]?.t || 8787;

  const svg = d3.select(viz).append("svg")
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g");
  const riverLayer = g.append("g").attr("class", "color-river");
  const breakLayer = g.append("g").attr("class", "break-marker");
  const overlayLayer = g.append("g").attr("class", "overlays");
  const axisLayer = g.append("g").attr("class", "axis");

  // Pre-compute aggregate stats once
  const dreamColors = colors.filter((c) => +c.t < BREAK_SEC);
  const realColors = colors.filter((c) => +c.t >= BREAK_SEC);
  const meanSat = (arr) => arr.reduce((s, c) => s + +c.s, 0) / Math.max(1, arr.length);
  const meanBrt = (arr) => arr.reduce((s, c) => s + +c.b, 0) / Math.max(1, arr.length);
  const dreamSat = meanSat(dreamColors);
  const realSat = meanSat(realColors);
  const dreamBrt = meanBrt(dreamColors);
  const realBrt = meanBrt(realColors);

  function layout() {
    const w = viz.clientWidth;
    const h = viz.clientHeight;
    const margin = { top: 28, right: 16, bottom: 36, left: 16 };
    const innerW = Math.max(200, w - margin.left - margin.right);
    const innerH = Math.max(120, h - margin.top - margin.bottom);

    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    g.attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, totalSec]).range([0, innerW]);

    // The river: each color sample is a thin vertical bar
    const barW = innerW / colors.length;
    const sel = riverLayer.selectAll("rect").data(colors);
    sel.exit().remove();
    sel.enter().append("rect")
      .merge(sel)
      .attr("x", (d) => xScale(+d.t))
      .attr("y", 0)
      .attr("width", Math.max(barW * 1.05, 0.5))
      .attr("height", innerH)
      .attr("fill", (d) => d.hex || "#000")
      .attr("opacity", (d) => 0.55 + (+d.s || 0) * 0.4);

    // Break marker — vertical line + label
    breakLayer.selectAll("*").remove();
    breakLayer.append("line")
      .attr("x1", xScale(BREAK_SEC)).attr("x2", xScale(BREAK_SEC))
      .attr("y1", -10).attr("y2", innerH + 10)
      .attr("stroke", "#9b2926")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0)
      .attr("class", "break-line");
    breakLayer.append("text")
      .attr("x", xScale(BREAK_SEC) + 6).attr("y", -14)
      .attr("class", "timeline-track-label")
      .text("THE BREAK · 01:53")
      .style("fill", "#9b2926")
      .style("opacity", 0)
      .attr("class", "break-label timeline-track-label");

    // Time axis at the bottom
    axisLayer.selectAll("*").remove();
    const axisY = innerH + 6;
    const tickValues = [0, 1800, 3600, 5400, 7200, 8400];
    const tickFmt = (s) => {
      const m = Math.floor(s / 60);
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };
    axisLayer.selectAll("line.tick").data(tickValues).enter().append("line")
      .attr("class", "tick")
      .attr("x1", (d) => xScale(d)).attr("x2", (d) => xScale(d))
      .attr("y1", axisY).attr("y2", axisY + 4)
      .attr("stroke", "#5a5444");
    axisLayer.selectAll("text.tick").data(tickValues).enter().append("text")
      .attr("class", "tick timeline-track-label")
      .attr("x", (d) => xScale(d))
      .attr("y", axisY + 18)
      .attr("text-anchor", "middle")
      .text(tickFmt);

    // Stat overlays (drawn later, hidden initially)
    overlayLayer.selectAll("*").remove();
    overlayLayer.append("text")
      .attr("class", "overlay-label dream-label timeline-track-label")
      .attr("x", xScale(BREAK_SEC / 2)).attr("y", -10)
      .attr("text-anchor", "middle")
      .style("fill", "#dba8b9")
      .style("opacity", 0)
      .text(`DREAM · sat ${dreamSat.toFixed(2)} · bri ${dreamBrt.toFixed(0)}`);
    overlayLayer.append("text")
      .attr("class", "overlay-label real-label timeline-track-label")
      .attr("x", xScale(BREAK_SEC + (totalSec - BREAK_SEC) / 2)).attr("y", -10)
      .attr("text-anchor", "middle")
      .style("fill", "#9b2926")
      .style("opacity", 0)
      .text(`REALITY · sat ${realSat.toFixed(2)} · bri ${realBrt.toFixed(0)}`);
  }

  layout();

  function showStep(idx, opts = {}) {
    setActiveStep(idx, opts);
    const breakLine = svg.select(".break-line");
    const breakLabel = svg.select(".break-label");
    const dreamLabel = svg.select(".dream-label");
    const realLabel = svg.select(".real-label");

    if (idx === 0) {
      caption.textContent = "4,394 frames sampled every 2 seconds";
      breakLine.transition().duration(400).attr("opacity", 0);
      breakLabel.transition().duration(400).style("opacity", 0);
      dreamLabel.transition().duration(400).style("opacity", 0);
      realLabel.transition().duration(400).style("opacity", 0);
    } else if (idx === 1) {
      caption.textContent = "the dream half — pinks, peaches, soft yellows";
      breakLine.transition().duration(400).attr("opacity", 0);
      breakLabel.transition().duration(400).style("opacity", 0);
      dreamLabel.transition().duration(800).style("opacity", 1);
      realLabel.transition().duration(400).style("opacity", 0);
    } else if (idx === 2) {
      caption.textContent = "around 01:53 the saturation collapses";
      breakLine.transition().duration(800).attr("opacity", 1);
      breakLabel.transition().duration(800).style("opacity", 1);
      dreamLabel.transition().duration(400).style("opacity", 1);
      realLabel.transition().duration(800).style("opacity", 0);
    } else {
      caption.textContent = "browns, reds, blacks — and they don't lift";
      breakLine.transition().duration(400).attr("opacity", 1);
      breakLabel.transition().duration(400).style("opacity", 1);
      dreamLabel.transition().duration(400).style("opacity", 1);
      realLabel.transition().duration(800).style("opacity", 1);
    }
  }

  const scroller = scrollama();
  scroller
    .setup({ step: `#${sectionEl.id} .step`, offset: 0.55 })
    .onStepEnter(({ index }) => showStep(index));

  showStep(0, { silent: true });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); scroller.resize(); }, 150);
  });
}
