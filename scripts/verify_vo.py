#!/usr/bin/env python3
"""配音质检：用 mlx-whisper 回听每一句，找出被引擎吞字的句子，重新合成几次，留最好的一条。

TTS 引擎（尤其是 GPT-SoVITS 类的角色音色）偶尔会悄悄漏掉词、甚至整个分句，听一遍很容易错过。
这里把每句转写回文字，与原稿逐字比对：
  - 转写里的阿拉伯数字先换成中文读法再比；
  - 只漏一两个字不算（角色音色常被 ASR 听错个别字），真正漏掉一段才判为不合格。

用法（先跑完 generate_vo.py；Apple Silicon 上用 mlx-whisper，需要 uv）：
  python3 verify_vo.py <Script.md>                  # 回听全部句子，不合格的最多重录 3 次
  python3 verify_vo.py <Script.md> --takes 5 --threshold 0.85
  python3 verify_vo.py <Script.md> --report-only    # 只打分，不重录
  python3 verify_vo.py <Script.md> --numbers        # 打印稿子里所有数字的建议读法（可贴进 pronounce.json）

结果写回 lines.json（每句加 asr / asr_score），重录的候选文件 *.tryN.wav 用完即删。
之后再跑 assemble_vo.py --update，镜头时长按新的句子时长重排。
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import generate_vo as G  # noqa: E402

ASR_MODEL = "mlx-community/whisper-large-v3-turbo"
DIG = "零一二三四五六七八九"

ASR_CHILD = f"""
import json, sys, mlx_whisper
out = {{}}
for p in sys.argv[2:]:
    r = mlx_whisper.transcribe(p, path_or_hf_repo="{ASR_MODEL}", language="zh", initial_prompt="以下是普通话的句子。")
    out[p] = r["text"].strip()
json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
"""


def zh_int(n):
    """整数读法（< 1 亿）：25 → 二十五，105 → 一百零五，3000 → 三千。"""
    if n == 0:
        return "零"
    if n >= 10000:
        hi, lo = divmod(n, 10000)
        return zh_int(hi) + "万" + (("零" if lo < 1000 else "") + zh_int(lo) if lo else "")
    out, zero = "", False
    for v, u in ((1000, "千"), (100, "百"), (10, "十"), (1, "")):
        d = n // v % 10
        if d:
            if zero:
                out += "零"
            out += DIG[d] + u
            zero = False
        elif out:
            zero = True
    return out[1:] if out.startswith("一十") else out


def zh_number(tok, nxt=""):
    if re.fullmatch(r"\d+(\.\d+){2,}", tok):           # 版本号 8.2.35 → 八点二点三十五
        return "点".join(zh_int(int(p)) for p in tok.split("."))
    if re.fullmatch(r"\d+\.\d+", tok):                 # 小数 9.3 → 九点三
        a, b = tok.split(".")
        return zh_int(int(a)) + "点" + "".join(DIG[int(c)] for c in b)
    if len(tok) == 4 and nxt.startswith("年"):          # 年份逐位读：2026 年 → 二零二六年
        return "".join(DIG[int(c)] for c in tok)
    if len(tok) > 8:                                   # 编号类长数字逐位读
        return "".join(DIG[int(c)] for c in tok)
    return zh_int(int(tok))


def number_readings(texts):
    """{稿子里的数字: 中文读法}，含百分号和"年"。"""
    found = {}
    for t in texts:
        for m in re.finditer(r"\d+(?:\.\d+)*%?", t):
            tok = m.group(0)
            pct = tok.endswith("%")
            core = tok.rstrip("%")
            nxt = t[m.end():m.end() + 1]
            key = tok if pct or not nxt.startswith("年") or len(core) != 4 else tok + "年"
            found[key] = ("百分之" + zh_number(core)) if pct else zh_number(core, nxt) + ("年" if key.endswith("年") else "")
    return found


def norm(s):
    return re.sub(r"[\W_]+", "", s).lower()


def score(expected, heard):
    """原稿里被听到的字的比例；漏 ≤ 2 个字算满分。"""
    for k, v in sorted(number_readings([heard]).items(), key=lambda kv: -len(kv[0])):
        heard = heard.replace(k, v)
    e, h = norm(expected), norm(heard)
    if not e:
        return 1.0
    m = difflib.SequenceMatcher(None, e, h).get_matching_blocks()
    missing = len(e) - sum(b.size for b in m)
    return 1.0 if missing <= 2 else 1 - missing / len(e)


def asr(files, scratch):
    out = scratch / "asr.json"
    child = scratch / "_asr_child.py"
    child.write_text(ASR_CHILD, encoding="utf-8")
    subprocess.run(["uv", "run", "--quiet", "--with", "mlx-whisper", "python", str(child), str(out),
                    *map(str, files)], check=True)
    return json.loads(out.read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path)
    ap.add_argument("--version", default="v1")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--takes", type=int, default=3, help="每句最多合成几次（含第一次）")
    ap.add_argument("--threshold", type=float, default=0.8)
    ap.add_argument("--report-only", action="store_true")
    ap.add_argument("--numbers", action="store_true")
    args = ap.parse_args()

    G.load_project_pronounce(args.script)
    if args.numbers:
        texts = [s for _, s in G.parse_lines(args.script.read_text(encoding="utf-8"))]
        print(json.dumps(number_readings(texts), ensure_ascii=False, indent=1))
        return

    vo_dir = args.script.parent / "Audio Tracks" / f"VO {args.version}"
    manifest_path = vo_dir / "lines.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    heard = asr([vo_dir / m["file"] for m in manifest], vo_dir)
    for m in manifest:
        m["asr"] = heard[str(vo_dir / m["file"])]
        m["asr_score"] = round(score(G.tts_text(m["text"]), m["asr"]), 3)

    for take in range(2, args.takes + 1):
        bad = [m for m in manifest if m["asr_score"] < args.threshold]
        if not bad or args.report_only:
            break
        print(f"第 {take} 次重录：{len(bad)} 句")
        tries = {}
        for m in bad:
            rate, samples = G.synthesize(m["text"], args.speed)
            p = vo_dir / (m["file"] + f".try{take}.wav")
            G.write_wav(p, rate, G.trim(samples, rate))
            tries[str(p)] = m
        heard = asr(list(tries), vo_dir)
        for p, m in tries.items():
            sc = score(G.tts_text(m["text"]), heard[p])
            if sc > m["asr_score"]:
                Path(p).replace(vo_dir / m["file"])
                with wave.open(str(vo_dir / m["file"])) as w:
                    m["duration"] = round(w.getnframes() / w.getframerate(), 3)
                m["asr"], m["asr_score"] = heard[p], round(sc, 3)
            else:
                Path(p).unlink()

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    flagged = [m for m in manifest if m["asr_score"] < args.threshold]
    for m in flagged:
        print(f"仍需人工处理 {m['file']}  {m['asr_score']:.2f}\n  稿：{m['text']}\n  听：{m['asr']}")
    print(f"{len(manifest)} 句，{len(flagged)} 句未过 {args.threshold}。"
          "反复吞同一个词时，改写那句口播（换个说法）比继续重录有效。")


if __name__ == "__main__":
    main()
