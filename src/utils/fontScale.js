// fontScale.js —— 全局字号缩放（界面文字 + 游戏内文字统一用这个系数）
// 范围 0.8 ~ 1.6，默认 1。存 localStorage 记住用户选择。

export const FONT_SCALE_KEY = 'wordworld-font-scale'
export const FONT_SCALE_MIN = 0.8
export const FONT_SCALE_MAX = 1.6
export const FONT_SCALE_DEFAULT = 1

/** 读取已保存的字号缩放（越界/异常都回退默认值） */
export function readFontScale() {
  try {
    const raw = localStorage.getItem(FONT_SCALE_KEY)
    if (!raw) return FONT_SCALE_DEFAULT
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return FONT_SCALE_DEFAULT
    return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n))
  } catch {
    return FONT_SCALE_DEFAULT
  }
}

/** 保存字号缩放 */
export function writeFontScale(n) {
  try {
    localStorage.setItem(FONT_SCALE_KEY, String(n))
  } catch {
    // 隐私模式等场景写不进去也无需中断
  }
}
