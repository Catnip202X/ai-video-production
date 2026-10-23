# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = [
#   "mlx-whisper>=0.4",
#   "demucs>=4.0.1",
#   "torch>=2.2,<2.9",
#   "torchaudio>=2.2,<2.9",
#   "soundfile",
#   "numpy<2",
#   "opencc-python-reimplemented",
# ]
# ///
"""
Automatic, word-timed lyrics from the audio itself.

    cd <project root> && uv run <skill>/scripts/music/lyrics.py "audio/<song title>/song.wav"

1. Demucs isolates the vocals        → <song folder>/stems/vocals.wav (cached)
2. Whisper (MLX, large-v3-turbo) transcribes the vocals with per-word timestamps
3. Hallucinations in instrumental parts are filtered using vocal loudness
4. Words are grouped into lyric lines → <song folder>/<song file>.lyrics.json

Optional: if lyrics/<song-stem>.txt exists and has content, those lines are
used as the text and Whisper only provides the timing (forced alignment).
"""
import difflib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

MODEL = "mlx-community/whisper-large-v3-turbo"
# Non-Latin scripts that get their own Whisper pass when the lyrics contain them.
SCRIPTS = {"ko": r"[\uac00-\ud7a3]", "ja": r"[\u3040-\u30ff]", "zh": r"[\u4e00-\u9fff]", "ru": r"[\u0400-\u04ff]"}
ROOT = Path.cwd()  # run from the music-video project root (the folder holding audio/ and lyrics/)


def separate_vocals(audio: Path) -> Path:
    out = audio.parent / "stems" / "vocals.wav"   # each song has its own folder: audio/<title>/
    if out.exists():
        return out
    print("Separating vocals with Demucs…", flush=True)
    tmp = audio.parent / "stems" / "_demucs"
    subprocess.run([sys.executable, "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs", "-o", str(tmp), str(audio)], check=True)
    src = tmp / "htdemucs" / audio.stem
    out.parent.mkdir(parents=True, exist_ok=True)
    for f in src.iterdir():
        f.rename(out.parent / f.name)
    shutil.rmtree(tmp, ignore_errors=True)
    return out


