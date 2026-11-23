// 読み上げ音声がルールどおりか確かめる。違反があれば一覧を出して exit 1。
//   ルール: すべて .m4a / MAX_AUDIO_BYTES 以内 / ファイル名と voice.json のキーがそのジャンルの答えのどれかと一致する
// 直し方: pnpm audio:optimize（形式）、ファイル名を答えに合わせる（名前）
import fs from 'node:fs/promises'
import path from 'node:path'
import { QUIZ_DIR, rel } from './images-lib.mjs'
import { MAX_AUDIO_BYTES, OUTPUT_EXT, answersByGenre, listAudioFiles } from './audio-lib.mjs'

const answers = await answersByGenre()
const problems = []

for (const { genre, file, abs } of await listAudioFiles()) {
  if (path.extname(file).toLowerCase() !== OUTPUT_EXT) {
    problems.push(`${rel(abs)}: ${OUTPUT_EXT} ではありません（pnpm audio:optimize で変換してください）`)
    continue
  }
  const { size } = await fs.stat(abs)
  if (size > MAX_AUDIO_BYTES) problems.push(`${rel(abs)}: ${Math.round(size / 1024)}KB（${MAX_AUDIO_BYTES / 1024}KB を超えています）`)
  if (genre !== null) {
    const name = path.basename(file, path.extname(file)).normalize('NFC')
    if (!answers.get(genre.normalize('NFC'))?.has(name)) {
      problems.push(`${rel(abs)}: 「${genre}」に「${name}」という答えがありません（ファイル名を答えに合わせてください）`)
    }
  }
}

// voice.json（VOICEVOX の読みの指定）のキーも答えと一致しているか
for (const [genre, set] of answers) {
  const file = path.join(QUIZ_DIR, genre, 'voice.json')
  let raw
  try {
    raw = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') problems.push(`${rel(file)}: 読めません（${error.message}）`)
    continue
  }
  for (const key of Object.keys(raw)) {
    if (!set.has(key.normalize('NFC'))) problems.push(`${rel(file)}: 「${genre}」に「${key}」という答えがありません`)
  }
}

if (problems.length > 0) {
  console.error(`[audio:check] 読み上げ音声がルールに合っていません（${problems.length} 件）:`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('[audio:check] OK: 読み上げ音声はすべて .m4a で、答えと名前が一致しています')
