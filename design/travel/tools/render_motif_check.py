#!/usr/bin/env python3
"""Large-render gate for the Travel header flight motif SVG.

Usage:
  python design/travel/tools/render_motif_check.py
  python design/travel/tools/render_motif_check.py path/to/travel-route.svg

Writes a 600px preview next to the SVG (via macOS qlmanage) and prints the
path. Open it and confirm fuselage + wings + tail before shipping — see
design/travel/GLYPH_MATCHING.md.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SVG = ROOT / "assets" / "icons" / "travel-route.svg"


def main() -> int:
    svg = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SVG
    if not svg.is_file():
        print(f"missing svg: {svg}", file=sys.stderr)
        return 1

    out_dir = Path("/tmp/travel-motif-check")
    out_dir.mkdir(parents=True, exist_ok=True)
    # qlmanage names output "<filename>.png"
    subprocess.run(
        ["qlmanage", "-t", "-s", "600", "-o", str(out_dir), str(svg)],
        check=True,
        capture_output=True,
    )
    preview = out_dir / f"{svg.name}.png"
    if not preview.is_file():
        # qlmanage sometimes keeps the full stem
        matches = list(out_dir.glob(f"{svg.stem}*"))
        if not matches:
            print("qlmanage produced no preview", file=sys.stderr)
            return 1
        preview = matches[0]

    text = svg.read_text(encoding="utf-8")
    required = [
        "M21 16v-2l-8-5V3.5",  # Material flight fuselage/wings/tail
        "stroke-dasharray",
        'viewBox="0 0 96 40"',
    ]
    missing = [r for r in required if r not in text]
    if missing:
        print("SVG failed content gate:", ", ".join(missing), file=sys.stderr)
        return 1

    print(preview)
    print("GATE: open preview — fuselage + wings + tail; nose WNW (~west); trail at tail.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