def vocal_envelope(path: Path, hop=0.05):
    y, sr = sf.read(str(path), always_2d=True)
    y = y.mean(axis=1)
    n = int(sr * hop)
    rms = np.sqrt(np.add.reduceat(y[: len(y) // n * n] ** 2, np.arange(0, len(y) // n * n, n)) / n)
    return rms / (np.percentile(rms, 95) + 1e-9), hop


def transcribe(vocals: Path, prompt=None, language=None):
    import mlx_whisper
    print(f"Transcribing with {MODEL}{f' ({language})' if language else ''}…", flush=True)
    res = mlx_whisper.transcribe(
        str(vocals), path_or_hf_repo=MODEL, word_timestamps=True, language=language,
        condition_on_previous_text=False, initial_prompt=prompt,
        no_speech_threshold=0.5, compression_ratio_threshold=2.2,
    )
    return res


def clean_words(res, env, hop):
    words = []
    for seg in res["segments"]:
        if seg.get("compression_ratio", 0) > 2.4 or seg.get("no_speech_prob", 0) > 0.7:
            continue
        for w in seg.get("words", []):
            text = w["word"].strip()
            if not text or w["end"] <= w["start"] or len(text) > 24:   # one giant "word" is a hallucinated run
                continue
            a, b = int(w["start"] / hop), max(int(w["start"] / hop) + 1, int(w["end"] / hop))
            loud = float(env[a:b].mean()) if a < len(env) else 0
            if loud < 0.08 or w.get("probability", 1) < 0.1:   # silence → hallucination
                continue
            words.append({"w": text, "start": round(w["start"], 3), "end": round(w["end"], 3)})
    # Drop runs of the same word repeated 4+ times (classic Whisper loop).
    out = []
    for w in words:
        if len(out) >= 3 and all(norm(o["w"]) == norm(w["w"]) for o in out[-3:]):
            continue
        out.append(w)
    return out


def norm(s):
    # Keep letters in any script (Hangul, kana, Cyrillic…), drop punctuation.
    # Chinese is compared in simplified form: Whisper writes simplified even for traditional lyrics.
    return re.sub(r"[^\w']", "", to_simplified(s.lower().replace("’", "'"))).replace("_", "")


_t2s = None
def to_simplified(s):
    global _t2s
    if not re.search(SCRIPTS["zh"], s):
        return s
    if _t2s is None:
        from opencc import OpenCC
        _t2s = OpenCC("t2s")
    return _t2s.convert(s)


HAN = re.compile(r"[一-鿿]")

def split_han(text):
    """Chinese has no spaces, so align it one character at a time."""
    parts = re.findall(r"[一-鿿][^一-鿿\w]*|[^一-鿿]+", text)
    return [p for p in parts if norm(p)] or [text]


def split_han_words(words):
    """Whisper words with several characters → one per character, time shared evenly."""
    out = []
    for w in words:
        parts = split_han(w["w"]) if HAN.search(w["w"]) else [w["w"]]
        step = (w["end"] - w["start"]) / len(parts)
        out += [{"w": p, "start": round(w["start"] + i * step, 3), "end": round(w["start"] + (i + 1) * step, 3)}
                for i, p in enumerate(parts)]
    return out


def group_lines(words, max_words=7, max_chars=38, gap=0.55):
    lines, cur = [], []
    for i, w in enumerate(words):
        if cur:
            prev = cur[-1]
            long = len(cur) >= max_words or len(" ".join(x["w"] for x in cur)) + len(w["w"]) > max_chars
            pause = w["start"] - prev["end"] > gap
            punct = prev["w"][-1] in ".!?;" and len(cur) >= 3
            if long or pause or punct:
                lines.append(cur)
                cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    return [mk_line(l) for l in lines]


def mk_line(ws):
    return {"start": ws[0]["start"], "end": ws[-1]["end"], "text": " ".join(w["w"] for w in ws), "words": ws}


def align_text(words, txt_lines):
    """Use user-supplied lines as the text; borrow timings from Whisper words.

    Fuzzy global alignment (Needleman–Wunsch): a misheard word still pairs with
    the reference word sung at that moment and keeps its real timing. Only
    reference words aligned to a gap are interpolated.
    """
    words = split_han_words(words)
    ref = [(li, wi, part) for li, line in enumerate(txt_lines) for wi, w in enumerate(line.split())
           for part in (split_han(w) if HAN.search(w) else [w])]
    orig = {(li, wi): w for li, line in enumerate(txt_lines) for wi, w in enumerate(line.split())}
    A, B = [norm(p) for _, _, p in ref], [norm(w["w"]) for w in words]
    n, m, GAP = len(A), len(B), -0.45
    sim = lambda a, b: 2 * difflib.SequenceMatcher(None, a, b).ratio() - 1
    S = np.zeros((n + 1, m + 1)); T = np.zeros((n + 1, m + 1), dtype=np.int8)
    S[1:, 0] = GAP * np.arange(1, n + 1); S[0, 1:] = GAP * np.arange(1, m + 1); T[1:, 0] = 1; T[0, 1:] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            opts = (S[i - 1, j - 1] + sim(A[i - 1], B[j - 1]), S[i - 1, j] + GAP, S[i, j - 1] + GAP)
            k = int(np.argmax(opts)); S[i, j] = opts[k]; T[i, j] = k
    times, exact = [None] * n, 0
    i, j = n, m
    while i > 0 and j > 0:
        if T[i, j] == 0:
            times[i - 1] = (words[j - 1]["start"], words[j - 1]["end"])
            exact += A[i - 1] == B[j - 1]
            i, j = i - 1, j - 1
        elif T[i, j] == 1:
            i -= 1
        else:
            j -= 1
    known = [i for i, t in enumerate(times) if t]
    if not known:
        sys.exit("Could not align any words — is this the right lyrics file?")
    for i, t in enumerate(times):   # interpolate words that had no sung counterpart
        if t:
            continue
        lo = max((k for k in known if k < i), default=None)
        hi = min((k for k in known if k > i), default=None)
        if lo is None:
            s_ = times[hi][0] - 0.3 * (hi - i)
        elif hi is None:
            s_ = times[lo][1] + 0.3 * (i - lo)
        else:
            s_ = times[lo][1] + (times[hi][0] - times[lo][1]) * (i - lo) / (hi - lo)
        times[i] = (s_, s_ + 0.25)
    # Chinese characters merge back into the lyric's own words.
    lines, anchored, known_set = {}, set(), set(known)
    for k, ((li, wi, _), (s_, e)) in enumerate(zip(ref, times)):
        ws = lines.setdefault(li, {})
        if wi in ws:
            ws[wi]["end"] = round(max(e, ws[wi]["end"]), 3)
        else:
            ws[wi] = {"w": orig[li, wi], "start": round(s_, 3), "end": round(e, 3)}
        if k in known_set:
            anchored.add((li, wi))
    print(f"Aligned {len(known)}/{n} words to sung words ({exact} exact, {len(known) - exact} misheard), {n - len(known)} interpolated")
    out = [mk_line([ws[wi] for wi in sorted(ws)]) for _, ws in sorted(lines.items())]
    for li, line in enumerate(out):
        line["anchored"] = sum((li, wi) in anchored for wi in range(len(line["words"])))
    return out


def refine_windows(lines, user_lines):
    """Stretches around weakly anchored lines, each with the language to re-listen in."""
    wins = []
    for li, line in enumerate(lines):
        if line.get("anchored", len(line["words"])) >= 0.6 * len(line["words"]):
            continue
        lang = next((l for l, p in SCRIPTS.items() if re.search(p, line["text"])), "en")
        a, b = line["start"] - 2.5, line["end"] + 2.5
        if wins and wins[-1]["lang"] == lang and a <= wins[-1]["end"]:
            wins[-1]["end"] = max(wins[-1]["end"], b); wins[-1]["lines"].append(line["text"])
        else:
            wins.append({"start": max(0, a), "end": b, "lang": lang, "lines": [line["text"]]})
    return wins


def deaf_spots(words, lines, env, hop, min_len=2.0):
    """Loud vocal stretches where Whisper heard no words at all (a dropped
    hallucination loop usually swallows a whole verse)."""
    heard = np.zeros(len(env), bool)
    for w in words:
        heard[max(0, int((w["start"] - 0.4) / hop)): int((w["end"] + 0.4) / hop)] = True
    loud = np.convolve(env, np.ones(10) / 10, "same") > 0.25   # smoothed over 0.5s
    wins, i = [], 0
    while i < len(env):
        if loud[i] and not heard[i]:
            j = i
            while j < len(env) and loud[j] and not heard[j]:
                j += 1
            a, b = i * hop, j * hop
            if b - a >= min_len:
                near = [l["text"] for l in lines if l["end"] > a - 3 and l["start"] < b + 3]
                lang = next((l for l, p in SCRIPTS.items() if any(re.search(p, t) for t in near)), "en")
                wins.append({"start": max(0, a - 1), "end": b + 1, "lang": lang, "lines": near})
            i = j
        i += 1
    return wins


def transcribe_window(vocals, win, env, hop):
    """Re-transcribe one stretch of the vocals in a given language; times in song seconds."""
    import tempfile
    y, sr = sf.read(str(vocals))
    clip = y[int(win["start"] * sr): int(win["end"] * sr)]
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, clip, sr)
        res = transcribe(Path(tmp.name), prompt=" ".join(win["lines"])[:600], language=win["lang"])
    for seg in res["segments"]:
        seg["start"] += win["start"]; seg["end"] += win["start"]
        for w in seg.get("words", []):
            w["start"] += win["start"]; w["end"] += win["start"]
    return clean_words(res, env, hop)


def tail_repeats(words, lines, txt_lines):
    """Vocals after the last lyric (an echoed final line, ad-libs) that resemble a
    lyric line get that line again, timed to them."""
    tail = [w for w in words if w["start"] > lines[-1]["end"] + 0.5]
    if len(tail) < 2 or tail[-1]["end"] - tail[0]["start"] < 1:
        return []
    heard = norm(" ".join(w["w"] for w in tail).replace(" ", "_"))
    score, best = max((difflib.SequenceMatcher(None, heard, norm(l.replace(" ", "_"))).ratio(), l) for l in txt_lines)
    if score < 0.4:
        return []
    ws = best.split()
    t0, t1 = tail[0]["start"], tail[-1]["end"]
    step = (t1 - t0) / len(ws)
    print(f"Trailing vocals {t0:.1f}–{t1:.1f}s repeat a lyric line (similarity {score:.2f})")
    return [mk_line([{"w": w, "start": round(t0 + i * step, 3), "end": round(t0 + (i + 1) * step - 0.05, 3)} for i, w in enumerate(ws)])]


def apply_fixes(lines, path):
    """<song file>.lyrics.fix.json: {"<line index>": [start, end]} for lines the aligner
    got wrong (checked against downbeats and gaps in the vocals). Words are re-spread
    inside the new span; a squashed line is spread by word length."""
    if not path.exists():
        return
    fixes = {int(k): v for k, v in json.loads(path.read_text()).items() if k.isdigit()}
    for li, (a, b) in fixes.items():
        line, ws = lines[li], lines[li]["words"]
        s0, s1 = line["start"], line["end"]
        if s1 - s0 >= 0.5 and len(ws) > 1:
            f = lambda t: a + (t - s0) * (b - a) / (s1 - s0)
            for w in ws:
                w["start"], w["end"] = round(f(w["start"]), 3), round(f(w["end"]), 3)
        else:
            weights = np.cumsum([0] + [len(norm(w["w"])) + 1 for w in ws])
            for w, p, q in zip(ws, weights, weights[1:]):
                w["start"] = round(a + (b - a) * p / weights[-1], 3)
                w["end"] = round(a + (b - a) * q / weights[-1] - 0.03, 3)
        line["start"], line["end"] = a, b
    print(f"Applied {len(fixes)} timing fixes from {path.name}")


def main(audio):
    audio = Path(audio).resolve()
    vocals = separate_vocals(audio)
    env, hop = vocal_envelope(vocals)
    txt = ROOT / "lyrics" / f"{audio.stem}.txt"
    # Skip comments and section markers such as [Verse 1: Artist] or (Chorus).
    user_lines = [l.strip() for l in txt.read_text().splitlines()
                  if l.strip() and not l.startswith("#") and not re.fullmatch(r"\s*[\[(].*[\])]\s*", l)] if txt.exists() else []
    def cached(name, **kw):
        cache = vocals.parent / name
        if cache.exists():
            return json.loads(cache.read_text())
        res = transcribe(vocals, **kw)
        cache.write_text(json.dumps({"segments": res["segments"]}))
        return res

    res = cached("whisper.prompted.json" if user_lines else "whisper.json", prompt=" ".join(user_lines)[:800] if user_lines else None)
    words = clean_words(res, env, hop)
    # Whisper fixes one language per run. If the lyrics have lines in another script,
    # transcribe again in that language and merge, so those lines align too.
    for lang, pattern in SCRIPTS.items():
        other = [l for l in user_lines if re.search(pattern, l)]
        if other:
            extra = clean_words(cached(f"whisper.{lang}.json", prompt=" ".join(other)[:800], language=lang), env, hop)
            # its words in that script, plus anything it heard where the main pass heard nothing
            extra = [w for w in extra if re.search(pattern, w["w"]) or not any(abs(v["start"] - w["start"]) < 0.4 for v in words)]
            print(f"+ {len(extra)} words from a {lang} pass")
            words = sorted(words + extra, key=lambda w: w["start"])
    lines = align_text(words, user_lines) if user_lines else group_lines(words)
    if user_lines:
        # Refinement: re-listen to weakly anchored stretches on their own, then re-align.
        wins = deaf_spots(words, lines, env, hop) + refine_windows(lines, user_lines)
        if wins:
            print(f"Refining {len(wins)} weak stretches: " + ", ".join(f"{w['start']:.0f}-{w['end']:.0f}s {w['lang']}" for w in wins))
            score = lambda ls: sum(l["anchored"] for l in ls)
            for win in wins:
                cache = vocals.parent / f"whisper.win.{win['lang']}.{win['start']:.1f}-{win['end']:.1f}.json"
                if cache.exists():
                    got = json.loads(cache.read_text())
                else:
                    got = transcribe_window(vocals, win, env, hop)
                    cache.write_text(json.dumps(got))
                # replace what we had in that stretch with the focused transcription; keep it only if it helps
                trial = sorted([w for w in words if not (win["start"] + 0.5 <= w["start"] <= win["end"] - 0.5)] + got, key=lambda w: w["start"])
                refined = align_text(trial, user_lines)
                if score(refined) > score(lines):
                    words, lines = trial, refined
                else:
                    print(f"  {win['start']:.0f}-{win['end']:.0f}s didn't help; keeping what we had")
    if user_lines and lines:
        lines += tail_repeats(words, lines, user_lines)
        apply_fixes(lines, Path(str(audio) + ".lyrics.fix.json"))
        for line, nxt in zip(lines, lines[1:]):   # a line ends where the next begins
            if line["end"] > nxt["start"]:
                line["end"] = nxt["start"]
                for w in line["words"]:
                    w["end"] = min(w["end"], nxt["start"]); w["start"] = min(w["start"], w["end"])
    dest = Path(str(audio) + ".lyrics.json")
    dest.write_text(json.dumps({"source": audio.name, "model": MODEL, "from_text_file": bool(user_lines), "lines": lines}, indent=1, ensure_ascii=False))
    print(f"{dest}: {len(lines)} lines, {sum(len(l['words']) for l in lines)} words, "
          f"vocals {lines[0]['start']:.1f}s – {lines[-1]['end']:.1f}s" if lines else "no vocals found")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: uv run lyrics.py <audio file>  (from the project root)")
    main(sys.argv[1])
