import { useEffect } from 'react'
import { useGame } from '../store'
import { duckBgm } from '../lib/audio'
import FpsRange from '../games/FpsRange'
import GraffitiWall from '../games/GraffitiWall'
import NightDrive from '../games/NightDrive'
import RhythmBeat from '../games/RhythmBeat'
import Docking from '../games/Docking'

export default function GameHost() {
  const career = useGame(s => s.ending)
  // 游戏期间 BGM 闪避
  useEffect(() => { duckBgm(true); return () => duckBgm(false) }, [])
  return (
    <div className="game-shell" data-testid="game-shell">
      {career === 'soldier' && <FpsRange />}
      {career === 'painter' && <GraffitiWall />}
      {career === 'racer' && <NightDrive />}
      {career === 'musician' && <RhythmBeat />}
      {career === 'astronaut' && <Docking />}
    </div>
  )
}
