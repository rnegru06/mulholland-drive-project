# Mulholland Drive Scrollytelling — Design Brief

A self-contained prompt you can paste into any Claude session (claude.ai chat,
Claude Code in another repo, API) to continue or redesign this project.

> Paste everything below the line into the chat. If using claude.ai with
> Artifacts, the assistant can render HTML/CSS/JS previews inline. If using
> Claude Code, give it access to the project directory.

---

# Project: Mulholland Drive scrollytelling site

I'm building a data-driven scrollytelling website analyzing David Lynch's
*Mulholland Drive* (2001) for the [CAUSEweb data scrollytelling
competition](https://www.causeweb.org/cause/contests/data-scrollytelling).
Examples I'm modeling on:

- https://pudding.cool/2023/09/invisible-epidemic/ — sticky time scrubber
- https://too-many-bananas.github.io/cause-scrollytelling-2025/ — grid-fill

## Tech stack

- Vanilla HTML / CSS / JS (no build step, no framework)
- **D3.js v7** via CDN for visualizations
- **Scrollama.js v3** via CDN for scroll-step detection
- ES modules, served over `python3 -m http.server`
- Deployed via GitHub Pages
- Google Fonts: Playfair Display (serif headings/body), JetBrains Mono (labels)

## Site structure

```
HERO  — "What if you could map dreams?"
  ↓
PART I — WATCH THE FILM
   ├─ Dream walkthrough  (scenes 1, 2, 3, 5, 9, 10, 17, 19, 22, 23)
   ├─ TWIST: Club Silencio  ("No hay banda")
   ├─ TWIST: Blue box opens  (theme flips dream→reality)
   └─ Reality walkthrough (scenes 26, 28, 29, 33, 34, 35, 36, 37)
  ↓
PART II — READ THE DATA
   ├─ Two Timelines  (presented vs chronological order)
   ├─ Two Worlds     (color river: 4,394 frames)
   ├─ Identity Dissolution  (Betty↔Diane, Rita↔Camilla)
   ├─ Symbols as Breadcrumbs  (30 motifs across the runtime)
   ├─ The Break     (multi-line shock chart: shots × saturation × audio)
   └─ Rewatching With Knowledge  (dual-coded scene annotations)
  ↓
CONCLUSION + HYPOTHESIS
```

A sticky scrubber bar at the top shows `HH:MM:SS · Scene Title · Phase` and a
2-pixel progress strip the width of `currentFilmSec / 8787s`. The scrubber
updates from `data-film-sec` and `data-scene-title` attributes on each step.

## Design system

```css
/* Film-grounded palette — sampled from the film's signature scenes */
--bg-deep:        #0a0d18  /* Mulholland night */
--bg-paper:       #14161f
--fg:             #ece6d5  /* warm off-white, like Betty's blouse */
--fg-dim:         #8a8275
--fg-mute:        #5a5444
--rule:           rgba(236, 230, 213, 0.10)

--dream-blue:     #3b5fa4  /* the blue box / Club Silencio */
--reality-red:    #9b2926  /* the red lampshade / oxblood */
--memory-gold:    #d4a155  /* jitterbug stage */
--hollywood-pink: #dba8b9  /* Betty's courtyard apartment */
--silencio-cyan:  #4f8fb0  /* audio-track accent */
```

When the `<body>` gets `data-world="dream|reality|memory|hollywood"`, the
`--accent` CSS variable re-points. All theme-sensitive elements transition
via `transition: color/background 900ms cubic-bezier(0.22,1,0.36,1)`. A
fixed-position overlay does a horizontal sweep animation at every
dream→reality boundary.

### Layout pattern

Each `<section class="scrolly">` is a 2-column CSS grid:

```
| sticky viz (1.4fr) | scrolling step cards (1fr) |
```

- Viz column: `position: sticky; top: var(--scrubber-h); height: calc(100vh - scrubber-h)`
- Step cards have their own backdrop so they're readable independent of the viz
- Active step gets an accent-colored left border + full opacity

### Typography

- Headings: Playfair Display 800, `font-size: clamp(...)`, italic accent words
- Body: Playfair Display 400, line-height 1.6
- Labels / data / timestamps: JetBrains Mono, 0.7–0.85rem, letter-spacing 0.12–0.22em, often uppercase
- Italic quotes: serif italic, set off from the surrounding body

### Aesthetic targets

- Dark, cinematic — feels like a 4 AM screening room
- Theme transitions feel like the film passing through a cut
- Numbers feel like terminal output (mono, restrained, lots of letter-spacing)
- Body feels like a longread (serif, warm off-white, comfortable measure)

## Data sources

All bundled into a single `data/viz_data.json` (~1.65 MB) with these keys
(counts indicative):

| Key | Rows | What it is |
|---|---|---|
| `scenes` | 37 | per-scene metadata: title, timecode, location, world, characters, key objects, description, notes |
| `characters` | 25 | actor → dream-persona/reality-persona mapping + scene counts |
| `symbols` | 30 | motif/object/prop appearances across scenes |
| `timeline` | 37 | presented-order ↔ chronological-order mapping |
| `dialogue` | 1,003 | every spoken line with timestamp + scene_id |
| `colors` | 4,394 | dominant frame color every 2s + brightness + saturation |
| `shots_per_shot` | 2,557 | from Cinemetrics — per-shot length, character/type, timestamp |
| `audio` | 4,393 | librosa per-2s window: RMS energy, silence flag, spectral centroid, ZCR |

Aggregate facts to call out in copy: `37 scenes`, `1,003 dialogue lines`,
`2,557 cuts`, `4,394 color frames`, mean saturation `0.27 → 0.18` across the
break, Betty `18 scenes` vs Diane `11`, Rita `16` vs Camilla `5`.

## Coding conventions

- **No build step.** Plain HTML/CSS/JS, ES modules, CDN imports.
- **No frameworks.** No React, no Vue, no Svelte. The whole site is ~6 module files.
- **No emojis** anywhere unless explicitly added.
- **No multi-line JS comment blocks** — short single-line comments only when the *why* isn't obvious.
- **D3 idioms.** Use `d3.scaleLinear`, `d3.line`, `d3.selection.join` / enter/update/exit. Keep `viewBox` responsive; recalc layout on `resize` (debounced 150ms).
- **Scrollama idioms.** One scroller per section. Use `offset: 0.55` for step activation. Re-`resize()` after layout changes.
- **Theme handoff.** Each `.step` has `data-world="dream|reality|memory|hollywood"`. The main orchestrator (`js/main.js`) reads this on step-enter and calls `setWorld()`. Sections do not call `setWorld` directly.

## What's done

✅ All 8 sections render and load data
✅ Color palette + side-by-side layout + sticky scrubber
✅ Two walkthrough sections (dream / reality) with scene posters
✅ Two plot-twist beats (Silencio, blue box)
✅ Opening Hook: dual D3 timeline with 5 scroll-driven progressive reveals
✅ Two Worlds: 4,394-bar color river with break marker + dream/reality stat overlays
✅ The Break: multi-line shock chart (shot length × saturation × audio energy) with break-line
✅ Conclusion + hypothesis section with 6 data points

## What's still stubby (the work to do next)

| Section | Current state | What to build |
|---|---|---|
| **Identity Dissolution** | Two horizontal bars for Betty/Diane and Rita/Camilla | 10×10 grid (100 squares) that fills as Betty's screen time accumulates, then a mirrored grid for Rita. Square color = world at that moment. |
| **Symbols as Breadcrumbs** | List of top 6 motifs by count | Horizontal timeline (147 min) with icon markers at each `scenes_appearing` point. Symbols cluster visibly right before the break. Hover/click reveals interpretation. |
| **Rewatching With Knowledge** | 3 sample scenes with first-watch / on-rewatch annotations | A scrolling annotated walk through the 12 chronologically-real scenes, showing what you thought you saw vs what it meant. |
| **Plot twist beats** | Static "card" with glitch animation | Add scroll-progress-driven layered effects: text fades, color drains, optional audio cue at Silencio, the smoke-puff at the blue box. |
| **Mobile** | Works but not refined | Tighten typography sizing, make scene-poster smaller, drop scrubber phase chip below 600px. |

## File layout

```
website/
├── index.html                  — 8 scrolly sections, hero, twists, conclusion
├── css/styles.css              — design system + section styles
├── js/
│   ├── main.js                 — fetches viz_data.json, orchestrates sections
│   ├── theme.js                — setWorld() + sweep animation
│   ├── scrubber.js             — sticky timestamp + progress bar
│   └── sections/
│       ├── walkthrough.js      — scene-poster renderer (used by both walkthroughs)
│       ├── opening.js          — dual timeline (D3)
│       ├── two-worlds.js       — color river (D3)
│       ├── identity.js         — STUB (replace with 10×10 grid)
│       ├── symbols.js          — STUB (replace with timeline)
│       ├── break.js            — multi-line chart (D3)
│       └── rewatching.js       — STUB (replace with dual-coded walk)
└── data/viz_data.json          — the bundle
```

## What I want from you

Treat me as the product owner. When I ask you to build a section, follow
these conventions and *match the design system above*. If a visual choice
isn't covered, default toward dark/cinematic/film-grounded. Don't introduce
emoji, frameworks, or comments-for-the-sake-of-comments. Don't replace the
color palette without checking. Don't break the scrubber's data flow.

Suggested first task: implement the **Identity Dissolution** section. Use
`data.characters` from `viz_data.json`. The viz is a 10×10 grid of squares
(100 squares total). As the user scrolls past steps, the grid fills with
filled squares — colored blue for Betty's scenes, red for Diane's scenes —
in proportion to scene counts. Mirror it for a second grid showing
Rita/Camilla. Use D3's `data().join()` pattern. Animate the fill over 800ms
with `cubic-bezier(0.22, 1, 0.36, 1)` easing.
