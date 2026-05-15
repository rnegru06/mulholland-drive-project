# Mulholland Drive Scrollytelling Project — Data Roadmap

## Where you are right now

You have gathered an excellent foundation:

| Source | What it gives you | Status |
|---|---|---|
| Your uploaded scene-by-scene breakdown (37 scenes) | Deep symbolic + narrative analysis per scene | **You have this** |
| Script-O-Rama transcript | Actual film dialogue (includes Winkie's, Castigliane, Silencio scenes) | **You have this URL** |
| The Script Savant pilot script PDF | 1999 ABC pilot version (~75% of film) | **You have this URL** |
| Gonzalez-Requena scene breakdown PDF | Academic shot/scene catalog | **You have this URL** |
| Cinemetrics Esselaar dataset (1303 shots) | Shot lengths divided by **plot line/character** | **You have this URL** |
| Cinemetrics Sonneveld dataset (1254 shots) | Shot lengths divided by **shot type** | **You have this URL** |
| mulholland-drive.net timeline | Presented order vs chronological mapping | **You have this URL** |
| mulholland-drive.net studies | Character profiles, symbols, locations, properties | **You have this URL** |

This is genuinely strong - more sources than most students gather.

---

## Files I built for you to start filling in

```
mulholland-data/
├── data/
│   ├── scenes.csv                     ← seeded with all 37 scenes
│   ├── characters.csv                 ← seeded with 25 characters + dream/reality identity
│   ├── symbols.csv                    ← seeded with 30 motifs/objects
│   ├── timeline_mapping.csv           ← presented order ↔ chronological order
│   └── shot_stats_summary.csv         ← from cinemetrics
├── scripts/
│   ├── extract_colors.py              ← run on extracted video frames
│   ├── parse_srt.py                   ← turn .srt subtitles into dialogue.csv
│   └── csv_to_json.py                 ← bundle everything for D3.js
└── ROADMAP.md                         ← this file
```

The CSVs are **pre-populated with real data** from your scene breakdown and the analyses on mulholland-drive.net. Fields marked with rough values (timecodes, durations) are estimates you'll refine.

---

## Step-by-step plan: what to do next

### STEP 1 — Lock down your scene timing (essential, ~3 hours)

You need a legally obtained copy of the film. Open it in VLC and walk through the 37 scenes in `scenes.csv`. Confirm or correct:
- `start_timecode` (HH:MM:SS)
- `end_timecode`
- `duration_sec`

VLC tip: hit `e` to advance frame-by-frame, `Ctrl-T` to jump to a timestamp.

The pre-filled timecodes are educated estimates from the analysis docs - they'll be close but you should verify. Without accurate timecodes you can't sync any other data.

### STEP 2 — Get film dialogue with timestamps (essential, ~1 hour)

The text-only transcript from script-o-rama doesn't have timestamps. You need an .srt subtitle file.

1. Visit **opensubtitles.org**, search "Mulholland Drive 2001"
2. Download an English .srt file (pick one with high download count for accuracy)
3. Run:
   ```bash
   cd mulholland-data
   python scripts/parse_srt.py path/to/mulholland_drive.srt \
       --scenes data/scenes.csv \
       --output data/dialogue.csv
   ```

This gives you `dialogue.csv` with every line timestamped AND tagged with its scene_id. Now you can ask questions like "how much dialogue happens in dream vs reality" or "which scenes are silent".

### STEP 3 — Extract colors from video frames (high-impact, ~2 hours including processing time)

This produces the most visually striking dataset for your scrollytelling.

1. Install FFmpeg (`brew install ffmpeg` on Mac, or download from ffmpeg.org)
2. Extract one frame every 2 seconds:
   ```bash
   mkdir frames
   ffmpeg -i mulholland_drive.mp4 -vf fps=1/2 frames/frame_%05d.png
   ```
   For a 147-min film at 1 frame/2sec that's ~4400 frames. (Use `fps=1/5` for ~1700 frames if processing is slow.)

3. Install Python packages:
   ```bash
   pip install opencv-python numpy scikit-learn
   ```

4. Run the extractor:
   ```bash
   python scripts/extract_colors.py --frames_dir frames/ \
       --output data/colors.csv --fps_inverse 2.0
   ```

You now have a CSV with the dominant color, brightness, and saturation at every 2-second interval throughout the film. This is the data that powers a "color river" visualization showing how the palette shifts between dream and reality.

### STEP 4 — Pull cinemetrics shot data into your CSVs (~30 min)

The cinemetrics URLs give you summary statistics. To get the underlying per-shot data:

1. Visit each cinemetrics URL
2. Download the raw measurement (look for the "Loading..." section - there's usually a download icon or you can use browser dev tools to grab the underlying JSON)
3. The data has one row per shot with: shot duration, start time, and either character (Esselaar) or shot type (Sonneveld)

If the download isn't easy, an alternative is to use the page's summary stats which I've put in `shot_stats_summary.csv` - these alone are enough for a "shot length comparison" chart.

### STEP 5 — Refine character and symbol data (~2 hours)

Open `characters.csv` and `symbols.csv` and:
- Verify `total_scenes_dream` and `total_scenes_reality` counts as you watch the film
- Verify `scenes_appearing` for each symbol
- Add any missing characters or symbols you spot
- Pull additional details from mulholland-drive.net character pages (each character has their own page with deep notes)

### STEP 6 — Bundle into JSON (5 min, run after each data update)

```bash
python scripts/csv_to_json.py --data_dir data/ --output viz_data.json
```

Now you have one `viz_data.json` file your D3.js code can `fetch()` to power every visualization.

---

## What's still missing (and how to fill the gap)

### A. Audio/sound data (NICE TO HAVE)
- What you don't have: silence durations, music presence, ambient sound
- How to get it: Extract audio with FFmpeg (`ffmpeg -i film.mp4 -vn audio.wav`), then run librosa for silence detection. Worth doing if you want a "sound density" track. Skip if time is tight.

### B. Per-shot data (NICE TO HAVE)
- What you don't have: a row per shot with shot type, length, scene
- The cinemetrics URLs have aggregate stats but raw shot data may need scraping
- Alternative: manually code 50-100 representative shots; that's enough for a sample-based visualization

### C. Viewer interpretation survey (UNIQUE ANGLE)
- You don't have this yet, but it would set your project apart
- 5-minute Google Form, ask: "On first watch, when did you realize what was happening?", "Which scene confused you most?", "What did you think the blue box represented?"
- Post in r/davidlynch, r/TrueFilm, your school - 50 responses is plenty
- This becomes a unique data layer the Pudding-style essays don't have

### D. Comparison data (OPTIONAL CONTEXT)
- Other Lynch films' dream/reality ratios, for context
- Other "puzzle films" (Memento, Inception, Eternal Sunshine) - shot length comparisons
- IMDB/Rotten Tomatoes ratings - reception data

---

## My recommended priority order if you have ~2 weeks

**Week 1**
- Day 1-2: Refine scenes.csv timecodes (Step 1)
- Day 3: Get .srt and run parse_srt.py (Step 2)
- Day 4-5: Run color extraction (Step 3) — let it process overnight if needed

**Week 2**
- Day 6-7: Polish characters.csv and symbols.csv against the film (Step 5)
- Day 8: Optional — run viewer survey (Section C above)
- Day 9-10: Build first scrollytelling prototype with bundled JSON

---

## Quick sanity check on your data

After running everything, you should have:
- `scenes.csv`: 37 rows, every row with valid timecodes
- `dialogue.csv`: 800-1,200 lines (typical for this film), each tagged with scene_id
- `colors.csv`: 4,000+ rows if you used 2-sec intervals
- `characters.csv`: 25+ rows
- `symbols.csv`: 30+ rows

If any are dramatically smaller, something went wrong - investigate before moving on.

---

## How this maps to your scrollytelling sections

From the original strategy:

| Section | Primary data file | Visualization type |
|---|---|---|
| Opening: Two timelines | timeline_mapping.csv | Diverging path |
| Two Worlds | scenes.csv + colors.csv | Split-screen w/ color palettes |
| Identity Dissolution | characters.csv | Sankey or filled-square grid |
| Symbols as Breadcrumbs | symbols.csv + scenes.csv | Timeline scatter |
| The Break | colors.csv + dialogue.csv | Multi-line shock chart |
| Rewatching | All combined | Annotated re-scroll |

You now have the data foundation for every one of these.
