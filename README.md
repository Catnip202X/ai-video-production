# ai-video-production

A [Claude Code](https://claude.com/claude-code) skill for one person making AI-assisted videos, from script to upload. It covers narrated Chinese explainers and lyric-synced music videos.

- **Script and storyboard:** templates, plus a storyboard that doubles as the project's memory (locked decisions, shot list, decision log).
- **Visual languages:** each mapped to a tool: illustration and hand-drawn rough.js in Remotion, IMPACT kinetic poster type (SVG + opentype.js glyph morphing), ASCII (three.js rendered to characters), GL glowing line art (HDR bloom, motion blur, real 3D), isometric machine figures ([anatomy](https://github.com/wheresryan22/anatomy) kit, in pilot), p5.brush ink, three.js, manim, Blender. Plus a catalog of the 66 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) film styles (newsreel, satellite briefing, ink wash, ukiyo-e, risograph, pixel RPG and more), each with a style prompt and a way to render it in this pipeline.
- **Voiceover:** a GPT-SoVITS / [MamboTTS](https://github.com/Tsukimisaka/MamboTTS) engine reads one whole sentence at a time into per-shot folders, Whisper re-listens to every line and re-takes the ones with dropped words, and shot durations are timed to the voiceover.
- **Motion graphics:** a Remotion starter driven by the voiceover timeline. It includes rough.js primitives, burned-in subtitles, code-generated sound effects and contact-sheet stills.
- **Real social posts:** shown as faithful cards, original text first, then a translation covering it.
- **Music videos:** beat, section and key analysis; Demucs + Whisper lyric timing force-aligned to the official lyric text; frame-pure rendering; every video with its own graphics and palette, and a new scene for every repeated line.
- **Publishing:** through the patched [bilibili-mcp](https://github.com/Catnip202X/bilibili-mcp/tree/patched), which adds an encrypted credential vault, scheduled publishing, a 4:3 cover and the AI-content declaration.

## Install

```bash
git clone https://github.com/Catnip202X/ai-video-production.git ~/.claude/skills/ai-video-production
```

Claude Code picks the skill up automatically. Start with [`SKILL.md`](SKILL.md).

## Requirements

- **Voiceover:** Python 3 (the voiceover scripts use only the standard library), plus a running GPT-SoVITS `api.py` (see [`references/tts-voiceover.md`](references/tts-voiceover.md)).
- **ASR check and music analysis:** [uv](https://docs.astral.sh/uv/), because those scripts pull their dependencies inline. The Whisper check and lyric timing use mlx-whisper, so they need Apple Silicon.
- **Motion graphics:** Node 18+ for Remotion.
- **Machine figures:** Node 22+, Chrome and ffmpeg.
- **GL engine, `tools/` commands:** these live in the separate music-video workspace, which is not part of this repo.

## License

MIT, see [LICENSE](LICENSE). Bundled third-party pieces keep their own terms: MamboTTS voice weights, GPT-SoVITS, Remotion (which has its own company licence for larger teams), [anatomy](vendor/anatomy/NOTICE.md) (MIT, © 2026 Ryan). The GL engine and lyric alignment method come from [pdoom-video](https://github.com/mexicat/pdoom-video) (MIT, © 2026 Giacomo Magnanini). The library film styles are catalogued from [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) by LemoLab (code and docs MIT, demo films CC BY 4.0); the style prompts are fetched from that repo, not bundled.
