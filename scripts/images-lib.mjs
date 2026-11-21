// クイズ画像の共通ルール。images:check と images:optimize の両方が使う。
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const QUIZ_DIR = path.join(ROOT, 'src/assets/quiz')
export const CREDITS_FILE = path.join(QUIZ_DIR, 'credits.json')

/** 長辺の上限（px） */
export const MAX_SIDE = 1200
/** 1枚あたりの上限（バイト） */
export const MAX_BYTES = 400 * 1024
/** 変換元として受け付ける拡張子 */
export const SOURCE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff', '.heic', '.heif']

/** 画像ではないデータファイル。images:check / images:optimize の対象外 */
export const DATA_FILES = ['colors.json', 'text.json']

/** ジャンルフォルダ内のファイルを { genre, file, abs } で列挙する（隠しファイルと DATA_FILES は除く） */
export async function listQuizFiles() {
  const result = []
  for (const genre of await fs.readdir(QUIZ_DIR, { withFileTypes: true })) {
    if (!genre.isDirectory() || genre.name.startsWith('.')) continue
    const dir = path.join(QUIZ_DIR, genre.name)
    for (const file of await fs.readdir(dir)) {
      if (file.startsWith('.') || DATA_FILES.includes(file)) continue
      result.push({ genre: genre.name, file, abs: path.join(dir, file) })
    }
  }
  return result.sort((a, b) => a.abs.localeCompare(b.abs))
}

export const rel = (abs) => path.relative(ROOT, abs)
