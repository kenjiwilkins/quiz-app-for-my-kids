import type { Shape } from '../lib/colors'
import { shapeAt } from '../lib/colors'

type ShapeProps = {
  hex: string
  shape: Shape
  /** 枠線の色。背景に合わせて渡す */
  stroke?: string
  className?: string
}

/** 色の問題で出す図形。100x100 の中に描き、表示サイズは CSS で決める */
export function ColorShape({ hex, shape, stroke = 'var(--border)', className }: ShapeProps) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <ShapePath hex={hex} shape={shape} stroke={stroke} x={0} y={0} size={100} />
    </svg>
  )
}

type CoverProps = {
  hexes: string[]
  className?: string
}

/** 画像のない（色だけの）ジャンルのカード。先頭の4色を 2x2 に並べる */
export function ColorCover({ hexes, className }: CoverProps) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {hexes.slice(0, 4).map((hex, i) => (
        <ShapePath
          key={i}
          hex={hex}
          shape={shapeAt(i)}
          // カードの背景はダークモードでも白なので、枠線は常に黒
          stroke="var(--bh-ink)"
          x={(i % 2) * 50 + 4}
          y={Math.floor(i / 2) * 50 + 4}
          size={42}
        />
      ))}
    </svg>
  )
}

type PathProps = { hex: string; shape: Shape; stroke: string; x: number; y: number; size: number }

function ShapePath({ hex, shape, stroke, x, y, size }: PathProps) {
  // 枠線が切れないよう、少し内側に描く
  const inset = size * 0.04
  const s = size - inset * 2
  const left = x + inset
  const top = y + inset
  const common = { fill: hex, stroke, strokeWidth: 4, vectorEffect: 'non-scaling-stroke' as const }
  switch (shape) {
    case 'circle':
      return <circle cx={left + s / 2} cy={top + s / 2} r={s / 2} {...common} />
    case 'triangle':
      return <polygon points={`${left + s / 2},${top} ${left + s},${top + s} ${left},${top + s}`} {...common} />
    default:
      return <rect x={left} y={top} width={s} height={s} {...common} />
  }
}
