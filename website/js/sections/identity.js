/**
 * Section 3 — Identity Dissolution
 *
 * 10×10 grid (1 sq = 1% of runtime ≈ 88 seconds), one row per actress.
 *   Top:    Naomi Watts — Betty (dream-blue) → Diane (reality-red)
 *   Bottom: Laura Harring — Rita (dream-blue) → Camilla (reality-red), mirrored R→L
 *
 * Each cell is filled with the dominant color of the scene it covers.
 * A 2px inset stroke marks identity (blue = dream persona, red = reality persona).
 * After the break (Club Silencio / Blue Box), post-break cells dissolve out
 * of formation — drift, rotate, shrink — visualizing the loss of self.
 *
 * Hover any cell → tooltip with scene title + timecode + persona.
 * Click any cell → scrub the page's main scrubber to that scene's timestamp.
 */

const TOTAL_RUNTIME_SEC = 8787;
const BREAK_SQUARE = 77; // squares >= 77 are post-break (after Club Silencio)

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

// Identify which persona is on screen in each scene for each actress.
// nw = Naomi Watts ("betty"|"diane"|null); lh = Laura Harring ("rita"|"camilla"|null)
const SCENE_PRESENCE = {
  1:  { nw: "diane",  lh: null     }, 2:  { nw: null,     lh: "rita"   },
  3:  { nw: null,     lh: null     }, 4:  { nw: null,     lh: null     },
  5:  { nw: "betty",  lh: null     }, 6:  { nw: null,     lh: "rita"   },
  7:  { nw: null,     lh: null     }, 8:  { nw: null,     lh: "rita"   },
  9:  { nw: "betty",  lh: "rita"   }, 10: { nw: null,     lh: null     },
  11: { nw: null,     lh: null     }, 12: { nw: null,     lh: null     },
  13: { nw: "betty",  lh: "rita"   }, 14: { nw: null,     lh: null     },
  15: { nw: null,     lh: null     }, 16: { nw: "betty",  lh: "rita"   },
  17: { nw: null,     lh: null     }, 18: { nw: "betty",  lh: "rita"   },
  19: { nw: "betty",  lh: null     }, 20: { nw: "betty",  lh: null     },
  21: { nw: "betty",  lh: "rita"   }, 22: { nw: "betty",  lh: "rita"   },
  23: { nw: "betty",  lh: "rita"   }, 24: { nw: "betty",  lh: "rita"   },
  25: { nw: "betty",  lh: "rita"   }, 26: { nw: "diane",  lh: null     },
  27: { nw: "diane",  lh: null     }, 28: { nw: "diane",  lh: "camilla"},
  29: { nw: "diane",  lh: "camilla"}, 30: { nw: "diane",  lh: null     },
  31: { nw: "diane",  lh: null     }, 32: { nw: "diane",  lh: "camilla"},
  33: { nw: "diane",  lh: "camilla"}, 34: { nw: "diane",  lh: null     },
  35: { nw: "diane",  lh: null     }, 36: { nw: "diane",  lh: null     },
  37: { nw: null,     lh: null     },
};

