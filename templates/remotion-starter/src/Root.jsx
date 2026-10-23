import React from 'react';
import { Composition } from 'remotion';
import timeline from './timeline.json';
import { FPS, H, W } from './theme';
import { Video } from './Video';

// 时长完全来自 timeline.json（assemble_vo.py 按口播排出来的），不在这里手写。
export const Root = () => (
  <Composition
    id="Draft"
    component={Video}
    durationInFrames={Math.round(timeline.total * FPS)}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ subtitles: true }}
  />
);
