# /// script
# requires-python = ">=3.10,<3.14"
# dependencies = ["librosa>=0.10", "numpy", "scipy"]
# ///
"""
Break a song into musical structure for the video engine.

    uv run <skill>/scripts/music/analyze.py "audio/<song title>/song.wav"

Writes <song folder>/song.wav.analysis.json with:
  tempo, key, beats, downbeats, onsets, and sections [{start, end, label, energy}]
A renderer reads it to drive scene changes, energy and beat-synced motion.
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def estimate_key(chroma):
    prof = chroma.mean(axis=1)
    best = max(
        ((np.corrcoef(prof, np.roll(tpl, k))[0, 1], f"{KEYS[k]} {mode}")
         for k in range(12) for tpl, mode in ((MAJOR, "major"), (MINOR, "minor"))),
    )
    return best[1]


def main(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    duration = len(y) / sr
    hop = 512

    # --- beats & downbeats --------------------------------------------------
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop)
    tempo = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)

    # Downbeat phase: the beat-in-bar position with the strongest low end.
    S = np.abs(librosa.stft(y, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr)
    low = S[freqs < 150].sum(axis=0)
    low_at = low[np.clip(beat_frames, 0, len(low) - 1)] if len(beat_frames) else np.array([])
    phase = int(np.argmax([low_at[p::4].mean() if len(low_at[p::4]) else 0 for p in range(4)])) if len(low_at) >= 4 else 0
    downbeats = beats[phase::4]

    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=hop, units="time")

    # --- sections -------------------------------------------------------------
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc, axis=1), rms[None] / (rms.max() + 1e-9)])
    sync = librosa.util.sync(feat, beat_frames, aggregate=np.median) if len(beat_frames) > 8 else feat
    k = int(np.clip(round(duration / 15), 3, 12))
    bounds = librosa.segment.agglomerative(sync, k)
    if len(beat_frames) > 8:
        bound_frames = librosa.util.fix_frames([0] + [beat_frames[min(b, len(beat_frames)) - 1] if b > 0 else 0 for b in bounds[1:]])
    else:
        bound_frames = bounds
    times = sorted(set([0.0] + [float(t) for t in librosa.frames_to_time(bound_frames, sr=sr, hop_length=hop)] + [duration]))

    # Snap to nearest downbeat and drop tiny sections.
    if len(downbeats):
        times = [0.0] + [float(downbeats[np.argmin(np.abs(downbeats - t))]) for t in times[1:-1]] + [duration]
    merged = [times[0]]
    for t in times[1:]:
        if t - merged[-1] >= 4.0:
            merged.append(t)
        else:
            merged[-1] = t if t == duration else merged[-1]
    if merged[-1] != duration:
        merged[-1] = duration

    def frames(a, b):
        return slice(int(a * sr / hop), max(int(a * sr / hop) + 1, int(b * sr / hop)))

    secs = []
    for a, b in zip(merged[:-1], merged[1:]):
        fs = frames(a, b)
        secs.append({"start": round(a, 3), "end": round(b, 3), "vec": feat[:-1, fs].mean(axis=1), "rms": float(rms[fs].mean())})

    # Label repeats: similar timbre/harmony -> same letter.
    labels, protos = [], []
    for s in secs:
        v = s["vec"] / (np.linalg.norm(s["vec"]) + 1e-9)
        sims = [float(v @ p) for p in protos]
        if sims and max(sims) > 0.985:
            labels.append(chr(65 + int(np.argmax(sims))))
        else:
            protos.append(v)
            labels.append(chr(65 + len(protos) - 1))
    lo, hi = min(s["rms"] for s in secs), max(s["rms"] for s in secs)
    sections = [{"start": s["start"], "end": s["end"], "label": lab, "energy": round((s["rms"] - lo) / (hi - lo + 1e-9), 3)}
                for s, lab in zip(secs, labels)]

    out = {
        "source": Path(path).name,
        "duration": round(duration, 3),
        "tempo": round(tempo, 2),
        "key": estimate_key(chroma),
        "beats": [round(float(t), 3) for t in beats],
        "downbeats": [round(float(t), 3) for t in downbeats],
        "onsets": [round(float(t), 3) for t in onsets],
        "sections": sections,
    }
    dest = Path(str(path) + ".analysis.json")
    dest.write_text(json.dumps(out, indent=1))
    print(f"{dest}: {tempo:.1f} BPM, {out['key']}, {len(beats)} beats, {len(sections)} sections")
    for s in sections:
        print(f"  {s['start']:7.2f} – {s['end']:7.2f}  {s['label']}  energy {s['energy']:.2f}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: uv run <skill>/scripts/music/analyze.py <audio file>")
    main(sys.argv[1])
