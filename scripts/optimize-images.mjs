// クイズ画像を 長辺 MAX_SIDE 以内の WebP に変換し、元ファイルを置き換える。
// credits.json のキー（例: りんご.jpg）も新しいファイル名（りんご.webp）に書き換える。
// すでにルールどおりの WebP には何もしない。
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { CREDITS_FILE, MAX_BYTES, MAX_SIDE, SOURCE_EXTS, listQuizFiles, rel } from './images-lib.mjs'

const renames = new Map() // 古いキー -> 新しいキー（credits.json 用）
let before = 0
let after = 0
let count = 0

for (const { genre, file, abs } of await listQuizFiles()) {
  const ext = path.extname(file).toLowerCase()
  if (!SOURCE_EXTS.includes(ext)) {
    if (file !== 'credits.json') console.warn(`skip（画像ではない）: ${rel(abs)}`)
    continue
  }
  const { size } = await fs.stat(abs)
  const meta = await sharp(abs).metadata()
  const ok = ext === '.webp' && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE && size <= MAX_BYTES
  if (ok) continue

  const base = path.basename(file, path.extname(file))
  const out = path.join(path.dirname(abs), `${base}.webp`)
  if (out !== abs) {
    const exists = await fs.access(out).then(() => true, () => false)
    if (exists) throw new Error(`同じ名前の WebP がすでにあります: ${rel(out)}（どちらかを消してから再実行してください）`)
  }

  const buffer = await sharp(abs)
    .rotate() // 写真の向き（EXIF）を反映
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 100, effort: 6 })
    .toBuffer({ resolveWithObject: true })
  await fs.writeFile(out, buffer.data)
  if (out !== abs) await fs.unlink(abs)

  before += size
  after += buffer.data.length
  count++
  if (out !== abs) {
    renames.set(file, `${base}.webp`)
    renames.set(`${genre}/${file}`, `${genre}/${base}.webp`)
  }
  console.log(
    `${String(Math.round(size / 1024)).padStart(6)}KB -> ${String(Math.round(buffer.data.length / 1024)).padStart(4)}KB  ` +
      `${buffer.info.width}x${buffer.info.height}  ${rel(out)}`,
  )
}

// credits.json のキーを新しいファイル名に合わせる
if (renames.size > 0) {
  const raw = await fs.readFile(CREDITS_FILE, 'utf8')
  const credits = JSON.parse(raw)
  let changed = false
  const next = {}
  for (const [key, value] of Object.entries(credits)) {
    const nfc = key.normalize('NFC')
    const renamed = renames.get(nfc) ?? renames.get(key)
    if (renamed) changed = true
    next[renamed ?? key] = value
  }
  if (changed) {
    await fs.writeFile(CREDITS_FILE, `${JSON.stringify(next, null, 2)}\n`)
    console.log('credits.json のキーを .webp に書き換えました')
  }
}

if (count === 0) console.log('変換が必要な画像はありませんでした')
else console.log(`${count} 枚を変換: ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`)
