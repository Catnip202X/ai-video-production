import React from 'react';
import { C } from '../theme';
import { within } from '../lib';
import { Arrow, Canvas, Circle, Hand, Phase, R, Sfx } from '../components/rough';

// 每个镜头组件拿到 L（本镜头每句口播的 start / end，单位秒，相对镜头开头）和 dur。
// 动画时间点一律挂在口播上：L[0].start、within(L[1], 0.5)……口播重录后画面自动跟着走。
export const S1_01 = ({ L }) => (
  <>
    <Phase to={L[1] ? L[1].start - 0.2 : undefined}>
      <Canvas>
        <R kind="rectangle" a={[560, 300, 800, 420]} at={0.1} dur={0.6} seed={1} o={{ fill: '#fff', fillStyle: 'solid' }} />
        <Circle cx={960} cy={510} w={300} h={180} at={within(L[0], 0.6)} />
        <Arrow x1={400} y1={800} x2={700} y2={600} at={within(L[0], 0.8)} bend={0.2} />
      </Canvas>
      <Hand x={960} y={180} align="center" size={72} at={L[0].start} dur={0.8} weight={700}>标题写在这里</Hand>
    </Phase>
    <Sfx at={0.1} name="scribble" volume={0.25} />
    <Sfx at={within(L[0], 0.6)} name="pop" volume={0.35} />
  </>
);
