const COLORS = ['var(--shape-red)', 'var(--shape-blue)', 'var(--shape-yellow)'] as const

/** n 番目のジャンルの色（赤→青→黄 を くりかえす）。ジャンルカードの図形とクイズ画像の色ブロックで共通 */
export function shapeColor(index: number): string {
  return COLORS[index % COLORS.length]
}
