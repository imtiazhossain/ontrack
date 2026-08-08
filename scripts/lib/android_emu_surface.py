#!/usr/bin/env python3
"""Android emulator SurfaceView paint checks for headed handoff.

Headless→window restarts (and some cold boots) can leave the React surface
blank/white while Metro + the JS bridge still look healthy. Callers sample a
screencap and relaunch the app when near-white coverage is too high.
"""

from __future__ import annotations

import argparse
import io
import sys
from typing import BinaryIO


DEFAULT_NEAR_WHITE_MIN = 245


def near_white_pct(
    png_bytes: bytes,
    *,
    min_channel: int = DEFAULT_NEAR_WHITE_MIN,
) -> float:
    """Return % of pixels with R,G,B all >= min_channel (0–100)."""
    if not png_bytes:
        return 100.0
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(f"error: Pillow required for surface checks ({exc})") from exc

    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    px = im.getdata()
    total = len(px)
    if total == 0:
        return 100.0
    near = sum(1 for r, g, b in px if r >= min_channel and g >= min_channel and b >= min_channel)
    return round(100.0 * near / total, 1)


def _read_png(stream: BinaryIO) -> bytes:
    data = stream.read()
    if not data:
        raise SystemExit("error: empty PNG input")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    pct = sub.add_parser("pct", help="Print near-white %% from PNG on stdin or --file")
    pct.add_argument("--file", "-f", help="PNG path (default: stdin)")
    pct.add_argument(
        "--min-channel",
        type=int,
        default=DEFAULT_NEAR_WHITE_MIN,
        help="Per-channel minimum for near-white (default: 245)",
    )

    blank = sub.add_parser("is-blank", help="Exit 0 when near-white %% >= threshold")
    blank.add_argument("--file", "-f", help="PNG path (default: stdin)")
    blank.add_argument(
        "--threshold",
        type=float,
        default=85.0,
        help="Near-white %% threshold (default: 85)",
    )
    blank.add_argument("--min-channel", type=int, default=DEFAULT_NEAR_WHITE_MIN)

    args = parser.parse_args(argv)
    if args.file:
        with open(args.file, "rb") as fh:
            png = _read_png(fh)
    else:
        png = _read_png(sys.stdin.buffer)

    value = near_white_pct(png, min_channel=args.min_channel)
    if args.cmd == "pct":
        print(f"{value}")
        return 0

    # is-blank
    if value >= float(args.threshold):
        print(f"{value}")
        return 0
    print(f"{value}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
