---
name: ai-video-production
description: End-to-end production of AI-assisted videos by a solo creator — writing the script, storyboarding with a decision log, picking a visual language and the tool that renders it, generating sentence-level Chinese TTS voiceover with a GPT-SoVITS engine (e.g. MamboTTS) and ASR-checking it, timing shots to the VO, building motion graphics in Remotion (clean illustration or hand-drawn rough.js), showing real social posts as translated cards, making lyric-synced song music videos, and publishing to Bilibili through a patched bilibili-mcp. Use when the user wants to make, script, storyboard, voice, animate, render or revise an explainer / tutorial / news video or a music video, or says 写脚本, 分镜, 配音, 动画, 动态图形, 视觉语言, 音乐 MV, 做视频.
---

# AI video production

A pipeline for one person making narrated explainer videos (and song music videos) with AI tools.
Every stage writes files the next stage reads, so any stage can be redone without breaking the rest.

```
Script.md ──generate_vo.py──▶ Audio Tracks/VO v1/<shot>/<shot>_NN.wav + lines.json
    │                                   │ verify_vo.py (ASR re-listen, retakes)
    │                                   ▼
Storyboard.md ◀──assemble_vo.py --update── timeline.json + VO full v1.wav + .srt
    │                                   │ sync_vo.sh
    ▼                                   ▼
visual language ──▶ Remotion project (one component per shot, timed off the VO) ──▶ draft mp4 ──▶ final
```

## The rules that matter most

1. **The VO drives the timing.** Write the script, generate the voiceover, then time the shots to it. Don't time it the other way round. Animation cues hang off sentence times (`L[0].start`, `within(L[1], 0.5)`), so re-recording a line moves the picture with it.
2. **TTS one whole sentence at a time.** Never split at commas. Each sentence is its own file, grouped in one folder per shot. Fragmented reads sound slow and robotic.
3. **Every VO line is checked by ear or by ASR.** Character-voice TTS engines silently drop words. Transcribe each line, re-synthesize the flagged ones, and rewrite a sentence that keeps failing.
4. **One visual language per video** (at most one accent). The storyboard's *Visual style / look* field names it and the tool follows from it. See [references/visual-languages.md](references/visual-languages.md).
5. **Explainer graphics are clean motion graphics.** Even when the topic is a stylised art form (e.g. ASCII music videos), the explainer shots stay clean. Only footage of the work itself carries its style.
6. **The storyboard is the project's memory.** It has locked decisions, a shot list, a decision log (date, scope, decision, reason, *decided by*) and open questions. Your own proposals stay marked 待确认 / proposed until the creator confirms them. Never build on an unconfirmed proposal.
7. **Real sources only.** News visuals use real posts, shown faithfully with their original media. A deleted post is labelled deleted and never reconstructed. Every fact in the script has a source.
8. **Match the creator's voice.** A solo creator narrates as 我, not 我们. Ask the creator once and record it.
9. **Publishing is the creator's call.** Render, write the upload metadata, then stop and ask before uploading or posting anything. Upload through the patched [bilibili-mcp](https://github.com/Catnip202X/bilibili-mcp/tree/patched). Its credential vault is off-limits to the assistant.

## Stages

| Stage | What to do | Reference |
|---|---|---|
| 1. Project | Copy `templates/Script.md` + `templates/Storyboard.md` into `Projects/<title>/` with `Audio Tracks/` and `Drafts/` | [script-and-storyboard.md](references/script-and-storyboard.md) |
| 2. Script | Logline, scenes, VISUAL / VO / MUSIC-SFX blocks, `[S#-##]` shot tags on VO lines, sources at the end | same |
| 3. Storyboard | Lock aspect ratio, visual language, palette, pacing, typography, recurring props; draft the shot list with a `Min` column | same |
| 4. Voiceover | Start the engine → `generate_vo.py` → `verify_vo.py` → `assemble_vo.py --update`; per-project `pronounce.json` | [tts-voiceover.md](references/tts-voiceover.md) |
| 5. Motion | Remotion project from `templates/remotion-starter/`; `sync_vo.sh`; one component per shot; contact-sheet stills; render | [motion-graphics.md](references/motion-graphics.md) |
| 6. Post cards | Fetch real posts, show the original text first, then a translation covers it | [social-post-cards.md](references/social-post-cards.md) |
| 7. Review | The creator watches the draft; log every change in the decision log; bump the VO / draft version | — |
| 8. Publish | Covers + `upload.json`, then upload through the patched bilibili-mcp, only with the creator's per-upload OK | [publishing-bilibili.md](references/publishing-bilibili.md) |
| Music video | Song → analysis → lyric timing → palette (the creator picks it, every video) → per-line storyboard with a new scene for every repeated line → frame-pure renderer → mux. No graphics shared with any other video | [music-videos.md](references/music-videos.md) |

## Scripts in this skill

- `scripts/generate_vo.py <Script.md> [--shot S3-02] [--scene 5] [--speed 1.05] [--dry-run]` reads the tagged VO lines and synthesizes one sentence at a time. It uses only the standard library.
- `scripts/verify_vo.py <Script.md> [--takes 3] [--numbers]` re-listens to every line with mlx-whisper (via `uv`) and re-takes lines with missing words. `--numbers` prints Chinese readings for all the numbers in the script.
- `scripts/assemble_vo.py <Storyboard.md> [--update] [--lead 0.4 --gap 0.35 --tail 0.6]` computes shot durations from the VO, writes `timeline.json`, the full VO track and an SRT, and writes the durations back into the shot table.
- `scripts/music/analyze.py <song.wav>` finds tempo, key, beats, downbeats, onsets and labelled sections with energy (uv inline deps).
- `scripts/music/lyrics.py <song.wav>` separates the vocals with Demucs and gives word-timed lyrics with Whisper, force-aligned to official lyric text when it is provided.
- `templates/remotion-starter/` is a Remotion project wired to `timeline.json`. It includes rough.js primitives, VO and subtitle tracks, a synthesized-SFX generator and a contact-sheet stills tool.

## Working habits

- **Before changing a pronunciation or style rule,** make short A/B clips or stills and let the creator choose by ear or eye. Put them in `Drafts/<what is being compared>/`.
- **Review with contact sheets** first (`node tools/stills.mjs out/sheet --shots`), then render a short frame range, then the full draft in the background.
- **Version, don't overwrite:** `VO v1` → `VO v2`, and `<title>_draft_v1.mp4` → `_v2`. Approved finals go to `Completed Renders/<title>/` together with the SRT.
- **Keep a project index** (one row per video: status, length, visual language, final file) if the creator has several videos in progress.
- **Copyright:** mute embedded third-party video audio when it has background music, because platform content ID will flag it. Generate SFX in code. Credit CC-BY assets.
