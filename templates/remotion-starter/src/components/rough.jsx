import React from 'react';
import rough from 'roughjs';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { C, HAND } from '../theme';
import { EASE, EASE_IN_OUT, prog, useSec } from '../lib';

// rough.js 生成的路径按 (形状, 参数, 种子) 缓存；同一镜头里线条每 1/6 秒换一次种子（3 个轮换），
// 产生手绘动画特有的轻微"抖动"。
const gen = rough.generator();
const cache = new Map();
const BOIL_FPS = 6;

const DEF = {
  stroke: C.ink, strokeWidth: 3, roughness: 1.3, bowing: 1.1,
  fillStyle: 'hachure', hachureGap: 9, fillWeight: 2, hachureAngle: -41,
};

const paths = (kind, a, o) => {
  const key = kind + JSON.stringify(a) + JSON.stringify(o);
  let v = cache.get(key);
  if (!v) {
    v = gen.toPaths(gen[kind](...a, o));
    cache.set(key, v);
    if (cache.size > 6000) cache.delete(cache.keys().next().value);
  }
  return v;
};

// 当前的抖动相位
export const useBoil = () => Math.floor(useSec() * BOIL_FPS) % 3;

// 一个 rough 图形，at 秒开始"逐笔画出"，dur 秒画完。kind: rectangle / ellipse / circle / line / linearPath / polygon / path / arc / curve
export const R = ({ kind, a, o = {}, at = 0, dur = 0.6, seed = 1, boil = true, fade, style }) => {
  const t = useSec();
  const phase = useBoil();
  const p = dur <= 0 ? (t >= at ? 1 : 0) : prog(t, at, at + dur, EASE_IN_OUT);
  if (p <= 0) return null;
  const out = fade != null ? 1 - prog(t, fade, fade + 0.3) : 1;
  if (out <= 0) return null;
  const ps = paths(kind, a, { ...DEF, ...o, seed: seed * 7 + (boil ? phase : 0) + 1 });
  const dash = p < 1;
  return (
    <g style={{ opacity: out, ...style }}>
      {ps.map((pp, i) => (
        <path key={i} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill={pp.fill || 'none'}
          fillOpacity={pp.fill ? Math.min(1, p * 1.5) : undefined}
          pathLength={dash ? 1 : undefined} strokeDasharray={dash ? '1 1' : undefined} strokeDashoffset={dash ? 1 - p : undefined}
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
};

// 整屏 SVG 画布（1920×1080 坐标）
export const Canvas = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>{children}</svg>
  </AbsoluteFill>
);

// 箭头：从 (x1,y1) 画到 (x2,y2)，末端两笔箭头
export const Arrow = ({ x1, y1, x2, y2, at = 0, dur = 0.5, color = C.ink, w = 3, seed = 3, bend = 0, fade }) => {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const L = 22;
  const h1 = [x2 - L * Math.cos(ang - 0.45), y2 - L * Math.sin(ang - 0.45)];
  const h2 = [x2 - L * Math.cos(ang + 0.45), y2 - L * Math.sin(ang + 0.45)];
  const o = { stroke: color, strokeWidth: w, roughness: 1 };
  return (
    <>
      <R kind="curve" a={[[[x1, y1], [mx, my], [x2, y2]]]} o={o} at={at} dur={dur} seed={seed} fade={fade} />
      <R kind="linearPath" a={[[h1, [x2, y2], h2]]} o={o} at={at + dur * 0.9} dur={0.15} seed={seed + 1} fade={fade} />
    </>
  );
};

// 手写文字：从左到右"写出来"
export const Hand = ({ children, x, y, at = 0, dur = 0.5, size = 48, color = C.ink, w, align = 'left', weight = 400, rotate = 0, font = HAND, fade, style }) => {
  const t = useSec();
  const p = prog(t, at, at + dur, EASE);
  if (p <= 0) return null;
  const out = fade != null ? 1 - prog(t, fade, fade + 0.3) : 1;
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, transform: `translateX(${tx}) rotate(${rotate}deg)`,
      fontFamily: font, fontSize: size, color, fontWeight: weight, lineHeight: 1.25, textAlign: align,
      clipPath: `inset(-20% ${(1 - p) * 100}% -20% -5%)`, opacity: out, whiteSpace: w ? 'normal' : 'nowrap', ...style,
    }}>{children}</div>
  );
};

// 荧光笔划线（文字下方的黄色粗线）
export const Highlight = ({ x, y, w, at = 0, dur = 0.4, color = C.yellow, h = 22, seed = 5 }) => (
  <R kind="line" a={[x, y, x + w, y]} o={{ stroke: color, strokeWidth: h, roughness: 0.8, bowing: 0.6 }} at={at} dur={dur} seed={seed} boil={false} style={{ mixBlendMode: 'multiply', opacity: 0.85 }} />
);

// 红笔圈出
export const Circle = ({ cx, cy, w, h, at = 0, dur = 0.5, color = C.red, seed = 9, sw = 4 }) => (
  <R kind="ellipse" a={[cx, cy, w, h]} o={{ stroke: color, strokeWidth: sw, roughness: 1.8 }} at={at} dur={dur} seed={seed} />
);

// 打叉 / 打勾
export const Cross = ({ x, y, s = 60, at = 0, color = C.red, seed = 11 }) => (
  <>
    <R kind="line" a={[x - s / 2, y - s / 2, x + s / 2, y + s / 2]} o={{ stroke: color, strokeWidth: 6 }} at={at} dur={0.18} seed={seed} />
    <R kind="line" a={[x + s / 2, y - s / 2, x - s / 2, y + s / 2]} o={{ stroke: color, strokeWidth: 6 }} at={at + 0.15} dur={0.18} seed={seed + 1} />
  </>
);
export const Check = ({ x, y, s = 60, at = 0, color = C.green, seed = 13 }) => (
  <R kind="linearPath" a={[[[x - s / 2, y], [x - s / 8, y + s / 2.4], [x + s / 2, y - s / 2]]]} o={{ stroke: color, strokeWidth: 7 }} at={at} dur={0.3} seed={seed} />
);

export const Sfx = ({ at, name, volume = 0.5 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(at * fps))} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};

// 镜头里的一个段落：from 秒淡入，to 秒淡出（to 不给则一直显示）；可整体平移 / 缩放
export const Phase = ({ from = 0, to, children, x = 0, y = 0, s = 1, style }) => {
  const t = useSec();
  if (t < from - 0.01 || (to != null && t > to + 0.4)) return null;
  const o = prog(t, from, from + 0.3) * (to != null ? 1 - prog(t, to, to + 0.4) : 1);
  return <AbsoluteFill style={{ opacity: o, transform: `translate(${x}px, ${y}px) scale(${s})`, ...style }}>{children}</AbsoluteFill>;
};

// 整体"弹入"：用于卡片和图块
export const usePop = (at, outAt) => {
  const t = useSec();
  const k = prog(t, at, at + 0.45, EASE);
  const o = outAt != null ? 1 - prog(t, outAt, outAt + 0.35, EASE_IN_OUT) : 1;
  return { k, o };
};
