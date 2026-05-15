"""
Color extraction script for Mulholland Drive scrollytelling project.

This script analyzes video frames to extract dominant colors, brightness,
and saturation data for each scene. Output is a CSV that can power
your color-timeline visualization.

REQUIREMENTS:
    pip install opencv-python numpy pandas scikit-learn pillow

USAGE:
    1. Extract frames from your video file using FFmpeg:
       ffmpeg -i mulholland_drive.mp4 -vf fps=1/2 frames/frame_%05d.png
       (extracts one frame every 2 seconds; adjust as needed)

    2. Run this script:
       python extract_colors.py --frames_dir frames/ --output colors.csv

OUTPUT FORMAT (colors.csv):
    frame_number, timestamp_sec, dominant_color_hex, dominant_r, dominant_g,
    dominant_b, brightness_0_255, saturation_0_1, hue_0_360,
    second_color_hex, third_color_hex
"""

import argparse
import os
import csv
import re
from pathlib import Path
import cv2
import numpy as np
from sklearn.cluster import KMeans


def get_dominant_colors(image_path, k=3, resize_to=200):
    """
    Extract the k dominant colors from an image using K-means clustering.

    Args:
        image_path: Path to the image file.
        k: Number of dominant colors to extract.
        resize_to: Resize image to this max dimension for speed.

    Returns:
        List of (r, g, b, percentage) tuples sorted by percentage descending.
    """
    img = cv2.imread(str(image_path))
    if img is None:
        return None

    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Resize for speed (does not affect color analysis quality)
    h, w = img.shape[:2]
    if max(h, w) > resize_to:
        scale = resize_to / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    # Reshape to a list of pixels
    pixels = img.reshape(-1, 3)

    # K-means clustering to find dominant colors
    kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
    kmeans.fit(pixels)

    # Get cluster centers (the colors) and labels
    colors = kmeans.cluster_centers_.astype(int)
    labels = kmeans.labels_

    # Calculate percentage of each color
    counts = np.bincount(labels)
    percentages = counts / len(labels)

    # Sort by percentage (most dominant first)
    sorted_indices = np.argsort(percentages)[::-1]
    result = [
        (int(colors[i][0]), int(colors[i][1]), int(colors[i][2]), float(percentages[i]))
        for i in sorted_indices
    ]
    return result


def rgb_to_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}"


def rgb_to_hsv_components(r, g, b):
    """Returns (hue 0-360, saturation 0-1, value/brightness 0-255)."""
    rgb_pixel = np.uint8([[[r, g, b]]])
    hsv = cv2.cvtColor(rgb_pixel, cv2.COLOR_RGB2HSV)[0][0]
    # OpenCV uses H 0-179, S 0-255, V 0-255
    hue = float(hsv[0]) * 2.0  # convert to 0-360
    saturation = float(hsv[1]) / 255.0
    value = float(hsv[2])
    return hue, saturation, value


def extract_frame_number(filename, pattern=r'frame_(\d+)'):
    match = re.search(pattern, str(filename))
    return int(match.group(1)) if match else None


def main():
    parser = argparse.ArgumentParser(description="Extract dominant colors from video frames")
    parser.add_argument('--frames_dir', required=True, help='Directory containing frame images')
    parser.add_argument('--output', default='colors.csv', help='Output CSV path')
    parser.add_argument('--fps_inverse', type=float, default=2.0,
                        help='Seconds between extracted frames (for timestamp calc). '
                             'If you used "fps=1/2", pass 2.0')
    parser.add_argument('--k', type=int, default=3, help='Number of dominant colors to extract')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of frames (for testing)')
    args = parser.parse_args()

    frames_dir = Path(args.frames_dir)
    frame_files = sorted([f for f in frames_dir.iterdir()
                          if f.suffix.lower() in ('.png', '.jpg', '.jpeg')])

    if args.limit:
        frame_files = frame_files[:args.limit]

    print(f"Processing {len(frame_files)} frames...")

    rows = []
    for i, frame_path in enumerate(frame_files):
        if i % 50 == 0:
            print(f"  {i}/{len(frame_files)}...")

        frame_num = extract_frame_number(frame_path.name) or i
        timestamp_sec = frame_num * args.fps_inverse

        colors = get_dominant_colors(frame_path, k=args.k)
        if colors is None:
            continue

        # Primary color
        r1, g1, b1, pct1 = colors[0]
        hue, sat, val = rgb_to_hsv_components(r1, g1, b1)

        row = {
            'frame_number': frame_num,
            'timestamp_sec': timestamp_sec,
            'timestamp_hms': f"{int(timestamp_sec//3600):02d}:{int((timestamp_sec%3600)//60):02d}:{int(timestamp_sec%60):02d}",
            'dominant_color_hex': rgb_to_hex(r1, g1, b1),
            'dominant_r': r1, 'dominant_g': g1, 'dominant_b': b1,
            'dominant_pct': round(pct1, 3),
            'brightness_0_255': round(val, 1),
            'saturation_0_1': round(sat, 3),
            'hue_0_360': round(hue, 1),
        }
        # Add secondary and tertiary colors
        for n, (r, g, b, pct) in enumerate(colors[1:], start=2):
            row[f'color_{n}_hex'] = rgb_to_hex(r, g, b)
            row[f'color_{n}_pct'] = round(pct, 3)

        rows.append(row)

    # Write CSV
    if rows:
        # Collect ALL possible keys from all rows
        keys = sorted({k for row in rows for k in row.keys()})

        with open(args.output, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(rows)

        print(f"\nWrote {len(rows)} rows to {args.output}")
    else:
        print("No frames processed.")


if __name__ == '__main__':
    main()
