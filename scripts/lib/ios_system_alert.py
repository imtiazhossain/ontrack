#!/usr/bin/env python3
"""Detect and dismiss blocking iOS Simulator system sheets (Apple Account, etc.).

Uses Vision OCR on a simctl screenshot, then clicks the dismiss control
(preferring "Not Now") by mapping the label's bounding-box center into the
Simulator.app window.

Exit codes:
  0 — clear (or skipped)
  1 — still blocking after dismiss attempts
  2 — tool / screenshot / OCR failure
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CACHE_CLEAR_SECS = 90

# Prefer soft dismiss over Settings / Done.
DISMISS_PRIORITY = (
    "not now",
    "cancel",
    "close",
    "later",
    "don't allow",
    "dont allow",
)


def repo_root() -> Path:
    env = os.environ.get("AGENT_UI_ROOT") or os.environ.get("ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def cache_path() -> Path:
    root = repo_root() / ".cursor"
    root.mkdir(parents=True, exist_ok=True)
    return root / "ios-system-alert-clear.stamp"


def ocr_bin() -> Path:
    return repo_root() / ".cursor" / "ios_ocr_alert"


def ensure_ocr_bin() -> Path:
    src = Path(__file__).resolve().parent / "ios_ocr_alert.swift"
    out = ocr_bin()
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.is_file() and out.stat().st_mtime >= src.stat().st_mtime:
        return out
    print("agent-ui: compiling iOS system-alert OCR helper…", file=sys.stderr)
    proc = subprocess.run(
        ["xcrun", "--sdk", "macosx", "swiftc", "-O", str(src), "-o", str(out)],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0 or not out.is_file():
        detail = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit(f"error: failed to compile ios_ocr_alert: {detail or proc.returncode}")
    return out


def recently_clear() -> bool:
    path = cache_path()
    if not path.is_file():
        return False
    age = time.time() - path.stat().st_mtime
    return 0 <= age < CACHE_CLEAR_SECS


def mark_clear() -> None:
    cache_path().write_text(str(int(time.time())), encoding="utf-8")


def take_screenshot(path: Path) -> None:
    proc = subprocess.run(
        ["xcrun", "simctl", "io", "booted", "screenshot", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0 or not path.is_file():
        detail = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit(f"error: iOS screenshot failed: {detail or proc.returncode}")


def _redact_emails(text: str) -> str:
    # Keep probe logs free of personal inboxes (OCR often captures Apple Account copy).
    import re

    return re.sub(r"[\w.+-]+@[\w.-]+\.\w+", "[redacted-email]", text)


def ocr_screenshot(path: Path) -> dict:
    binary = ensure_ocr_bin()
    proc = subprocess.run(
        [str(binary), str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit(f"error: iOS OCR failed: {detail or proc.returncode}")
    try:
        result = json.loads(proc.stdout.strip() or "{}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"error: iOS OCR returned invalid JSON: {exc}") from exc
    if isinstance(result.get("text"), str):
        result["text"] = _redact_emails(result["text"])
    return result


def simulator_running() -> bool:
    return (
        subprocess.run(
            ["pgrep", "-x", "Simulator"],
            check=False,
            capture_output=True,
        ).returncode
        == 0
    )


def ensure_simulator_app() -> None:
    if simulator_running():
        return
    print("agent-ui: opening Simulator.app to dismiss system sheet…", file=sys.stderr)
    # Resolve a booted UDID so we don't restore a multi-device layout.
    boot_udid = ""
    try:
        raw = subprocess.run(
            ["xcrun", "simctl", "list", "devices", "booted", "-j"],
            check=False,
            capture_output=True,
            text=True,
        ).stdout
        data = json.loads(raw or "{}")
        for devices in data.get("devices", {}).values():
            for device in devices:
                if device.get("state") == "Booted":
                    boot_udid = device.get("udid") or ""
                    break
            if boot_udid:
                break
    except json.JSONDecodeError:
        boot_udid = ""
    if boot_udid:
        subprocess.run(
            ["open", "-a", "Simulator", "--args", f"-CurrentDeviceUDID={boot_udid}"],
            check=False,
            capture_output=True,
        )
    else:
        subprocess.run(["open", "-a", "Simulator"], check=False, capture_output=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if simulator_running():
            time.sleep(0.8)
            return
        time.sleep(0.25)


def pick_dismiss_target(result: dict) -> dict | None:
    targets = result.get("targets") or []
    if not isinstance(targets, list):
        return None
    ranked: list[tuple[int, dict]] = []
    for target in targets:
        if not isinstance(target, dict):
            continue
        label = str(target.get("label") or "").strip().lower()
        try:
            rank = next(i for i, needle in enumerate(DISMISS_PRIORITY) if needle in label)
        except StopIteration:
            continue
        ranked.append((rank, target))
    if not ranked:
        return None
    ranked.sort(key=lambda item: item[0])
    return ranked[0][1]


def simulator_window_frame() -> tuple[float, float, float, float] | None:
    """Return (x, y, width, height) of Simulator front window in global screen points."""
    script = """
tell application "System Events"
  if not (exists process "Simulator") then return ""
  tell process "Simulator"
    try
      set w to front window
      set p to position of w
      set s to size of w
      return ((item 1 of p) as text) & "," & ((item 2 of p) as text) & "," & ((item 1 of s) as text) & "," & ((item 2 of s) as text)
    on error
      return ""
    end try
  end tell
