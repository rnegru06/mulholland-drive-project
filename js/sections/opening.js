/**
 * Section 1 — Opening Hook: Two Timelines
 *
 * Polished, interactive version focused on the FIRST graph: presented order
 * (the order you watch). Each scene is a width-proportional block sized by
 * its actual duration. Blocks are colored by the scene's dominant color and
 * outlined by world (blue = dream, red = reality, gold = memory).
 *
 * Interactions:
 *   - Hover any block → tooltip with title, timecode, world, duration
 *   - Click any block → scrubs the sticky scrubber to that scene's timestamp
 *   - A playhead marker traces the top track as the user advances steps
 *
 * The chronological track only appears once the user reaches step 3+. Until
 * then, all the attention is on the top track — which is what "what you
 * watched" means in the brief.
 */

const TRACK_DREAM   = "#3b5fa4";
const TRACK_REALITY = "#9b2926";
const TRACK_MEMORY  = "#d4a155";
const TRACK_NEUTRAL = "#5a5470";

const COLOR_MAP = {
  red_purple: "#5f2236", blue_black: "#13243f", beige_yellow: "#a89568",
  red: "#7a2422", pink_white: "#e3b9b6", blue_night: "#1c2e54",
  dawn_blue: "#3d567f", pink_warm: "#c98c8a", pink_apricot: "#dba48c",
  black_white_marble: "#2a2a2a", brown_drab: "#5a4633", warm_pink: "#c47877",
  pink_red: "#9b3744", office_neutral: "#6e6a5c", muted: "#4a4a45",
  western_brown: "#6f4a2d", professional_neutral: "#7d7b6c",
  studio_lights: "#bda984", muted_blue: "#3a4c66", death_blue_grey: "#3a4148",
  red_curtains_blue: "#601f1f", blue_dark: "#0f1b34",
  grey_natural_morning: "#7d7c75", grey_natural: "#5e5d57",
  studio_natural: "#8a847a", red_lampshade: "#7a2520",
  warm_dinner_amber: "#a3743a", winkies_neon: "#b87a44",
  natural_light: "#a39a8a", grey_horror: "#3a3838", blue_smoke: "#3b4a66",
};

const TOTAL_RUNTIME_SEC = 8787;

function worldColor(w) {
  if (w === "dream") return TRACK_DREAM;
  if (w === "reality") return TRACK_REALITY;
  if (w === "reality_memory" || w === "coda") return TRACK_MEMORY;
  return TRACK_NEUTRAL;
}

