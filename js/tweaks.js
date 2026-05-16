/**
 * Tweaks panel — three expressive controls that reshape the feel of the
 * Mulholland Drive scrollytelling site.
 *
 *   Mood   — palette + ambience preset (cinematic | editorial | noir)
 *   Voice  — type pairing preset       (cinematic | editorial | pulp)
 *   Tempo  — vertical rhythm multiplier (0.55 → 1.6, default 1.0)
 *
 * Each tweak is applied by setting an attribute or CSS custom property on
 * <html> — all the actual visual work happens in css/tweaks.css.
 *
 * Host protocol:
 *   - On load: register message listener, then post __edit_mode_available
 *   - Receive  __activate_edit_mode / __deactivate_edit_mode to toggle visibility
 *   - On every change: post __edit_mode_set_keys so the host can persist edits
 *   - On close button: post __edit_mode_dismissed
 */

const DEFAULTS = (window.MD_TWEAKS && typeof window.MD_TWEAKS === "object")
  ? window.MD_TWEAKS
  : { mood: "cinematic", voice: "cinematic", tempo: 1.0 };

let state = {
  mood: DEFAULTS.mood || "cinematic",
  voice: DEFAULTS.voice || "cinematic",
  tempo: typeof DEFAULTS.tempo === "number" ? DEFAULTS.tempo : 1.0,
};

const root = document.documentElement;

function apply(s) {
  root.dataset.mood = s.mood;
  root.dataset.voice = s.voice;
  root.style.setProperty("--tempo", String(s.tempo));
}

function safePost(msg) {
  try { window.parent.postMessage(msg, "*"); } catch (_) { /* not in host */ }
}

function set(partial) {
  state = { ...state, ...partial };
  apply(state);
  syncUI();
  safePost({ type: "__edit_mode_set_keys", edits: partial });
}

/* ---------- Panel ---------- */

let panel = null;

function buildPanel() {
  panel = document.createElement("aside");
  panel.id = "tweaks-panel";
  panel.dataset.open = "0";
  panel.setAttribute("aria-label", "Tweaks");
  panel.innerHTML = `
    <header class="tw-head">
      <span class="tw-title">Tweaks</span>
      <button class="tw-close" type="button" aria-label="Close tweaks">×</button>
    </header>

    <section class="tw-section">
      <p class="tw-label">Mood <span class="tw-hint">palette &amp; ambience</span></p>
      <div class="tw-segments" data-key="mood" role="group" aria-label="Mood">
        <button type="button" data-value="cinematic">Cinematic</button>
        <button type="button" data-value="editorial">Editorial</button>
        <button type="button" data-value="noir">Noir</button>
      </div>
    </section>

    <section class="tw-section">
      <p class="tw-label">Voice <span class="tw-hint">type pairing</span></p>
      <div class="tw-segments" data-key="voice" role="group" aria-label="Voice">
        <button type="button" data-value="cinematic">Cinematic</button>
        <button type="button" data-value="editorial">Editorial</button>
        <button type="button" data-value="pulp">Pulp</button>
      </div>
    </section>

    <section class="tw-section">
      <p class="tw-label">Tempo <span class="tw-hint">how much it breathes</span></p>
      <div class="tw-slider">
        <input type="range" min="0.55" max="1.6" step="0.05" aria-label="Tempo" />
        <div class="tw-slider__scale"><span>tight</span><span>standard</span><span>cinematic</span></div>
        <span class="tw-slider__val">1.00×</span>
      </div>
    </section>

    <footer class="tw-foot">
      <div class="tw-presets">
        <button class="tw-preset" type="button" data-preset="pudding">Pudding</button>
        <button class="tw-preset" type="button" data-preset="vanity">Vanity Fair</button>
      </div>
      <button class="tw-reset" type="button">Reset</button>
    </footer>
  `;
  document.body.appendChild(panel);

  // Segment buttons (Mood / Voice)
  panel.querySelectorAll(".tw-segments").forEach((group) => {
    const key = group.dataset.key;
    group.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => set({ [key]: btn.dataset.value }));
    });
  });

  // Tempo slider — live drag + commit
  const slider = panel.querySelector('input[type="range"]');
  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    set({ tempo: v });
  });

  // Curated combo presets
  const PRESETS = {
    pudding:  { mood: "editorial", voice: "editorial", tempo: 0.75 },
    vanity:   { mood: "cinematic", voice: "pulp",      tempo: 1.25 },
  };
  panel.querySelectorAll(".tw-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = PRESETS[btn.dataset.preset];
      if (p) set(p);
    });
  });

  panel.querySelector(".tw-close").addEventListener("click", () => {
    hide();
    safePost({ type: "__edit_mode_dismissed" });
  });
  panel.querySelector(".tw-reset").addEventListener("click", () => {
    set({ mood: "cinematic", voice: "cinematic", tempo: 1.0 });
  });
}

function syncUI() {
  if (!panel) return;
  panel.querySelectorAll(".tw-segments").forEach((group) => {
    const key = group.dataset.key;
    group.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.value === state[key]);
    });
  });
  const slider = panel.querySelector('input[type="range"]');
  if (slider && parseFloat(slider.value) !== state.tempo) slider.value = String(state.tempo);
  const valEl = panel.querySelector(".tw-slider__val");
  if (valEl) valEl.textContent = `${state.tempo.toFixed(2)}×`;
}

function show() {
  if (!panel) buildPanel();
  syncUI();
  panel.dataset.open = "1";
}
function hide() {
  if (panel) panel.dataset.open = "0";
}

/* ---------- Wire-up ---------- */

// Apply persisted state on load (before host activate message)
apply(state);

// Listener FIRST, then announce availability
window.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || typeof d !== "object") return;
  if (d.type === "__activate_edit_mode")   show();
  if (d.type === "__deactivate_edit_mode") hide();
});

safePost({ type: "__edit_mode_available" });
