# Visual languages

Each video picks **one** visual language in the storyboard's *Visual style / look* field. The rendering tool follows from the language. Pick it from the script's tone, and keep one main language per video with at most one accent.

| 视觉语言 / language | Tool | How it is produced | Good for |
|---|---|---|---|
| 插画 flat illustration / motion graphics | Remotion (React + SVG/CSS), or plain Canvas 2D | Frame-pure components rendered by Remotion; Canvas 2D frames piped to ffmpeg | Explainers, cards, icons, kinetic type (**default for explainers**) |
| 手绘草图 hand-drawn sketch | rough.js inside Remotion SVG | Shapes "drawn" stroke by stroke with dash offset; seeds rotated for line boil | Whiteboard feel, casual explanations, process diagrams |
| 水墨 / 水彩 ink & watercolour | p5.js + p5.brush | Sketch stepped frame by frame, `saveCanvas` per frame, or a headless capture | Mood, Eastern themes, transitions |
| 3D | three.js | WebGL scene, one frame captured per tick (CCapture or Playwright) | Spatial structure, objects, camera moves |
| 板书动画 maths / derivation | manim | `manim -pqh scene.py` produces an mp4 directly | Formulas, step-by-step derivations, charts built up |
| 粘土质感 clay | Blender | Modelling plus materials (subsurface, fingerprint normal map), Cycles/EEVEE image sequence | Characters, stop-motion feel, tactile shots |

The first two have been used in full productions. The others are mapped, but treat their first use as a pilot: make one shot, get the creator's approval, then scale up.

## Install

```bash
# Remotion / rough.js / p5 / three.js: npm or CDN, no system install
pip install manim
brew install --cask blender
```

## Rules for any language

- **Frame-pure rendering.** Every frame is a function of time *t* plus precomputed data:
  - seeded RNG, never `Math.random()`
  - no CSS transitions or wall-clock timers
  - with Remotion, all motion comes from `useCurrentFrame()`

  Frame-pure renders can be resumed, run in parallel, and produce identical stills.
- **Write a design system file first** (`theme.js`): palette with meanings, fonts, fps, size. Shots use only tokens from it.
- **Keep text crisp.**
  - Use system CJK fonts for Chinese, e.g. PingFang SC for UI and Hannotate SC / HanziPen SC for hand-drawn.
  - Put a paper-coloured stroke behind titles that sit on lines.
  - Burned-in subtitles go bottom centre, ≤ 18 characters per cue.
- **Explainer look.** Use flat vector shapes, cards, smooth easing curves (`cubic-bezier(0.22,1,0.36,1)` out, `(0.65,0,0.35,1)` in-out), springy pops and kinetic type. Don't make it look like a stock template, and don't style it after the subject matter.

## Hand-drawn (rough.js) specifics

- Cache `rough.generator()` paths by (shape, args, options, seed).
- **Boil:** re-seed every 1/6 s by rotating 3 seeds. Hand-drawn animation flickers slightly like this; static rough lines look dead.
- **Draw-on:** use `pathLength=1` + `strokeDasharray="1 1"` + `strokeDashoffset=1-p`. Fade hachure fills in alongside the stroke.
- **Handwritten text:** reveal it left to right with `clip-path: inset(...)`.
- **Background:** cream paper `#F6F1E7` with a faint blue grid, a subtle vignette, black ink `#1E1E1E`, and annotation colours red / blue / highlighter yellow / green.
- **Real-world artefacts** (posts, screenshots) keep their own look. They get "taped" onto the paper, slightly rotated.
- **Stills and thumbnails** render at frame 0, so draw every shape with a negative `at` to show it finished.
