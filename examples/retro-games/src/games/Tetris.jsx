import { useRef, useEffect, useState, useCallback } from 'react'

const W = 400
const H = 600
const COLS = 10
const ROWS = 15
const CELL = Math.floor((W - 20) / COLS)
const GAP = 2

// Block colors by row
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22d3ee']

export default function TetrisGame({ score, setScore, setGameOver }) {
  const canvasRef = useRef(null)
  const [started, setStarted] = useState(false)
  const stateRef = useRef({
    board: [],
    current: null,
    next: null,
    gameOver: false,
    dropCounter: 0,
    dropInterval: 500,
    keys: {},
    paused: false,
  })

  const handleKeyDown = useCallback((e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'a', 'd', 's', 'w'].includes(e.key)) e.preventDefault()
    stateRef.current.keys[e.key] = true
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

  // Tetromino shapes (each is a set of relative coordinates)
  const PIECES = {
    I: [[0,0],[1,0],[2,0],[3,0]],
    O: [[0,0],[1,0],[0,1],[1,1]],
    T: [[0,0],[1,0],[2,0],[1,1]],
    S: [[1,0],[2,0],[0,1],[1,1]],
    Z: [[0,0],[1,0],[1,1],[2,1]],
    J: [[0,0],[0,1],[1,1],[2,1]],
    L: [[2,0],[0,1],[1,1],[2,1]],
  }

  const randomPiece = () => {
    const keys = Object.keys(PIECES)
    const type = keys[Math.floor(Math.random() * keys.length)]
    return {
      type,
      blocks: PIECES[type].map(([x, y]) => [x, y]),
      x: 3,
      y: 0,
    }
  }

  const rotateBlocks = (blocks) => {
    // Rotate 90° clockwise around center
    const cx = blocks.reduce((s, b) => s + b[0], 0) / blocks.length
    const cy = blocks.reduce((s, b) => s + b[1], 0) / blocks.length
    return blocks.map(([x, y]) => [Math.round(cx + (y - cy)), Math.round(cy - (x - cx))])
  }

  const isValid = (board, blocks, ox, oy) => {
    for (const [bx, by] of blocks) {
      const nx = bx + ox
      const ny = by + oy
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false
      if (ny >= 0 && board[ny][nx]) return false
    }
    return true
  }

  const lockPiece = (board, piece) => {
    const newBoard = board.map(row => [...row])
    for (const [bx, by] of piece.blocks) {
      const ny = by + piece.y
      const nx = bx + piece.x
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        newBoard[ny][nx] = piece.type
      }
    }
    return newBoard
  }

  const clearLines = (board) => {
    let cleared = 0
    const newBoard = board.filter(row => {
      if (row.every(c => c)) {
        cleared++
        return false
      }
      return true
    })
    while (newBoard.length < ROWS) {
      newBoard.unshift(new Array(COLS).fill(null))
    }
    return { board: newBoard, cleared }
  }

  useEffect(() => {
    if (!started) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const gs = stateRef.current

    // Init board
    gs.board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
    gs.current = randomPiece()
    gs.next = randomPiece()
    gs.gameOver = false
    gs.dropCounter = 0
    gs.keys = {}

    let lastTime = performance.now()

    function drawCell(c, x, y, alpha = 1) {
      ctx.globalAlpha = alpha
      ctx.fillStyle = COLORS[PIECES[c].length - 1] || '#22d3ee'
      ctx.fillRect(x * CELL + GAP, y * CELL + GAP, CELL - GAP * 2, CELL - GAP * 2)
      // Highlight
      ctx.fillStyle = '#ffffff44'
      ctx.fillRect(x * CELL + GAP, y * CELL + GAP, CELL - GAP * 2, 3)
      ctx.globalAlpha = 1
    }

    function frame(now) {
      if (gs.gameOver) return
      const dt = now - lastTime
      lastTime = now

      gs.dropCounter += dt

      // Auto drop
      if (gs.dropCounter > gs.dropInterval) {
        gs.dropCounter = 0
        const piece = gs.current
        if (isValid(gs.board, piece.blocks, piece.x, piece.y + 1)) {
          piece.y++
        } else {
          // Lock
          gs.board = lockPiece(gs.board, piece)
          const result = clearLines(gs.board)
          gs.board = result.board
          if (result.cleared > 0) {
            const points = [0, 100, 300, 500, 800]
            setScore(prev => prev + (points[result.cleared] || 0))
          }
          gs.current = gs.next
          gs.next = randomPiece()
          // Check game over
          if (!isValid(gs.board, gs.current.blocks, gs.current.x, gs.current.y)) {
            gs.gameOver = true
            setGameOver(true)
          }
        }
      }

      // Soft drop with key hold (decrement interval on ArrowDown/s)
      const isDown = gs.keys['ArrowDown'] || gs.keys['s']
      if (isDown) {
        const piece = gs.current
        if (isValid(gs.board, piece.blocks, piece.x, piece.y + 1)) {
          piece.y++
          setScore(prev => prev + 1)
        }
      }

      // Move with keys (trigger once per press using a simple debounce flag)
      if (!gs._moveTimer) gs._moveTimer = {}
      const nowMs = Date.now()
      const canMove = (key, dx) => {
        if (!gs.keys[key]) return false
        if (nowMs - (gs._moveTimer[key] || 0) < 120) return false // debounce
        gs._moveTimer[key] = nowMs
        const piece = gs.current
        if (isValid(gs.board, piece.blocks, piece.x + dx, piece.y)) {
          piece.x += dx
          return true
        }
        return false
      }
      canMove('ArrowLeft', -1) || canMove('a', -1)
      canMove('ArrowRight', 1) || canMove('d', 1)

      // Rotate on ArrowUp/w/Shift
      if (gs.keys['ArrowUp'] || gs.keys['w'] || gs.keys['Shift']) {
        if (nowMs - (gs._moveTimer.rotate || 0) > 120) {
          gs._moveTimer.rotate = nowMs
          const piece = gs.current
          const rotated = rotateBlocks(piece.blocks)
          if (isValid(gs.board, rotated, piece.x, piece.y)) {
            piece.blocks = rotated
          } else if (isValid(gs.board, rotated, piece.x - 1, piece.y)) {
            // Wall kick left
            piece.blocks = rotated; piece.x -= 1
          } else if (isValid(gs.board, rotated, piece.x + 1, piece.y)) {
            // Wall kick right
            piece.blocks = rotated; piece.x += 1
          }
        }
      }

      // Draw
      ctx.fillStyle = '#0b0f1f'
      ctx.fillRect(0, 0, W, H)

      // Grid lines
      ctx.strokeStyle = '#ffffff08'
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke()
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke()
      }

      // Board
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (gs.board[r][c]) drawCell(gs.board[r][c], c, r)
        }
      }

      // Ghost piece
      const ghost = { ...gs.current, y: gs.current.y }
      while (isValid(gs.board, ghost.blocks, ghost.x, ghost.y + 1)) ghost.y++
      for (const [bx, by] of ghost.blocks) drawCell(ghost.type, bx + ghost.x, by + ghost.y, 0.2)

      // Current piece
      for (const [bx, by] of gs.current.blocks) {
        if (by + gs.current.y >= 0) drawCell(gs.current.type, bx + gs.current.x, by + gs.current.y)
      }

      // Next preview
      ctx.fillStyle = '#facc15'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('NEXT', W / 2 + 40, 25)
      for (const [bx, by] of gs.next.blocks) {
        const px = W / 2 + 55 + bx * 12
        const py = 40 + by * 12
        ctx.fillStyle = COLORS[PIECES[gs.next.type].length - 1] || '#22d3ee'
        ctx.fillRect(px, py, 10, 10)
      }

      animId = requestAnimationFrame(frame)
    }

    lastTime = performance.now()
    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [started, score, setScore, setGameOver])

  if (!started) {
    return (
      <div className="relative flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-arcade-purple/40 bg-gradient-to-br from-[#0b0f1f] to-[#1a1040] p-6">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center"><span className="text-7xl">🧩</span></div>
          <h3 className="font-pixel text-xl text-arcade-yellow mb-3">Tetris Neon</h3>
          <p className="text-sm text-slate-400 mb-6">Llena líneas completas para eliminarlas. ¡Las piezas se aceleran!</p>
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
            <p><span className="text-arcade-yellow font-pixel">↑ / W</span> rotar</p>
            <p><span className="text-arcade-green font-pixel">↓ / S</span> caer rápido</p>
          </div>
          <button onClick={() => setStarted(true)} className="rounded-lg bg-arcade-purple/20 px-8 py-3 font-pixel text-sm text-arcade-purple transition-all hover:bg-arcade-purple/40">▶ JUGAR</button>
        </div>
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} width={W} height={H} className="max-w-full rounded-lg" style={{ imageRendering: 'pixelated' }} />
  )
}
