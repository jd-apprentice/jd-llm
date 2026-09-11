import { useRef, useEffect, useState, useCallback } from 'react'

const W = 400
const H = 600
const COLS = 15
const ROWS = 22
const CELL = Math.floor((W - 10) / COLS)

// Map: 0=empty, 1=wall, 2=dots, 3=power, 9=empty(no dot)
const MAP_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,2,1,1,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,0,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,9,9,9,2,2,2,2,2,1],
  [1,1,1,1,2,1,0,0,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,0,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,9,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,0,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,0,0,0,1,2,1,2,1,1],
  [1,2,2,2,2,1,0,0,0,1,2,2,2,2,1],
  [1,2,1,1,1,1,2,2,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,9,1,1,2,1,1,2,1],
  [1,3,2,1,2,1,0,0,0,1,2,1,2,3,1],
  [1,1,2,1,2,1,0,0,0,1,2,1,2,1,1],
  [1,2,2,2,2,2,2,0,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

const GHOST_COLORS = ['#ef4444', '#ec4899', '#a78bfa', '#22d3ee']
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }

export default function PacmanGame({ score, setScore, setGameOver }) {
  const canvasRef = useRef(null)
  const [started, setStarted] = useState(false)
  const stateRef = useRef({
    map: [],
    pacman: { x: 7, y: 16, dir: 'right', nextDir: 'right' },
    ghosts: [],
    dotsLeft: 0,
    gameOver: false,
    powerMode: false,
    powerTimer: 0,
    keys: {},
    frameCount: 0,
    moveInterval: 6, // game ticks per movement
  })

  const handleKeyDown = useCallback((e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(e.key)) e.preventDefault()
    stateRef.current.keys[e.key] = true
    // Map key to direction
    const dirMap = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
    if (dirMap[e.key]) stateRef.current.pacman.nextDir = dirMap[e.key]
  }, [])
  const handleKeyUp = useCallback((e) => {
    stateRef.current.keys[e.key] = false
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    if (!started) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const gs = stateRef.current

    // Reset
    gs.map = MAP_TEMPLATE.map(row => [...row])
    gs.pacman = { x: 7, y: 16, dir: 'right', nextDir: 'right' }
    gs.ghosts = [
      { x: 7, y: 9, dir: 'up', color: GHOST_COLORS[0] },
      { x: 6, y: 9, dir: 'up', color: GHOST_COLORS[1] },
      { x: 8, y: 9, dir: 'up', color: GHOST_COLORS[2] },
      { x: 7, y: 8, dir: 'down', color: GHOST_COLORS[3] },
    ]
    gs.dotsLeft = 0
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (gs.map[r][c] === 2 || gs.map[r][c] === 3) gs.dotsLeft++
    gs.gameOver = false
    gs.powerMode = false
    gs.powerTimer = 0
    gs.frameCount = 0

    let lastTick = performance.now()
    const tickInterval = 120 // ms per game tick

    function isWall(x, y) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false // tunnel
      return gs.map[y][x] === 1
    }

    function canMove(x, y, dir) {
      const [dx, dy] = DIRS[dir]
      let nx = x + dx, ny = y + dy
      // Tunnel wrap
      if (nx < 0) nx = COLS - 1
      if (nx >= COLS) nx = 0
      return !isWall(nx, ny)
    }

    function getValidDirs(x, y, currentDir) {
      const oppDir = OPP[currentDir]
      return ['up', 'down', 'left', 'right'].filter(d => d !== oppDir && canMove(x, y, d))
    }

    // Simple ghost AI: random valid direction, prefer non-opposite
    function moveGhost(ghost) {
      const valid = getValidDirs(ghost.x, ghost.y, ghost.dir)
      if (valid.length === 0) return
      // Random choice
      ghost.dir = valid[Math.floor(Math.random() * valid.length)]
      const [dx, dy] = DIRS[ghost.dir]
      let nx = ghost.x + dx, ny = ghost.y + dy
      if (nx < 0) nx = COLS - 1
      if (nx >= COLS) nx = 0
      ghost.x = nx
      ghost.y = ny
    }

    function frame(now) {
      if (gs.gameOver) return
      gs.frameCount++

      const tick = now - lastTick
      if (tick < tickInterval) {
        animId = requestAnimationFrame(frame)
        return
      }
      lastTick = now

      // Move pacman
      const pac = gs.pacman
      // Try next direction first
      if (canMove(pac.x, pac.y, pac.nextDir)) {
        pac.dir = pac.nextDir
      }
      if (canMove(pac.x, pac.y, pac.dir)) {
        const [dx, dy] = DIRS[pac.dir]
        let nx = pac.x + dx, ny = pac.y + dy
        if (nx < 0) nx = COLS - 1
        if (nx >= COLS) nx = 0
        pac.x = nx
        pac.y = ny

        // Eat dot
        const cell = gs.map[ny][nx]
        if (cell === 2) {
          gs.map[ny][nx] = 9
          setScore(prev => prev + 10)
          gs.dotsLeft--
        } else if (cell === 3) {
          gs.map[ny][nx] = 9
          setScore(prev => prev + 50)
          gs.powerMode = true
          gs.powerTimer = 30
          gs.dotsLeft--
        }

        // Win condition
        if (gs.dotsLeft <= 0) {
          // Respawn dots with harder map would go here
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (gs.map[r][c] === 9 && MAP_TEMPLATE[r][c] !== 1) gs.map[r][c] = MAP_TEMPLATE[r][c]
          gs.ghosts[0].x = 7; gs.ghosts[0].y = 9
          gs.ghosts[1].x = 6; gs.ghosts[1].y = 9
          gs.ghosts[2].x = 8; gs.ghosts[2].y = 9
          gs.ghosts[3].x = 7; gs.ghosts[3].y = 8
        }
      }

      // Power timer
      if (gs.powerTimer > 0) {
        gs.powerTimer--
        if (gs.powerTimer <= 0) gs.powerMode = false
      }

      // Move ghosts (every other tick for balance)
      if (gs.frameCount % 2 === 0) {
        for (const g of gs.ghosts) {
          moveGhost(g)

          // Collision with pacman
          if (g.x === pac.x && g.y === pac.y) {
            if (gs.powerMode) {
              // Send ghost back to center
              g.x = 7; g.y = 9
              setScore(prev => prev + 200)
            } else {
              gs.gameOver = true
              setGameOver(true)
              return
            }
          }
        }
      }

      // ---- DRAW ----
      const offX = (W - COLS * CELL) / 2
      const offY = (H - ROWS * CELL) / 2

      // Background
      ctx.fillStyle = '#0b0f1f'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(offX, offY)

      // Draw map
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (gs.map[r][c] === 1) {
            // Wall
            ctx.fillStyle = '#1e3a5f'
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
            ctx.strokeStyle = '#22d3ee44'
            ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2)
          } else if (gs.map[r][c] === 2) {
            // Dot
            ctx.fillStyle = '#facc15'
            ctx.beginPath()
            ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 3, 0, Math.PI * 2)
            ctx.fill()
          } else if (gs.map[r][c] === 3) {
            // Power pellet
            ctx.fillStyle = '#facc15'
            ctx.beginPath()
            ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 7, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Draw pacman
      const px = pac.x * CELL + CELL / 2
      const py = pac.y * CELL + CELL / 2
      const mouthAngle = gs.frameCount % 8 < 4 ? 0.3 : 0.1
      let startAngle, endAngle
      if (pac.dir === 'right') { startAngle = mouthAngle; endAngle = Math.PI * 2 - mouthAngle }
      else if (pac.dir === 'left') { startAngle = Math.PI + mouthAngle; endAngle = Math.PI - mouthAngle }
      else if (pac.dir === 'up') { startAngle = 1.5 + mouthAngle; endAngle = 1.5 - mouthAngle + Math.PI * 2 }
      else { startAngle = 0.5 - mouthAngle; endAngle = 0.5 + mouthAngle }

      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(px, py, CELL / 2 - 1, startAngle % (Math.PI * 2), endAngle % (Math.PI * 2))
      ctx.lineTo(px, py)
      ctx.fill()

      // Draw ghosts
      for (const g of gs.ghosts) {
        const gx = g.x * CELL + CELL / 2
        const gy = g.y * CELL + CELL / 2
        const color = gs.powerMode ? '#3b82f6' : g.color

        ctx.fillStyle = color
        // Ghost body (dome + skirt)
        ctx.beginPath()
        ctx.arc(gx, gy - 2, CELL / 2 - 1, Math.PI, 0)
        ctx.lineTo(gx + CELL / 2 - 1, gy + CELL / 2 - 1)
        // Skirt waves
        for (let i = 3; i >= 0; i--) {
          const wx = gx - CELL / 2 + 1 + (i + 1) * (CELL - 2) / 4
          const wy = gy + CELL / 2 - 1 + (i % 2 === 0 ? 3 : -3)
          ctx.lineTo(wx, wy)
        }
        ctx.closePath()
        ctx.fill()

        // Eyes
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(gx - 4, gy - 5, 3, 0, Math.PI * 2)
        ctx.arc(gx + 4, gy - 5, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(gx - 3, gy - 5, 1.5, 0, Math.PI * 2)
        ctx.arc(gx + 5, gy - 5, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      animId = requestAnimationFrame(frame)
    }

    lastTick = performance.now()
    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [started, score, setScore, setGameOver])

  if (!started) {
    return (
      <div className="relative flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-arcade-orange/40 bg-gradient-to-br from-[#0b0f1f] to-[#1a1040] p-6">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center"><span className="text-7xl">👻</span></div>
          <h3 className="font-pixel text-xl text-arcade-yellow mb-3">Pac-Maze Rush</h3>
          <p className="text-sm text-slate-400 mb-6">Come todos los puntos y esquiva a los fantasmas. ¡Los power pellets te dan ventaja!</p>
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → ↑ ↓ / WASD</span> mover</p>
            <p><span className="text-arcade-green font-pixel">⬤ Grande</span> = power pellet (come fantasmas)</p>
          </div>
          <button onClick={() => setStarted(true)} className="rounded-lg bg-arcade-orange/20 px-8 py-3 font-pixel text-sm text-arcade-orange transition-all hover:bg-arcade-orange/40">▶ JUGAR</button>
        </div>
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} width={W} height={H} className="max-w-full rounded-lg" style={{ imageRendering: 'pixelated' }} />
  )
}
