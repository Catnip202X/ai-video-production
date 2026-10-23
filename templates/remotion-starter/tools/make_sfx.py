"""合成手绘讲解用的音效（全部由代码生成，无版权问题）。输出 public/sfx/*.wav（48 kHz 单声道）。
用法：python3 tools/make_sfx.py public/sfx   （需要 numpy + scipy；没有就 uv run --with numpy --with scipy python ...）"""
import numpy as np, wave, sys
from scipy.signal import butter, sosfilt

SR = 48000
OUT = sys.argv[1]
rng = np.random.default_rng(11)

def t(sec): return np.arange(int(sec * SR)) / SR
def env(n, a=0.002, d=0.1):
    x = np.arange(n) / SR
    return np.minimum(x / a, 1) * np.exp(-x / d)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, f): return sosfilt(butter(2, f, "lowpass", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, "highpass", fs=SR, output="sos"), x)
def save(name, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())

# 胶带"嘶啦"
x = t(0.32); n = rng.standard_normal(len(x)); a = np.sin(np.pi * np.minimum(x / 0.32, 1)) ** 0.6
save("tape", bp(n, 1500, 7000) * a * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * x)), 0.45)
# 纸张翻动
x = t(0.45); n = rng.standard_normal(len(x)); save("paper", bp(n, 600, 4000) * np.sin(np.pi * x / 0.45) ** 2, 0.4)
# 盖章"咚"
x = t(0.35); save("stamp", (np.sin(2 * np.pi * 90 * x) * np.exp(-x / 0.07) + 0.5 * lp(rng.standard_normal(len(x)), 900) * np.exp(-x / 0.03)), 0.7)
# 沉闷"咚"
x = t(0.5); save("thud", np.sin(2 * np.pi * 60 * x * (1 - 0.3 * x)) * np.exp(-x / 0.12), 0.7)
# 裂缝"咔"
x = np.zeros(int(0.4 * SR))
for k in range(6):
    s = int((0.01 + k * 0.03 + rng.uniform(0, 0.02)) * SR); L = int(0.012 * SR)
    x[s:s + L] += hp(rng.standard_normal(L), 1800) * env(L, 0.0005, 0.004) * rng.uniform(0.5, 1)
save("crack", x, 0.6)
# 铅笔沙沙
x = t(1.4); n = rng.standard_normal(len(x)); stroke = 0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * x) ** 2
save("scribble", bp(n, 2500, 8000) * stroke * np.minimum(1, np.minimum(x / 0.1, (1.4 - x) / 0.2)), 0.25)
# 弹出 / 叮 / 嗒
x = t(0.12); f = 700 * (300 / 700) ** (x / 0.12); save("pop", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.001, 0.04), 0.6)
x = t(0.9); save("ding", (np.sin(2 * np.pi * 1568 * x) + 0.4 * np.sin(2 * np.pi * 3136 * x)) * env(len(x), 0.002, 0.25), 0.5)
x = t(0.06); save("tick", hp(rng.standard_normal(len(x)), 2000) * env(len(x), 0.0005, 0.008), 0.5)
# 滑稽"叮咚"（笑点）
x = t(0.7); f = np.where(x < 0.25, 880, 660); save("boing", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), 0.002, 0.3), 0.5)
# 低频晃动
x = t(2.0); save("rumble", lp(rng.standard_normal(len(x)), 120) * np.sin(np.pi * x / 2.0), 0.6)
# 电流"滋啦"
x = np.zeros(int(0.6 * SR))
for k in range(12):
    s = int(rng.uniform(0, 0.55) * SR); L = int(rng.uniform(0.01, 0.04) * SR)
    x[s:s + L] += np.sign(np.sin(2 * np.pi * rng.uniform(300, 2000) * np.arange(L) / SR)) * rng.uniform(0.3, 1)
save("zap", hp(x, 200), 0.35)
# 爆炸 / 打穿"轰"
x = t(1.0); save("boom", lp(rng.standard_normal(len(x)), 300) * np.exp(-x / 0.25) + 0.6 * np.sin(2 * np.pi * 45 * x) * np.exp(-x / 0.3), 0.75)
print("ok")
