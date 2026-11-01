# Isometric machine figures (anatomy)

Explain an idea by building it as a real working object: a dense isometric machine, drawn in vector, whose motion is the explanation. The kit and its full instructions are in [`vendor/anatomy/`](../vendor/anatomy/NOTICE.md), from [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) (MIT).

**Status: pilot.** The video adapter is tested on a plain test page only. No anatomy figure has been built or rendered through it yet, and WebGL and 3D figures are untried. Make one shot and get the creator's approval before scaling up.

## When to use it

- **Explainers:** a shot where a mechanism is the point: how a cache key skips work, how a pipeline moves data. Find the machine whose working is the concept: a pin-tumbler lock, not boxes and arrows.
- **Music videos:** a set piece or a whole language, when the song is about machines, systems or tech.
- **Not for:** a list, a quote, a real social post, a talking point with no mechanism. Use the other languages for those.

## Making a figure

Read `vendor/anatomy/SKILL.md` and follow its workflow. It covers sizing, the parts list, the kit, painter's order and the audits. Start by opening `examples/dial-indicator/build.mjs`, the smallest example.

```bash
node vendor/anatomy/examples/dial-indicator/build.mjs      # writes a standalone HTML page next to the script
```

Size it first: a **Figure** is 40–80 parts, a **Hero** is 80–150 parts and takes about 2–4 hours, and an **Epic** takes 6 hours or more and needs the creator's choice before starting.

## Changes for video

Upstream figures are made for a web page. A video shot differs:

- **Motion follows a cue list, not a pointer.** Replace the idle tour and pointer handling with cues from `timeline.json` or the song analysis: `target = cueAt(clock)`. Keep the kit's springs and eases. `--key t:ArrowRight` can also press keys at set times.
- **Timed to the VO or the beat.** Set the clip length from the shot's duration, and let the VO or beat times set the cues, as in every other language.
- **Hide the hint.** The card's interaction hint means nothing in a video. Keep the readout only if it is legible at video size.
- **Readable at a glance.** Upstream rewards zooming to 4×, and a viewer can't zoom. Keep the density, but frame the working part large and move in on it.
- **Colour.** Upstream's tone hierarchy (one lit part) carries over. The palette is still the creator's choice, with two lighting colours at most.
- **Words.** Upstream keeps words out of the drawing. Lyrics and titles go in a layer above it and follow the music-video rules: large, entering from off-screen.
- **No shared graphics between videos.** Examples are for study. Each video builds its own machine.
- **`scripts/publish.mjs` is removed.** It posts to upstream's community gallery. Publishing here goes through [publishing-bilibili.md](publishing-bilibili.md).

## Rendering to video

```bash
node scripts/anatomy-to-video.mjs page.html --out "Drafts/shot.mp4" --duration 6 --fps 60
```

The adapter replaces the page's clock before it loads and steps it one frame at a time, so the same page gives the same frames at any machine speed. It frames `.iso-plate` by default, and `--select none` takes the whole page. It writes video only: mux the song or VO afterwards, or place the clip in Remotion with `<OffthreadVideo>`.

- `--from` steps through the earlier frames without capturing them, so a late start still takes time. Motion stays frame-accurate, unlike seeking.
- CSS transitions and animations are switched off, because the adapter owns time. A figure that relies on them for motion will look frozen, so drive it from JavaScript.
- It refuses to start under 30% free memory and stops under 10%. It stops on any page error and removes the partial file.
- Speed on the test page: about 16 frames a second at 1080p. Real figures will be slower.

## Checks

Run upstream's checks on the built page before rendering, then look at sampled frames from the video:

- `node build.mjs --audit` passes, if the figure has pipes, cables or round parts.
- `node vendor/anatomy/scripts/lines.mjs page.html` prints `line ends: 0`.
- Text checks: nothing cut off, and readable at 1080p.
