# TTS voiceover (GPT-SoVITS / MamboTTS)

## Engine

[MamboTTS](https://github.com/Tsukimisaka/MamboTTS) packages a GPT-SoVITS v2 voice (曼波) for Windows/NVIDIA. It runs on Apple Silicon too. Any GPT-SoVITS voice works the same way.

**Mac port, from scratch:**

1. Clone upstream GPT-SoVITS at tag `20250606v2pro`. Put the voice weights from the MamboTTS release zip (`*.pth` SoVITS, `*.ckpt` GPT, `refer.wav`) in `models/`.
2. Use a **Python 3.11** venv inside `GPT-SoVITS/`. **scipy ≥ 1.16** is needed, because ≤ 1.15 wheels fail to load on recent macOS.
3. Create the empty directory `GPT_SoVITS/pretrained_models/fast_langdetect/`, or language detection crashes.
4. Start script (about 1 minute to load):

```zsh
#!/bin/zsh
ROOT="${0:A:h}"; cd "$ROOT/GPT-SoVITS" || exit 1
export PYTORCH_ENABLE_MPS_FALLBACK=1          # unsupported MPS ops fall back to CPU instead of crashing
REF_TEXT="<exact transcript of models/refer.wav>"   # must match the reference clip word for word
exec .venv/bin/python api.py -a 127.0.0.1 -p 9880 -d "${DEVICE:-mps}" -fp \
  -s "$ROOT/models/<voice>.pth" -g "$ROOT/models/<voice>.ckpt" \
  -dr "$ROOT/models/refer.wav" -dt "$REF_TEXT" -dl zh
```

The API is `POST http://127.0.0.1:9880/` with `{"text", "text_language": "zh", "speed", "cut_punc": ""}`. `zh` handles mixed Chinese and English. **`cut_punc` must be `""`.** Otherwise the engine splits at commas and the sentence comes out in fragments. `DEVICE=cpu` is the fallback.

## Generate → verify → assemble

```bash
python3 scripts/generate_vo.py  Projects/<t>/Script.md --dry-run     # check the sentence split first
python3 scripts/generate_vo.py  Projects/<t>/Script.md               # all shots
python3 scripts/verify_vo.py    Projects/<t>/Script.md --takes 3     # ASR re-listen + retakes
python3 scripts/assemble_vo.py  Projects/<t>/Storyboard.md --update  # shot durations, timeline, track, SRT
```

- **Splitting.** Sentences split at `。？！?!…` (with a trailing closing quote). Each sentence goes to the engine whole. Silence is trimmed to −40 dBFS with 40 ms padding, and each clip is saved as `<shot>/<shot>_NN.wav`. `lines.json` records shot, index, text and duration.
- **Re-recording.** `--shot S3-02` or `--scene 5` re-records only that part. The shot folder is wiped first, so a changed sentence count leaves no stale files.
- **Shot timing.** `assemble_vo.py` computes each shot as `lead 0.4 + Σ sentences + gap 0.35 × (n−1) + tail 0.6`, never shorter than the `Min` column, rounded up to 0.1 s. Subtitles split long sentences at commas into cues of ≤ 18 characters, timed by character share.
- **Speed.** If the voice is too slow, try `--speed 1.05` before rewriting anything. Speed changes don't change pitch.

## Pronunciation (`pronounce.json` next to Script.md)

`{"原文": "送进引擎的读法"}` only changes the text sent to the engine. Subtitles keep the original. The longest key is matched first, and only on standalone tokens.

| Problem | Fix that worked |
|---|---|
| `AI` read as one blended syllable | `"AI": "A, I"`: the comma separates the letters. `MV` reads fine as is. |
| Acronyms | Space the letters: `"API": "A P I"`, `"EC2": "E C 二"`, `"SSL/TLS": "S S L，T L S"` |
| Version numbers / decimals | Spell them out in Chinese: `"9.3": "九点三"`, `"8.5.12": "八点五点十二"` |
| IDs (e.g. CVE numbers) | Read digit groups: `"CVE-2026-12345": "C V E，二零二六，一二三四五"` |
| Years | Read digit by digit: `2026 年` → 二零二六年 |
| Brand names | Chinese transliterations read best, e.g. `Vercel` → 沃赛尔, `curl` → 柯尔 |
| Mixed-case product names | Respell phonetically, e.g. `PwnEscape` → `Pone Escape` |

`verify_vo.py --numbers` prints suggested readings for every number in the script; paste the ones you want.
**Make A/B clips before changing a global rule** (e.g. `Drafts/VO 字母读法对比/`) and let the creator choose by ear.

## Verification (do not skip)

- **The problem.** Character voices drop words, sometimes a whole clause, and a casual listen misses it. Transcribe every line with `mlx-community/whisper-large-v3-turbo` (via `uv run --with mlx-whisper`, `language="zh"`, initial prompt `以下是普通话的句子。`) and compare it to the script.
- **How lines are scored.** Convert Arabic numerals in the transcript to Chinese readings, then strip punctuation. Missing ≤ 2 characters counts as a pass, because ASR mishears this kind of voice on individual characters (e.g. 证书 heard as 正修). Below 0.8, the line is re-synthesized up to N times and the best take is kept.
- **When a line keeps failing, rewrite it.** Example: "根证书给中间证书签名" kept losing 签名; "根证书签发中间证书" read cleanly. Log the rewrite in the storyboard's decision log.
- **Re-time after retakes.** Re-run `assemble_vo.py --update`, because the durations changed.

## Related tools

- **Voice conversion.** An RVC model of the same voice (e.g. via Applio) can re-voice a sung or spoken track. Use it for covers, not narration.
- **Music analysis.** Whisper + Demucs for lyric timing are covered in `music-videos.md`.
