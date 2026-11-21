// バウハウス風の幾何学アイコン。文字が読めなくても形で伝わるようにする。

type IconProps = { size?: number }

/** おうち: 四角の上に三角 */
export function HouseIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <polygon points="2,13 14,2 26,13" fill="var(--shape-red)" />
      <rect x="5" y="13" width="18" height="13" fill="currentColor" />
      <rect x="11" y="18" width="6" height="8" fill="var(--shape-yellow)" />
    </svg>
  )
}

/** つぎへ: 右向きの三角 */
export function NextIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="6,3 29,16 6,29" fill="currentColor" />
    </svg>
  )
}

/** もういっかい: 円 */
export function RetryIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="52 100" />
      <polygon points="22,2 31,10 20,13" fill="currentColor" />
    </svg>
  )
}

/** ロゴ: 赤い四角・青い円・黄色い三角 */
export function LogoMark({ size = 40 }: IconProps) {
  return (
    <svg width={size * 2.125} height={size} viewBox="0 0 170 80" aria-hidden="true">
      <rect x="2" y="14" width="52" height="52" fill="var(--shape-red)" />
      <circle cx="86" cy="40" r="26" fill="var(--shape-blue)" />
      <polygon points="118,66 144,14 170,66" fill="var(--shape-yellow)" />
    </svg>
  )
}

const SHAPES = ['square', 'circle', 'triangle'] as const
const COLORS = ['var(--shape-red)', 'var(--shape-blue)', 'var(--shape-yellow)'] as const

/** n 番目の図形（四角→円→三角 を くりかえす） */
export function ShapeMark({ index, size = 28 }: { index: number; size?: number }) {
  const shape = SHAPES[index % SHAPES.length]
  const color = COLORS[index % COLORS.length]
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      {shape === 'square' && <rect x="2" y="2" width="24" height="24" fill={color} />}
      {shape === 'circle' && <circle cx="14" cy="14" r="12" fill={color} />}
      {shape === 'triangle' && <polygon points="1,26 14,2 27,26" fill={color} />}
    </svg>
  )
}
