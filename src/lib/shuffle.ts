/**
 * Fisher-Yates シャッフル。元の配列は変更せず、新しい配列を返す純粋関数。
 * random は テスト用に差し替えられるようにしている（0 以上 1 未満を返す関数）。
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }
  return result
}
