# Mulholland Drive Project

A data-driven scrollytelling analysis of David Lynch's *Mulholland Drive* (2001),
built for the [CAUSEweb data scrollytelling competition](https://www.causeweb.org/cause/contests/data-scrollytelling).

The site walks the reader through the film scene-by-scene — first the dream,
then the plot twist, then the reality — and then opens up six analytical
sections that map the film's structure with real data: shot lengths, color
saturation, dialogue density, silence, character screen time, scene order,
and symbol recurrence.

## Repo layout

```
mulholland-drive-project/
├── website/                    Deployable scrollytelling site (HTML/CSS/JS)
│   ├── index.html              All copy, all sections, all scaffolding
│   ├── css/                    styles.css + per-section CSS (opening, identity, tweaks)
│   ├── js/                     Main entry + Scrollama orchestration + D3 visualizations
│   └── data/viz_data.json      Bundled dataset the frontend fetches at load
│
├── Mulholland Drive Data/      Data pipeline (extractors + intermediate CSVs)
│   ├── analysis/               Python scripts:
│   │                             extract_colors.py — OpenCV K-means on frames
│   │                             extract_audio.py — ffmpeg + librosa
│   │                             parse_srt.py — subtitles → timestamped dialogue
│   │                             scrape_cinemetrics.py — pulls per-shot data
│   │                             csv_to_json.py — bundles every CSV into viz_data.json
│   ├── data/                   The CSVs the scripts produce
│   ├── processed/viz_data.json The bundle (copied into website/data/ at deploy)
│   └── raw/                    Source materials (subtitle.srt, scripts, breakdowns)
│                               NOTE: the .mp4, .wav, and frames/ folder are
│                               gitignored (1.35 GB combined). Use ffmpeg to
│                               regenerate frames + wav from your own legally
│                               obtained copy of the film. [copyright reasons]
└──
```

## Regenerating the data bundle

If you change any of the CSVs in `Mulholland Drive Data/data/`, re-bundle:

```bash
cd "Mulholland Drive Data"
python3 analysis/csv_to_json.py --data_dir data/ --output processed/viz_data.json
cp processed/viz_data.json ../website/data/viz_data.json
```

## Regenerating from source media

The film, extracted audio, and 4,394 PNG frames are gitignored because of
size. To recreate them:

```bash
# 1. Drop your legally obtained mulholland_drive.mp4 in Mulholland Drive Data/raw/
# 2. Extract one frame every 2 seconds:
ffmpeg -i "Mulholland Drive Data/raw/mulholland_drive.mp4" \
       -vf fps=1/2 "Mulholland Drive Data/raw/frames/frame_%05d.png"

# 3. Extract a mono WAV and run audio analysis:
python3 "Mulholland Drive Data/analysis/extract_audio.py" \
        --video "Mulholland Drive Data/raw/mulholland_drive.mp4" \
        --scenes "Mulholland Drive Data/data/scenes.csv" \
        --output "Mulholland Drive Data/data/audio.csv"

# 4. Run color extraction on the frames:
python3 "Mulholland Drive Data/analysis/extract_colors.py" \
        --frames_dir "Mulholland Drive Data/raw/frames/" \
        --output "Mulholland Drive Data/data/colors.csv"
```

## Data sources

- Scene-by-Scene Narrative Breakdown (uploaded analysis doc from the mulholland-drive.net website - all rights reserved to the creator)
- Cinemetrics shot data: [Esselaar 2014](https://cinemetrics.uchicago.edu/movie/59ca9e2d-c6de-47c8-9e71-3287c9392d7a) (by plot line) · [Sonneveld 2009](https://cinemetrics.uchicago.edu/movie/476522f6-03a8-44b3-b8b5-32bcebc208e8) (by shot type)
- OpenSubtitles SRT for timestamped dialogue
- librosa audio analysis (silence, RMS energy, spectral centroid)
- OpenCV color extraction (dominant frame color, brightness, saturation)
- [mulholland-drive.net](https://www.mulholland-drive.net/studies/studies.htm) studies (character profiles, locations, symbols, timeline)
