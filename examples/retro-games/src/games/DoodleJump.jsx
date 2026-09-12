import { useRef, useEffect, useState, useCallback } from 'react'

const W = 400
const H = 600

export default function DoodleGame({ score, setScore, setGameOver }) {
  const canvasRef = useRef(null)
  const [started, setStarted] = useState(false)
  const stateRef = useRef({
    player: { x: W / 2, y: H - 100, vy: 0, w: 30, h: 30 },
    platforms: [],
    score: 0,
    gameOver: false,
    cameraY: 0,
    keys: {},
  })

  const handleKeyDown = useCallback((e) => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(e.key)) e.preventDefault()
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

  const initPlatforms = () => {
    const platforms = []
    // Ground platform
    platforms.push({ x: W / 2 - 60, y: H - 30, w: 120, type: 'ground' })
    // Generate initial platforms
    for (let i = 0; i < 20; i++) {
      platforms.push({
        x: Math.random() * (W - 60) + 30,
        y: H - 100 - i * 50,
        w: 40 + Math.random() * 30,
        type: Math.random() > 0.7 ? 'moving' : 'normal',
        dir: Math.random() > 0.5 ? 1 : -1,
      })
    }
    return platforms
  }

  useEffect(() => {
    if (!started) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const gs = stateRef.current

    gs.platforms = initPlatforms()
    gs.player.x = W / 2
    gs.player.y = H - 100
    gs.vy = 0
    gs.score = 0
    gs.gameOver = false
    gs.cameraY = 0

    const gravity = 0.4
    const jumpForce = -9
    const moveSpeed = 5

    function drawPlatform(p) {
      if (p.type === 'ground') {
        ctx.fillStyle = '#16a34a'
        ctx.fillRect(p.x, p.y, p.w, 8)
      } else if (p.type === 'moving') {
        ctx.fillStyle = '#f59e0b'
        ctx.fillRect(p.x, p.y, p.w, 6)
        // Arrow indicators
        ctx.fillStyle = '#fef3c7'
        ctx.font = '10px monospace'
        ctx.fillText(p.dir > 0 ? '→' : '←', p.x + p.w / 2 - 4, p.y - 5)
      } else {
        ctx.fillStyle = '#22d3ee'
        ctx.fillRect(p.x, p.y, p.w, 6)
      }
    }

    function drawPlayer() {
      const pl = gs.player
      // Body
      ctx.fillStyle = '#ec4899'
      ctx.beginPath()
      ctx.arc(pl.x, pl.y, pl.h / 2, 0, Math.PI * 2)
      ctx.fill()
      // Eyes
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(pl.x - 6, pl.y - 3, 4, 0, Math.PI * 2)
      ctx.arc(pl.x + 6, pl.y - 3, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.arc(pl.x - 5, pl.y - 3, 2, 0, Math.PI * 2)
      ctx.arc(pl.x + 7, pl.y - 3, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    function drawBg() {
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#1e1b4b')
      grad.addColorStop(1, '#0f172a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Stars
      ctx.fillStyle = '#ffffff88'
      for (let i = 0; i < 50; i++) {
        const sx = (i * 73 + gs.score * 2) % W
        const sy = ((i * 137 + Math.abs(gs.cameraY) * 0.3) % H + H) % H
        ctx.fillRect(sx, sy, 2, 2)
      }
    }

    function frame() {
      if (gs.gameOver) return
      const pl = gs.player

      // Move player
      if (gs.keys['ArrowLeft'] || gs.keys['a']) pl.x -= moveSpeed
      if (gs.keys['ArrowRight'] || gs.keys['d']) pl.x += moveSpeed
      pl.x = Math.max(pl.w / 2, Math.min(W - pl.w / 2, pl.x))

      // Gravity
      pl.vy += gravity
      pl.y += pl.vy

      // Platform collision (only when falling)
      if (pl.vy >= 0) {
        for (const p of gs.platforms) {
          const py = p.y - Math.abs(gs.cameraY * 0.1)
          if (
            pl.x + pl.w / 2 > p.x &&
            pl.x - pl.w / 2 < p.x + p.w &&
            pl.y + pl.h / 2 >= py &&
            pl.y + pl.h / 2 <= py + 12
          ) {
            if (p.type !== 'ground') {
              gs.score += 10
              setScore(gs.score)
            }
            pl.vy = jumpForce
            pl.y = py - pl.h / 2
          }
        }
      }

      // Move platforms
      for (const p of gs.platforms) {
        if (p.type === 'moving') {
          p.x += p.dir * 0.8
          if (p.x < 0 || p.x + p.w > W) p.dir *= -1
        }
      }

      // Camera follow (scroll up when player goes too high)
      const targetCamY = Math.min(0, pl.y - H / 2)
      if (targetCamY < gs.cameraY) {
        gs.cameraY += (targetCamY - gs.cameraY) * 0.1
      }

      // Remove platforms below view and add new ones
      gs.platforms = gs.platforms.filter(p => p.y - Math.abs(gs.cameraY * 0.1) < H + 50)
      const highestPlat = Math.min(...gs.platforms.map(p => p.y))
      if (highestPlat > gs.cameraY - 50) {
        for (let i = 0; i < 3; i++) {
          gs.platforms.push({
            x: Math.random() * (W - 60) + 30,
            y: highestPlat - 50 - i * 40,
            w: 40 + Math.random() * 30,
            type: Math.random() > 0.7 ? 'moving' : 'normal',
            dir: Math.random() > 0.5 ? 1 : -1,
          })
        }
      }

      // Ground platform follows camera
      const groundPlat = gs.platforms.find(p => p.type === 'ground')
      if (groundPlat) {
        groundPlat.y = H - 30 + gs.cameraY * 0.1
      }

      // Game over check
      if (pl.y - Math.abs(gs.cameraY * 0.1) > H + 50) {
        gs.gameOver = true
        setGameOver(true)
        return
      }

      // Draw
      ctx.save()
      ctx.translate(0, -gs.cameraY * 0.1)
      drawBg()
      for (const p of gs.platforms) drawPlatform(p)
      drawPlayer()
      ctx.restore()

      animId = requestAnimationFrame(frame)
    }

    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [started, score, setScore, setGameOver])

  if (!started) {
    return (
      <div className="relative flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-arcade-green/40 bg-gradient-to-br from-[#0b0f1f] to-[#1a365d] p-6">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center"><span className="text-7xl">🍄</span></div>
          <h3 className="font-pixel text-xl text-arcade-yellow mb-3">Doodle Jump Deluxe</h3>
          <p className="text-sm text-slate-400 mb-6">Salta de plataforma en plataforma. No caigas.</p>
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
            <p><span className="text-arcade-green font-pixel">Salto</span> automático al tocar plataforma</p>
          </div>
          <button onClick={() => setStarted(true)} className="rounded-lg bg-arcade-green/20 px-8 py-3 font-pixel text-sm text-arcade-green transition-all hover:bg-arcade-green/40">▶ JUGAR</button>
        </div>
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} width={W} height={H} className="max-w-full rounded-lg" style={{ imageRendering: 'pixelated' }} />
  )
}
