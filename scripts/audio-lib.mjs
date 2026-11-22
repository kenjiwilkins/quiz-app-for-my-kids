// 読み上げ音声の共通ルール。audio:check と audio:optimize の両方が使う。
//   置き場所: src/assets/quiz/<ジャンル>/<答え>.m4a（問題の音声）
//             src/assets/voice/<言葉>.m4a（「おしまい」など、問題以外で読む言葉）
import fs from 'node:fs/promises'
import path from 'node:path'
import { AUDIO_EXTS, ROOT, listGenreFiles } from './images-lib.mjs'

export { AUDIO_EXTS }
export const VOICE_DIR = path.join(ROOT, 'src/assets/voice')

/** コミットしてよい形式 */
export const OUTPUT_EXT = '.m4a'
/** 1本あたりの上限（バイト）。AAC 48kbps なら 1秒で約 6KB なので、十分な余裕がある */
export const MAX_AUDIO_BYTES = 100 * 1024
/** 変換の設定: モノラル・AAC・48kbps */
export const AAC_BITRATE = 48000

const isAudio = (file) => AUDIO_EXTS.includes(path.extname(file).toLowerCase())

/** 音声ファイルを { genre, file, abs } で列挙する。voice フォルダのものは genre が null */
export async function listAudioFiles() {
  const result = (await listGenreFiles()).filter(({ file }) => isAudio(file))
  const voiceFiles = await fs.readdir(VOICE_DIR).catch(() => [])
  for (const file of voiceFiles) {
    if (!file.startsWith('.') && isAudio(file)) result.push({ genre: null, file, abs: path.join(VOICE_DIR, file) })
  }
  return result.sort((a, b) => a.abs.localeCompare(b.abs))
}

/** ジャンルごとの答えの一覧（音声のファイル名がどれかに一致するか確かめる用）。NFC にそろえる */
export async function answersByGenre() {
  const map = new Map()
  const add = (genre, answer) => {
    const key = genre.normalize('NFC')
    if (!map.has(key)) map.set(key, new Set())
    map.get(key).add(answer.normalize('NFC').trim())
  }
  for (const { genre, file, abs } of await listGenreFiles()) {
    if (isAudio(file)) continue
    if (file === 'colors.json') {
      for (const key of Object.keys(JSON.parse(await fs.readFile(abs, 'utf8')))) add(genre, key)
    } else if (file === 'text.json') {
      const { items = [] } = JSON.parse(await fs.readFile(abs, 'utf8'))
      for (const item of items) {
        const text = typeof item === 'string' ? item : item?.text
        if (typeof text === 'string') add(genre, text)
      }
    } else if (file !== 'credits.json') {
      add(genre, path.basename(file, path.extname(file)))
    }
  }
  return map
}
