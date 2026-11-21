import { useEffect } from 'react'
import { speak, stopSpeaking } from '../lib/speak'
import { Button } from './Button'
import { HomeButton } from './HomeButton'
import styles from './Result.module.css'
import { HouseIcon, RetryIcon } from './Shapes'

type Props = {
  onRetry: () => void
  onHome: () => void
}

export function Result({ onRetry, onHome }: Props) {
  // おしまい画面が出たら読み上げる。画面を離れたら止める
  useEffect(() => {
    speak('おしまい')
    return stopSpeaking
  }, [])

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <HomeButton onClick={onHome} />
      </div>

      <div className={styles.body}>
        <svg className={styles.composition} viewBox="0 0 400 400" aria-hidden="true">
          <rect width="400" height="400" fill="var(--bh-paper)" />
          <rect x="40" y="40" width="180" height="180" fill="var(--bh-red)" />
          <circle cx="260" cy="160" r="110" fill="var(--bh-blue)" />
          <polygon points="120,360 240,180 360,360" fill="var(--bh-yellow)" />
          <rect x="40" y="300" width="80" height="60" fill="var(--bh-ink)" />
          <rect x="0" y="240" width="400" height="6" fill="var(--bh-ink)" />
        </svg>
        <h1 className={styles.title}>おしまい</h1>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" block onClick={onRetry}>
          <RetryIcon />
          もういっかい
        </Button>
        <Button block onClick={onHome}>
          <HouseIcon size={36} />
          おうちへ
        </Button>
      </div>
    </main>
  )
}
