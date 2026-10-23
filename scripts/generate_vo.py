#!/usr/bin/env python3
"""从项目的 Script.md 中提取口播，逐句调用 GPT-SoVITS 引擎（例如 MamboTTS 曼波音色）生成配音，按分镜镜头分文件夹存放。

Script.md 中口播行用镜头号标记归属，标记之后的行沿用同一镜头，直到下一个标记：
  > [S5-01] 第二步，是整个流程里最"玄学"的一步……
  > 首先，AI 会把人声从伴奏里单独抠出来……        ← 仍属于 S5-01

用法：
  python3 generate_vo.py <项目文件夹/Script.md>                 # 生成全部镜头
  python3 generate_vo.py <Script.md> --shot S5-03 --shot S7-02 # 只重做指定镜头
  python3 generate_vo.py <Script.md> --scene 5                 # 只重做某个场景
  python3 generate_vo.py <Script.md> --version v2 --speed 1.05
  python3 generate_vo.py <Script.md> --dry-run                 # 只打印分句，不调用引擎

每一句（到 。？！… 为止）整句送进引擎合成一次，句内逗号不切分，语气是连贯的一整句；
每句切掉前后静音后单独存档，句间停顿和镜头时长交给 assemble_vo.py 按分镜排。

输出（与 Script.md 同级的 `Audio Tracks/VO {版本}/`）：
  {镜头}/{镜头}_{序号}.wav   每句一个文件，例如 S5-03/S5-03_02.wav
  lines.json                每句所属镜头、文字、时长
引擎需先启动（GPT-SoVITS api.py，见 references/tts-voiceover.md）；地址可用环境变量 TTS_API 覆盖。只用标准库，系统自带的 python3 即可运行。
"""

import argparse
import array
import io
import json
import os
import re
import shutil
import sys
import urllib.request
import wave
from pathlib import Path

API_URL = os.environ.get("TTS_API", "http://127.0.0.1:9880")  # GPT-SoVITS api.py

SCENE_RE = re.compile(r"^### Scene (\d+)")
TAG_RE = re.compile(r"^\[(S\d+-\d+)\]\s*")
# 句末标点（可连续，如 ……、？！），后面可能跟一个右引号
SENTENCE_RE = re.compile(r".+?(?:[。？！?!…]+[\"”’]?|$)")

# 读音表：只改送进引擎的文字，字幕和 lines.json 仍用原文。
# 引擎默认已按字母读缩写，但 "AI" 会连成一个音；加逗号让两个字母分开。
# "MV" 原样读就清楚，不用改。改读音前先做 A/B 试听，让创作者用耳朵挑。
PRONOUNCE = {
    "AI": "A, I",
}

SILENCE = 300        # 低于约 -40 dBFS 视为静音
EDGE_PAD = 0.04      # 裁切后每句前后保留的余量（秒）


def parse_lines(script_text):
    """返回 [(镜头号, 句子)]，按 Script.md 中的顺序。"""
    out, scene, in_vo, shot = [], None, False, None
    for line in script_text.splitlines():
        m = SCENE_RE.match(line)
        if m:
            scene, in_vo, shot = int(m.group(1)), False, None
            continue
        if line.startswith("**VO / DIALOGUE"):
            in_vo = True
        elif line.startswith("**"):
            in_vo = False
        elif in_vo and line.startswith(">"):
            text = line.lstrip(">").strip().replace("**", "")
            t = TAG_RE.match(text)
            if t:
                shot, text = t.group(1), text[t.end():]
            if not text:
                continue
            if shot is None:
                sys.exit(f"Scene {scene} 的口播缺少镜头标记，例如 > [S{scene}-01] ……")
            out += [(shot, s.strip()) for s in SENTENCE_RE.findall(text) if s.strip()]
    return out


def tts_text(text):
    """按读音表替换（只替换独立的英文词，不碰其他单词里的字母）。长词先换，避免被短词截胡。"""
    for word in sorted(PRONOUNCE, key=len, reverse=True):
        text = re.sub(rf"(?<![A-Za-z0-9.]){re.escape(word)}(?![A-Za-z0-9])", PRONOUNCE[word], text)
    return text


