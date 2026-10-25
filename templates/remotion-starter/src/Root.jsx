import React from 'react';
import { Composition, Still } from 'remotion';
import timeline from './timeline.json';
import { FPS, H, W } from './theme';
import { Video } from './Video';
import { Thumb16x9, Thumb4x3 } from './Thumbnails';

// 时长完全来自 timeline.json（assemble_vo.py 按口播排出来的），不在这里手写。
// 封面两个比例都要：B 站一次投稿同时要 16:9 和 4:3，缺一个就不算做完。
export const Root = () => (
  <>
    <Composition
      id="Draft"
      component={Video}
      durationInFrames={Math.round(timeline.total * FPS)}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ subtitles: true }}
    />
    <Still id="Thumb16x9" component={Thumb16x9} width={1920} height={1080} />
    <Still id="Thumb4x3" component={Thumb4x3} width={1440} height={1080} />
  </>
);
