# Song music videos

A lyric-synced music video is built from analysis data computed once per song. A frame-pure browser renderer draws the picture, and the song is muxed in at the end.

## Pipeline

1. **Get the audio.** Use a source the creator names. Ask before downloading, and state the file, source, size and licence. Then:
   - `uvx yt-dlp -f bestaudio -o "audio/<title>/<key>.%(ext)s" <url>`
   - `ffmpeg -i in -ar 44100 -ac 2 audio/<title>/<key>.wav`

   Never overwrite the original; keep it as `.original.wav`.

   Official-video uploads often end in long digital silence. Find it with
   `ffmpeg -i in.wav -af silencedetect=n=-50dB:d=1 -f null -`, then cut there with a short fade.
   Trimming only the tail leaves every lyric timing valid.
2. **Analyse the song:** `uv run scripts/music/analyze.py "audio/<title>/<key>.wav"`. It writes `<wav>.analysis.json`:
   - librosa at 22 050 Hz mono, hop 512
   - tempo and beats via `beat_track`
   - downbeats: the beat phase with the most < 150 Hz energy
   - onsets
   - key: Krumhansl profiles over `chroma_cqt`
   - sections: agglomerative clustering of beat-synced chroma + 13 MFCC + RMS, with k = duration/15 clamped to 3–12. Boundaries snap to downbeats, and sections under 4 s are dropped.
   - section labels A/B/C (cosine > 0.985 counts as the same label) and energy from 0 to 1
3. **Get the lyric text** from an official or annotated source the creator provides. **Never from Whisper or from memory.** Save it to `lyrics/<key>.txt`, one line per lyric line, with section markers turned into blank lines.
4. **Time the lyrics:** `uv run scripts/music/lyrics.py "audio/<title>/<key>.wav"` writes `<wav>.lyrics.json`. Aim for more than 95% of words aligned.
   - **Vocals:** Demucs `--two-stems=vocals -n htdemucs` writes `stems/vocals.wav` (cached).
   - **Transcription:** mlx-whisper `large-v3-turbo` with word timestamps. Settings: `condition_on_previous_text=False`, `no_speech_threshold=0.5`, `compression_ratio_threshold=2.2`, and the lyric text (≤ 800 characters) as the initial prompt.
   - **Hallucination filter:** drops segments with compression > 2.4 or no_speech > 0.7; words with vocal RMS < 0.08 or probability < 0.1; "words" over 24 characters; and anything repeated 4+ times in a row.
   - **Multilingual songs:** an extra Whisper pass runs per script present (ko / ja / zh / ru), and the words are merged in. Use a Unicode-aware normaliser; an ASCII-only one silently broke the Korean lines.
   - **Alignment:** Needleman–Wunsch against the official text (gap −0.45, difflib similarity). Chinese aligns per character after OpenCC t2s conversion.
   - **Repair:** weak lines (< 60% anchored) and loud vocal stretches where no words were heard are re-transcribed in ±2.5 s windows, and kept only if alignment improves. Hand overrides go in `<wav>.lyrics.fix.json` as `{"lineIdx": [start, end]}`; add `"spread"` as a third item (`[start, end, "spread"]`) to re-spread words the aligner piled onto one instant.
   - **Chants Whisper can't hear** (e.g. "Go-go-go-go-go-gods" over a heavy drop) come out squashed to a fraction of a second. Time them by hand:
     - print the vocal stem's loudness in 0.125 s cells to find the gaps between phrases
     - snap the phrase starts to the downbeats from the analysis
     - a repeated section (post-chorus 2) is the first one shifted by the chorus-to-chorus offset
     - a hyphenated chant is a single lyric "word", so it lights up all at once; let the scene stagger it letter by letter.
5. **Ask the creator for the colour palette**, every video. Don't reuse a previous video's palette or fall back to a saved one.
   **Storyboard per lyric line,** together with the creator. For each line note: scene, shot (wide / left / right / close / low / high / dutch), text mode, lead and hold, and transitions. Sections with energy > 0.6 get punchier text, e.g. word-by-word instead of line-by-line. A line's scene holds about 0.35 s after its last word.
