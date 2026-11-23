// VOICEVOX（ローカルで起動しているエンジン）で読み上げ音声を作り、.m4a で保存する。
//   pnpm voice:generate                      音声がまだない問題すべて
//   pnpm voice:generate --genre でんしゃ      ジャンルをしぼる（くり返し指定できる）
//   pnpm voice:generate --only 常磐線,阪和線  答えをしぼる（カンマ区切り）
//   pnpm voice:generate --force              すでにある音声も作り直す（--genre / --only と一緒に使う）
//   pnpm voice:generate --dry-run            作らずに、読みとアクセント（カナ表記）だけ表示する
//
// 前提: VOICEVOX のデスクトップアプリを起動しておく（エンジンが http://127.0.0.1:50021 で動く）
//
// 読みやアクセントを直したいときは、ジャンルフォルダの voice.json に書く:
//   { "常磐線": "ジョウバンセン", "N700S": "エヌナナヒャクエス", "阪和線": "ハ'ンワセン" }
//   - ' を含まない値: 普通のテキストとして読ませる（カタカナで読みを決める）
//   - ' を含む値: AquesTalk 風のカナ表記としてそのまま使う（' の直前の音が高く、その次から下がる。
//     / でアクセント句を区切る。長音は ー ではなく母音で書く 例: ジョオバンセン'）
//   --dry-run で表示されるカナ表記をコピーして直すと楽
// 問題以外の言葉（おしまい）は src/assets/voice/voice.json に書く
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { rel } from './images-lib.mjs'
import { OUTPUT_EXT, PHRASES, VOICE_DIR, convertToM4a, listQuestions } from './audio-lib.mjs'

/** 声と話し方の設定。デスクトップアプリで作ったものと同じ既定値 */
const CONFIG = {
  engine: process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021',
  speaker: 'ずんだもん',
  style: 'ノーマル',
  speedScale: 1.0,
  pitchScale: 0.0,
  intonationScale: 1.0,
  volumeScale: 1.0,
  prePhonemeLength: 0.1,
  postPhonemeLength: 0.1,
  /** 無声化（「す」が息だけの「s」になる など）を戻して、はっきり発音させる */
  voiceDevoiced: true,
}

const { values: args } = parseArgs({
  options: {
    genre: { type: 'string', multiple: true },
    only: { type: 'string' },
    force: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})
const genres = args.genre?.map((g) => g.normalize('NFC'))
const only = args.only?.split(',').map((s) => s.normalize('NFC').trim()).filter(Boolean)
const dryRun = args['dry-run']

if (args.force && !genres && !only) {
  console.error('[voice:generate] --force は --genre か --only と一緒に使ってください（全部の作り直しを防ぐため）')
  process.exit(1)
}

// ---- エンジン ----

async function api(pathname, params, body) {
  const url = new URL(pathname, CONFIG.engine)
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, String(value))
  let res
  try {
    res = await fetch(url, {
      method: pathname === '/speakers' ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error(`VOICEVOX エンジン（${CONFIG.engine}）に接続できません。VOICEVOX アプリを起動してから再実行してください`)
  }
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`VOICEVOX ${pathname} が失敗しました（${res.status}）: ${detail}`)
  }
  return res
}

async function findSpeakerId() {
  const speakers = await (await api('/speakers')).json()
  const speaker = speakers.find((s) => s.name === CONFIG.speaker)
  const style = speaker?.styles.find((s) => s.name === CONFIG.style)
  if (!style) throw new Error(`VOICEVOX に「${CONFIG.speaker}（${CONFIG.style}）」が見つかりません`)
  return style.id
}

/** 無声化された音（母音が大文字）を有声に戻す。高さは前後の音に合わせる */
function voiceDevoicedMoras(query) {
  for (const phrase of query.accent_phrases) {
    const moras = phrase.moras
    moras.forEach((mora, i) => {
      if (!/^[AIUEO]$/.test(mora.vowel)) return
      mora.vowel = mora.vowel.toLowerCase()
      const neighbor = [...moras.slice(0, i).reverse(), ...moras.slice(i + 1)].find((m) => m.pitch > 0)
      mora.pitch = neighbor?.pitch ?? 5.5
    })
  }
}

