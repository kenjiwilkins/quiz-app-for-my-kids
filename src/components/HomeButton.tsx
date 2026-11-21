import { Button } from './Button'
import { HouseIcon } from './Shapes'

export function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="small" onClick={onClick} aria-label="おうちへ もどる">
      <HouseIcon />
      おうち
    </Button>
  )
}
