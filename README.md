# ai-video-production

A [Claude Code](https://claude.com/claude-code) skill for one person making AI-assisted videos, from script to upload. It covers narrated Chinese explainers and lyric-synced music videos.

- **Script and storyboard:** templates, plus a storyboard that doubles as the project's memory (locked decisions, shot list, decision log).
- **Visual languages:** six styles, each mapped to a tool: illustration and hand-drawn rough.js in Remotion, p5.brush ink, three.js, manim, Blender.
- **Voiceover:** a GPT-SoVITS / [MamboTTS](https://github.com/Tsukimisaka/MamboTTS) engine reads one whole sentence at a time into per-shot folders, Whisper re-listens to every line and re-takes the ones with dropped words, and shot durations are timed to the voiceover.
- **Motion graphics:** a Remotion starter driven by the voiceover timeline. It includes rough.js primitives, burned-in subtitles, code-generated sound effects and contact-sheet stills.
- **Real social posts:** shown as faithful cards, original text first, then a translation covering it.
- **Music videos:** beat, section and key analysis; Demucs + Whisper lyric timing force-aligned to the official lyric text; frame-pure rendering.
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

## License

MIT, see [LICENSE](LICENSE). Bundled third-party pieces keep their own terms: MamboTTS voice weights, GPT-SoVITS, Remotion (which has its own company licence for larger teams).
