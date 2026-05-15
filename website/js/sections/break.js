/**
 * Section 5 — The Break: a multi-line shock chart.
 *
 * Three time-aligned signals across the 147-min runtime:
 *   1. Shot length (rolling avg, from Cinemetrics Esselaar dataset)
 *   2. Color saturation (rolling avg, from extracted color frames)
 *   3. Audio energy / silence (from librosa analysis)
 *
 * A vertical break-line at minute 113 (Club Silencio + Blue Box).
 * As the reader scrolls, lines reveal one at a time and the break-line
 * lights up to show every signal flipping within seconds of each other.
 */

const BREAK_SEC = 6780; // 01:53:00

// Pick the Esselaar dataset since it's per-character, more useful for our story
function smoothPerSec(arr, getX, getY, totalSec, binSec = 60) {
  // Bin into windows, take the mean. Returns [{x, y}].
  const bins = new Map();
  for (const item of arr) {
    const x = +getX(item);
    const y = +getY(item);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const bin = Math.floor(x / binSec) * binSec;
    if (!bins.has(bin)) bins.set(bin, { sum: 0, n: 0 });
    const b = bins.get(bin);
    b.sum += y;
    b.n += 1;
  }
  const out = [];
  for (let t = 0; t <= totalSec; t += binSec) {
    const b = bins.get(t);
    out.push({ x: t, y: b ? b.sum / b.n : null });
  }
  return out;
}

export async function initBreak({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const shots = (data.shots_per_shot || []).filter((s) => s.ds === "esselaar");
  const colors = data.colors || [];
  const audio = data.audio || [];

  if (!shots.length || !colors.length || !audio.length) {
    viz.innerHTML = '<div class="viz-placeholder">break-section data unavailable</div>';
    return;
  }

  const totalSec = 8787;
  const binSec = 60;

  const shotSeries = smoothPerSec(shots, (d) => +d.t, (d) => +d.len, totalSec, binSec);
  const satSeries = smoothPerSec(colors, (d) => +d.t, (d) => +d.s, totalSec, binSec);
  const audioSeries = smoothPerSec(audio, (d) => +d.t, (d) => +d.rms, totalSec, binSec);

  const svg = d3.select(viz).append("svg").attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g");

  const linesG = g.append("g").attr("class", "lines");
  const breakG = g.append("g").attr("class", "break");
  const axisG = g.append("g").attr("class", "axis");
  const legendG = g.append("g").attr("class", "legend");

  function layout() {
    const w = viz.clientWidth;
    const h = viz.clientHeight;
    const margin = { top: 50, right: 16, bottom: 36, left: 40 };
    const innerW = Math.max(200, w - margin.left - margin.right);
    const innerH = Math.max(160, h - margin.top - margin.bottom);

    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    g.attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, totalSec]).range([0, innerW]);

    function makeLine(series, key, color) {
      const valid = series.filter((d) => d.y !== null);
      const min = d3.min(valid, (d) => d.y);
      const max = d3.max(valid, (d) => d.y);
      const yScale = d3.scaleLinear().domain([min, max]).range([innerH, 0]);
      const line = d3.line()
        .defined((d) => d.y !== null)
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneX);
      let path = linesG.select(`path.${key}`);
      if (path.empty()) {
        path = linesG.append("path")
          .attr("class", key)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.6)
          .attr("opacity", 0);
      } else {
        path.attr("stroke", color);
      }
      path.attr("d", line(series));
    }

    makeLine(shotSeries, "line-shots", "#dba8b9");
    makeLine(satSeries, "line-sat", "#d4a155");
    makeLine(audioSeries, "line-audio", "#4f8fb0");

    // Break vertical line + label
    breakG.selectAll("*").remove();
    breakG.append("line")
      .attr("x1", xScale(BREAK_SEC)).attr("x2", xScale(BREAK_SEC))
      .attr("y1", -20).attr("y2", innerH + 8)
      .attr("stroke", "#9b2926")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0)
      .attr("class", "break-line");
    breakG.append("text")
      .attr("class", "break-label timeline-track-label")
      .attr("x", xScale(BREAK_SEC) + 6).attr("y", -22)
      .style("fill", "#9b2926")
      .style("opacity", 0)
      .text("01:53 · the break");

    // X axis
    axisG.selectAll("*").remove();
    const tickValues = [0, 1800, 3600, 5400, 7200, 8400];
    const fmt = (s) => {
      const m = Math.floor(s / 60);
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };
    const axisY = innerH + 6;
    axisG.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", axisY).attr("y2", axisY)
      .attr("stroke", "#5a5444");
    axisG.selectAll("text.tick").data(tickValues).enter().append("text")
      .attr("class", "tick timeline-track-label")
      .attr("x", (d) => xScale(d))
      .attr("y", axisY + 18)
      .attr("text-anchor", "middle")
      .text(fmt);

    // Legend
    legendG.selectAll("*").remove();
    const items = [
      { label: "shot length", color: "#dba8b9", key: "line-shots" },
      { label: "saturation", color: "#d4a155", key: "line-sat" },
      { label: "audio energy", color: "#4f8fb0", key: "line-audio" },
    ];
    let lx = 0;
    items.forEach((it) => {
      const grp = legendG.append("g").attr("transform", `translate(${lx}, -38)`);
      grp.append("rect")
        .attr("width", 14).attr("height", 2)
        .attr("y", 4)
        .attr("fill", it.color);
      const text = grp.append("text")
        .attr("x", 20).attr("y", 8)
        .attr("class", "timeline-track-label")
        .style("fill", it.color)
        .text(it.label);
      lx += 22 + (text.node().getComputedTextLength?.() || 100) + 12;
    });
  }

  layout();

  function showStep(idx, opts = {}) {
    setActiveStep(idx, opts);
    const lines = svg.selectAll(".lines path");
    const breakLine = svg.select(".break-line");
    const breakLabel = svg.select(".break-label");

    if (idx === 0) {
      caption.textContent = "three signals, one timeline";
      lines.transition().duration(600).attr("opacity", 0.15);
      breakLine.transition().duration(600).attr("opacity", 0);
      breakLabel.transition().duration(600).style("opacity", 0);
    } else if (idx === 1) {
      caption.textContent = "across the dream, all three signals are stable";
      lines.transition().duration(900).attr("opacity", 0.85);
      breakLine.transition().duration(600).attr("opacity", 0);
      breakLabel.transition().duration(600).style("opacity", 0);
    } else if (idx === 2) {
      caption.textContent = "the break — every line cracks within seconds";
      lines.transition().duration(900).attr("opacity", 0.95);
      breakLine.transition().duration(900).attr("opacity", 1);
      breakLabel.transition().duration(900).style("opacity", 1);
    } else {
      caption.textContent = "saturation drops, cuts shorten, silence climbs";
      lines.transition().duration(900).attr("opacity", 1);
      breakLine.transition().duration(900).attr("opacity", 1);
      breakLabel.transition().duration(900).style("opacity", 1);
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
