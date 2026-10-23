#!/usr/bin/env python3
"""按分镜把逐句配音排到时间线上：镜头时长由它自己的口播决定。

用法：
  python3 assemble_vo.py <项目文件夹/Storyboard.md>            # 只计算并输出，不改分镜
  python3 assemble_vo.py <Storyboard.md> --update               # 同时把新时长写回分镜表
  python3 assemble_vo.py <Storyboard.md> --gap 0.3 --lead 0.3   # 调整节奏

规则（每个镜头）：
  有口播：时长 = lead + 各句时长 + 句间 gap + tail，且不短于分镜表 Min 列
  无口播：时长 = Min 列（没有则用 Duration 列）
读取 `Audio Tracks/VO {版本}/lines.json`（由 generate_vo.py 生成），输出到同一文件夹：
  VO full {版本}.wav   整片口播音轨（与镜头时间对齐，可直接放进剪辑）
  VO full {版本}.srt   中文字幕（长句在逗号处拆成多条）
  timeline.json        每个镜头和每句的起止时间
只用标准库，系统自带的 python3 即可运行。
"""

import argparse
import array
import json
import math
import re
import wave
from pathlib import Path

ROW_RE = re.compile(r"^\|\s*(S\d+-\d+)\s*\|")
SUB_MAX = 18   # 每条字幕最多字数，超过就在逗号处拆开


def parse_time(s):
    s = s.strip()
    if not s:
        return None
    m, sec = s.split(":")
    return int(m) * 60 + float(sec)


def fmt_time(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"


def srt_time(t):
    ms = round(t * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def split_row(line):
    """拆表格行；单元格里转义的 \\| 不算分隔符。"""
    return re.split(r"(?<!\\)\|", line.strip()[1:-1])


def read_shots(md_lines):
    """返回 [(行号, 镜头号, 各列)]，并给出 Duration / Min 列的位置。"""
    header = next(l for l in md_lines if l.startswith("| Shot ID"))
    cols = [c.strip() for c in split_row(header)]
    rows = [(i, ROW_RE.match(l).group(1), [c.strip() for c in split_row(l)])
            for i, l in enumerate(md_lines) if ROW_RE.match(l)]
    return rows, cols.index("Duration"), cols.index("Min")


def subtitle_chunks(text):
    """长句按逗号等拆成不超过 SUB_MAX 字的几段（尽量）。"""
    parts = re.findall(r".+?(?:[，、；：,;:]|$)", text)
    chunks, cur = [], ""
    for p in parts:
        if cur and len(cur) + len(p) > SUB_MAX:
            chunks.append(cur)
            cur = ""
        cur += p
    if cur:
        chunks.append(cur)
    return [c for c in chunks if c.strip()]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("storyboard", type=Path)
    ap.add_argument("--version", default="v1")
    ap.add_argument("--lead", type=float, default=0.4, help="镜头开始到第一句的留白（秒）")
    ap.add_argument("--gap", type=float, default=0.35, help="同一镜头内句与句之间的停顿（秒）")
    ap.add_argument("--tail", type=float, default=0.6, help="最后一句结束到切镜头的留白（秒）")
    ap.add_argument("--update", action="store_true", help="把新时长写回 Storyboard.md")
    args = ap.parse_args()

    vo_dir = args.storyboard.parent / "Audio Tracks" / f"VO {args.version}"
    lines = json.loads((vo_dir / "lines.json").read_text(encoding="utf-8"))
    md = args.storyboard.read_text(encoding="utf-8").split("\n")
    rows, dur_col, min_col = read_shots(md)

    timeline, t = [], 0.0
    print(f"{'镜头':7} {'原时长':>7} {'新时长':>7} {'口播':>6}  句数")
    for line_no, shot, cells in rows:
        shot_lines = [l for l in lines if l["shot"] == shot]
        floor = parse_time(cells[min_col]) or 0.0
        old = parse_time(cells[dur_col]) or 0.0
        if shot_lines:
            speech = sum(l["duration"] for l in shot_lines) + args.gap * (len(shot_lines) - 1)
            dur = max(args.lead + speech + args.tail, floor)
        else:
            speech, dur = 0.0, floor or old
        dur = math.ceil(dur * 10) / 10  # 取整到 0.1 秒，方便剪辑
        placed, at = [], t + args.lead
        for l in shot_lines:
            placed.append({**l, "start": round(at, 3), "end": round(at + l["duration"], 3)})
            at += l["duration"] + args.gap
        timeline.append({"shot": shot, "start": round(t, 3), "duration": dur, "lines": placed,
                         "row": line_no})
        print(f"{shot:7} {fmt_time(old):>7} {fmt_time(dur):>7} {speech:5.1f}s  {len(shot_lines)}")
        t += dur
    print(f"合计 {len(timeline)} 个镜头，{fmt_time(t)}")

    # 整片口播音轨
    rate = None
    for l in lines:
        with wave.open(str(vo_dir / l["file"])) as w:
            rate = w.getframerate()
            break
    track = array.array("h", bytes(2 * (int(t * rate) + rate)))
    for shot in timeline:
        for l in shot["lines"]:
            with wave.open(str(vo_dir / l["file"])) as w:
                clip = array.array("h", w.readframes(w.getnframes()))
            i = int(l["start"] * rate)
            track[i:i + len(clip)] = clip
    del track[int(t * rate):]
    with wave.open(str(vo_dir / f"VO full {args.version}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(track.tobytes())

    # 字幕：长句按字数比例分配时间
    cues = []
    for shot in timeline:
        for l in shot["lines"]:
            chunks = subtitle_chunks(l["text"])
            total = sum(len(c) for c in chunks)
            at = l["start"]
            for c in chunks:
                end = at + (l["end"] - l["start"]) * len(c) / total
                cues.append((at, end, c.rstrip("，、；：,;:")))
                at = end
    (vo_dir / f"VO full {args.version}.srt").write_text(
        "\n".join(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{c}\n" for i, (a, b, c) in enumerate(cues, 1)),
        encoding="utf-8")

    (vo_dir / "timeline.json").write_text(json.dumps(
        {"version": args.version, "lead": args.lead, "gap": args.gap, "tail": args.tail,
         "total": round(t, 3), "shots": [{k: v for k, v in s.items() if k != "row"} for s in timeline]},
        ensure_ascii=False, indent=1), encoding="utf-8")

    if args.update:
        for shot in timeline:
            cells = split_row(md[shot["row"]])
            cells[dur_col] = f" {fmt_time(shot['duration'])} "
            md[shot["row"]] = "|" + "|".join(cells) + "|"
        md = [re.sub(r"^\*\*合计：\*\*.*$", f"**合计：** {len(timeline)} 个镜头，约 {fmt_time(t)}"
                     f"（按 VO {args.version} 逐句排定：lead {args.lead}s / gap {args.gap}s / tail {args.tail}s）。", l)
              for l in md]
        args.storyboard.write_text("\n".join(md), encoding="utf-8")
        print("已写回分镜表")


if __name__ == "__main__":
    main()
