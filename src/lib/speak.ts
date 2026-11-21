let cachedVoice: SpeechSynthesisVoice | null | undefined

function pickJapaneseVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice
  const voices = synth.getVoices()
  if (voices.length === 0) return null
  cachedVoice = voices.find((v) => v.lang === 'ja-JP') ?? voices.find((v) => v.lang.startsWith('ja')) ?? null
  return cachedVoice
}

/** 日本語で読み上げる。非対応の環境では何もしない。 */
export function speak(text: string): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = 0.85
    utterance.pitch = 1.1
    const voice = pickJapaneseVoice(synth)
    if (voice) utterance.voice = voice
    synth.speak(utterance)
  } catch {
    // 読み上げは おまけ機能なので、失敗しても無視する
  }
}

/** 読み上げを止める。非対応の環境では何もしない。 */
export function stopSpeaking(): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  } catch {
    // 無視
  }
}
