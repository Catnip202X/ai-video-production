// 一次打包，渲染多张静帧：node tools/stills.mjs <输出目录> <秒数1> <秒数2> ...
// 也可以 --shots：每个镜头取中间一帧（联系表用）
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [outDir, ...args] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const timeline = JSON.parse(fs.readFileSync('src/timeline.json', 'utf8'));

let targets;
if (args[0] === '--shots') {
  const frac = Number(args[1] ?? 0.6);
  targets = timeline.shots.map((s) => ({ name: s.shot, sec: s.start + s.duration * frac }));
} else {
  // 秒数，或 镜头号@镜头内秒数（例如 S5-01@10）
  const byId = Object.fromEntries(timeline.shots.map((s) => [s.shot, s]));
  targets = args.map((a) => {
    const [id, off] = a.split('@');
    if (off != null) return { name: `${id}@${off}`, sec: byId[id].start + Number(off) };
    return { name: `t${Number(a).toFixed(2)}`, sec: Number(a) };
  });
}

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.js') });
const composition = await selectComposition({ serveUrl, id: 'Draft' });
for (const { name, sec } of targets) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(sec * composition.fps));
  const output = path.join(outDir, `${name}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: 'jpeg', jpegQuality: 85, scale: 0.5 });
  console.log(output);
}
