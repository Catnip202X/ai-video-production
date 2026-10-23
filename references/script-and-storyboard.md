# Script and storyboard

## Project layout

```
Projects/<视频标题>/
  Script.md            the words: scenes, VISUAL / VO / MUSIC-SFX, sources
  Storyboard.md        the decisions: locked choices, shot list, decision log, open questions
  pronounce.json       optional, project-only TTS readings (see tts-voiceover.md)
  Audio Tracks/VO v1/  generated per-sentence VO, timeline.json, full track, SRT
  Drafts/              draft renders, A/B comparisons
Completed Renders/<视频标题>/   approved final + SRT
```

Start from `templates/Script.md` and `templates/Storyboard.md`.

## Writing the script

- Start with a **logline**: one or two sentences on what the video is about and why someone would watch it.
- Add a short **写作原则 (writing principles, not in the video)** block for the rules this video follows. Examples:
  - "every fact has a source; unverified claims say 据报道 or are cut"
  - "the title's metaphor is explained in the ending"
  - "narration uses 我"
- Each **Scene** contains:
  - a `Storyboard shots:` line
  - an `Audio:` path
  - a `**VISUAL:**` block
  - a `**VO / DIALOGUE:**` block of `>` quote lines
  - a `**MUSIC / SFX:**` block
- **Tagging VO lines for the TTS script.** Start a VO line with its shot ID, for example `> [S3-02] ……`. Untagged lines that follow belong to the same shot until the next tag. Every scene's first VO line must be tagged, or `generate_vo.py` refuses to run.
- **Write for the ear.**
  - Keep sentences short, one idea each.
  - Spell out or rephrase anything the TTS will stumble on, such as long English acronyms or a term it keeps dropping.
  - Explain with concrete metaphors and recurring props. Examples: a restaurant with one waiter for a worker process, an apartment building for VMs, a passport and stamp for certificates.
- **Close with a 事实来源 (sources) section.** List every claim's URL. Social posts are cited by URL.
- **Keep a revision-notes table** (date / change / why) at the bottom.

## Storyboard

**Locked decisions** apply to the whole video. Change one only on purpose, and log the change.

- Aspect ratio, resolution and fps. Explainers default to 16:9 at 1920×1080, 30 fps; 60 fps suits smooth flat motion.
- Visual style / look: one entry from `visual-languages.md`, described concretely. Example: "cream graph paper, black marker lines, every shape drawn stroke by stroke, lines boil 6×/s".
- Color palette as hex values with meanings: red = danger, blue = defence, yellow = highlight, green = fixed. Give each storyline its own marker colour.
- Pacing: the VO timing parameters (lead / gap / tail) and the minimum duration per shot type.
- Recurring characters or props, and which scenes they return in.
- Voiceover engine, voice, and the pronunciation-table location.
- Motion-graphics source location and versions.
- Typography: the hand-drawn font, the UI font, and the subtitle style and position.

**Shot list columns:** `Shot ID | Scene | Description | Framing / Camera | Duration | Min | Audio cue | Draft file | Status`

- Shot IDs are `S<scene>-<nn>`. The same IDs tag VO lines, name the VO folders and key the Remotion shot registry.
- `Duration` is written by `assemble_vo.py --update`; don't hand-edit it once VO exists.
- `Min` is a floor for shots that need screen time beyond the speech: post cards (≥ 6 s so the original text shows ≥ 2.5 s), title cards and end cards. Shots without VO use `Min`.
- Status: Planned → Drafted → Approved → Cut.
- A `**合计：**` line under the table gets the total, rewritten automatically.

**Decision log:** newest first. Columns: `Date | Shot / Scope | Decision | Reason | Decided by`. Log:

- creator requests, and who decided them
- your own fixes, such as "rewrote S6-01 VO because the engine kept dropping 签名"
- content-integrity calls, such as "promo video not used, it doesn't clearly show the topic"
- copyright calls, such as "embedded demo video muted, its music may trigger content ID"

**Open questions:** checkboxes for anything waiting on the creator, such as title A vs B or the sign-off handle.

## Series / recurring formats

For a daily or weekly format:

- Make each episode a folder with a `shots.json` that lists **templates + parameters** (title, post card, stat, credits) instead of bespoke shot code.
- Generate the storyboard table from that file.
- Reuse one Remotion project whose shot components are those templates.
- Set default `Min` values per template, e.g. title 5 s, post 7 s, credits 8 s.
- Keep upload metadata (title, description, tags, category, scheduled publish time, cover paths, AI-content flag) in an `upload.json` per episode. It waits for the creator's go-ahead.
