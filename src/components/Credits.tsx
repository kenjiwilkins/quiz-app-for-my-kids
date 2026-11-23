import { findCredit, voiceCredits } from '../lib/credits'
import type { Genre, ImageItem } from '../lib/loadAssets'
import { HomeButton } from './HomeButton'
import styles from './Credits.module.css'

type Props = {
  genres: Genre[]
  onBack: () => void
}

/** 保護者向けの画像・音声のクレジット一覧（ここだけは漢字・英語で表示する） */
export function Credits({ genres, onBack }: Props) {
  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <HomeButton onClick={onBack} />
      </div>

      <h1 className={styles.title}>クレジット / Credits</h1>
      <p className={styles.lead}>
        このアプリで使用している画像・音声の作者とライセンスです。それぞれのライセンス・利用規約に従って利用しています。
      </p>

      <section>
        <h2 className={styles.section}>読み上げ音声 / Voice</h2>
        <ul className={styles.list}>
          {voiceCredits.map((voice) => (
            <li key={voice.label} className={[styles.item, styles.voice].join(' ')}>
              <p className={styles.name}>{voice.label}</p>
              <dl className={styles.meta}>
                <dt>ソフト / Software</dt>
                <dd>
                  <a href={voice.softwareUrl} target="_blank" rel="noopener noreferrer">
                    {voice.softwareUrl}
                  </a>
                </dd>
                <dt>利用規約 / Terms</dt>
                <dd>
                  <a href={voice.termsUrl} target="_blank" rel="noopener noreferrer">
                    {voice.termsUrl}
                  </a>
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <h2 className={styles.section}>画像 / Images</h2>

      {genres.map((genre) => {
        // 色の問題は画像を使わないので載せない。default のカード画像は先頭に載せる
        const images = genre.items.filter((item): item is ImageItem => item.kind === 'image')
        const list = genre.cover && !images.includes(genre.cover) ? [genre.cover, ...images] : images
        if (list.length === 0) return null
        return (
        <section key={genre.name}>
          <h3 className={styles.genre}>{genre.name}</h3>
          <ul className={styles.list}>
            {list.map((item) => {
              const credit = findCredit(item)
              const isCover = item === genre.cover && !images.includes(item)
              return (
                <li key={item.src} className={styles.item}>
                  <img src={item.src} alt="" loading="lazy" />
                  <div>
                    <p className={styles.name}>{isCover ? 'カード画像 / Cover' : item.answer}</p>
                    {credit ? (
                      <dl className={styles.meta}>
                        <dt>作者 / Author</dt>
                        <dd>{credit.author || '—'}</dd>
                        <dt>ライセンス / License</dt>
                        <dd>{credit.license || '—'}</dd>
                        <dt>出典 / Source</dt>
                        <dd>
                          {credit.sourceUrl ? (
                            <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                              {credit.sourceUrl}
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </dl>
                    ) : (
                      <p className={styles.missing}>クレジット情報が未登録です（credits.json）</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
        )
      })}
    </main>
  )
}