end tell
"""
    try:
        proc = subprocess.run(
            ["osascript", "-e", script],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except subprocess.TimeoutExpired:
        return None
    raw = (proc.stdout or "").strip()
    if not raw or proc.returncode != 0:
        return None
    parts = raw.split(",")
    if len(parts) != 4:
        return None
    try:
        return float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])
    except ValueError:
        return None


def click_screen_point(x: float, y: float) -> bool:
    """Click a global screen point via System Events (points, not pixels)."""
    script = f"""
tell application "Simulator" to activate
delay 0.15
tell application "System Events"
  click at {{{int(round(x))}, {int(round(y))}}}
end tell
return "ok"
"""
    try:
        proc = subprocess.run(
            ["osascript", "-e", script],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except subprocess.TimeoutExpired:
        return False
    return proc.returncode == 0 and "ok" in (proc.stdout or "")


def click_dismiss_target(target: dict) -> bool:
    """Map normalized screenshot coords (top-left origin) into Simulator window and click."""
    try:
        nx = float(target["x"])
        ny = float(target["y"])
    except (KeyError, TypeError, ValueError):
        return False
    frame = simulator_window_frame()
    if frame is None:
        return False
    win_x, win_y, win_w, win_h = frame
    # Approximate chrome: title/toolbar ~28pt top, thin side/home bezels.
    # Keep math simple — Apple Account sheets sit near vertical center.
    inset_top = 28.0
    inset_side = 12.0
    inset_bottom = 18.0
    content_w = max(1.0, win_w - 2 * inset_side)
    content_h = max(1.0, win_h - inset_top - inset_bottom)
    click_x = win_x + inset_side + nx * content_w
    click_y = win_y + inset_top + ny * content_h
    label = str(target.get("label") or "dismiss")
    print(
        f"agent-ui: clicking '{label}' at screen ({int(click_x)}, {int(click_y)})",
        file=sys.stderr,
    )
    return click_screen_point(click_x, click_y)


def send_escape() -> None:
    try:
        subprocess.run(
            [
                "osascript",
                "-e",
                'tell application "Simulator" to activate\n'
                "delay 0.1\n"
                'tell application "System Events" to key code 53',
            ],
            check=False,
            capture_output=True,
            timeout=4,
        )
    except subprocess.TimeoutExpired:
        pass


def dismiss_blocking(result: dict) -> bool:
    """Prefer clicking OCR'd 'Not Now'; Escape is a reliable fallback for account sheets."""
    ensure_simulator_app()
    target = pick_dismiss_target(result)
    clicked = False
    if target is not None:
        clicked = click_dismiss_target(target)
        time.sleep(0.45)
    if not clicked:
        print("agent-ui: sending Escape to dismiss system sheet", file=sys.stderr)
        send_escape()
        time.sleep(0.35)
    return True


def probe(*, force: bool = False) -> dict:
    if not force and recently_clear():
        return {"blocking": False, "cached": True, "phrases": [], "buttons": [], "targets": []}
    with tempfile.TemporaryDirectory(prefix="ios-sys-alert-") as tmp:
        shot = Path(tmp) / "screen.png"
        take_screenshot(shot)
        result = ocr_screenshot(shot)
    result["cached"] = False
    return result


def ensure_clear(*, force: bool = False) -> int:
    if os.environ.get("AGENT_UI_SKIP_IOS_ALERTS", "0") == "1":
        return 0
    platform = (os.environ.get("AGENT_UI_PLATFORM") or "ios").strip().lower()
    if platform == "android":
        return 0

    first = probe(force=force)
    if not first.get("blocking"):
        if not first.get("cached"):
            mark_clear()
        return 0

    phrases = ", ".join(first.get("phrases") or ["system alert"])
    buttons = ", ".join(first.get("buttons") or [])
    print(
        f"agent-ui: iOS system sheet detected ({phrases}"
        + (f"; buttons: {buttons}" if buttons else "")
        + ") — dismissing…",
        file=sys.stderr,
    )
    dismiss_blocking(first)

    second = probe(force=True)
    if second.get("blocking"):
        # One retry with a fresh OCR target (sheet may have shifted).
        dismiss_blocking(second)
        third = probe(force=True)
        if third.get("blocking"):
            phrases2 = ", ".join(third.get("phrases") or phrases.split(", "))
            print(
                f"error: iOS system sheet still blocking UI ({phrases2}). "
                'Tap "Not Now" on the simulator (or sign out of iCloud on the sim), '
                "then retry. Set AGENT_UI_SKIP_IOS_ALERTS=1 to bypass.",
                file=sys.stderr,
            )
            return 1

    mark_clear()
    print("agent-ui: iOS system sheet cleared", file=sys.stderr)
    return 0


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "ensure"
    force = "--force" in argv[2:]
    if cmd in ("ensure", "dismiss"):
        return ensure_clear(force=force or cmd == "dismiss")
    if cmd == "probe":
        result = probe(force=True)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 1 if result.get("blocking") else 0
    print("usage: ios_system_alert.py ensure|dismiss|probe [--force]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