async function buildQuery(speaker, text, override) {
  const query = await (await api('/audio_query', { speaker, text: override && !override.includes("'") ? override : text })).json()
  if (override?.includes("'")) {
    query.accent_phrases = await (await api('/accent_phrases', { speaker, text: override, is_kana: true })).json()
  }
  Object.assign(query, {
    speedScale: CONFIG.speedScale,
    pitchScale: CONFIG.pitchScale,
    intonationScale: CONFIG.intonationScale,
    volumeScale: CONFIG.volumeScale,
    prePhonemeLength: CONFIG.prePhonemeLength,
    postPhonemeLength: CONFIG.postPhonemeLength,
    outputStereo: false,
  })
  if (CONFIG.voiceDevoiced) voiceDevoicedMoras(query)
  return query
}

/** 表示用: アクセント位置つきのカナ（例: ジョオバンセン'） */
function kanaOf(query) {
  return query.accent_phrases
    .map((p) => p.moras.map((m, i) => m.text + (i + 1 === p.accent ? "'" : '')).join(''))
    .join('/')
}

// ---- 対象を集める ----

const readOverrides = async (dir) => {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(dir, 'voice.json'), 'utf8'))
    return new Map(Object.entries(raw).map(([k, v]) => [k.normalize('NFC'), String(v)]))
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map()
    throw new Error(`${rel(path.join(dir, 'voice.json'))} を読めません: ${error.message}`)
  }
}

const exists = (file) => fs.access(file).then(() => true, () => false)

const targets = []
const skippedLang = new Set()
const overridesCache = new Map()
const overridesFor = async (dir) => {
  if (!overridesCache.has(dir)) overridesCache.set(dir, await readOverrides(dir))
  return overridesCache.get(dir)
}

for (const q of await listQuestions()) {
  if (genres && !genres.includes(q.genre)) continue
  if (only && !only.includes(q.answer)) continue
  const overrides = await overridesFor(q.dir)
  // VOICEVOX は日本語だけ。lang がある（英語の）ジャンルは、voice.json に書いた問題だけ作る
  if (q.lang && !overrides.has(q.answer)) {
    skippedLang.add(q.genre)
    continue
  }
  targets.push({ label: `${q.genre}/${q.answer}`, text: q.read ?? q.answer, override: overrides.get(q.answer), out: path.join(q.dir, `${q.answer}${OUTPUT_EXT}`) })
}
if (!genres || genres.includes('voice')) {
  const overrides = await overridesFor(VOICE_DIR)
  for (const phrase of PHRASES) {
    if (only && !only.includes(phrase)) continue
    targets.push({ label: `voice/${phrase}`, text: phrase, override: overrides.get(phrase), out: path.join(VOICE_DIR, `${phrase}${OUTPUT_EXT}`) })
  }
}

const todo = []
for (const target of targets) {
  // macOS のファイル名は濁点が分かれている（NFD）ことがあるので、両方確かめる
  const nfd = path.join(path.dirname(target.out), path.basename(target.out).normalize('NFD'))
  const has = (await exists(target.out)) || (await exists(nfd))
  if (has && !args.force) continue
  todo.push({ ...target, existing: has ? ((await exists(target.out)) ? target.out : nfd) : undefined })
}

if (skippedLang.size > 0) {
  console.log(`skip（日本語以外のジャンル）: ${[...skippedLang].join(', ')}  ※ voice.json に書けば作れます`)
}
if (todo.length === 0) {
  console.log('作る音声はありませんでした（すでにある音声を作り直すときは --force）')
  process.exit(0)
}

// ---- 作る ----

const speaker = await findSpeakerId()
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'voicevox-'))
let made = 0
try {
  for (const target of todo) {
    const query = await buildQuery(speaker, target.text, target.override)
    const kana = kanaOf(query)
    const mark = target.override ? '（voice.json）' : ''
    if (dryRun) {
      console.log(`${target.label}  ${kana}${mark}`)
      continue
    }
    const wav = Buffer.from(await (await api('/synthesis', { speaker }, query)).arrayBuffer())
    const wavFile = path.join(tmp, `${made}.wav`)
    await fs.writeFile(wavFile, wav)
    if (target.existing) await fs.unlink(target.existing)
    await convertToM4a(wavFile, target.out)
    const { size } = await fs.stat(target.out)
    made++
    console.log(`${String(Math.round(size / 1024)).padStart(4)}KB  ${rel(target.out)}  ${kana}${mark}`)
  }
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

if (dryRun) console.log(`（--dry-run: ${todo.length} 件。音声は作っていません）`)
else console.log(`${made} 本を作りました（VOICEVOX:${CONFIG.speaker}）。耳で確かめて、おかしいものは voice.json で直して --force --only で作り直してください`)
