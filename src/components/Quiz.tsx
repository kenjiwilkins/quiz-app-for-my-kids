import { useEffect, useState, type CSSProperties } from 'react'
import type { Genre } from '../lib/loadAssets'
import { preloadImage } from '../lib/preload'
import { shuffle } from '../lib/shuffle'
import { speak, stopSpeaking } from '../lib/speak'
import { Button } from './Button'
import { HomeButton } from './HomeButton'
import styles from './Quiz.module.css'
import { Result } from './Result'
import { NextIcon } from './Shapes'

type Props = {
  genre: Genre
  onHome: () => void
  onRetry: () => void
}

export function Quiz({ genre, onHome, onRetry }: Props) {
  // マウントのたびに1回だけシャッフルする（もういっかい は key を変えて作り直す）
  const [deck] = useState(() => shuffle(genre.items))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const current = deck[index]

  // 次の画像を先読みしておく
  useEffect(() => {
    preloadImage(deck[index + 1]?.src)
  }, [deck, index])

  // 画面を離れたら読み上げを止める
  useEffect(() => stopSpeaking, [])

  if (!current) {
    return <Result onRetry={onRetry} onHome={onHome} />
  }

  const reveal = () => {
    setRevealed(true)
    speak(current.answer)
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
              key={item.src}
              className={[styles.dot, i < index ? styles.dotDone : '', i === index ? styles.dotCurrent : ''].join(' ')}
            />
          ))}
        </ol>
      </div>

      <button
        type="button"
        className={styles.picture}
        onClick={reveal}
        aria-label={revealed ? `こたえは ${current.answer}。もういちど きく` : 'こたえを みる'}
      >
        <img key={current.src} src={current.src} alt="" draggable={false} />
      </button>

      <div className={styles.answerArea} aria-live="polite">
        {revealed ? (
          <button
            type="button"
            className={styles.answer}
            style={{ '--len': [...current.answer].length } as CSSProperties}
            onClick={() => speak(current.answer)}
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
