/** 言語ごとに選んだ声（見つからなかった言語は null） */
const cachedVoices = new Map<string, SpeechSynthesisVoice | null>()

// macOS のおもしろ声（ロボット声・歌声など）。子ども向けには使わない
const NOVELTY_VOICES =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Pipe Organ|Ralph|Fred|Kathy|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i

// 聞き取りやすい標準の声（見つかれば優先する）
const PREFERRED_VOICES = /^(Samantha|Kyoko|Google|Microsoft|Ava|Allison|Susan|Alex|Siri)\b/i

/** lang（例: ja-JP, en-US）に合う声を選ぶ。完全一致 → 同じ言語（ja, en）の順に、おもしろ声を除いて探す */
function pickVoice(synth: SpeechSynthesis, lang: string): SpeechSynthesisVoice | null {
  const cached = cachedVoices.get(lang)
  if (cached) return cached
  const voices = synth.getVoices().filter((v) => !NOVELTY_VOICES.test(v.name))
  if (voices.length === 0) return null
  const base = lang.split('-')[0]
  const choose = (list: SpeechSynthesisVoice[]) =>
    list.find((v) => PREFERRED_VOICES.test(v.name)) ?? list.find((v) => v.default) ?? list[0]
  const exact = voices.filter((v) => v.lang === lang)
  const sameLanguage = voices.filter((v) => v.lang.startsWith(base))
  const voice = (exact.length > 0 ? choose(exact) : choose(sameLanguage)) ?? null
  cachedVoices.set(lang, voice)
  return voice
}

/** 読み上げる。lang を省くと日本語。非対応の環境では何もしない。 */
export function speak(text: string, lang = 'ja-JP'): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.85
    utterance.pitch = 1.1
    const voice = pickVoice(synth, lang)
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
