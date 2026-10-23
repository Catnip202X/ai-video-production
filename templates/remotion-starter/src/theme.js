// 设计系统：每条视频一份。颜色、字体和帧率在这里定，镜头里只引用 C.xxx，不写死色值。
// 下面是"手绘草图"语言的示例值（米白方格纸 + 黑色马克笔 + 红蓝黄批注）；换语言时整份替换。
export const C = {
  paper: '#F6F1E7',
  paper2: '#EFE8DA',
  grid: 'rgba(60,90,140,0.10)',
  ink: '#1E1E1E',
  ink2: '#4A4A4A',
  faint: '#9A9387',
  red: '#E03E3E',     // 危险 / 错误
  blue: '#2F6FEB',    // 防守 / 修复中
  yellow: '#FFE066',  // 高亮 / 译文便签
  note: '#FFF1A8',
  green: '#2E9E5B',   // 完成 ✓
};

export const HAND = '"Hannotate SC", "HanziPen SC", "PingFang SC", sans-serif';
export const HAND_EN = '"Chalkboard SE", "Hannotate SC", sans-serif';
export const UI = '-apple-system, "SF Pro Text", "Helvetica Neue", "PingFang SC", sans-serif';
export const MONO = '"SF Mono", Menlo, monospace';

export const FPS = 30;
export const W = 1920;
export const H = 1080;
