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

type SpeakOptions = {
  /** 読み上げの言語（例: en-US）。省くと日本語 */
  lang?: string
  /** 用意した音声ファイルのURL。あればこちらを鳴らし、鳴らせなければ Web Speech API で読み上げる */
  audio?: string
}

/** speak / stopSpeaking のたびに増やす。古い再生（読み込み待ちのものなど）を鳴らさないために使う */
let generation = 0

/**
 * 読み上げる。audio があればその音声ファイルを鳴らし、なければ（または鳴らせなければ）Web Speech API で読む。
 * 非対応の環境では何もしない。
 */
export function speak(text: string, { lang = 'ja-JP', audio }: SpeakOptions = {}): void {
  stopSpeaking()
  const current = generation
  if (!audio) {
    speakWithSynth(text, lang)
    return
  }
  // playClip の最初の await までは同期で動くので、タップの中で AudioContext を起こせる
  playClip(audio, current).catch(() => {
    if (current === generation) speakWithSynth(text, lang)
  })
}

/** 読み上げを止める。非対応の環境では何もしない。 */
export function stopSpeaking(): void {
  generation++
  try {
    playing?.stop()
  } catch {
    // すでに止まっている
  }
  playing = null
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  } catch {
    // 無視
  }
}

/** 次に使う音声ファイルを先に取ってきておく（デコードは鳴らすときにする） */
export function preloadAudio(url: string | undefined): void {
  if (url) fetchBytes(url).catch(() => {})
}

function speakWithSynth(text: string, lang: string): void {
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

// ---- 音声ファイルの再生 ----
// <audio> ではなく Web Audio API で鳴らす。メディア要素ではないので、スマホのロック画面や
// 通知に「再生中」（Media Session）が出ず、ほかのアプリの音楽も止めない。
// ※ iPhone のマナーモード中は Web Audio は鳴らない（Web Speech API は鳴る）

let context: AudioContext | null | undefined
let playing: AudioBufferSourceNode | null = null

function getContext(): AudioContext | null {
  if (context !== undefined) return context
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  context = Ctor ? new Ctor() : null
  return context
}

const MAX_CACHED = 24
const bytesCache = new Map<string, Promise<ArrayBuffer>>()
const bufferCache = new Map<string, Promise<AudioBuffer>>()

/** 古いものから捨てて、MAX_CACHED 個までにする */
function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string)
  return value
}

function fetchBytes(url: string): Promise<ArrayBuffer> {
  const cached = bytesCache.get(url)
  if (cached) return cached
  const promise = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.arrayBuffer()
  })
  promise.catch(() => bytesCache.delete(url))
  return remember(bytesCache, url, promise)
}

function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url)
  if (cached) return remember(bufferCache, url, cached)
  // decodeAudioData は渡した ArrayBuffer を使えなくするので、コピーを渡す
  const promise = fetchBytes(url).then((bytes) => ctx.decodeAudioData(bytes.slice(0)))
  promise.catch(() => bufferCache.delete(url))
  return remember(bufferCache, url, promise)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function playClip(url: string, current: number): Promise<void> {
  const ctx = getContext()
  if (!ctx) throw new Error('Web Audio API に対応していません')
  if (ctx.state !== 'running') {
    // タップの外（おしまい画面など）で一度も起こしていないと resume が終わらないので、待ちすぎない
    await Promise.race([ctx.resume(), wait(300)])
    if ((ctx.state as AudioContextState) !== 'running') throw new Error('AudioContext を開始できません')
  }
  const buffer = await loadBuffer(ctx, url)
  if (current !== generation) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.onended = () => {
    if (playing === source) playing = null
  }
  source.start()
  playing = source
}
