import type { Genre } from '../lib/loadAssets'
import { ColorCover } from './ColorShape'
import styles from './GenreSelect.module.css'
import { LogoMark, ShapeMark } from './Shapes'

type Props = {
  genres: Genre[]
  onSelect: (genre: Genre) => void
  onShowCredits: () => void
}

export function GenreSelect({ genres, onSelect, onShowCredits }: Props) {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <LogoMark size={44} />
        <h1 className={styles.title}>なにかな?</h1>
      </header>

      {genres.length === 0 ? (
        <p className={styles.empty}>
          画像がまだありません。<code>src/assets/quiz/ジャンル名/</code> に画像を置いてください。
        </p>
      ) : (
        <ul className={styles.grid}>
          {genres.map((genre, i) => (
            <li key={genre.name}>
              <button type="button" className={styles.card} onClick={() => onSelect(genre)}>
                <span className={styles.thumb}>
                  {genre.cover ? (
                    <img src={genre.cover.src} alt="" />
                  ) : genre.coverText ? (
                    // 文字のジャンル: 先頭の文字を大きく出す
                    <span className={styles.textCover}>{genre.coverText}</span>
                  ) : (
                    <ColorCover
                      hexes={genre.items.flatMap((item) => (item.kind === 'color' ? [item.hex] : []))}
                    />
                  )}
                </span>
                <span className={styles.label}>
                  <ShapeMark index={i} />
                  {genre.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className={styles.footer}>
        <button type="button" className={styles.creditsLink} onClick={onShowCredits}>
          がぞうについて
        </button>
      </footer>
    </main>
  )
}
