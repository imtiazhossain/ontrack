#!/usr/bin/env python3
"""Sample accent-ish pixels inside an agent-ui element frame from a screenshot."""

from __future__ import annotations

import colorsys
import math
import subprocess
import tempfile
from pathlib import Path
from typing import Any


def parse_hex_color(raw: str) -> tuple[int, int, int]:
    value = raw.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) != 6:
        raise ValueError(f"expected #RRGGBB, got {raw!r}")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def _is_ink(rgb: tuple[int, int, int]) -> bool:
    """True for saturated / mid-luma pixels (skip white cards & near-black)."""
    r, g, b = (c / 255.0 for c in rgb)
    h, lightness, saturation = colorsys.rgb_to_hls(r, g, b)
    _ = h
    return saturation >= 0.12 and 0.12 <= lightness <= 0.78


def sample_frame_accent(
    image_path: Path,
    frame: dict[str, Any],
    *,
    scale: float,
) -> tuple[int, int, int] | None:
    """Average non-background pixels in the element frame. Returns RGB or None."""
    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit(
            "error: Pillow required for --assert-color "
            "(python3 -m pip install pillow)"
        ) from exc

    img = Image.open(image_path).convert("RGB")
    x = float(frame.get("x") or 0) * scale
    y = float(frame.get("y") or 0) * scale
    w = float(frame.get("width") or 0) * scale
    h = float(frame.get("height") or 0) * scale
    if w < 2 or h < 2:
        return None

    # Inset slightly; bias toward left/center where icon + title live.
    left = max(0, int(x + w * 0.04))
    top = max(0, int(y + h * 0.15))
    right = min(img.width, int(x + w * 0.72))
    bottom = min(img.height, int(y + h * 0.85))
    if right <= left or bottom <= top:
        return None

    crop = img.crop((left, top, right, bottom))
    pixels = list(crop.getdata())
    ink = [p for p in pixels if _is_ink(p)]
    if len(ink) < 8:
        # Fall back to center cross-sample if card chrome dominates.
        cx, cy = int((left + right) / 2), int((top + bottom) / 2)
        samples = []
        for dx, dy in ((0, 0), (-8, 0), (8, 0), (-20, 0), (20, 0), (0, -4), (0, 4)):
            px, py = cx + dx, cy + dy
            if 0 <= px < img.width and 0 <= py < img.height:
                samples.append(img.getpixel((px, py)))
        ink = [p for p in samples if _is_ink(p)] or samples
    if not ink:
        return None
    n = len(ink)
    return (
        round(sum(p[0] for p in ink) / n),
        round(sum(p[1] for p in ink) / n),
        round(sum(p[2] for p in ink) / n),
    )


def _agent_ui_platform() -> str:
    import os

    raw = (os.environ.get("AGENT_UI_PLATFORM") or "ios").strip().lower()
    return "android" if raw == "android" else "ios"


def _android_serial() -> str | None:
    import os

    serial = (os.environ.get("ONTRACK_ANDROID_SERIAL") or os.environ.get("ANDROID_SERIAL") or "").strip()
    if serial:
        return serial
    # Prefer serial written by ensure-android-emulator / ensure-packager --android.
    try:
        from pathlib import Path as _Path

        root = os.environ.get("AGENT_UI_ROOT") or os.environ.get("ROOT")
        if not root:
            root = str(_Path(__file__).resolve().parents[2])
        cached = _Path(root) / ".cursor" / "android-emulator.serial"
        if cached.is_file():
            text = cached.read_text(encoding="utf-8").strip()
            if text:
                return text
    except OSError:
        pass
    return None


def capture_screenshot(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if _agent_ui_platform() == "android":
        import os
        import shutil

        adb = shutil.which("adb") or os.path.expanduser(
            "~/Library/Android/sdk/platform-tools/adb"
        )
        if not os.path.isfile(adb) and not shutil.which("adb"):
            raise SystemExit("error: adb not found for Android screenshot")
        if not os.path.isfile(adb):
            adb = shutil.which("adb") or "adb"
        cmd = [adb]
        serial = _android_serial()
        if serial:
            cmd += ["-s", serial]
        cmd += ["exec-out", "screencap", "-p"]
        proc = subprocess.run(cmd, check=False, capture_output=True)
        if proc.returncode != 0 or not proc.stdout:
            detail = (proc.stderr or b"").decode("utf-8", errors="replace").strip()
            raise SystemExit(f"error: android screenshot failed: {detail or proc.returncode}")
        path.write_bytes(proc.stdout)
        return path

    proc = subprocess.run(
        ["xcrun", "simctl", "io", "booted", "screenshot", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0 or not path.is_file():
        detail = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit(f"error: screenshot failed: {detail or proc.returncode}")
    return path


def assert_element_color(
    *,
    frame: dict[str, Any],
    expected_hex: str,
    scale: float,
    tolerance: float = 55.0,
    screenshot_path: Path | None = None,
) -> dict[str, Any]:
    """Compare sampled accent in frame to expected hex. Returns result dict."""
    expected = parse_hex_color(expected_hex)
    tmp: Path | None = None
    path = screenshot_path
    if path is None:
        tmp = Path(tempfile.mkstemp(suffix=".png", prefix="agent-ui-color-")[1])
        path = tmp
    try:
        if screenshot_path is None or not path.is_file():
            capture_screenshot(path)
        sampled = sample_frame_accent(path, frame, scale=scale)
        if sampled is None:
            return {
                "ok": False,
                "op": "color",
                "detail": "could not sample ink pixels in frame",
                "expected": expected_hex,
            }
        dist = color_distance(sampled, expected)
        ok = dist <= tolerance
        return {
            "ok": ok,
            "op": "color",
            "detail": (
                f"rgb={sampled[0]},{sampled[1]},{sampled[2]} "
                f"expected={expected_hex} dist={dist:.1f} tol={tolerance}"
            ),
            "expected": expected_hex,
            "sampled": f"#{sampled[0]:02X}{sampled[1]:02X}{sampled[2]:02X}",
            "distance": round(dist, 2),
            "tolerance": tolerance,
        }
    finally:
        if tmp is not None:
            tmp.unlink(missing_ok=True)
