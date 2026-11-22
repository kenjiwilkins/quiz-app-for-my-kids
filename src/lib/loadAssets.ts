type ItemBase = {
  /** ジャンル名（フォルダ名） */
  genre: string
  /** 答えの表示名（画像は拡張子を除いたファイル名、色は colors.json のキー） */
  answer: string
  /** 問題ごとに一意なキー（React の key などに使う） */
  id: string
}

/** 画像の問題 */
export type ImageItem = ItemBase & {
  kind: 'image'
  /** ビルド後の画像URL */
  src: string
  /** 拡張子つきのファイル名（クレジットの照合に使う） */
  fileName: string
}

/** 色の問題（colors.json に Hex で書く。画像はいらない） */
export type ColorItem = ItemBase & {
  kind: 'color'
  /** 塗る色（#RGB または #RRGGBB） */
  hex: string
}

/** 文字の問題（text.json に書く。画像はいらない）。answer の文字をそのまま大きく出す */
export type TextItem = ItemBase & {
  kind: 'text'
  /** 読み上げる言葉（カタカナなど）。書かなければ answer をそのまま読む */
  reading: string | undefined
}

export type QuizItem = ImageItem | ColorItem | TextItem

// フォルダとファイルを置くだけで反映される。コードの変更は不要。
const imageModules = import.meta.glob<string>('/src/assets/quiz/*/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

// 色の問題: ジャンルフォルダの colors.json に { "答え": "#RRGGBB" } で書く
const colorModules = import.meta.glob<Record<string, unknown>>('/src/assets/quiz/*/colors.json', {
  eager: true,
  import: 'default',
})

// 文字の問題: ジャンルフォルダの text.json に { "pick": 20, "items": ["あ", "い", ...] } で書く。
// 読み方を決めたいときは items に { "text": "a", "read": "エー" } と書ける
type TextFile = { pick?: unknown; items?: unknown }
const textModules = import.meta.glob<TextFile>('/src/assets/quiz/*/text.json', {
  eager: true,
  import: 'default',
})

const collator = new Intl.Collator('ja')

/** パスから ジャンル名 と ファイル名 を取り出す */
function splitPath(path: string): { genre: string; fileName: string } | null {
  // macOS で作ったファイル名は濁点が分解（NFD）されていることがあるので NFC にそろえる
  const parts = path.normalize('NFC').split('/')
  const fileName = parts.at(-1)
  const genre = parts.at(-2)
  return fileName && genre ? { genre, fileName } : null
}

function parseImage(path: string, src: string): ImageItem | null {
  const parsed = splitPath(path)
  if (!parsed) return null
  const answer = parsed.fileName.replace(/\.[^.]+$/, '')
  return { kind: 'image', genre: parsed.genre, answer, id: src, src, fileName: parsed.fileName }
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function parseColors(path: string, colors: Record<string, unknown>): ColorItem[] {
  const genre = splitPath(path)?.genre
  if (!genre) return []
  const items: ColorItem[] = []
  for (const [key, value] of Object.entries(colors)) {
    const answer = key.normalize('NFC')
    if (typeof value !== 'string' || !HEX.test(value)) {
      if (import.meta.env.DEV) {
        console.warn(`[colors] ${genre}/colors.json の「${answer}」の色が正しくありません: ${String(value)}（#RRGGBB で書いてください）`)
      }
      continue
    }
    items.push({ kind: 'color', genre, answer, id: `color:${genre}/${answer}`, hex: value })
  }
  return items
}

/** 文字のジャンルの設定（1回に出す数と、カードに出す文字） */
type TextGenre = { pick: number | undefined; coverText: string | undefined }
const textGenres = new Map<string, TextGenre>()

function parseText(path: string, file: TextFile): TextItem[] {
  const genre = splitPath(path)?.genre
  if (!genre) return []
  const warn = (message: string) => {
    if (import.meta.env.DEV) console.warn(`[text] ${genre}/text.json: ${message}`)
  }
  const raw = Array.isArray(file.items) ? file.items : []
  if (raw.length === 0) warn('"items" に文字の配列を書いてください')
  // 文字列か { text, read } を受け付ける。空文字と重複は除く
  const entries = new Map<string, string | undefined>()
  for (const value of raw) {
    const text = typeof value === 'string' ? value : isEntry(value) ? value.text : undefined
    const read = isEntry(value) && typeof value.read === 'string' ? value.read.trim() || undefined : undefined
    const answer = text?.normalize('NFC').trim()
    if (!answer) {
      warn(`読めない項目があります: ${JSON.stringify(value)}`)
      continue
    }
    if (!entries.has(answer)) entries.set(answer, read)
  }
  const answers = [...entries.keys()]
  let pick: number | undefined
  if (file.pick !== undefined) {
    if (typeof file.pick === 'number' && Number.isInteger(file.pick) && file.pick > 0) pick = file.pick
    else warn(`"pick" は 1 以上の整数で書いてください（${String(file.pick)}）。すべて出題します`)
  }
  textGenres.set(genre, { pick, coverText: answers[0] })
  return answers.map((answer) => ({
    kind: 'text',
    genre,
    answer,
    reading: entries.get(answer),
    id: `text:${genre}/${answer}`,
  }))
}

function isEntry(value: unknown): value is { text: string; read?: unknown } {
  return typeof value === 'object' && value !== null && typeof (value as { text?: unknown }).text === 'string'
}

/** 読み上げる言葉。文字の問題で読みが書いてあればそれ、なければ答えそのもの */
export function spokenText(item: QuizItem): string {
  return (item.kind === 'text' && item.reading) || item.answer
}

/** ジャンルのカード用画像のファイル名（拡張子を除く）。出題はされない */
const COVER_NAME = 'default'

const isCover = (item: QuizItem): item is ImageItem => item.kind === 'image' && item.answer.toLowerCase() === COVER_NAME

const byGenreAndAnswer = (a: QuizItem, b: QuizItem) =>
  collator.compare(a.genre, b.genre) || collator.compare(a.answer, b.answer)

const imageItems: ImageItem[] = Object.entries(imageModules)
  .map(([path, src]) => parseImage(path, src))
  .filter((item): item is ImageItem => item !== null)
  .sort(byGenreAndAnswer)

const colorItems: ColorItem[] = Object.entries(colorModules)
  .flatMap(([path, colors]) => parseColors(path, colors))
  .sort(byGenreAndAnswer)

const textItems: TextItem[] = Object.entries(textModules).flatMap(([path, file]) => parseText(path, file))

// 文字の問題は text.json に書いた順のまま（あいうえお順のカード文字などに使う）。出題時はシャッフルされる
const allItems: QuizItem[] = [
  ...[...imageItems.filter((item) => !isCover(item)), ...colorItems].sort(byGenreAndAnswer),
  ...textItems,
]
const covers = new Map(imageItems.filter(isCover).map((item) => [item.genre, item]))

/** 出題する問題（default を除く）を、ジャンル名・答えの順に並べて返す */
export function loadAssets(): QuizItem[] {
  return allItems
}

/** default も含めた、すべての画像を返す（クレジット用。色の問題は含まない） */
export function loadAllImages(): ImageItem[] {
  return imageItems
}

export type Genre = {
  name: string
  /**
   * ジャンル選択のカードに出す画像。default があればそれ、なければ先頭の画像。
   * 画像が1枚もない（色・文字だけの）ジャンルでは undefined で、カードには色の図形か文字を描く
   */
  cover: ImageItem | undefined
  /** 文字のジャンルのカードに出す文字（text.json の先頭） */
  coverText: string | undefined
  /** 1回のクイズで出す数。undefined ならすべて出す */
  pick: number | undefined
  /** 出題する問題 */
  items: QuizItem[]
}

/**
 * ジャンルごとにまとめて返す（ジャンルの並びはあいうえお順）。
 * 出題する問題が1つもないジャンル（default だけのフォルダなど）は含めない。
 */
export function loadGenres(): Genre[] {
  const map = new Map<string, QuizItem[]>()
  for (const item of allItems) {
    const list = map.get(item.genre) ?? []
    list.push(item)
    map.set(item.genre, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => collator.compare(a, b))
    .map(([name, items]) => ({
      name,
      cover: covers.get(name) ?? items.find((item): item is ImageItem => item.kind === 'image'),
      coverText: textGenres.get(name)?.coverText,
      pick: textGenres.get(name)?.pick,
      items,
    }))
}
