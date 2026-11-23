// 読み上げ音声（WAV など）を モノラル・AAC 48kbps の .m4a に変換し、元ファイルを消す。
// macOS に最初から入っている afconvert を使う（ほかのソフトのインストールは不要）。
// すでに .m4a のものには何もしない。
import fs from 'node:fs/promises'
import path from 'node:path'
import { rel } from './images-lib.mjs'
import { OUTPUT_EXT, convertToM4a, listAudioFiles } from './audio-lib.mjs'

if (process.platform !== 'darwin') {
  console.error('[audio:optimize] macOS の afconvert を使うため、Mac で実行してください')
  process.exit(1)
}

let before = 0
let after = 0
let count = 0

for (const { file, abs } of await listAudioFiles()) {
  if (path.extname(file).toLowerCase() === OUTPUT_EXT) continue
  const out = path.join(path.dirname(abs), `${path.basename(file, path.extname(file))}${OUTPUT_EXT}`)
  const exists = await fs.access(out).then(() => true, () => false)
  if (exists) throw new Error(`同じ名前の ${OUTPUT_EXT} がすでにあります: ${rel(out)}（どちらかを消してから再実行してください）`)

  await convertToM4a(abs, out)
  const { size: inSize } = await fs.stat(abs)
  const { size: outSize } = await fs.stat(out)
  await fs.unlink(abs)

  before += inSize
  after += outSize
  count++
  console.log(`${String(Math.round(inSize / 1024)).padStart(6)}KB -> ${String(Math.round(outSize / 1024)).padStart(4)}KB  ${rel(out)}`)
}

if (count === 0) console.log('変換が必要な音声はありませんでした')
else console.log(`${count} 本を変換: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`)