def load_project_pronounce(script):
    """项目文件夹里可以放一个 pronounce.json（{"原文": "送进引擎的读法"}），只对这个项目生效。"""
    path = script.parent / "pronounce.json"
    if path.exists():
        PRONOUNCE.update(json.loads(path.read_text(encoding="utf-8")))


def synthesize(text, speed):
    """整句合成，返回 (采样率, int16 样本)。cut_punc 为空 = 引擎不在逗号处切开。"""
    body = json.dumps({"text": tts_text(text), "text_language": "zh",  # zh = 中英混合
                       "speed": speed, "cut_punc": ""}).encode("utf-8")
    req = urllib.request.Request(API_URL + "/", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=max(120, len(text) * 2)) as resp:
        data = resp.read()
    if data[:4] != b"RIFF":
        raise RuntimeError(f"引擎没有返回 WAV：{data[:200]!r}")
    with wave.open(io.BytesIO(data)) as w:
        if w.getsampwidth() != 2 or w.getnchannels() != 1:
            raise RuntimeError("只支持 16 位单声道 WAV")
        return w.getframerate(), array.array("h", w.readframes(w.getnframes()))


def trim(samples, rate):
    """去掉前后静音（按 10ms 窗口的峰值判断），两端各留 EDGE_PAD 秒。"""
    win = rate // 100
    loud = [i for i in range(0, len(samples), win)
            if max(abs(x) for x in samples[i:i + win]) > SILENCE]
    if not loud:
        return samples
    pad = int(EDGE_PAD * rate)
    return samples[max(0, loud[0] - pad):min(len(samples), loud[-1] + win + pad)]


def write_wav(path, rate, samples):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(samples.tobytes())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path)
    ap.add_argument("--shot", action="append", help="只生成这些镜头（可重复）")
    ap.add_argument("--scene", type=int, action="append", help="只生成这些场景（可重复）")
    ap.add_argument("--version", default="v1")
    ap.add_argument("--speed", type=float, default=1.0, help="引擎语速（变速不变调），默认 1.0")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    load_project_pronounce(args.script)
    lines = parse_lines(args.script.read_text(encoding="utf-8"))
    if args.shot or args.scene:
        lines = [(shot, s) for shot, s in lines
                 if shot in (args.shot or []) or int(shot[1:].split("-")[0]) in (args.scene or [])]
    if not lines:
        sys.exit("没有找到口播（检查 Script.md 中的 **VO / DIALOGUE:** 段落和镜头标记）")

    vo_dir = args.script.parent / "Audio Tracks" / f"VO {args.version}"
    manifest_path = vo_dir / "lines.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    shots = list(dict.fromkeys(shot for shot, _ in lines))
    manifest = [m for m in manifest if m["shot"] not in shots]

    for shot in shots:
        sentences = [s for sh, s in lines if sh == shot]
        print(f"{shot}（{len(sentences)} 句）")
        if args.dry_run:
            for s in sentences:
                print("   | " + s)
            continue
        shot_dir = vo_dir / shot
        shutil.rmtree(shot_dir, ignore_errors=True)  # 句子数变了时不留旧句
        shot_dir.mkdir(parents=True)
        for i, s in enumerate(sentences, 1):
            rate, samples = synthesize(s, args.speed)
            clip = trim(samples, rate)
            name = f"{shot}_{i:02}.wav"
            write_wav(shot_dir / name, rate, clip)
            dur = len(clip) / rate
            manifest.append({"shot": shot, "n": i, "file": f"{shot}/{name}", "text": s,
                             "duration": round(dur, 3), "speed": args.speed})
            print(f"   {name}  {dur:5.2f}s  {s[:24]}")

    if not args.dry_run:
        def order(m):
            scene, shot = m["shot"][1:].split("-")
            return int(scene), int(shot), m["n"]
        manifest.sort(key=order)
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
