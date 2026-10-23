import React from 'react';
import { Img, Loop, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import posts from '../../public/x/posts.json';
import { ZH } from '../translations';
import { C, HAND, UI } from '../theme';
import { EASE, EASE_IN_OUT, prog, useSec } from '../lib';
import { R } from './rough';

// 真实 X 帖子卡片：先显示原文，trAt 秒时一张黄色手绘便签从下往上盖住正文，写着中文译文。
// 配图 / 视频不被盖住。卡片用手绘胶带"贴"在纸上。

// 原文在 API 里被截断的帖子 id：像 X 一样显示 "Show more"
const TRUNCATED = {};

const fmtCount = (n) => {
  if (n == null) return '';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (ts) => {
  const d = new Date(ts * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};
const fmtTime = (ts) => {
  const d = new Date(ts * 1000);
  const h = d.getUTCHours();
  return `${(h % 12) || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} UTC`;
};

// 认证标：个人蓝、机构金、政府灰
const BADGE = { individual: '#1D9BF0', organization: '#E2B719', government: '#829AAB' };
const Badge = ({ type, size = 22 }) => {
  if (!type || !BADGE[type]) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" style={{ marginLeft: 4, flexShrink: 0 }}>
      <path fill={BADGE[type]} d="M20.4 11c0-1.3-.7-2.4-1.8-3 .4-1.2.1-2.5-.8-3.4-.9-.9-2.2-1.1-3.4-.8C13.8 2.7 12.7 2 11.4 2s-2.4.7-3 1.8c-1.2-.4-2.5-.1-3.4.8-.9.9-1.1 2.2-.8 3.4C3.1 8.6 2.4 9.7 2.4 11s.7 2.4 1.8 3c-.4 1.2-.1 2.5.8 3.4.9.9 2.2 1.1 3.4.8.6 1.1 1.7 1.8 3 1.8s2.4-.7 3-1.8c1.2.4 2.5.1 3.4-.8.9-.9 1.1-2.2.8-3.4 1.1-.6 1.8-1.7 1.8-3z" />
      <path fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M7.4 11.3l2.6 2.6 4.9-5.4" />
    </svg>
  );
};

const XLogo = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#0F1419" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

// 正文：@提及、#话题、链接显示为蓝色
const Rich = ({ text }) => {
  const parts = text.split(/(https?:\/\/\S+|@\w+|#\w+)/g);
  return parts.map((p, i) => {
    if (/^https?:\/\//.test(p)) {
      const shown = p.replace(/^https?:\/\/(www\.)?/, '');
      return <span key={i} style={{ color: '#1D9BF0' }}>{shown.length > 30 ? shown.slice(0, 29) + '…' : shown}</span>;
    }
    if (/^[@#]\w+/.test(p)) return <span key={i} style={{ color: '#1D9BF0' }}>{p}</span>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

const Icon = ({ d, n }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#536471' }}>
    <svg width={20} height={20} viewBox="0 0 24 24"><path fill="#536471" d={d} /></svg>
    <span>{n}</span>
  </div>
);
const IC = {
  reply: 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z',
  rt: 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
  like: 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  views: 'M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z',
};

// 盖在正文上的中文便签
const Note = ({ zh, p, size }) => {
  if (p <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: -14, right: -14, top: -10, minHeight: 'calc(100% + 20px)', display: 'flex', flexDirection: 'column',
      clipPath: `inset(${(1 - p) * 100}% -4% -4% -4%)`, zIndex: 2,
    }}>
      <div style={{
        position: 'relative', background: C.note, padding: '16px 22px 18px 22px', flex: 1,
        boxShadow: '0 6px 14px rgba(80,60,0,0.18)', transform: 'rotate(-0.6deg)', borderRadius: 3,
      }}>
        <div style={{ position: 'absolute', top: 6, right: 12, fontFamily: HAND, fontSize: 20, color: '#8A6D00', opacity: 0.8 }}>译</div>
        <div style={{ fontFamily: HAND, fontSize: size * 1.02, lineHeight: 1.45, color: C.ink, whiteSpace: 'pre-wrap' }}>{zh}</div>
      </div>
    </div>
  );
};

const Media = ({ post, maxH, videoVolume, innerW }) => {
  const { fps } = useVideoConfig();
  const m = post.media;
  if (!m.length) return null;
  const many = m.length > 1;
  // 单张图按原比例显示；超过 maxH 时整体缩窄（不裁切），保证截图内容完整
  if (!many && m[0].type === 'photo') {
    const h = Math.min(maxH, innerW * m[0].h / m[0].w);
    const w = h * m[0].w / m[0].h;
    return (
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
        <Img src={staticFile(`x/${m[0].file}`)} style={{ width: w, height: h, borderRadius: 16, border: '1px solid #CFD9DE', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: many ? '1fr 1fr' : '1fr', gap: 3, borderRadius: 16, overflow: 'hidden', border: '1px solid #CFD9DE' }}>
      {m.map((x) => (x.type === 'photo'
        ? <Img key={x.file} src={staticFile(`x/${x.file}`)} style={{ width: '100%', maxHeight: many ? maxH / 2 : maxH, objectFit: 'cover', display: 'block' }} />
        : (
          <Loop key={x.file} durationInFrames={Math.round(5 * fps)} layout="none">
            <OffthreadVideo src={staticFile(`x/${x.file}`)} muted={!videoVolume} volume={videoVolume || 0} style={{ width: '100%', maxHeight: maxH, objectFit: 'cover', display: 'block' }} />
          </Loop>
        )))}
    </div>
  );
};

const Quote = ({ q, zh, p, size }) => (
  <div style={{ marginTop: 14, border: '1px solid #CFD9DE', borderRadius: 16, padding: '12px 16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: size * 0.82 }}>
      <Img src={staticFile(`x/${q.avatar}`)} style={{ width: 26, height: 26, borderRadius: '50%' }} />
      <b style={{ color: '#0F1419' }}>{q.name}</b><Badge type={q.badge} size={18} />
      <span style={{ color: '#536471' }}>@{q.handle}{q.created ? ` · ${fmtDate(q.created).replace(/, \d+$/, '')}` : ''}</span>
    </div>
    <div style={{ position: 'relative', marginTop: 6 }}>
      <div style={{ fontSize: size * 0.86, color: '#0F1419', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}><Rich text={q.text} /></div>
      {zh && <Note zh={zh} p={p} size={size * 0.86} />}
    </div>
  </div>
);

/**
 * id        帖子 id（posts.json）
 * at        贴上来的时间（镜头内秒）
 * trAt      中文便签盖上的时间；默认 at + 2.6
 * outAt     卡片撤下的时间（可选）
 * x, y, w   卡片位置（中心 x、顶部 y）与宽度
 * size      正文字号
 * mediaH    配图最大高度
 * rot       倾斜角度
 * focus     0–1：卡片放大程度（随时间推近）
 */
export const Tweet = ({ id, at = 0, trAt, outAt, x = 960, y = 120, w = 860, size = 27, mediaH = 420, rot = -1.2, scale = 1, videoVolume = 0, children }) => {
  const t = useSec();
  const post = posts[id];
  const k = prog(t, at, at + 0.5, EASE);
  if (k <= 0 || !post) return null;
  const out = outAt != null ? prog(t, outAt, outAt + 0.4, EASE_IN_OUT) : 0;
  if (out >= 1) return null;
  const tr = trAt ?? at + 2.6;
  const p = prog(t, tr, tr + 0.55, EASE_IN_OUT);
  const zh = ZH[id];
  const zhQ = ZH[`quote:${id}`];
  const drift = (t - at) * 0.004;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w,
      transform: `translateX(-50%) translateY(${(1 - k) * 60 + out * 80}px) rotate(${rot + (1 - k) * 3}deg) scale(${scale * (0.94 + 0.06 * k) + drift})`,
      transformOrigin: '50% 0%', opacity: Math.min(1, k * 1.4) * (1 - out),
    }}>
      {/* 胶带 */}
      <svg width={w} height={60} style={{ position: 'absolute', top: -28, left: 0, overflow: 'visible', zIndex: 3 }}>
        <R kind="rectangle" a={[40, 6, 150, 44]} o={{ fill: 'rgba(240,226,180,0.75)', fillStyle: 'solid', stroke: 'rgba(170,150,100,0.6)', strokeWidth: 1.5, roughness: 1.6 }} dur={0} at={at} seed={21} style={{ transform: `rotate(-8deg)`, transformOrigin: '115px 28px' }} />
        <R kind="rectangle" a={[w - 190, 6, 150, 44]} o={{ fill: 'rgba(240,226,180,0.75)', fillStyle: 'solid', stroke: 'rgba(170,150,100,0.6)', strokeWidth: 1.5, roughness: 1.6 }} dur={0} at={at} seed={22} style={{ transform: `rotate(7deg)`, transformOrigin: `${w - 115}px 28px` }} />
      </svg>
      <div style={{
        background: '#fff', borderRadius: 18, padding: '22px 26px 14px', fontFamily: UI, color: '#0F1419',
        boxShadow: '0 18px 40px rgba(60,45,20,0.22), 0 2px 6px rgba(60,45,20,0.12)', border: '1px solid #E4DED2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Img src={staticFile(`x/${post.avatar}`)} style={{ width: 58, height: 58, borderRadius: post.badge === 'organization' ? 10 : '50%', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: size * 0.85, fontWeight: 700 }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.name}</span><Badge type={post.badge} size={size * 0.85} />
            </div>
            <div style={{ fontSize: size * 0.78, color: '#536471' }}>@{post.handle}</div>
          </div>
          <XLogo size={size} />
        </div>
        <div style={{ position: 'relative', marginTop: 14 }}>
          <div style={{ fontSize: size, lineHeight: 1.36, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <Rich text={post.text} />{TRUNCATED[id] && <span style={{ color: '#1D9BF0' }}>… Show more</span>}
          </div>
          {zh && <Note zh={zh} p={p} size={size} />}
        </div>
        {post.quote && <Quote q={post.quote} zh={zhQ} p={p} size={size} />}
        <Media post={post} maxH={mediaH} videoVolume={videoVolume} innerW={w - 52} />
        <div style={{ marginTop: 14, fontSize: size * 0.72, color: '#536471' }}>
          {fmtTime(post.created)} · {fmtDate(post.created)}{post.views ? <> · <b style={{ color: '#0F1419' }}>{fmtCount(post.views)}</b> Views</> : null}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #EFF3F4', display: 'flex', justifyContent: 'space-between', fontSize: size * 0.68, padding: '10px 10px 0' }}>
          <Icon d={IC.reply} n={fmtCount(post.replies)} />
          <Icon d={IC.rt} n={fmtCount(post.retweets)} />
          <Icon d={IC.like} n={fmtCount(post.likes)} />
          <Icon d={IC.views} n={fmtCount(post.views)} />
        </div>
        {children}
      </div>
    </div>
  );
};

// 原帖已删除的卡片：不编造原文。只显示作者、日期、"已删除"说明，以及来源明确的同一段媒体（如作者后来正式公开的视频）。
export const DeletedPost = ({ name, avatar, date, note = '原帖已删除', source, at = 0, outAt, x = 960, y = 110, w = 1000, rot = 0.8, videoSrc, videoFrom = 0, volume = 0, aspect = '16 / 9', children }) => {
  const t = useSec();
  const { fps } = useVideoConfig();
  const k = prog(t, at, at + 0.5, EASE);
  if (k <= 0) return null;
  const out = outAt != null ? prog(t, outAt, outAt + 0.4, EASE_IN_OUT) : 0;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, opacity: Math.min(1, k * 1.4) * (1 - out),
      transform: `translateX(-50%) translateY(${(1 - k) * 60}px) rotate(${rot}deg)`,
    }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '20px 24px 18px', fontFamily: UI, boxShadow: '0 18px 40px rgba(60,45,20,0.22)', border: '1px solid #E4DED2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {avatar && <Img src={staticFile(avatar)} style={{ width: 58, height: 58, borderRadius: '50%' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 21, color: '#536471' }}>{date}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, background: '#F7F9F9', border: '1px solid #CFD9DE', borderRadius: 12, padding: '12px 16px', fontSize: 22, color: '#536471' }}>
          Deleted · <span style={{ fontFamily: HAND, fontSize: 24, color: C.ink }}>{note}</span>
        </div>
        {videoSrc && (
          <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: '1px solid #CFD9DE', aspectRatio: aspect, background: '#000' }}>
            <OffthreadVideo src={staticFile(videoSrc)} startFrom={Math.round(videoFrom * fps)} volume={volume} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        {source && <div style={{ marginTop: 10, fontSize: 19, color: '#536471' }}>来源：{source}</div>}
        {children}
      </div>
    </div>
  );
};
