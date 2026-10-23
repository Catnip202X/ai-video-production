import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import timeline from './timeline.json';
import { C, HAND } from './theme';
import { SHOTS } from './shots';

const fr = (sec, fps) => Math.round(sec * fps);

// 方格纸底：所有镜头共用，镜头只画内容
export const Paper = () => (
  <AbsoluteFill style={{
    background: C.paper,
    backgroundImage: `linear-gradient(${C.grid} 1.5px, transparent 1.5px), linear-gradient(90deg, ${C.grid} 1.5px, transparent 1.5px)`,
    backgroundSize: '48px 48px',
  }}>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(120,95,50,0.16) 100%)' }} />
  </AbsoluteFill>
);

const Placeholder = ({ id }) => (
  <AbsoluteFill style={{ color: C.faint, fontFamily: HAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>{id}</AbsoluteFill>
);

// 字幕：长句按逗号拆成不超过 18 字的几段，按字数分配时间（与 assemble_vo.py 的 SRT 一致）
const SUB_MAX = 18;
const chunks = (text) => {
  const parts = text.match(/.+?(?:[，、；：,;:]|$)/g) || [text];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if (cur && cur.length + p.length > SUB_MAX) { out.push(cur); cur = ''; }
    cur += p;
  }
  if (cur) out.push(cur);
  return out.filter((c) => c.trim());
};
const CUES = timeline.shots.flatMap((s) => s.lines.flatMap((l) => {
  const cs = chunks(l.text);
  const total = cs.reduce((a, c) => a + c.length, 0);
  let at = l.start;
  return cs.map((c) => {
    const end = at + ((l.end - l.start) * c.length) / total;
    const cue = { start: at, end, text: c.replace(/[，、；：,;:。]+$/, '') };
    at = end;
    return cue;
  });
}));

const Subtitles = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cue = CUES.find((c) => t >= c.start && t < c.end + 0.1);
  if (!cue) return null;
  return (
    <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
      <div style={{
        fontFamily: '"PingFang SC", sans-serif', fontSize: 44, fontWeight: 600, color: '#fff', padding: '8px 26px', borderRadius: 10,
        background: 'rgba(25,22,18,0.72)', letterSpacing: 1,
      }}>{cue.text}</div>
    </div>
  );
};

export const Video = ({ subtitles = true }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Paper />
      {timeline.shots.map((s) => {
        const from = fr(s.start, fps);
        const to = fr(s.start + s.duration, fps);
        const Comp = SHOTS[s.shot];
        const L = s.lines.map((l) => ({ ...l, start: l.start - s.start, end: l.end - s.start }));
        return (
          <Sequence key={s.shot} from={from} durationInFrames={to - from} name={s.shot}>
            {Comp ? <Comp L={L} dur={s.duration} /> : <Placeholder id={s.shot} />}
          </Sequence>
        );
      })}
      {timeline.shots.flatMap((s) => s.lines.map((l) => (
        <Sequence key={l.file} from={fr(l.start, fps)} name={`VO ${l.file}`} layout="none">
          <Audio src={staticFile(`vo/${l.file}`)} volume={1} />
        </Sequence>
      )))}
      {subtitles && <Subtitles />}
    </AbsoluteFill>
  );
};
