#!/usr/bin/env python3
"""Create a side-by-side + alpha overlay visual comparison for the Travel screen.
Usage: python tools/compare_travel_reference.py path/to/current.png [output.png]
"""
from pathlib import Path
import sys
from PIL import Image, ImageChops, ImageEnhance, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
ref_path = root / "references" / "travel-home-reference.png"
if len(sys.argv) < 2:
    raise SystemExit("Usage: compare_travel_reference.py CURRENT_SCREENSHOT [OUTPUT]")
cur_path = Path(sys.argv[1])
out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "references" / "travel-visual-comparison.png"

ref = Image.open(ref_path).convert("RGB")
cur = Image.open(cur_path).convert("RGB")
cur = ImageOps.fit(cur, ref.size, method=Image.Resampling.LANCZOS)

overlay = Image.blend(ref, cur, 0.5)
diff = ImageChops.difference(ref, cur)
diff = ImageEnhance.Contrast(diff).enhance(2.0)

pad = 24
label_h = 44
w, h = ref.size
canvas = Image.new("RGB", (w*2 + pad*3, h*2 + label_h*2 + pad*3), "white")
d = ImageDraw.Draw(canvas)

def place(img, x, y, label):
    d.text((x, y), label, fill="black")
    canvas.paste(img, (x, y + label_h))

place(ref, pad, pad, "REFERENCE")
place(cur, w + pad*2, pad, "CURRENT (scaled)")
place(overlay, pad, h + label_h + pad*2, "50% OVERLAY")
place(diff, w + pad*2, h + label_h + pad*2, "AMPLIFIED PIXEL DIFFERENCE")
canvas.save(out_path)
print(out_path)