function tcToSec(tc) {
  if (!tc) return 0;
  const [h, m, s] = tc.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Deterministic per-cell jitter (so dissolution looks the same each render).
function makeJitter() {
  const out = [];
  for (let i = 0; i < 100; i++) {
    const a = Math.sin((i + 1) * 12.9898) * 43758.5453;
    const b = Math.sin((i + 1) * 78.233) * 12345.6789;
    out.push({
      dx: (a - Math.floor(a)) * 2 - 1,
      dy: (b - Math.floor(b)) * 2 - 1,
      rot: ((a - Math.floor(a)) - 0.5) * 28,
    });
  }
  return out;
}

// Build the 100-square sequence for a given actor: each square covers ~88s and
// is tagged with the scene at its midpoint + which persona is on screen.
function buildSquares(scenes, actor) {
  // cumulative offsets
  let t = 0;
  const offs = scenes.map((s) => {
    const start = t;
    t += +s.duration_sec;
    return { start, end: t, scene: s };
  });
  const totalSec = t;
  const unit = totalSec / 100;
  const out = [];
  for (let i = 0; i < 100; i++) {
    const mid = (i + 0.5) * unit;
    const span = offs.find((o) => mid >= o.start && mid < o.end) || offs[offs.length - 1];
    const scene = span.scene;
    const presence = SCENE_PRESENCE[+scene.scene_id] || {};
    out.push({ i, scene, persona: presence[actor] || null });
  }
  return out;
}

export async function initIdentity({ data, sectionEl, setActiveStep }) {
  const viz = sectionEl.querySelector(".scrolly__viz");
  const caption = sectionEl.querySelector(".scrolly__caption");
  const scenes = (data.scenes || []).slice().sort((a, b) => +a.scene_id - +b.scene_id);

  if (!scenes.length) {
    viz.innerHTML = '<div class="viz-placeholder">scenes data unavailable</div>';
    return;
  }

  const sqNW = buildSquares(scenes, "nw");
  const sqLH = buildSquares(scenes, "lh");
  const jitter = makeJitter();

  // Counts (squares)
  const countBetty   = sqNW.filter((s) => s.persona === "betty").length;
  const countDiane   = sqNW.filter((s) => s.persona === "diane").length;
  const countRita    = sqLH.filter((s) => s.persona === "rita").length;
  const countCamilla = sqLH.filter((s) => s.persona === "camilla").length;

  viz.innerHTML = `
    <div class="id-viz" data-revealed="0" data-dissolved="0">
      <div class="id-pair">
        <div class="id-pair__label">
          <span class="id-actor">Naomi Watts</span>
          <span class="id-duo"><span class="dn">Betty Elms</span> / <span class="rn">Diane Selwyn</span></span>
        </div>
        <div class="id-grid id-grid--nw" data-actor="nw"></div>
        <div class="id-gauge">
          <span class="id-gauge__num id-gauge__num--dream">${countBetty}</span>
          <div class="id-gauge__bar">
            <div class="id-gauge__seg id-gauge__seg--dream" style="width: ${countBetty}%"></div>
            <div class="id-gauge__seg id-gauge__seg--real"  style="width: ${countDiane}%; left: ${countBetty}%"></div>
          </div>
          <span class="id-gauge__num id-gauge__num--real">${countDiane}</span>
          <span class="id-gauge__caption">squares · 1 sq = 1% of runtime</span>
        </div>
      </div>

      <div class="id-pair">
        <div class="id-pair__label">
          <span class="id-actor">Laura Harring</span>
          <span class="id-duo"><span class="dn">Rita</span> / <span class="rn">Camilla Rhodes</span></span>
        </div>
        <div class="id-grid id-grid--lh" data-actor="lh" data-mirror="1"></div>
        <div class="id-gauge">
          <span class="id-gauge__num id-gauge__num--dream">${countRita}</span>
          <div class="id-gauge__bar">
            <div class="id-gauge__seg id-gauge__seg--dream" style="width: ${countRita}%"></div>
            <div class="id-gauge__seg id-gauge__seg--real"  style="width: ${countCamilla}%; left: ${countRita}%"></div>
          </div>
          <span class="id-gauge__num id-gauge__num--real">${countCamilla}</span>
          <span class="id-gauge__caption">squares · 1 sq = 1% of runtime</span>
        </div>
      </div>

      <div class="id-tip" id="id-tip" aria-hidden="true"></div>
    </div>
  `;

  // Render cells
  function renderGrid(selector, squares, mirrored) {
    const root = viz.querySelector(selector);
    root.innerHTML = "";
    squares.forEach((s, i) => {
      const idx = mirrored ? 99 - i : i;
      const col = idx % 10;
      const row = Math.floor(idx / 10);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "id-cell";
      cell.dataset.persona = s.persona || "";
      cell.dataset.sceneId = s.scene.scene_id;
      cell.dataset.cellIdx = idx;
      cell.style.left = `${col * 10}%`;
      cell.style.top = `${row * 10}%`;
      cell.style.background = COLOR_MAP[s.scene.dominant_color] || "#3a3a3a";
      cell.setAttribute("aria-label", `${s.scene.scene_title} — ${s.persona || "no persona"}`);
      cell.addEventListener("mouseenter", (e) => showTip(s, e));
      cell.addEventListener("mousemove", (e) => moveTip(e));
      cell.addEventListener("mouseleave", hideTip);
      cell.addEventListener("focus", (e) => showTip(s, { clientX: cell.getBoundingClientRect().left + 20, clientY: cell.getBoundingClientRect().top }));
      cell.addEventListener("blur", hideTip);
      cell.addEventListener("click", () => jumpToScene(s.scene));
      root.appendChild(cell);
    });
  }

  renderGrid(".id-grid--nw", sqNW, false);
  renderGrid(".id-grid--lh", sqLH, true);

  // Tooltip
  const tip = viz.querySelector("#id-tip");
  function showTip(sq, e) {
    const sec = tcToSec(sq.scene.start_timecode);
    const personaTxt = sq.persona ? sq.persona.toUpperCase() : "no persona on screen";
    tip.innerHTML = `
      <span class="id-tip__scene">${sq.scene.scene_title}</span>
      <span class="id-tip__meta">${fmtTime(sec)} · ${personaTxt}</span>
    `;
    tip.dataset.persona = sq.persona || "";
    tip.style.display = "block";
    moveTip(e);
  }
  function moveTip(e) {
    const rect = viz.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }
  function hideTip() { tip.style.display = "none"; }

  // Click-to-scrub: dispatch a custom event the page's scrubber can listen to.
  // For now, simply update the visible scrubber DOM directly.
  function jumpToScene(scene) {
    const sec = tcToSec(scene.start_timecode);
    const timeEl = document.getElementById("scrubber-time");
    const sceneEl = document.getElementById("scrubber-scene");
    const phaseEl = document.getElementById("scrubber-phase");
    const progEl = document.getElementById("scrubber-progress");
    if (timeEl) timeEl.textContent = fmtTime(sec);
    if (sceneEl) sceneEl.textContent = scene.scene_title;
    if (phaseEl) {
      const w = scene.world;
      phaseEl.textContent = w === "reality" || w === "reality_memory" ? "Reality" : "Dream";
    }
    if (progEl) progEl.style.width = `${(sec / TOTAL_RUNTIME_SEC) * 100}%`;
    // visual ping
    const root = viz.querySelector(".id-viz");
    root.classList.remove("is-pinged");
    void root.offsetWidth;
    root.classList.add("is-pinged");
  }

  // Steps: scrollama drives `reveal` count + dissolve flag + caption.
  // Step indices align with .step elements in index.html.
  const stepStates = [
    { reveal: 0,   dissolved: false, caption: "Two actresses · two opposite selves · one Diane" },
    { reveal: 50,  dissolved: false, caption: "Betty fills · the dream is on" },
    { reveal: 77,  dissolved: false, caption: "77 squares of the film are dream — about 1h 53m" },
    { reveal: 80,  dissolved: true,  caption: "Club Silencio · the dream ends · the grid loses formation" },
    { reveal: 100, dissolved: true,  caption: "Diane fills the rest · Camilla flickers in only 13 squares" },
  ];

  function applyState(idx, opts = {}) {
    setActiveStep(idx, opts);
    const state = stepStates[idx] || stepStates[0];
    const root = viz.querySelector(".id-viz");
    root.dataset.revealed = state.reveal;
    root.dataset.dissolved = state.dissolved ? "1" : "0";
    if (caption) caption.textContent = state.caption;

    // Update each cell's revealed flag + transform
    const cells = viz.querySelectorAll(".id-cell");
    cells.forEach((cell) => {
      const idxN = +cell.dataset.cellIdx;
      const revealed = idxN < state.reveal;
      cell.dataset.revealed = revealed ? "1" : "0";

      const post = idxN >= BREAK_SQUARE;
      if (state.dissolved && post) {
        const j = jitter[idxN];
        const dx = j.dx * 18, dy = j.dy * 14, rot = j.rot;
        const scale = 0.78 + Math.abs(j.dx) * 0.22;
        cell.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`;
      } else {
        cell.style.transform = "";
      }
    });
  }

  applyState(0, { silent: true });

  const scroller = scrollama();
  scroller
    .setup({ step: `#${sectionEl.id} .step`, offset: 0.6 })
    .onStepEnter(({ index }) => applyState(index));

  window.addEventListener("resize", () => scroller.resize());
}
