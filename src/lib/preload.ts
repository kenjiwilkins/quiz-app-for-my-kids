const loaded = new Set<string>()

/** 画像を先読みしておき、切り替え時のちらつきを防ぐ */
export function preloadImage(src: string | undefined): void {
  if (!src || loaded.has(src)) return
  loaded.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}
