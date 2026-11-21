import { useEffect, useState } from 'react'
import { Credits } from './components/Credits'
import { GenreSelect } from './components/GenreSelect'
import { Quiz } from './components/Quiz'
import { warnMissingCredits } from './lib/credits'
import { loadAllImages, loadGenres, type Genre } from './lib/loadAssets'

type Screen = { name: 'home' } | { name: 'quiz'; genre: Genre; round: number } | { name: 'credits' }

const genres = loadGenres()

// 開発時のみ: credits.json にない画像をコンソールで警告する（本番ビルドでは何もしない）
warnMissingCredits(loadAllImages())

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  // 画面が切り替わったら いちばん上から表示する
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const goHome = () => setScreen({ name: 'home' })

  switch (screen.name) {
    case 'quiz':
      return (
        <Quiz
          // round を変えると Quiz が作り直され、再シャッフルされる
          key={`${screen.genre.name}-${screen.round}`}
          genre={screen.genre}
          onHome={goHome}
          onRetry={() => setScreen({ ...screen, round: screen.round + 1 })}
        />
      )
    case 'credits':
      return <Credits genres={genres} onBack={goHome} />
    default:
      return (
        <GenreSelect
          genres={genres}
          onSelect={(genre) => setScreen({ name: 'quiz', genre, round: 0 })}
          onShowCredits={() => setScreen({ name: 'credits' })}
        />
      )
  }
}
