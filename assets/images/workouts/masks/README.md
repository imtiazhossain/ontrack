# Muscle highlight masks (offline bake only)

The **app displays JPGs** from `../highlights/`, not these masks directly.
Invisible hit boxes in `muscle-hit-targets.ts` choose which JPG to show.

White-on-black mattes here feed the optional bake:

```bash
python3 scripts/paint-muscle-masks.py
python3 scripts/render-muscle-highlights.py
```

To improve how a muscle looks in Explorer, replace or rebake
`../highlights/<id>.jpg` — that file is the source of truth at runtime.
