import { useEffect } from 'react'
import { useGame, careerOf } from '../store'
import { duckBgm } from '../lib/audio'
import FpsRange from '../games/FpsRange'
import GraffitiWall from '../games/GraffitiWall'
import NightDrive from '../games/NightDrive'

export default function GameHost() {
  const career = careerOf(useGame(s => s.ending))
  // 游戏期间 BGM 闪避
  useEffect(() => { duckBgm(true); return () => duckBgm(false) }, [])
  return (
    <div className="game-shell" data-testid="game-shell">
      {career === 'soldier' && <FpsRange />}
      {career === 'painter' && <GraffitiWall />}
      {career === 'racer' && <NightDrive />}
    </div>
  )
}
