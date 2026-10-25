import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, HAND, HAND_EN, UI } from './theme';

// 封面：B 站一次投稿要两种比例，两版同一套设计。
// 这是占位稿——改 TITLE / KICKER / SUB 三行就够，版式不用动。
// 静帧渲染在 frame 0，所以这里全部写成静态（不用 prog / useSec），一开帧就是完成态。
const KICKER = 'SERIES / 系列名';
const TITLE = ['第一行标题', '第二行标题'];
const SUB = ['一句副标题，说清这期讲什么', '第二行补充'];
const CHIPS = ['看点一', '看点二', '看点三', '看点四'];

const Chips = ({ size = 26, gap = 14 }) => (
  <div style={{ display: 'flex', gap }}>
    {CHIPS.map((t) => (
      <span
        key={t}
        style={{
          fontFamily: UI,
          fontSize: size,
          fontWeight: 600,
          color: C.ink2,
          background: C.paper2,
          border: `3px solid ${C.faint}`,
          borderRadius: 999,
          padding: `${Math.round(size * 0.28)}px ${Math.round(size * 0.7)}px`,
        }}
      >
        {t}
      </span>
    ))}
  </div>
);

// 右侧占位图形：换成这条视频的标志物（道具 / 角色 / 界面）
const Motif = ({ x, y, s = 1 }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'top left' }}>
    <div style={{ width: 520, height: 340, border: `5px solid ${C.ink}`, borderRadius: 26, background: '#fff', boxShadow: '12px 14px 0 rgba(60,50,35,0.14)', transform: 'rotate(-4deg)' }} />
    <div style={{ position: 'absolute', left: 330, top: -70, width: 240, height: 240, borderRadius: 120, border: `5px solid ${C.ink}`, background: C.yellow }} />
  </div>
);

const Text = ({ w, titleSize, subSize }) => (
  <div style={{ position: 'absolute', left: 96, top: 132, width: w }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <div style={{ width: 62, height: 10, borderRadius: 5, background: C.blue }} />
      <span style={{ fontFamily: HAND_EN, fontSize: 24, letterSpacing: 4, color: C.ink2 }}>{KICKER}</span>
    </div>
    {TITLE.map((line) => (
      <div key={line} style={{ fontFamily: HAND, fontSize: titleSize, fontWeight: 700, color: C.ink, lineHeight: 1.16 }}>
        {line}
        <br />
      </div>
    ))}
    <div style={{ marginTop: 26 }}>
      {SUB.map((line) => (
        <div key={line} style={{ fontFamily: HAND, fontSize: subSize, color: C.ink2, lineHeight: 1.5 }}>
          {line}
        </div>
      ))}
    </div>
    <div style={{ marginTop: 34 }}>
      <Chips size={Math.round(subSize * 0.72)} />
    </div>
  </div>
);

export const Thumb16x9 = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <Text w={1000} titleSize={96} subSize={36} />
    <Motif x={1180} y={330} s={1.15} />
  </AbsoluteFill>
);

export const Thumb4x3 = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <Text w={700} titleSize={80} subSize={30} />
    <Motif x={880} y={470} s={0.92} />
  </AbsoluteFill>
);
