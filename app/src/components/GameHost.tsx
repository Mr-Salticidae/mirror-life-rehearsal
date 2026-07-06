import { useGame, careerOf } from '../store'
import FpsRange from '../games/FpsRange'
import GraffitiWall from '../games/GraffitiWall'
import NightDrive from '../games/NightDrive'

export default function GameHost() {
  const career = careerOf(useGame(s => s.ending))
  return (
    <div className="game-shell" data-testid="game-shell">
      {career === 'soldier' && <FpsRange />}
      {career === 'painter' && <GraffitiWall />}
      {career === 'racer' && <NightDrive />}
    </div>
  )
}
