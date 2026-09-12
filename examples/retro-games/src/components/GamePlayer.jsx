import { useState } from 'react'
import DoodleJump from '../games/DoodleJump'
import SpaceInvaders from '../games/SpaceInvaders'
import Racing from '../games/Racing'
import Tetris from '../games/Tetris'
import PacMan from '../games/PacMan'

const GAME_COMPONENTS = {
  doodle: DoodleJump,
  invaders: SpaceInvaders,
  racing: Racing,
  tetris: Tetris,
  pacman: PacMan,
}

export default function GamePlayer({ title, gameId, onClose }) {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const GameComponent = GAME_COMPONENTS[gameId]
  const gameName = title || gameId || 'Juego'

  if (!gameOver && GameComponent) {
    return <GameComponent score={score} setScore={setScore} setGameOver={setGameOver} />
  }

  // Game over / menu screen
  return (
    <div className="relative flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-arcade-cyan/40 bg-gradient-to-br from-[#0b0f1f] to-[#1a1040] p-6">
      <div className="text-center max-w-md">
        <div className="mb-4 text-6xl">🏁</div>
        <h3 className="font-pixel text-xl text-arcade-yellow mb-2">¡{gameName} TERMINADO!</h3>
        <p className="text-3xl font-pixel text-arcade-cyan mb-1">{score}</p>
        <p className="text-sm text-slate-400 mb-8">PUNTOS</p>

        {/* Controls info per game */}
        {gameId === 'racing' && (
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">↑ / W</span> acelerar</p>
            <p><span className="text-arcade-cyan font-pixel">↓ / S</span> frenar</p>
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
          </div>
        )}

        {gameId === 'doodle' && (
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
            <p><span className="text-arcade-green font-pixel">Salto</span> automático al tocar plataforma</p>
          </div>
        )}

        {gameId === 'invaders' && (
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
            <p><span className="text-arcade-yellow font-pixel">ESPACIO</span> disparar</p>
          </div>
        )}

        {gameId === 'tetris' && (
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
            <p><span className="text-arcade-yellow font-pixel">↑ / W</span> rotar</p>
            <p><span className="text-arcade-green font-pixel">↓ / S</span> caer rápido</p>
          </div>
        )}

        {gameId === 'pacman' && (
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → ↑ ↓ / WASD</span> mover</p>
            <p><span className="text-arcade-green font-pixel">⬤ Grande</span> = power pellet</p>
          </div>
        )}

        <button
          onClick={() => {
            setScore(0)
            setGameOver(false)
          }}
          className="rounded-lg bg-arcade-cyan/20 px-8 py-3 font-pixel text-sm text-arcade-cyan transition-all hover:bg-arcade-cyan/40"
        >
          ↺ JUGAR DE NUEVO
        </button>
      </div>
    </div>
  )
}
