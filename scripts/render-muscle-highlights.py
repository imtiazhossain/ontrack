#!/usr/bin/env python3
"""Render Muscle Explorer plates from painted alpha masks.

SOURCE OF TRUTH: assets/images/workouts/masks/<id>.png
This script NEVER writes to the masks folder — it only reads masks and
writes JPEG composites into assets/images/workouts/highlights/.

Usage:
  python3 scripts/render-muscle-highlights.py
  python3 scripts/render-muscle-highlights.py --force   # overwrite finished art
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MASK_DIR = ROOT / 'assets/images/workouts/masks'
OUT = ROOT / 'assets/images/workouts/highlights'
MAX_W = 640
JPEG_Q = 85

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


def downscale(img: Image.Image) -> Image.Image:
    if img.width <= MAX_W:
        return img
    height = int(img.height * MAX_W / img.width)
    return img.resize((MAX_W, height), Image.Resampling.LANCZOS)


def render(gray: Image.Image, color: Image.Image, mask: Image.Image) -> Image.Image:
    """Composite like the reference: colorized fiber on a crisp muscle matte.

    Glow stays inside the anatomy silhouette — bloom is clipped to body alpha
    so it never paints the cream background.
    """
    width, height = gray.size
    body_alpha = np.array(color.split()[-1])
    mask_arr = np.array(mask).astype(np.float32)
    # Never glow outside the figure.
    mask_arr *= body_alpha.astype(np.float32) / 255.0
    mask_clipped = Image.fromarray(np.clip(mask_arr, 0, 255).astype(np.uint8), 'L')

    # Tight inner glow only (reference is silhouette-accurate, not a soft oval).
    bloom = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    for radius, alpha in ((4, 0.22), (2, 0.18)):
        blurred = mask_clipped.filter(ImageFilter.GaussianBlur(radius=radius))
        layer = np.zeros((height, width, 4), dtype=np.uint8)
        layer[:, :, 0] = 255
        layer[:, :, 1] = 72
        layer[:, :, 2] = 28
        strength = np.array(blurred).astype(np.float32) / 255.0 * alpha
        strength *= body_alpha.astype(np.float32) / 255.0
        layer[:, :, 3] = np.clip(strength * 255, 0, 255).astype(np.uint8)
        bloom = Image.alpha_composite(bloom, Image.fromarray(layer, 'RGBA'))

    # Fiber: full color anatomy, warm-multiplied, alpha = mask (texture shows through).
    fiber = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    fiber.paste(color, mask=mask_clipped)
    # Match Anatomy-in-Motion stills: copper wash over real fiber, not neon flat fill.
    warm = ImageChops.multiply(fiber, Image.new('RGBA', (width, height), (255, 150, 110, 255)))
    fiber = Image.blend(fiber, warm, 0.42)
    fiber_arr = np.array(fiber)
    fiber_arr[:, :, 3] = np.minimum(
        fiber_arr[:, :, 3],
        np.clip(mask_arr, 0, 255).astype(np.uint8),
    )
    fiber = Image.fromarray(fiber_arr, 'RGBA')

    tint = np.zeros((height, width, 4), dtype=np.uint8)
    tint[:, :, 0] = 241
    tint[:, :, 1] = 140
    tint[:, :, 2] = 95
    tint[:, :, 3] = (mask_arr * 0.28).astype(np.uint8)

    core = np.zeros((height, width, 4), dtype=np.uint8)
    core[:, :, 0] = 255
    core[:, :, 1] = 190
    core[:, :, 2] = 150
    core_a = np.array(mask_clipped.filter(ImageFilter.GaussianBlur(1))).astype(np.float32)
    core_a *= body_alpha.astype(np.float32) / 255.0
    core[:, :, 3] = (core_a * 0.12).astype(np.uint8)

    out = Image.new('RGBA', (width, height), (245, 239, 230, 255))
    out.alpha_composite(gray)
    out.alpha_composite(fiber)
    out.alpha_composite(Image.fromarray(tint, 'RGBA'))
    out.alpha_composite(bloom)
    out.alpha_composite(Image.fromarray(core, 'RGBA'))
    return out


def main() -> None:
    force = '--force' in sys.argv
    if (OUT / 'FINISHED_ART.txt').exists() and not force:
        raise SystemExit(
            'highlights/ contains finished art (FINISHED_ART.txt).\n'
            'Refusing to overwrite. Pass --force if you really mean to rebake.'
        )

    OUT.mkdir(parents=True, exist_ok=True)
    bases: dict[str, tuple[Image.Image, Image.Image]] = {}
    for view in ('front', 'back'):
        gray = Image.open(ROOT / f'assets/images/workouts/anatomy-{view}-gray.png').convert('RGBA')
        color = Image.open(
            ROOT / f'assets/images/workouts/anatomy-{view}-transparent.png'
        ).convert('RGBA')
        bases[view] = (gray, color)
        neutral = Image.new('RGBA', gray.size, (245, 239, 230, 255))
        neutral.alpha_composite(gray)
        downscale(neutral.convert('RGB')).save(
            OUT / f'neutral-{view}.jpg',
            quality=JPEG_Q,
            optimize=True,
            progressive=True,
        )

    total = 0
    for muscle_id, view in VIEW.items():
        mask_path = MASK_DIR / f'{muscle_id}.png'
        if not mask_path.exists():
            raise SystemExit(f'Missing mask: {mask_path}')
        mask = Image.open(mask_path).convert('L')
        gray, color = bases[view]
        if mask.size != gray.size:
            mask = mask.resize(gray.size, Image.Resampling.BILINEAR)
        plate = render(gray, color, mask)
        dest = OUT / f'{muscle_id}.jpg'
        downscale(plate.convert('RGB')).save(
            dest,
            quality=JPEG_Q,
            optimize=True,
            progressive=True,
        )
        total += dest.stat().st_size
        print(f'{muscle_id}: {dest.stat().st_size / 1024:.0f} KB')

    print(f'\nTotal: {total / 1024 / 1024:.2f} MB → {OUT}')


if __name__ == '__main__':
    main()
