import rawCredits from '../assets/quiz/credits.json'
import type { ImageItem } from './loadAssets'

export type Credit = {
  author: string
  license: string
  sourceUrl: string
}

const credits = new Map<string, Credit>(
  Object.entries(rawCredits as Record<string, Partial<Credit>>).map(([key, value]) => [
    key.normalize('NFC'),
    { author: value.author ?? '', license: value.license ?? '', sourceUrl: value.sourceUrl ?? '' },
  ]),
)

/**
 * 画像のクレジットを探す。
 * キーは「ファイル名」（例: りんご.webp）。同じファイル名が別ジャンルにある場合は
 * 「ジャンル/ファイル名」（例: くだもの/りんご.webp）でも書ける（こちらが優先）。
 */
export function findCredit(item: ImageItem): Credit | undefined {
  return credits.get(`${item.genre}/${item.fileName}`) ?? credits.get(item.fileName)
}

/** 開発時だけ、credits.json に載っていない画像をコンソールで知らせる */
export function warnMissingCredits(items: readonly ImageItem[]): void {
  if (!import.meta.env.DEV) return
  const missing = items.filter((item) => !findCredit(item))
  if (missing.length === 0) return
  console.warn(
    `[credits] credits.json にクレジットがない画像が ${missing.length} 件あります:\n` +
      missing.map((item) => `  - ${item.genre}/${item.fileName}`).join('\n'),
  )
}

export type VoiceCredit = {
  /** 表示するクレジット（利用規約で決められた書き方） */
  label: string
  /** 使ったソフトのURL */
  softwareUrl: string
  /** キャラクターの利用規約のURL */
  termsUrl: string
}

/**
 * 読み上げ音声（src/assets/quiz/<ジャンル>/<答え>.m4a など）のクレジット。
 * VOICEVOX のキャラクターは「VOICEVOX:キャラ名」の表記が必要。声を増やしたらここに足す
 */
export const voiceCredits: readonly VoiceCredit[] = [
  {
    label: 'VOICEVOX:ずんだもん',
    softwareUrl: 'https://voicevox.hiroshiba.jp/',
    termsUrl: 'https://zunko.jp/con_ongen_kiyaku.html',
  },
]
