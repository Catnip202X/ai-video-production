# Song music videos

A lyric-synced music video is built from analysis data computed once per song. A frame-pure browser renderer draws the picture, and the song is muxed in at the end.

## Pipeline

1. **Get the audio.** Use a source the creator names. Ask before downloading, and state the file, source, size and licence. Then:
   - `uvx yt-dlp -f bestaudio -o "audio/<title>/<key>.%(ext)s" <url>`
   - `ffmpeg -i in -ar 44100 -ac 2 audio/<title>/<key>.wav`

   Never overwrite the original; keep it as `.original.wav`.
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
   - **Repair:** weak lines (< 60% anchored) and loud vocal stretches where no words were heard are re-transcribed in ±2.5 s windows, and kept only if alignment improves. Hand overrides go in `<wav>.lyrics.fix.json` as `{"lineIdx": [start, end]}`.
5. **Storyboard per lyric line,** together with the creator. For each line note: scene, shot (wide / left / right / close / low / high / dutch), text mode, lead and hold, and transitions. Sections with energy > 0.6 get punchier text, e.g. word-by-word instead of line-by-line. A line's scene holds about 0.35 s after its last word.
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
    - Numbered drafts: `out/<title>/<title> N.mp4`.
    - The approved cut: `<title> final.mp4`.
    - Credit files in every language the audience uses, listing song credits and CC-BY assets.
    - Never mix two songs in one folder.

## Style lessons

- **Camera:** slow drift only. No per-line kicks, downbeat zoom punches or glitch jolts. Use shake only for a story beat, and ease it.
- **Lyric text:** pin it to fixed screen positions like a stencil. With text-art styles this cut per-frame character churn from about 50% to about 5%. Give every CJK character its own x position so wide glyphs don't shift the row.
- **Colour:** one colour per object, and the same kind of object always has the same colour. Keep it semantic, e.g. coins gold, bills green. Background scenery doesn't count toward these rules.
- **Composition:** don't hog the centre. Use thirds, crops and dutch angles.
- **3D models:**
  - Z-up rigged models come in lying flat; upright them automatically.
  - Avoid transparent volumes.
  - Low-poly, near-black models read as blobs; show figures in a fixed wide shot and larger.
  - CC0 / CC-BY models need crediting.
  - Don't copy copyrighted character designs.
- **Synthesized soundtrack layers:** initialise every filter coefficient. Unset ones produce NaN and a silent track.
- **In chat:** don't reproduce song lyrics. Talk about line counts and timings.
- **Chinese text:** use Simplified Chinese unless the song's own lyrics are Traditional.
