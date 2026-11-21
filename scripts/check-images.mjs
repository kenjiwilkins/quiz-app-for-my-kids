// クイズ画像がルールどおりか確かめる。違反があれば一覧を出して exit 1。
//   ルール: すべて .webp / 長辺 MAX_SIDE 以内 / MAX_BYTES 以内
// 直し方: pnpm images:optimize
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MAX_BYTES, MAX_SIDE, listQuizFiles, rel } from './images-lib.mjs'

const problems = []
for (const { abs } of await listQuizFiles()) {
  const ext = path.extname(abs).toLowerCase()
  if (ext !== '.webp') {
    problems.push(`${rel(abs)}: WebP ではありません`)
    continue
  }
  const { size } = await fs.stat(abs)
  const { width = 0, height = 0 } = await sharp(abs).metadata()
  if (Math.max(width, height) > MAX_SIDE) problems.push(`${rel(abs)}: ${width}x${height}（長辺 ${MAX_SIDE}px を超えています）`)
  if (size > MAX_BYTES) problems.push(`${rel(abs)}: ${Math.round(size / 1024)}KB（${MAX_BYTES / 1024}KB を超えています）`)
}

if (problems.length > 0) {
  console.error(`[images:check] クイズ画像がルールに合っていません（${problems.length} 件）:`)
  for (const p of problems) console.error(`  - ${p}`)
  console.error('直すには `pnpm images:optimize` を実行してください。')
  process.exit(1)
}
console.log('[images:check] OK: クイズ画像はすべて WebP・長辺 1200px 以内です')