function tcToSec(tc) {
  if (!tc) return 0;
  const [h, m, s] = String(tc).split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function fmtMin(sec) {
  const m = Math.round(sec / 60);
  return `${m} min`;
}

function parseChrono(value) {
  if (!value || value === "NA") return null;
  const m = String(value).match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export async function initOpening({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const timeline = data.timeline || [];
  const scenes = (data.scenes || []).slice().sort((a, b) => +a.scene_id - +b.scene_id);

  if (!timeline.length || !scenes.length) {
    viz.innerHTML = '<div class="viz-placeholder">timeline data unavailable</div>';
    return;
  }

  // Merge presentation order + scene metadata into one record per scene.
  const sceneById = new Map(scenes.map((s) => [String(s.scene_id), s]));
  const recs = timeline
    .map((t) => {
      const s = sceneById.get(String(t.scene_id));
      if (!s) return null;
      const startSec = tcToSec(s.start_timecode);
      const dur = +s.duration_sec || 0;
      return {
        sceneId: +s.scene_id,
        presentedOrder: +t.presented_order,
        chronoOrder: parseChrono(t.chronological_order),
        title: s.scene_title,
        shortName: t.scene_short_name || s.scene_title,
        world: s.world,
        worldHint: t.real_or_dream,
        startSec,
        endSec: startSec + dur,
        durSec: dur,
        dominant: COLOR_MAP[s.dominant_color] || "#3a3a3a",
        location: s.location || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.presentedOrder - b.presentedOrder);

  // Inject the DOM scaffold (HTML + scoped SVG)
  viz.innerHTML = `
    <div class="op-viz">
      <header class="op-header">
        <div class="op-legend">
          <span class="op-legend__item"><i class="op-swatch" style="background:${TRACK_DREAM}"></i>Dream</span>
          <span class="op-legend__item"><i class="op-swatch" style="background:${TRACK_REALITY}"></i>Reality</span>
          <span class="op-legend__item"><i class="op-swatch" style="background:${TRACK_MEMORY}"></i>Memory</span>
        </div>
        <div class="op-readout" id="op-readout">
          <span class="op-readout__title">Hover over any scene</span>
          <span class="op-readout__meta">1 block = 1 scene<br>width = scene length</span>
        </div>
      </header>

      <div class="op-stage">
        <p class="op-track-label op-track-label--top">
          <span class="op-track-label__name">Presented order (movie watching order)</span>
          <span class="op-track-label__sub"></span>
        </p>
        <svg class="op-svg" preserveAspectRatio="none">
          <g class="op-band-layer"></g>
          <g class="op-top-track"></g>
          <g class="op-axis"></g>
          <g class="op-links"></g>
          <g class="op-bottom-track"></g>
          <g class="op-overlay"></g>
        </svg>
        <p class="op-track-label op-track-label--bot" data-revealed="0">
          <span class="op-track-label__name">Chronological order</span>
          <span class="op-track-label__sub">when events actually happened</span>
        </p>
      </div>

      <div class="op-tip" id="op-tip" aria-hidden="true"></div>
    </div>
  `;

  const tip = viz.querySelector("#op-tip");
  const readout = viz.querySelector("#op-readout");
  const stage = viz.querySelector(".op-stage");
  const svgEl = viz.querySelector(".op-svg");
  const botLabel = viz.querySelector(".op-track-label--bot");

  const svg = d3.select(svgEl);
  const bandLayer = svg.select(".op-band-layer");
  const topTrack = svg.select(".op-top-track");
  const axis = svg.select(".op-axis");
  const links = svg.select(".op-links");
  const bottomTrack = svg.select(".op-bottom-track");
  const overlay = svg.select(".op-overlay");

  let layout = { w: 0, h: 0, padL: 0, padR: 0, topY: 0, botY: 0, blockH: 0 };

  function computeLayout() {
    const rect = stage.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const padL = 8;
    const padR = 8;
    const innerW = Math.max(200, w - padL - padR);
    const topY = Math.min(90, h * 0.22);
    const botY = h - 80;
    const blockH = 56;
    layout = { w, h, padL, padR, innerW, topY, botY, blockH };
    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    return layout;
  }

  function xForSec(sec) {
    return layout.padL + (sec / TOTAL_RUNTIME_SEC) * layout.innerW;
  }
  function xForChrono(n, max) {
    return layout.padL + ((n - 1) / Math.max(1, max - 1)) * layout.innerW;
  }

  function render() {
    computeLayout();
    const { topY, botY, blockH, innerW, padL } = layout;

    // ---------- World bands behind the top track (dream vs reality) ----------
    const bandY = topY - blockH / 2 - 18;
    const bandH = blockH + 36;
    const breakSec = 6800; // ~Club Silencio / Blue Box, around 01:53
    const bands = [
      { x0: 0,           x1: breakSec,            world: "dream",   label: "DREAM" },
      { x0: breakSec,    x1: TOTAL_RUNTIME_SEC,   world: "reality", label: "REALITY" },
    ];
    const bandSel = bandLayer.selectAll("g.op-band").data(bands, (d) => d.world);
    bandSel.exit().remove();
    const bandEnter = bandSel.enter().append("g").attr("class", "op-band");
    bandEnter.append("rect").attr("class", "op-band-rect");
    bandEnter.append("text").attr("class", "op-band-label");
    const bandAll = bandEnter.merge(bandSel);
    bandAll.select(".op-band-rect")
      .attr("x", (d) => xForSec(d.x0))
      .attr("y", bandY)
      .attr("width", (d) => xForSec(d.x1) - xForSec(d.x0))
      .attr("height", bandH)
      .attr("fill", (d) => d.world === "dream" ? "rgba(59,95,164,0.07)" : "rgba(155,41,38,0.07)");
    bandAll.select(".op-band-label")
      .attr("x", (d) => xForSec((d.x0 + d.x1) / 2))
      .attr("y", bandY - 6)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => d.world === "dream" ? "rgba(59,95,164,0.6)" : "rgba(155,41,38,0.7)")
      .text((d) => d.label);

    // Break marker line
    let breakLine = bandLayer.selectAll("line.op-break-line").data([breakSec]);
    breakLine.exit().remove();
    breakLine = breakLine.enter().append("line").attr("class", "op-break-line").merge(breakLine);
    breakLine
      .attr("x1", (d) => xForSec(d))
      .attr("x2", (d) => xForSec(d))
      .attr("y1", bandY - 16)
      .attr("y2", bandY + bandH + 16)
      .attr("stroke", "rgba(236,230,213,0.18)")
      .attr("stroke-dasharray", "3 4");
    let breakLabel = bandLayer.selectAll("text.op-break-label").data([breakSec]);
    breakLabel.exit().remove();
    breakLabel = breakLabel.enter().append("text").attr("class", "op-break-label").merge(breakLabel);
    breakLabel
      .attr("x", (d) => xForSec(d))
      .attr("y", bandY + bandH + 30)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(236,230,213,0.45)")
      .text("CLUB SILENCIO · 01:53");

    // ---------- Top track: presentation order, width = duration ----------
    const top = topTrack.selectAll("g.op-block").data(recs, (d) => d.sceneId);
    top.exit().remove();
    const topEnter = top.enter().append("g").attr("class", "op-block").style("cursor", "pointer");
    topEnter.append("rect").attr("class", "op-block__bg");
    topEnter.append("rect").attr("class", "op-block__stroke");
    topEnter.append("text").attr("class", "op-block__num");

    const topAll = topEnter.merge(top);
    topAll
      .attr("data-scene", (d) => d.sceneId)
      .attr("data-world", (d) => d.world)
      .on("mouseenter", (e, d) => showTip(e, d, "presented"))
      .on("mousemove", (e) => moveTip(e))
      .on("mouseleave", hideTip)
      .on("click", (e, d) => scrubToScene(d));

    topAll.select(".op-block__bg")
      .attr("x", (d) => xForSec(d.startSec))
      .attr("y", topY - blockH / 2)
      .attr("width", (d) => Math.max(2, xForSec(d.endSec) - xForSec(d.startSec) - 1))
      .attr("height", blockH)
      .attr("fill", (d) => d.dominant);

    topAll.select(".op-block__stroke")
      .attr("x", (d) => xForSec(d.startSec))
      .attr("y", topY - blockH / 2)
      .attr("width", (d) => Math.max(2, xForSec(d.endSec) - xForSec(d.startSec) - 1))
      .attr("height", blockH)
      .attr("fill", "none")
      .attr("stroke", (d) => worldColor(d.world))
      .attr("stroke-width", 1.5);

    topAll.select(".op-block__num")
      .attr("x", (d) => (xForSec(d.startSec) + xForSec(d.endSec)) / 2)
      .attr("y", topY + 4)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(236,230,213,0.55)")
      .text((d) => {
        // only show numbers for blocks wide enough
        const wpx = xForSec(d.endSec) - xForSec(d.startSec);
        return wpx >= 26 ? String(d.sceneId) : "";
      });

    // ---------- Time axis under top track ----------
    const ticks = [0, 1800, 3600, 5400, 7200, TOTAL_RUNTIME_SEC];
    const axisY = topY + blockH / 2 + 14;
    const tickSel = axis.selectAll("g.op-tick").data(ticks);
    tickSel.exit().remove();
    const tickEnter = tickSel.enter().append("g").attr("class", "op-tick");
    tickEnter.append("line");
    tickEnter.append("text");
    const tickAll = tickEnter.merge(tickSel);
    tickAll.select("line")
      .attr("x1", (d) => xForSec(d)).attr("x2", (d) => xForSec(d))
      .attr("y1", axisY - 4).attr("y2", axisY + 2)
      .attr("stroke", "rgba(236,230,213,0.3)");
    tickAll.select("text")
      .attr("x", (d) => xForSec(d))
      .attr("y", axisY + 16)
      .attr("text-anchor", (d) => d === 0 ? "start" : d === TOTAL_RUNTIME_SEC ? "end" : "middle")
      .attr("fill", "rgba(236,230,213,0.5)")
      .text((d) => {
        const m = Math.round(d / 60);
        return m === 0 ? "0:00" : `${m}m`;
      });

    // ---------- Bottom track + links (rendered, opacity-controlled by step) ----------
    const chronoRecs = recs.filter((r) => r.chronoOrder !== null)
      .slice().sort((a, b) => a.chronoOrder - b.chronoOrder);
    const chronoMax = d3.max(chronoRecs, (r) => r.chronoOrder) || 12;

    const botBlockW = Math.max(18, (innerW / chronoMax) * 0.85);
    const bot = bottomTrack.selectAll("g.op-bblock").data(chronoRecs, (d) => d.sceneId);
    bot.exit().remove();
    const botEnter = bot.enter().append("g").attr("class", "op-bblock").style("cursor", "pointer");
    botEnter.append("rect").attr("class", "op-bblock__bg");
    botEnter.append("rect").attr("class", "op-bblock__stroke");
    botEnter.append("text").attr("class", "op-bblock__num");
    const botAll = botEnter.merge(bot);
    botAll
      .attr("data-scene", (d) => d.sceneId)
      .on("mouseenter", (e, d) => showTip(e, d, "chrono"))
      .on("mousemove", (e) => moveTip(e))
      .on("mouseleave", hideTip)
      .on("click", (e, d) => scrubToScene(d));
    botAll.select(".op-bblock__bg")
      .attr("x", (d) => xForChrono(d.chronoOrder, chronoMax) - botBlockW / 2)
      .attr("y", botY - 14)
      .attr("width", botBlockW)
      .attr("height", 28)
      .attr("fill", (d) => d.dominant);
    botAll.select(".op-bblock__stroke")
      .attr("x", (d) => xForChrono(d.chronoOrder, chronoMax) - botBlockW / 2)
      .attr("y", botY - 14)
      .attr("width", botBlockW)
      .attr("height", 28)
      .attr("fill", "none")
      .attr("stroke", (d) => worldColor(d.world))
      .attr("stroke-width", 1.5);
    botAll.select(".op-bblock__num")
      .attr("x", (d) => xForChrono(d.chronoOrder, chronoMax))
      .attr("y", botY + 4)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(236,230,213,0.7)")
      .style("font-size", "10px")
      .text((d) => d.sceneId);

    // Links
    const lk = links.selectAll("path.op-link").data(chronoRecs, (d) => d.sceneId);
    lk.exit().remove();
    const lkEnter = lk.enter().append("path").attr("class", "op-link");
    lkEnter.merge(lk)
      .attr("d", (d) => {
        const x1 = (xForSec(d.startSec) + xForSec(d.endSec)) / 2;
        const x2 = xForChrono(d.chronoOrder, chronoMax);
        const y1 = topY + blockH / 2;
        const y2 = botY - 14;
        const cy = (y1 + y2) / 2;
        return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
      })
      .attr("fill", "none")
      .attr("stroke", (d) => worldColor(d.world))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.55);

    // ---------- Playhead overlay (shown in step 1+) ----------
    let ph = overlay.selectAll("g.op-playhead").data([0]);
    ph.exit().remove();
    const phEnter = ph.enter().append("g").attr("class", "op-playhead").attr("opacity", 0);
    phEnter.append("line")
      .attr("class", "op-playhead__line")
      .attr("stroke", "#ece6d5").attr("stroke-width", 1)
      .attr("y1", topY - blockH / 2 - 8).attr("y2", topY + blockH / 2 + 6);
    phEnter.append("circle")
      .attr("class", "op-playhead__dot")
      .attr("r", 4).attr("fill", "#ece6d5")
      .attr("cy", topY - blockH / 2 - 10);
  }

  // ---------- Tooltip helpers ----------
  function showTip(e, d, track) {
    const personaTxt =
      d.worldHint === "dream" ? "Dream" :
      d.worldHint === "reality" ? "Reality" :
      d.worldHint === "reality_memory" ? "Memory" :
      d.worldHint === "coda" ? "Coda" : "—";
    const chronoTxt = d.chronoOrder
      ? `chronological #${d.chronoOrder}`
      : `<span class="op-tip__noreal">no chronological position — only in dream</span>`;
    tip.innerHTML = `
      <div class="op-tip__head">
        <span class="op-tip__num">Scene ${d.sceneId}</span>
        <span class="op-tip__world op-tip__world--${d.worldHint}">${personaTxt}</span>
      </div>
      <div class="op-tip__title">${d.shortName}</div>
      <div class="op-tip__meta">${fmtTime(d.startSec)} · ${fmtMin(d.durSec)} on screen</div>
      <div class="op-tip__chrono">${chronoTxt}</div>
    `;
    tip.dataset.world = d.worldHint;
    tip.style.display = "block";
    moveTip(e);

    // Persistent readout (always-visible bottom-right summary)
    readout.innerHTML = `
      <span class="op-readout__title">Scene ${d.sceneId} · <em>${d.shortName}</em></span>
      <span class="op-readout__meta">${fmtTime(d.startSec)} → ${fmtTime(d.endSec)} · ${personaTxt}${d.chronoOrder ? " · chrono #" + d.chronoOrder : " · no chrono anchor"}</span>
    `;
  }
  function moveTip(e) {
    const rect = viz.getBoundingClientRect();
    tip.style.left = `${e.clientX - rect.left}px`;
    tip.style.top  = `${e.clientY - rect.top}px`;
  }
  function hideTip() {
    tip.style.display = "none";
    readout.innerHTML = `
      <span class="op-readout__title">Hover over any scene</span>
      <span class="op-readout__meta">1 block = 1 scene<br>width = scene length</span>
    `;
  }

  function scrubToScene(d) {
    const timeEl = document.getElementById("scrubber-time");
    const sceneEl = document.getElementById("scrubber-scene");
    const phaseEl = document.getElementById("scrubber-phase");
    const progEl = document.getElementById("scrubber-progress");
    if (timeEl) timeEl.textContent = fmtTime(d.startSec);
    if (sceneEl) sceneEl.textContent = d.title;
    if (phaseEl) {
      phaseEl.textContent = d.world === "reality" || d.world === "reality_memory" ? "Reality" : "Dream";
    }
    if (progEl) progEl.style.width = `${(d.startSec / TOTAL_RUNTIME_SEC) * 100}%`;
    const root = viz.querySelector(".op-viz");
    root.classList.remove("is-pinged"); void root.offsetWidth; root.classList.add("is-pinged");
    // visual highlight on the clicked block
    topTrack.selectAll("g.op-block").classed("is-focused", (rec) => rec.sceneId === d.sceneId);
  }

  render();

  // ---------- Step-driven state ----------
  function applyState(idx, opts = {}) {
    setActiveStep(idx, opts);

    const blocks = topTrack.selectAll("g.op-block");
    const botBlocks = bottomTrack.selectAll("g.op-bblock");
    const lk = links.selectAll("path.op-link");
    const ph = overlay.selectAll("g.op-playhead");

    if (idx === 0) {
      caption.textContent = "Hover over any scene · click to scrub the film to that moment";
      blocks.classed("is-dim", (d) => d.presentedOrder !== 1)
            .classed("is-spotlight", (d) => d.presentedOrder === 1);
      botBlocks.transition().duration(400).attr("opacity", 0);
      lk.transition().duration(400).attr("opacity", 0);
      botLabel.dataset.revealed = "0";
      ph.transition().duration(400).attr("opacity", 0);
    } else if (idx === 1) {
      caption.textContent = "37 scenes · widths are real screen time";
      blocks.classed("is-dim", false).classed("is-spotlight", false);
      // Animate the playhead sweeping left → right with the reveal
      blocks.transition().duration(600).delay((d) => d.presentedOrder * 30).attr("opacity", 1);
      botBlocks.transition().duration(400).attr("opacity", 0);
      lk.transition().duration(400).attr("opacity", 0);
      botLabel.dataset.revealed = "0";
      ph.transition().duration(400).attr("opacity", 0);
    } else if (idx === 2) {
      caption.textContent = "Color the blocks by world — most of what you watched was the dream";
      blocks.classed("is-dim", false).classed("is-spotlight", false);
      blocks.classed("is-fade-real", (d) => d.world === "reality");
      botBlocks.transition().duration(400).attr("opacity", 0);
      lk.transition().duration(400).attr("opacity", 0);
      botLabel.dataset.revealed = "0";
      ph.transition().duration(400).attr("opacity", 0);
    } else if (idx === 3) {
      caption.textContent = "Now the chronological track — only 12 of 37 anchor to real time";
      blocks.classed("is-dim", false).classed("is-spotlight", false).classed("is-fade-real", false);
      botBlocks.transition().duration(700).attr("opacity", 1);
      lk.transition().duration(900).attr("opacity", 0.55);
      botLabel.dataset.revealed = "1";
      ph.transition().duration(400).attr("opacity", 0);
    } else {
      caption.textContent = "The criss-cross is the structure — the dream floats with no chronological anchor";
      blocks.classed("is-dim", false).classed("is-spotlight", false).classed("is-fade-real", false);
      botBlocks.transition().duration(400).attr("opacity", 1);
      lk.transition().duration(700).attr("opacity", 0.85).attr("stroke-width", 1.4);
      botLabel.dataset.revealed = "1";
      ph.transition().duration(400).attr("opacity", 0);
    }
  }

  applyState(0, { silent: true });

  const scroller = scrollama();
  scroller
    .setup({ step: `#${sectionEl.id} .step`, offset: 0.6 })
    .onStepEnter(({ index }) => applyState(index));

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      render();
      scroller.resize();
    }, 150);
  });
}
