import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// 当前镜头内的秒数
export const useSec = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// a→b 秒之间从 0 到 1（带缓动，两端截断）
export const prog = (t, a, b, easing = EASE) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

export const lerp = (a, b, k) => a + (b - a) * k;

// 弹性出现：at 秒开始
export const useSpring = (at, config = { damping: 14, stiffness: 150, mass: 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at * fps, fps, config });
};

export const springAt = (frame, fps, at, config = { damping: 14, stiffness: 150, mass: 0.7 }) =>
  spring({ frame: frame - at * fps, fps, config });

// 在一句话内部按比例取时间点（例如逗号分开的三段）
export const within = (line, frac) => line.start + (line.end - line.start) * frac;

// 确定性伪随机
export const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
