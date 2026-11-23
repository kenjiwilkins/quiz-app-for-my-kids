// 読み上げ音声の共通ルール。audio:check / audio:optimize / voice:generate が使う。
//   置き場所: src/assets/quiz/<ジャンル>/<答え>.m4a（問題の音声）
//             src/assets/voice/<言葉>.m4a（「おしまい」など、問題以外で読む言葉）
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { AUDIO_EXTS, DATA_FILES, QUIZ_DIR, ROOT, listGenreFiles } from './images-lib.mjs'

const run = promisify(execFile)

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

/** 問題以外で読む言葉（src/assets/voice/<言葉>.m4a）。アプリで使う言葉を増やしたらここにも足す */
export const PHRASES = ['おしまい']

const readJson = async (file) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw new Error(`${path.relative(ROOT, file)} を読めません: ${error.message}`)
  }
}

/**
 * すべての問題を { genre, dir, answer, read, lang } で列挙する（default の画像は除く）。NFC にそろえる。
 *   read: text.json の read（読み方の指定）。lang: text.json の lang（日本語以外の言語）
 */
export async function listQuestions() {
  const result = []
  for (const entry of await fs.readdir(QUIZ_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const genre = entry.name.normalize('NFC')
    const dir = path.join(QUIZ_DIR, entry.name)
    const add = (answer, extra = {}) => result.push({ genre, dir, answer: answer.normalize('NFC').trim(), ...extra })

    for (const file of await fs.readdir(dir)) {
      if (file.startsWith('.') || DATA_FILES.includes(file) || file === 'credits.json' || isAudio(file)) continue
      const answer = path.basename(file, path.extname(file))
      if (answer.toLowerCase() !== 'default') add(answer)
    }
    const colors = await readJson(path.join(dir, 'colors.json'))
    for (const key of Object.keys(colors ?? {})) add(key)
    const text = await readJson(path.join(dir, 'text.json'))
    const lang = typeof text?.lang === 'string' ? text.lang : undefined
    for (const item of Array.isArray(text?.items) ? text.items : []) {
      const value = typeof item === 'string' ? item : item?.text
      const read = typeof item?.read === 'string' && item.read.trim() ? item.read.trim() : undefined
      if (typeof value === 'string' && value.trim()) add(value, { read, lang })
    }
  }
  // 同じ答えが重なったら最初のものだけ残す
  const seen = new Set()
  return result.filter((q) => {
    const key = `${q.genre}/${q.answer}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** ジャンルごとの答えの一覧（音声のファイル名がどれかに一致するか確かめる用）。NFC にそろえる */
export async function answersByGenre() {
  const map = new Map()
  for (const { genre, answer } of await listQuestions()) {
    if (!map.has(genre)) map.set(genre, new Set())
    map.get(genre).add(answer)
  }
  return map
}

/** 音声ファイルを モノラル・AAC の .m4a に変換する（macOS の afconvert を使う） */
export async function convertToM4a(input, output) {
  if (process.platform !== 'darwin') throw new Error('macOS の afconvert を使うため、Mac で実行してください')
  // -c 1: モノラル / -d aac: AAC-LC / -b: ビットレート / -f m4af: .m4a コンテナ
  await run('afconvert', ['-f', 'm4af', '-d', 'aac', '-c', '1', '-b', String(AAC_BITRATE), input, output])
}
