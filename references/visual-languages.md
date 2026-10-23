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
| IMPACT 大字 kinetic poster type | Pure SVG + opentype.js glyph outlines, in a frame-pure browser renderer | One screen per lyric/VO line; captured frame by frame like the other browser languages | Rap, slogans, high-energy sections; whenever the words themselves are the picture |

The first two have been used in full productions. IMPACT is built and demoed in the music-video renderer but has not shipped in a finished video yet. The others are mapped only. Treat the first real use of any of these as a pilot: make one shot, get the creator's approval, then scale up.

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

## IMPACT kinetic type specifics

The whole frame is the words.

- **Type:**
  - Huge condensed type: Impact for Latin; a heavy system CJK face (e.g. Apple SD Gothic Neo Heavy) for Korean and Chinese.
  - Flat poster colours: ink black, paper white, bright yellow, red, royal blue. Colour is a theme, not part of the language: `mono` and `wire` themes have none.
  - All of it is SVG text and shapes. Nothing is rasterised.
- **Motion:**
  - There is **no camera shake**. The energy comes from how words enter and from the graphics.
  - **One screen per line.** If the next line cuts in while the previous one is still animating, the old line stays underneath for about 0.45 s and fades, so motion is never hard-cut.
- **Three word states run through every mode:**
  - not yet sung = outline
  - sung = solid
  - being sung = highlight colour with a pop
- **Storyboard entry per line:** `{ mode, motif, picto, at, theme, opts, cont, lead, hold }`. Lines without an entry get a mode picked automatically from section energy.

**Text modes**

- *Poster* (solid type, flat colour blocks):
  - `stack`: the line set in justified rows that fill the width
  - `slam`: only the current word, full frame
  - `ticker`: counter-scrolling bands
  - `knockout`: the sung word becomes a window onto moving stripes
  - `split`: the word cut diagonally, halves in inverted colours
  - `wall`: the word tiled as outlines, with one solid tile
  - `vertical`: the line rotated 90° down the left, graphics on the right
  - `title`: for intro and outro cards
- *Wireframe* (thin lines, outline echoes):
  - `drop`: words fall in from the nearest edge, trailing echoes
  - `multiply`: the line copies itself downward on each beat
  - `box`: an outline box is drawn for each word; the box collapses into a strikethrough when the word is sung
  - `scatter`: letters fly in and fall out
  - `giant`: a huge outline word drifts behind small solid text
  - `shuffle`: a colour bar sweeps the word and the letters unscramble

**Motifs and pictograms**

- **Abstract motifs:** bars per bar, rings per beat, slow rays, stripes, halftone dots, chevrons, falling blocks, a swinging disc, corner labels, or none.
- **Pictograms** illustrate what the line says, mentions or implies. Draw them as poster illustration, not icons:
  - bold stroke and hard drop shadow
  - halftone or hatched shading
  - several layered parts with parallax
  - lines that draw themselves, a pop on entry, a slight breathing motion on the beat
- **Placement:**
  - Author pictograms in a 100×100 box.
  - Place them `right` (the default), `left`, or `back` (enlarged and faded behind the text).
  - The frame **bleeds off-screen**, so a pictogram reads as a cropped poster, not a shrunken icon.

**Fusing words and pictograms.** Each pictogram defines an anchor point and a silhouette path.

- `absorb`: the sung word is sucked into the pictogram, which swells as it lands.
- `shout`: the word shoots out of the pictogram and settles into its place.

**Real glyph morphing.** opentype.js reads the font, so each letter is a set of closed contours that can be interpolated point by point into any closed shape.

- `morph`: sung letters become vertical slices of the pictogram's parts; together the line forms the picture.
- `blocks`: solid blocks morph into letters as they are sung.
- `bar`: the finished line squashes into one thin bar.
- `wave`: a travelling wave passes through the letters.
- `melt`: sung letters sag and stretch downward.
- `match`: the letters act out the line's pictogram. This is the default when a line has a pictogram and no mode. Every pictogram gets its own warp:

  | Pictogram | What the letters do |
  |---|---|
  | banknote | flutter like paper |
  | coins | drop in and stack |
  | skyline | rise from the baseline |
  | crosshair | a scope lens magnifies the sung word |
  | calendar | flip down from a hinge |
  | safe | twist in like a dial |
  | tree | sway, more at the top |
  | cassette | smear in fast-forward |
  | heartbeat | grow out of a flat line with a running spike |

  Adding a pictogram means adding a drawing function plus a warp for it. Lines without a pictogram can use `match` with `wave` or `melt`.

**Fonts.** Subset the CJK font per song to just the characters it uses (fontTools, a few tens of KB). System fonts are licensed for local rendering only, so never redistribute the subset. Without the subset file, CJK characters fall back to plain text in the morphing modes.
