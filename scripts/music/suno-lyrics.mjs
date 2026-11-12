// Word-timed lyrics for a song made in Suno, from Suno's own lyric alignment, instead of Whisper.
//
//   node scripts/music/suno-lyrics.mjs <alignment.json> "audio/<title>/<key>.wav"
//
// <alignment.json> is the Suno MCP `audio-lyrics-alignment` result saved as is ({ status, words: [{ word, start_s, end_s, success }] }).
// Writes <key>.wav.lyrics.json in the studio's format, and fills lyrics/<key>.txt when it holds no lyrics yet.
// [Verse]-style tags are dropped. Parenthesised ad-libs leave the sung line and go to the line's `adlibs`;
// a line that is only ad-libs keeps them as its words, with `adlib: true`.
// Works for any script: each CJK character is a word, Latin words are split on spaces.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();   // run from the project root (audio/, lyrics/)

const [src, wav] = process.argv.slice(2);
if (!src || !wav) { console.error('usage: node scripts/music/suno-lyrics.mjs <alignment.json> "audio/<title>/<key>.wav"'); process.exit(1); }
const al = JSON.parse(fs.readFileSync(src, 'utf8'));
if (al.status !== 'complete' || !Array.isArray(al.words)) { console.error(`alignment status is "${al.status}", not complete`); process.exit(1); }

// one entry per character, each with the time of its share of the token
const chars = [];
for (const t of al.words) {
  const cs = [...t.word.replace(/\[[^\]\n]*\]/g, '')], sung = (c) => /[\p{L}\p{N}]/u.test(c), n = cs.filter(sung).length || 1;
  let i = 0;
  for (const c of cs) {
    const a = t.start_s + ((t.end_s - t.start_s) * i) / n, b = t.start_s + ((t.end_s - t.start_s) * Math.min(n, i + 1)) / n;
    chars.push({ c, a, b, ok: t.success !== false });
    if (sung(c)) i++;
  }
}

const CJK = /[぀-ヿ㐀-鿿가-힣豈-﫿]/;
const lines = [];
let row = [], depth = 0, tag = false;
const flush = () => {
  const main = [], adl = [];
  let cur = null;
  const end = () => { if (cur) { (cur.ad ? adl : main).push(cur); cur = null; } };
  for (const ch of row) {
    if (!ch.c.trim() || /[,.!?;:，。！？；：、"“”]/.test(ch.c) && !cur) { end(); continue; }
    if (CJK.test(ch.c)) { end(); (ch.ad ? adl : main).push({ w: ch.c, start: ch.a, end: ch.b, ad: ch.ad, ok: ch.ok }); continue; }
    if (cur && cur.ad !== ch.ad) end();
    if (/[,.!?;:，。！？；：、"“”]/.test(ch.c)) { cur.w += ch.c; cur.end = ch.b; continue; }
    if (!cur) cur = { w: '', start: ch.a, end: ch.b, ad: ch.ad, ok: ch.ok };
    cur.w += ch.c; cur.end = ch.b; cur.ok &&= ch.ok;
  }
  end();
  row = [];
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const clean = (ws) => ws.map((w) => ({ w: w.w.replace(/[,.!?;:，。！？；：、"“”]+$/, '') || w.w, start: r3(w.start), end: r3(w.end), ...(w.ok ? {} : { guessed: true }) }));
  const words = main.length ? clean(main) : clean(adl);
  if (!words.length) return;
  const sep = (ws) => ws.map((w, i) => (i && !(CJK.test(w.w[0]) && CJK.test(ws[i - 1].w.at(-1))) ? ' ' : '') + w.w).join('');
  lines.push({
    start: words[0].start, end: words.at(-1).end, text: sep(words), words,
    ...(main.length ? (adl.length ? { adlibs: clean(adl) } : {}) : { adlib: true }),
  });
};
for (const ch of chars) {
  if (ch.c === '\n') { flush(); tag = false; continue; }
  if (ch.c === '[' && !row.length) { tag = true; continue; }
  if (tag) { if (ch.c === ']') tag = false; continue; }
  if (ch.c === '(') { depth++; continue; }
  if (ch.c === ')') { depth = Math.max(0, depth - 1); continue; }
  row.push({ ...ch, ad: depth > 0 });
}
flush();

const abs = path.resolve(ROOT, wav);
const dest = abs + '.lyrics.json';
fs.writeFileSync(dest, JSON.stringify({ source: path.basename(abs), model: 'suno-alignment', from_text_file: true, lines }, null, 1));

const key = path.basename(abs, '.wav'), txt = path.join(ROOT, 'lyrics', `${key}.txt`);
const has = fs.existsSync(txt) && fs.readFileSync(txt, 'utf8').split('\n').some((l) => l.trim() && !l.startsWith('#'));
if (!has) fs.writeFileSync(txt, `# Lyrics for "${key}", from Suno's alignment (ad-libs left out).\n\n` + lines.filter((l) => !l.adlib).map((l) => l.text).join('\n') + '\n');

const words = lines.reduce((n, l) => n + l.words.length, 0), guessed = lines.reduce((n, l) => n + l.words.filter((w) => w.guessed).length, 0);
console.log(`${path.relative(ROOT, dest)}: ${lines.length} lines (${lines.filter((l) => l.adlib).length} ad-lib only), ${words} words, ${guessed} placed by guess`);
if (!has) console.log(`${path.relative(ROOT, txt)}: written`);
