export type QuizItem = {
  /** ジャンル名（フォルダ名） */
  genre: string
  /** 答えの表示名（拡張子を除いたファイル名） */
  answer: string
  /** ビルド後の画像URL */
  src: string
  /** 拡張子つきのファイル名（クレジットの照合に使う） */
  fileName: string
}

// フォルダとファイルを置くだけで反映される。コードの変更は不要。
const modules = import.meta.glob<string>('/src/assets/quiz/*/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const collator = new Intl.Collator('ja')

function parse(path: string, src: string): QuizItem | null {
  // macOS で作ったファイル名は濁点が分解（NFD）されていることがあるので NFC にそろえる
  const parts = path.normalize('NFC').split('/')
  const fileName = parts.at(-1)
  const genre = parts.at(-2)
  if (!fileName || !genre) return null
  const answer = fileName.replace(/\.[^.]+$/, '')
  return { genre, answer, src, fileName }
}

/** ジャンルのカード用画像のファイル名（拡張子を除く）。出題はされない */
const COVER_NAME = 'default'

const isCover = (item: QuizItem) => item.answer.toLowerCase() === COVER_NAME

const parsedItems: QuizItem[] = Object.entries(modules)
  .map(([path, src]) => parse(path, src))
  .filter((item): item is QuizItem => item !== null)
  .sort((a, b) => collator.compare(a.genre, b.genre) || collator.compare(a.answer, b.answer))

const allItems = parsedItems.filter((item) => !isCover(item))
const covers = new Map(parsedItems.filter(isCover).map((item) => [item.genre, item]))

/** 出題する画像（default を除く）を、ジャンル名・答えの順に並べて返す */
export function loadAssets(): QuizItem[] {
  return allItems
}

/** default も含めた、すべての画像を返す（クレジット用） */
export function loadAllImages(): QuizItem[] {
  return parsedItems
}

export type Genre = {
  name: string
  /** ジャンル選択のカードに出す画像。default があればそれ、なければ先頭の画像 */
  cover: QuizItem
  /** 出題する画像 */
  items: QuizItem[]
}

/**
 * ジャンルごとにまとめて返す（ジャンルの並びはあいうえお順）。
 * 出題する画像が1枚もないジャンル（default だけのフォルダなど）は含めない。
 */
export function loadGenres(): Genre[] {
  const map = new Map<string, QuizItem[]>()
  for (const item of allItems) {
    const list = map.get(item.genre) ?? []
    list.push(item)
    map.set(item.genre, list)
  }
  return [...map.entries()].map(([name, items]) => ({ name, cover: covers.get(name) ?? items[0], items }))
}
