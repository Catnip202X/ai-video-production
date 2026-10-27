# Previs → generation

**One line:** block the shot first, generate second. The previs frame carries composition, camera and
blocking; the generator only supplies surface, light and organic movement.

This is the workflow the Japanese MV maker なまなり あい documented for *夕暮れの電車* (TapNow, 2026‑10):
building the train and the station in previs first turned "a train passing behind the character" from
near-total gacha into almost one-take, and made a full 12‑car formation possible
([source post](https://x.com/AiNamanari33743/status/2106200595845853241)). The lesson is not the tool —
it is that **blocking beats prompting**.

## Where it fits this studio

The studio's own renderers (ASCII, IMPACT, three.js, low-poly) are already deterministic previs
machines: every shot has a camera, a subject and a blocking that a still can be exported from. So the
route is:

```
storyboard line ──▶ engine still (previs) ──▶ [optional] image-to-video ──▶ layer or alternate cut
                            │
                            └──▶ deterministic render stays the master
```

Use generation only where the engine is genuinely weak:

- organic performance — faces, hands, acting beats, lip shape
- crowds, cloth, hair, smoke, water, fire
- photoreal or anime-skinned vehicles and machinery at scale (a 12-car train, a fleet)
- shots the creator wants in a live-action or anime look rather than the film's graphic style

Never generate a shot the engine already draws well. The engine is frame-pure, colour-disciplined and
re-renderable; a generated clip is none of those.

## Exporting previs stills

From the music-video project (any frame-pure project works the same way):

```bash
# one contact sheet first, to review composition cheaply
node tools/stills.mjs --project <key> --lines 0-64 --cols 9 --width 214 --out "out/<title>/sheet.png"

# then one full-size PNG per shot, in storyboard order, plus a manifest
node tools/stills.mjs --project <key> --lines 0-64 --outdir "Previs/<title>"
```

`--outdir` writes `001_<time>s.png`, `002_…` … at the project's full resolution (1920×1080), and
`previs.json` describing each still (index, song time, file). The stills come from the same export page
as the final render, so **the previs frame is exactly the frame the film will show** at that moment.

Pick the still at the moment the shot reads best — usually 60–80% through the line, not its first
frame. For a moving subject, export two stills (start and end of the move) and keep both in the shot's
folder.

## Feeding a generator

- **Image-to-video, first frame.** Hand the previs PNG as the start frame, then describe only what
  changes: motion, light, weather, performance. Do **not** re-describe the framing, lens or blocking —
  that fights the reference and the composition drifts.
- **Reference / control passes.** If the tool accepts depth, pose, canny or a reference image, export a
  second still from the engine with the same camera but flat shading (turn the facet lighting down in
  the project options). Same composition, less style baked in, so the generator's look wins.
- **Consistency across shots.** Reuse one character reference still plus a seed family per character;
  record the seed and the tool version next to the shot in the storyboard's decision log.
- **Duration.** Generate a little longer than the line and trim to the cut; generators often lose the
  pose in the last frames.

## Rules

1. **The deterministic render is the master.** Generated footage is an added layer, an insert, or a
   separate cut — never a silent replacement of frames the engine drew.
2. **One shot, one route.** Don't interleave generated and vector frames inside a single shot without
   the creator's explicit OK (continuity breaks and the frame-purity rule is lost).
3. **Log every generated shot** in the decision log: date, shot index, tool, reference still, seed,
   what was generated and why. A generated shot that isn't logged can't be reproduced.
4. **Check against the previs.** Lay the generated clip next to the still: silhouette must hold, limbs
   must not morph, the camera must not drift. Reject and re-roll rather than patch.
5. **Credits and cost.** Name the generation tool in both credit files; a paid tool is a budget line the
   creator approves before use (rule 9 in SKILL.md covers day-to-day decisions, not spending).
6. **Likeness and IP.** Generated footage of a real person's likeness, or of a recognisable protected
   design, stays out of the film.
7. **Keep the previs.** The stills stay in the project so the shot can be re-generated, re-framed, or
   fall back to the engine alone.

## QC before the clip enters the cut

- frame count and duration match the line's window (within a frame)
- no limb/train/wheel breakage at cuts or fast pans
- colour stays inside the video's palette (grade if needed — the palette is the creator's)
- the previs composition is still readable when the clip is on screen for only 1.5 s
- if the shot fails three generations, fall back to the engine's own render
