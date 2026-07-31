#!/usr/bin/env python3
"""Export paint guides for Muscle Explorer masks (does not modify mask PNGs).

For each muscle, writes an RGB guide you can open in Photoshop/Procreate:
  - grayscale anatomy plate
  - current mask shown as red overlay (refine this shape)

Paint on a white layer over the muscle, export as grayscale PNG named
exactly like the mask id into assets/images/workouts/masks/<id>.png
(950×1655, white = muscle, black = empty). Then run:

  python3 scripts/render-muscle-highlights.py

That bake step NEVER overwrites your masks — it only reads them.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASK_DIR = ROOT / 'assets/images/workouts/masks'
GUIDE_DIR = ROOT / 'assets/images/workouts/mask-guides'
OUT_HIGHLIGHTS = ROOT / 'assets/images/workouts/highlights'

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


def main() -> None:
    GUIDE_DIR.mkdir(parents=True, exist_ok=True)
    bases = {
        'front': Image.open(
            ROOT / 'assets/images/workouts/anatomy-front-gray.png'
        ).convert('RGBA'),
        'back': Image.open(
            ROOT / 'assets/images/workouts/anatomy-back-gray.png'
        ).convert('RGBA'),
    }

    for muscle_id, view in VIEW.items():
        mask_path = MASK_DIR / f'{muscle_id}.png'
        if not mask_path.exists():
            # Blank template at art resolution — never invent shapes here.
            blank = Image.new('L', bases[view].size, 0)
            blank.save(mask_path)
            print(f'created blank mask {mask_path.name}')

        mask = Image.open(mask_path).convert('L')
        if mask.size != bases[view].size:
            mask = mask.resize(bases[view].size, Image.Resampling.NEAREST)

        base = bases[view].copy()
        overlay = np.zeros((base.height, base.width, 4), dtype=np.uint8)
        overlay[:, :, 0] = 255
        overlay[:, :, 1] = 48
        overlay[:, :, 2] = 32
        overlay[:, :, 3] = (np.array(mask).astype(np.float32) * 0.55).astype(np.uint8)
        base.alpha_composite(Image.fromarray(overlay, 'RGBA'))

        dest = GUIDE_DIR / f'{muscle_id}-guide.png'
        base.convert('RGB').save(dest, optimize=True)
        print(f'guide {dest.name}')

    print(f'\nGuides → {GUIDE_DIR}')
    print(f'Masks (paint targets, persistent) → {MASK_DIR}')
    print(f'After painting masks, bake plates → {OUT_HIGHLIGHTS}')
    print('  python3 scripts/render-muscle-highlights.py')


if __name__ == '__main__':
    main()
