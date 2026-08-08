#!/usr/bin/env python3
"""Resolve AgentUiIds JS key paths to ontrack.* wire testIDs.

Accepts (examples all resolve to the same wire id):
  ontrack.travel.planDetail.section.transport
  travel.planDetail.transportSection
  AgentUiIds.travel.planDetail.transportSection
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

_LEAF_RE = re.compile(
    r"(?P<key>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*'(?P<id>ontrack\.[^']+)'"
)


def ids_ts_path(root: Path) -> Path:
    return root / "src" / "utils" / "agent-ui" / "ids.ts"


@lru_cache(maxsize=4)
def load_id_aliases(ids_path: str) -> dict[str, str]:
    """Map JS key paths → wire ids. Also maps each wire id to itself."""
    text = Path(ids_path).read_text(encoding="utf-8")
    aliases: dict[str, str] = {}
    stack: list[str] = []
    in_root = False
    depth = 0

    for raw_line in text.splitlines():
        line = raw_line.split("//", 1)[0].rstrip()
        if not line.strip():
            continue

        if not in_root:
            if "export const AgentUiIds" in line and "{" in line:
                in_root = True
                depth = line.count("{") - line.count("}")
            continue

        obj_open = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{", line)
        if obj_open and "=>" not in line and not _LEAF_RE.search(line):
            stack.append(obj_open.group(1))
            depth += line.count("{") - line.count("}")
            if depth <= 0:
                break
            continue

        leaf = _LEAF_RE.search(line)
        if leaf and "=>" not in line:
            key_path = ".".join([*stack, leaf.group("key")])
            wire = leaf.group("id")
            aliases[key_path] = wire
            aliases[f"AgentUiIds.{key_path}"] = wire
            aliases[wire] = wire
            short = leaf.group("key")
            prev = aliases.get(short)
            if prev is None:
                aliases[short] = wire
            elif prev != wire:
                aliases[short] = ""  # ambiguous

        depth += line.count("{") - line.count("}")
        net_close = line.count("}") - line.count("{")
        for _ in range(max(0, net_close)):
            if stack:
                stack.pop()
        if depth <= 0:
            break

    return {k: v for k, v in aliases.items() if v}


def _canonicalize_travel_home_namespace(value: str) -> str:
    """Travel Home UI/flows say ``home``; stamped wire ids use ``travel.list.*``.

    Agents often invent ``travel.home.section.yourTrips`` from the surface name.
    Rewrite to the stamped ``travel.list.*`` namespace before alias/fallback.
    """
    if "travel.home." not in value:
        return value
    return value.replace("travel.home.", "travel.list.", 1)


def resolve_test_id(raw: str, *, root: Path | None = None) -> str:
    """Resolve a wire id or AgentUiIds key path. Passthrough when unknown.

    Static leaves in ids.ts map via aliases (e.g. travel.planDetail.transportSection
    → ontrack.travel.planDetail.section.transport). Parameterized factory ids are
    arrow functions and are not in that map — for those, mirror resolve_prefix and
    prepend ontrack. so agents can pass:
      travel.timelineItem.<itemId>.default
      travel.flight.openConfirmation.<itemId>

    Colloquial Travel Home paths (``travel.home.*``) rewrite to stamped
    ``travel.list.*`` wire ids.
    """
    value = (raw or "").strip()
    if not value:
        return value

    value = _canonicalize_travel_home_namespace(value)

    if value.startswith("ontrack."):
        return value

    root = root or Path(__file__).resolve().parents[2]
    path = ids_ts_path(root)
    if not path.is_file():
        return _ontrack_fallback(value)

    aliases = load_id_aliases(str(path))
    if value in aliases:
        return aliases[value]
    stripped = value.lstrip(".")
    if stripped in aliases:
        return aliases[stripped]
    if stripped.startswith("AgentUiIds."):
        inner = stripped[len("AgentUiIds.") :]
        if inner in aliases:
            return aliases[inner]
        return _ontrack_fallback(inner)
    return _ontrack_fallback(stripped)


def _ontrack_fallback(value: str) -> str:
    """Prepend ontrack. for dotted feature paths that aren't static aliases."""
    if not value or value.startswith("ontrack.") or "." not in value:
        return value
    return f"ontrack.{value}"


def resolve_prefix(raw: str, *, root: Path | None = None) -> str:
    """Resolve a JS-style prefix to an ontrack.* wire prefix."""
    value = (raw or "").strip()
    if not value or value.startswith("ontrack."):
        return value
    if value.startswith("AgentUiIds."):
        value = value[len("AgentUiIds.") :]
    value = _canonicalize_travel_home_namespace(value.lstrip("."))
    # travel.planDetail. → ontrack.travel.planDetail.
    if value.startswith("ontrack."):
        return value
    return "ontrack." + value.lstrip(".")


def resolve_op_ids(op: dict, *, root: Path | None = None) -> dict:
    """Copy an op dict with id/prefix fields resolved."""
    out = dict(op)
    if isinstance(out.get("id"), str):
        out["id"] = resolve_test_id(out["id"], root=root)
    if isinstance(out.get("prefix"), str):
        out["prefix"] = resolve_prefix(out["prefix"], root=root)
    return out
