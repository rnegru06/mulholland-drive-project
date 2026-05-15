"""
Audio analysis for Mulholland Drive scrollytelling project.

Extracts audio from the source MP4 with ffmpeg, then walks the
waveform in fixed time windows to produce a per-interval CSV with:
  - RMS energy (volume)
  - silence flag (energy below threshold)
  - spectral_centroid_hz (rough music-vs-speech indicator)
  - zero_crossing_rate (speech tends to be lower; music varies)
  - scene_id (looked up against scenes.csv)

This data powers a "sound density" track for the "The Break" section,
showing where music swells, where silence sits, and where dialogue lives.

REQUIREMENTS:
    brew install ffmpeg
    pip install librosa numpy soundfile

USAGE:
    python analysis/extract_audio.py \\
        --video raw/mulholland_drive.mp4 \\
        --scenes data/scenes.csv \\
        --output data/audio.csv \\
        --interval 2.0

OUTPUT (data/audio.csv):
    timestamp_sec, rms_energy, is_silent, spectral_centroid_hz,
    zero_crossing_rate, scene_id
"""

import argparse
import csv
import shutil
import subprocess
import sys
from pathlib import Path


def extract_audio(video_path: Path, wav_path: Path, sample_rate: int = 16000) -> None:
    """Extract a mono WAV from the video using ffmpeg."""
    if wav_path.exists():
        print(f"Audio already extracted at {wav_path} — skipping ffmpeg")
        return
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found in PATH. Install: brew install ffmpeg")
    print(f"Extracting audio: {video_path} -> {wav_path}")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vn", "-ac", "1", "-ar", str(sample_rate), "-f", "wav",
            str(wav_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def timecode_to_seconds(tc: str) -> float:
    tc = tc.strip().replace(",", ".")
    parts = tc.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(parts[0])


def load_scenes(scenes_csv: Path):
    scenes = []
    with open(scenes_csv, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                scenes.append({
                    "scene_id": row["scene_id"],
                    "start": timecode_to_seconds(row["start_timecode"]),
                    "end": timecode_to_seconds(row["end_timecode"]),
                })
            except (KeyError, ValueError):
                continue
    return scenes


def scene_for(t: float, scenes) -> str:
    for s in scenes:
        if s["start"] <= t < s["end"]:
            return s["scene_id"]
    return ""


def analyze(wav_path: Path, interval: float, silence_db: float):
    """Yield one dict per interval window."""
    try:
        import librosa
        import numpy as np
    except ImportError:
        sys.exit("librosa not installed. Run: pip install librosa numpy soundfile")

    print(f"Loading {wav_path} (this may take a minute for a feature film)...")
    y, sr = librosa.load(str(wav_path), sr=None, mono=True)
    total_sec = len(y) / sr
    print(f"Loaded {total_sec:.1f}s at {sr} Hz; window={interval}s")

    window_samples = int(interval * sr)
    silence_threshold = librosa.db_to_amplitude(silence_db)

    n_windows = len(y) // window_samples
    for i in range(n_windows):
        start = i * window_samples
        end = start + window_samples
        chunk = y[start:end]
        if chunk.size == 0:
            continue

        rms = float(np.sqrt(np.mean(chunk.astype(np.float32) ** 2)))
        is_silent = rms < silence_threshold

        if rms > 0:
            centroid = float(np.mean(librosa.feature.spectral_centroid(y=chunk, sr=sr)))
            zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=chunk)))
        else:
            centroid = 0.0
            zcr = 0.0

        yield {
            "timestamp_sec": round(i * interval, 3),
            "rms_energy": round(rms, 6),
            "is_silent": int(is_silent),
            "spectral_centroid_hz": round(centroid, 2),
            "zero_crossing_rate": round(zcr, 6),
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", default="raw/mulholland_drive.mp4")
    parser.add_argument("--wav", default="raw/mulholland_drive.wav",
                        help="Intermediate WAV path (cached after first run)")
    parser.add_argument("--scenes", default="data/scenes.csv")
    parser.add_argument("--output", default="data/audio.csv")
    parser.add_argument("--interval", type=float, default=2.0,
                        help="Seconds per analysis window")
    parser.add_argument("--silence_db", type=float, default=-40.0,
                        help="Energy threshold below which the window counts as silent")
    args = parser.parse_args()

    video_path = Path(args.video)
    wav_path = Path(args.wav)
    scenes_csv = Path(args.scenes)
    output_path = Path(args.output)

    if not video_path.exists():
        sys.exit(f"Video not found: {video_path}")

    extract_audio(video_path, wav_path)
    scenes = load_scenes(scenes_csv) if scenes_csv.exists() else []
    if scenes:
        print(f"Loaded {len(scenes)} scenes for tagging")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "timestamp_sec", "rms_energy", "is_silent",
        "spectral_centroid_hz", "zero_crossing_rate", "scene_id",
    ]
    rows = 0
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for record in analyze(wav_path, args.interval, args.silence_db):
            record["scene_id"] = scene_for(record["timestamp_sec"], scenes)
            writer.writerow(record)
            rows += 1

    print(f"Wrote {rows} audio windows to {output_path}")


if __name__ == "__main__":
    main()
