"""
SRT subtitle parser for Mulholland Drive scrollytelling project.

Converts a .srt subtitle file into a structured CSV with timestamps that
can be joined to your scenes.csv. SRT files give you precise timing for
every line of dialogue - perfect data for scrollytelling.

USAGE:
    python parse_srt.py mulholland_drive.en.srt --scenes scenes.csv \\
        --output dialogue.csv

The script will optionally tag each line with a scene_id by matching
the timestamp to the start_timecode/end_timecode in scenes.csv.

OUTPUT FORMAT (dialogue.csv):
    line_id, start_time, end_time, start_seconds, duration_seconds,
    dialogue, scene_id (if scenes.csv provided)
"""

import argparse
import csv
import re
from pathlib import Path


def timecode_to_seconds(tc):
    """Convert 'HH:MM:SS,mmm' or 'HH:MM:SS' to total seconds (float)."""
    tc = tc.strip().replace(',', '.')
    parts = tc.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    else:
        return float(parts[0])


def parse_srt(srt_path):
    """Parse an SRT file into list of dicts."""
    with open(srt_path, 'r', encoding='utf-8-sig') as f:
        content = f.read()

    # Split by blank line separators (handles \r\n and \n)
    blocks = re.split(r'\n\s*\n', content.strip())

    entries = []
    timing_re = re.compile(
        r'(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})'
    )

    for i, block in enumerate(blocks, start=1):
        lines = [ln.strip() for ln in block.strip().splitlines() if ln.strip()]
        if len(lines) < 2:
            continue

        # First line is index, second is timing, rest is dialogue
        try:
            idx = int(lines[0])
        except ValueError:
            idx = i

        timing_match = timing_re.search(lines[1] if len(lines) > 1 else '')
        if not timing_match:
            # Maybe timing is on first line (some malformed files)
            timing_match = timing_re.search(lines[0])
            if timing_match:
                dialogue_lines = lines[1:]
            else:
                continue
        else:
            dialogue_lines = lines[2:]

        start_str, end_str = timing_match.group(1), timing_match.group(2)
        start_sec = timecode_to_seconds(start_str)
        end_sec = timecode_to_seconds(end_str)

        # Clean dialogue: remove HTML tags, formatting
        dialogue = ' '.join(dialogue_lines)
        dialogue = re.sub(r'<[^>]+>', '', dialogue)  # strip tags
        dialogue = re.sub(r'\{[^}]+\}', '', dialogue)  # strip {y:i} etc
        dialogue = dialogue.strip()

        entries.append({
            'line_id': idx,
            'start_time': start_str.replace(',', '.'),
            'end_time': end_str.replace(',', '.'),
            'start_seconds': round(start_sec, 3),
            'duration_seconds': round(end_sec - start_sec, 3),
            'dialogue': dialogue,
        })

    return entries


def load_scenes(scenes_csv):
    """Load scenes.csv and parse start/end timecodes into seconds."""
    scenes = []
    with open(scenes_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                start = timecode_to_seconds(row['start_timecode'])
                end = timecode_to_seconds(row['end_timecode'])
                scenes.append({
                    'scene_id': row['scene_id'],
                    'start_sec': start,
                    'end_sec': end,
                })
            except (KeyError, ValueError):
                continue
    return scenes


def assign_scene_id(line_start_sec, scenes):
    """Find which scene a line belongs to based on its timestamp."""
    for scene in scenes:
        if scene['start_sec'] <= line_start_sec < scene['end_sec']:
            return scene['scene_id']
    return ''


def main():
    parser = argparse.ArgumentParser(description="Parse SRT subtitles to CSV")
    parser.add_argument('srt_file', help='Input .srt file')
    parser.add_argument('--scenes', default=None,
                        help='Optional scenes.csv to tag each line with scene_id')
    parser.add_argument('--output', default='dialogue.csv', help='Output CSV path')
    args = parser.parse_args()

    print(f"Parsing {args.srt_file}...")
    entries = parse_srt(args.srt_file)
    print(f"Found {len(entries)} dialogue lines")

    if args.scenes:
        scenes = load_scenes(args.scenes)
        print(f"Loaded {len(scenes)} scenes from {args.scenes}")
        for e in entries:
            e['scene_id'] = assign_scene_id(e['start_seconds'], scenes)

    if entries:
        keys = list(entries[0].keys())
        with open(args.output, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(entries)
        print(f"Wrote {len(entries)} lines to {args.output}")


if __name__ == '__main__':
    main()