6. **Build scenes** in the chosen visual language. Every frame is a pure function of `t` plus the analysis: seeded RNG, no CSS transitions, `@keyframes` frozen to frame time. The audio reactivity (FFT bands, bass/mid/high, beat and downbeat decay, beat phase, current section) is computed from the same data.
7. **Preview** in a local dev server with a seek hook (`window.__seek(s)`). Review contact sheets with one still per lyric line, taken 70% through the line and tiled with ffmpeg.
8. **Render:**
   - Headless Chrome (Playwright, `--force-color-profile=srgb`) with N workers. Each calls `renderFrame(n)` and captures a PNG over CDP.
   - Frames go through `image2pipe` into ffmpeg together with the song.
   - h264: `libx264 -preset slow -crf 12 -pix_fmt yuv420p -movflags +faststart` and AAC 320k. Masters: ProRes 4444 (`prores_ks -profile:v 4`) or FFV1 + FLAC.
   - Speed: about 35 fps with 4 workers at 1080p60 (≈ 6 min for a 3.5-min song).
   - Render a short range first, then the full song in the background.
9. **Check every render:** frame count, duration, `volumedetect` levels, sampled frames.
10. **Deliver:**
    - Numbered drafts: `out/<title>/<title> N.mp4`. A second cut of the same song (another visual language) keeps counting in the same folder.
    - The approved cut: `<title> final.mp4`.
    - Credit files in every language the audience uses, listing song credits and CC-BY assets. Fill in the **complete** credits yourself (writers, producers, mix, master, label, release date), never a "fill in later" placeholder. The source upload's description often lists them: `uvx yt-dlp --skip-download --print description <url>`. Then try label and streaming pages, the game or artist wiki, VGMdb and Genius.
    - Never mix two songs in one folder.

## Every video looks like itself

- **No two videos share graphics.** Models, scenes, pictograms, sprites and background patterns are made for one video only, in any visual language. A re-cut of the same song in another language counts as a new video and needs new graphics too. Engines (renderers, text modes, warps, lighting) stay shared. Before building a scene, check the other projects for the same subject and take a different angle on it.
- **No scene replays within a video.** Every pass of a repeated lyric (each chorus, post-chorus and pre-chorus) gets a **new scene**: another picture of the same words. For example, "crumble one by one" became obelisks, then a house of cards, then statues, then a brick wall. Only the song's **main motif** (e.g. a crown) may recur, and each time it does something else (descends, grows, assembles from shards, throws beams, falls) in another framing.
- **The palette is the creator's choice** for every video (step 5).

## Style lessons

- **Camera:** slow drift only. No per-line kicks, downbeat zoom punches or glitch jolts. Use shake only for a story beat, and ease it.
- **Lyric text:** pin it to fixed screen positions like a stencil. With text-art styles this cut per-frame character churn from about 50% to about 5%. Give every CJK character its own x position so wide glyphs don't shift the row.
- **Colour:** one colour per object, and the same kind of object always has the same colour. Keep it semantic, e.g. coins gold, bills green. Background scenery doesn't count toward these rules.
- **Composition:** don't hog the centre. Use thirds, crops and dutch angles.
- **ASCII (3D → characters) at ~114×33 cells:**
  - Auto camera presets crop tall or wide subjects (hourglasses, organs, speaker walls) out of frame. Give those scenes a fixed camera.
  - Bright volumes (light cones, emissive shafts) swallow everything near them. Use a few thin rays instead.
  - Keep the hero visible: a rider in front of a sun hides the sun. Put the subject low and to one side.
  - Fine structure (a square maze, small figures, thin chains) turns to mush. Use bold forms, e.g. a round labyrinth instead of a grid maze, and figures scaled up.
  - Thin spikes on a band read as a claw. A crown needs a tall band and broad triangular points.
  - Flat-shaded faceted meshes draw many edge glyphs; smooth shading reads calmer.
  - When something seems missing in a still, render it with `backdrop: false`. The big background word often just covers it.
  - Collapses and other progressive actions should span the whole line, not finish in the first second.
- **3D in a vector style:** a three.js mesh can be drawn as flat SVG polygons each frame: transform, cull back faces, light each face, quantise it into a few fixed tones per material, sort back to front, and draw an ink silhouette (all faces in ink with a thick stroke) behind them. A ~15k-triangle model renders in about 10 ms a frame and stays fully vector.
- **3D models:**
  - Z-up rigged models come in lying flat; upright them automatically.
  - Avoid transparent volumes.
  - Low-poly, near-black models read as blobs; show figures in a fixed wide shot and larger.
  - CC0 / CC-BY models need crediting.
  - Don't copy copyrighted character designs.
- **Synthesized soundtrack layers:** initialise every filter coefficient. Unset ones produce NaN and a silent track.
- **In chat:** don't reproduce song lyrics. Talk about line counts and timings.
- **Chinese text:** use Simplified Chinese unless the song's own lyrics are Traditional.
