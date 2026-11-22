import { useEffect, useState, type CSSProperties } from 'react'
import { shapeAt } from '../lib/colors'
import { spokenText, type Genre } from '../lib/loadAssets'
import { preloadImage } from '../lib/preload'
import { shuffle } from '../lib/shuffle'
import { speak, stopSpeaking } from '../lib/speak'
import { Button } from './Button'
import { ColorShape } from './ColorShape'
import { HomeButton } from './HomeButton'
import styles from './Quiz.module.css'
import { Result } from './Result'
import { NextIcon } from './Shapes'

type Props = {
  genre: Genre
  /** 画像の後ろの色ブロックの色（ジャンルカードの図形と同じ色） */
  color: string
  onHome: () => void
  onRetry: () => void
}

export function Quiz({ genre, color, onHome, onRetry }: Props) {
  // マウントのたびに1回だけシャッフルする（もういっかい は key を変えて作り直す）。
  // pick があるジャンル（ひらがな など）は、シャッフルした先頭から pick 個だけ出す
  const [deck] = useState(() => shuffle(genre.items).slice(0, genre.pick ?? genre.items.length))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const current = deck[index]

  // 次の画像を先読みしておく
  useEffect(() => {
    const nextItem = deck[index + 1]
    if (nextItem?.kind === 'image') preloadImage(nextItem.src)
  }, [deck, index])

  // 画面を離れたら読み上げを止める
  useEffect(() => stopSpeaking, [])

  if (!current) {
    return <Result onRetry={onRetry} onHome={onHome} />
  }

  const reveal = () => {
    setRevealed(true)
    speak(spokenText(current))
  }

  const next = () => {
    stopSpeaking()
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <HomeButton onClick={onHome} />
        <ol className={styles.progress} aria-label={`${deck.length}もん ちゅう ${index + 1}もんめ`}>
          {deck.map((item, i) => (
            <li
              key={item.id}
              className={[styles.dot, i < index ? styles.dotDone : '', i === index ? styles.dotCurrent : ''].join(' ')}
            />
          ))}
        </ol>
      </div>

      <button
        type="button"
        className={[
          styles.picture,
          current.kind === 'color' ? styles.pictureColor : '',
          current.kind === 'text' ? styles.pictureText : '',
        ].join(' ')}
        // 色ブロックは問題ごとに 右下 / 左下 と向きを入れ替える
        style={{ '--block': color, '--dir': index % 2 === 0 ? 1 : -1 } as CSSProperties}
        onClick={reveal}
        aria-label={revealed ? `こたえは ${current.answer}。もういちど きく` : 'こたえを みる'}
      >
        {current.kind === 'image' && <img key={current.id} src={current.src} alt="" draggable={false} />}
        {current.kind === 'color' && (
          // 色の問題: 画像の代わりに、その色で塗った図形を出す（形は問題ごとに 四角→円→三角）
          <ColorShape
            key={current.id}
            hex={current.hex}
            shape={shapeAt(index)}
            stroke="var(--bh-ink)"
            className={styles.swatch}
          />
        )}
        {current.kind === 'text' && (
          // 文字の問題: 文字をそのまま大きく出す。読みは答えを出したときに読み上げる
          <span
            key={current.id}
            className={styles.moji}
            style={{ '--len': [...current.answer].length } as CSSProperties}
          >
            {current.answer}
          </span>
        )}
      </button>

      <div className={styles.answerArea} aria-live="polite">
        {revealed ? (
          <button
            type="button"
            className={styles.answer}
            style={{ '--len': [...current.answer].length } as CSSProperties}
            onClick={() => speak(spokenText(current))}
          >
            {current.answer}
          </button>
        ) : (
          <button type="button" className={styles.hint} onClick={reveal} aria-label="こたえを みる">
            ?
          </button>
        )}
      </div>

      <div className={styles.next}>
        <Button variant="primary" block onClick={next}>
          つぎへ
          <NextIcon />
        </Button>
      </div>
    </main>
  )
}
