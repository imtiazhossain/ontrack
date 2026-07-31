#!/usr/bin/env python3
"""Paint Muscle Explorer alpha masks from anatomy-calibrated SVG paths.

SOURCE OF TRUTH after this runs: assets/images/workouts/masks/<id>.png
Does not call external AI. Reads path data from muscle-highlight-map.ts,
rasterizes onto the anatomy plate, softens edges, and clips to opaque tissue.

Usage:
  python3 scripts/paint-muscle-masks.py
  python3 scripts/render-muscle-highlights.py
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MAP_TS = ROOT / 'src/features/workouts/muscle-highlight-map.ts'
MASK_DIR = ROOT / 'assets/images/workouts/masks'
VIEWBOX = (100.0, 174.21)

VIEW = {
    'anterior-deltoid': 'front',
    'lateral-deltoid': 'front',
    'pectoralis-major': 'front',
    'pectoralis-minor': 'front',
    'serratus-anterior': 'front',
    'biceps-brachii': 'front',
    'brachialis': 'front',
    'brachioradialis': 'front',
    'rectus-abdominis': 'front',
    'obliques': 'front',
    'transverse-abdominis': 'front',
    'rectus-femoris': 'front',
    'vastus-lateralis': 'front',
    'vastus-medialis': 'front',
    'trapezius': 'back',
    'rhomboids': 'back',
    'posterior-deltoid': 'back',
    'latissimus-dorsi': 'back',
    'teres-major': 'back',
    'triceps-long-head': 'back',
    'triceps-lateral-head': 'back',
    'triceps-medial-head': 'back',
    'erector-spinae': 'back',
    'multifidus': 'back',
    'quadratus-lumborum': 'back',
    'gluteus-maximus': 'back',
    'gluteus-medius': 'back',
    'gluteus-minimus': 'back',
    'biceps-femoris': 'back',
    'semitendinosus': 'back',
    'semimembranosus': 'back',
    'gastrocnemius': 'back',
    'soleus': 'back',
}


def parse_highlight_map(text: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for match in re.finditer(
        r"'([^']+)':\s*\[((?:\s*'[^']*',?\s*)+)\]",
        text,
    ):
        muscle_id = match.group(1)
        paths = re.findall(r"'([^']+)'", match.group(2))
        if paths:
            out[muscle_id] = paths
    return out


def tokenize_path(d: str) -> list[tuple[str, list[float]]]:
    tokens = re.findall(r'[MmLlCcZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?', d)
    commands: list[tuple[str, list[float]]] = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in 'MmLlCcZz':
            cmd = tok
            i += 1
            nums: list[float] = []
            while i < len(tokens) and tokens[i] not in 'MmLlCcZz':
                nums.append(float(tokens[i]))
                i += 1
            commands.append((cmd, nums))
        else:
            raise ValueError(f'Unexpected path token: {tok}')
    return commands


def path_to_polygon(d: str, samples_per_curve: int = 12) -> np.ndarray:
    """Approximate SVG path as a dense closed polygon in viewBox coords."""
    cmds = tokenize_path(d)
    pts: list[tuple[float, float]] = []
    cx = cy = 0.0
    start = (0.0, 0.0)

    def cubic(p0, p1, p2, p3, n):
        for t in np.linspace(0, 1, n, endpoint=False):
            u = 1 - t
            x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
            y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
            pts.append((float(x), float(y)))

    for cmd, nums in cmds:
        if cmd in 'Mm':
            for j in range(0, len(nums), 2):
                x, y = nums[j], nums[j + 1]
                if cmd == 'm' and pts:
                    x += cx
                    y += cy
                cx, cy = x, y
                start = (cx, cy)
                pts.append((cx, cy))
        elif cmd in 'Ll':
            for j in range(0, len(nums), 2):
                x, y = nums[j], nums[j + 1]
                if cmd == 'l':
                    x += cx
                    y += cy
                cx, cy = x, y
                pts.append((cx, cy))
        elif cmd in 'Cc':
            for j in range(0, len(nums), 6):
                x1, y1, x2, y2, x, y = nums[j : j + 6]
                if cmd == 'c':
                    x1 += cx
                    y1 += cy
                    x2 += cx
                    y2 += cy
                    x += cx
                    y += cy
                cubic((cx, cy), (x1, y1), (x2, y2), (x, y), samples_per_curve)
                cx, cy = x, y
                pts.append((cx, cy))
        elif cmd in 'Zz':
            if pts and pts[-1] != start:
                pts.append(start)
            cx, cy = start
    if not pts:
        return np.zeros((0, 2), dtype=np.float64)
    return np.asarray(pts, dtype=np.float64)


def fill_polygons(polys: list[np.ndarray], width: int, height: int) -> np.ndarray:
    from matplotlib.path import Path as MplPath

    mask = np.zeros((height, width), dtype=bool)
    vw, vh = VIEWBOX
    for poly in polys:
        if len(poly) < 3:
            continue
        xs = poly[:, 0] / vw * (width - 1)
        ys = poly[:, 1] / vh * (height - 1)
        path = MplPath(np.column_stack([xs, ys]))
        x0 = max(0, int(np.floor(xs.min())) - 2)
        x1 = min(width - 1, int(np.ceil(xs.max())) + 2)
        y0 = max(0, int(np.floor(ys.min())) - 2)
        y1 = min(height - 1, int(np.ceil(ys.max())) + 2)
        grid_x, grid_y = np.meshgrid(
            np.arange(x0, x1 + 1),
            np.arange(y0, y1 + 1),
        )
        pts = np.column_stack([grid_x.ravel(), grid_y.ravel()])
        inside = path.contains_points(pts).reshape(grid_y.shape)
        mask[y0 : y1 + 1, x0 : x1 + 1] |= inside
    return mask


def muscle_tissue(color_rgba: np.ndarray) -> np.ndarray:
    """True on reddish fiber in the color anatomy plate (skip white tendon)."""
    r = color_rgba[:, :, 0].astype(np.float32)
    g = color_rgba[:, :, 1].astype(np.float32)
    b = color_rgba[:, :, 2].astype(np.float32)
    a = color_rgba[:, :, 3]
    opaque = a > 140
    tendon = (r > 185) & (g > 165) & (b > 140) & (np.abs(r - g) < 35)
    red = (r >= 48) & (r > g * 1.05) & (r > b * 1.05)
    deep = (r >= 70) & (r > g + 12)
    return opaque & ~tendon & (red | deep)


def soft_mask(hard: np.ndarray, opaque: np.ndarray, blur: float = 0.8) -> Image.Image:
    """Crisp matte with 1px AA — same idea as the bench-press stills."""
    img = Image.fromarray((hard.astype(np.uint8) * 255), 'L')
    # Close tiny holes inside the belly without expanding into other muscles.
    img = img.filter(ImageFilter.MaxFilter(size=3))
    img = img.filter(ImageFilter.MinFilter(size=3))
    hard2 = (np.array(img) > 127) & opaque
    soft = Image.fromarray((hard2.astype(np.uint8) * 255), 'L').filter(
        ImageFilter.GaussianBlur(radius=blur)
    )
    arr = np.array(soft).astype(np.float32)
    arr *= opaque.astype(np.float32)
    arr = np.maximum(arr, hard2.astype(np.float32) * 255.0)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'L')


def paint_from_paths(
    polys: list[np.ndarray],
    color_rgba: np.ndarray,
    opaque: np.ndarray,
) -> np.ndarray:
    """Path ROI × color-plate tissue — fiber-accurate silhouette inside the guide."""
    height, width = opaque.shape
    roi = fill_polygons(polys, width, height) & opaque
    tissue = muscle_tissue(color_rgba) & roi
    # If tissue is sparse (deep muscles / gray art), fall back to ROI.
    if tissue.mean() < 0.15 * max(roi.mean(), 1e-6):
        return roi
    # Keep a thin path core so small heads don't disappear, then prefer tissue.
    core = Image.fromarray((roi.astype(np.uint8) * 255), 'L').filter(ImageFilter.MinFilter(5))
    core_a = (np.array(core) > 127) & opaque
    return (tissue | core_a) & roi


def main() -> None:
    text = MAP_TS.read_text()
    path_map = parse_highlight_map(text)
    missing = [mid for mid in VIEW if mid not in path_map]
    if missing:
        raise SystemExit(f'Missing paths for: {missing}')

    anatomy = {
        'front': Image.open(ROOT / 'assets/images/workouts/anatomy-front-transparent.png').convert(
            'RGBA'
        ),
        'back': Image.open(ROOT / 'assets/images/workouts/anatomy-back-transparent.png').convert(
            'RGBA'
        ),
    }
    arrays = {k: np.array(v) for k, v in anatomy.items()}
    opaque = {k: (arr[:, :, 3] > 160) for k, arr in arrays.items()}

    MASK_DIR.mkdir(parents=True, exist_ok=True)
    for muscle_id, view in VIEW.items():
        polys = [path_to_polygon(d) for d in path_map[muscle_id]]
        hard = paint_from_paths(polys, arrays[view], opaque[view])
        mask = soft_mask(hard, opaque[view])
        out = MASK_DIR / f'{muscle_id}.png'
        mask.save(out)
        coverage = (np.array(mask) > 40).mean() * 100
        print(f'{muscle_id}: {coverage:.2f}% white → {out.name}')

    print(f'\nPainted {len(VIEW)} masks → {MASK_DIR}')
    print('Next: python3 scripts/render-muscle-highlights.py')


if __name__ == '__main__':
    main()
