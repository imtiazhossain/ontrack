# Muscle Explorer highlight plates (finished art)

**Runtime source of truth:** the JPG files in this folder.

The app shows these stills via `muscle-highlight-plate` / `muscle-highlight-images`.
Invisible hit boxes in `muscle-hit-targets.ts` only choose which JPG to display.

## Do not casually overwrite

`FINISHED_ART.txt` marks this folder as finished art (same idea as
`steps/bench-press/*.jpg`). `scripts/render-muscle-highlights.py` will refuse
to overwrite unless you pass `--force`.

## Adding / replacing a plate

1. Drop a finished illustration at `highlights/<id>.jpg` (prefer ~640×1114, cream background, grayscale body + copper target muscle).
2. Reload Workouts — Metro picks up the new `require()` asset after a refresh.

Sibling muscles without a dedicated frame may alias to a nearby finished plate.
