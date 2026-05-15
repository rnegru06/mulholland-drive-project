"""
Scrape per-shot data from Cinemetrics pages for Mulholland Drive.

The Cinemetrics Next.js app embeds the full per-shot dataset in the
RSC streaming payload (self.__next_f.push). We download the HTML,
extract the JSON object containing the `shots` array, and emit a
flat CSV with one row per shot.

USAGE:
    python analysis/scrape_cinemetrics.py --output data/shots_per_shot.csv

OUTPUT (data/shots_per_shot.csv):
    shot_id, dataset, type_name, type_color,
    timestamp_sec, shot_length_sec, moving_average,
    trendline_shot_length
"""

import argparse
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

DATASETS = {
    "esselaar": {
        "url": "https://cinemetrics.uchicago.edu/movie/59ca9e2d-c6de-47c8-9e71-3287c9392d7a",
        "description": "Shot lengths divided by plot line / character (Nikki Esselaar)",
    },
    "sonneveld": {
        "url": "https://cinemetrics.uchicago.edu/movie/476522f6-03a8-44b3-b8b5-32bcebc208e8",
        "description": "Shot lengths divided by shot type (Julie Sonneveld)",
    },
}


def fetch_html(url):
    result = subprocess.run(
        ["curl", "-sSL", "-A", "Mozilla/5.0", url],
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return result.stdout


def find_balanced_array(text, start_idx):
    """
    Given text and an index pointing at '[', find the matching ']'
    while respecting nested brackets and quoted strings.
    Returns the end index (inclusive of ']').
    """
    assert text[start_idx] == "["
    depth = 0
    i = start_idx
    in_string = False
    escaped = False
    while i < len(text):
        c = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == '"':
                in_string = False
        else:
            if c == '"':
                in_string = True
            elif c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise RuntimeError("Unbalanced array")


def extract_shots_payload(html):
    """
    Cinemetrics embeds data in self.__next_f.push(...) streaming chunks.
    The payload is JS-escaped, so we first un-escape the entire HTML,
    then locate `"shots":[ ... ]` and `"shotTypes":[ ... ]` using
    bracket-balanced extraction (regex can't handle nested arrays).
    """
    # Un-escape the streaming payload: \" -> " and \\ -> \
    text = html.replace('\\"', '"').replace('\\\\', '\\')

    def extract_array(key):
        marker = f'"{key}":['
        idx = text.find(marker)
        if idx == -1:
            raise RuntimeError(f'Could not locate "{key}" in HTML')
        bracket_idx = idx + len(marker) - 1
        end_idx = find_balanced_array(text, bracket_idx)
        return text[bracket_idx:end_idx + 1]

    shots_raw = extract_array("shots")
    types_raw = extract_array("shotTypes")

    shots = json.loads(shots_raw)
    type_meta = json.loads(types_raw)

    color_by_name = {}
    for t in type_meta:
        if isinstance(t, dict) and "name" in t and "color" in t:
            color_by_name[t["name"]] = t["color"]

    return shots, color_by_name


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default="data/shots_per_shot.csv",
        help="Output CSV path",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for dataset_name, meta in DATASETS.items():
        print(f"Fetching {dataset_name}: {meta['url']}")
        html = fetch_html(meta["url"])
        shots, colors = extract_shots_payload(html)
        print(f"  -> {len(shots)} shots, {len(colors)} types: {list(colors.keys())}")
        for s in shots:
            rows.append({
                "shot_id": f"{dataset_name}_{s['number']}",
                "dataset": dataset_name,
                "type_name": s.get("type", ""),
                "type_color": colors.get(s.get("type", ""), ""),
                "timestamp_sec": s.get("timestamp", ""),
                "shot_length_sec": s.get("shotLength", ""),
                "moving_average": s.get("movingAverage", ""),
                "trendline_shot_length": s.get("trendlineShotLength", ""),
            })

    fieldnames = [
        "shot_id", "dataset", "type_name", "type_color",
        "timestamp_sec", "shot_length_sec", "moving_average",
        "trendline_shot_length",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} shot rows to {output_path}")


if __name__ == "__main__":
    sys.exit(main())
