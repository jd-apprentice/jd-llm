import { useRef, useEffect, useState, useCallback } from 'react'

const W = 400
const H = 600

export default function InvadersGame({ score, setScore, setGameOver }) {
  const canvasRef = useRef(null)
  const [started, setStarted] = useState(false)
  const stateRef = useRef({
    player: { x: W / 2, w: 40, h: 20 },
    bullets: [],
    enemies: [],
    particles: [],
    score: 0,
    gameOver: false,
    keys: {},
    enemyDir: -1,
    enemySpeed: 1,
    shootCooldown: 0,
  })

  const handleKeyDown = useCallback((e) => {
    if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd'].includes(e.key)) e.preventDefault()
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

  useEffect(() => {
    if (!started) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const gs = stateRef.current

    // Init enemies grid
    gs.enemies = []
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        gs.enemies.push({
          x: 50 + col * 42,
          y: 60 + row * 40,
          w: 30,
          h: 20,
          alive: true,
          type: row,
        })
      }
    }

    gs.player.x = W / 2
    gs.bullets = []
    gs.particles = []
    gs.score = 0
    gs.gameOver = false
    gs.enemyDir = -1
    gs.enemySpeed = 1
    gs.shootCooldown = 0

    const shootInterval = 500 // ms between shots

    function drawEnemy(e) {
      if (!e.alive) return
      const colors = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399']
      ctx.fillStyle = colors[e.type] || '#22d3ee'

      // Alien shape (simple pixel art)
      const px = e.x - e.w / 2
      const py = e.y - e.h / 2
      ctx.fillRect(px + 4, py, e.w - 8, e.h)
      ctx.fillRect(px, py + 5, e.w, e.h - 10)
      ctx.fillRect(px + 4, py + e.h - 5, e.w - 8, 5)
      // Eyes
      ctx.fillStyle = '#0b0f1f'
      ctx.fillRect(px + 8, py + 6, 4, 4)
      ctx.fillRect(px + e.w - 12, py + 6, 4, 4)
    }

    function spawnParticles(x, y, color) {
      for (let i = 0; i < 8; i++) {
        gs.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 30,
          color,
        })
      }
    }

    function frame(now) {
      if (gs.gameOver) return
      const pl = gs.player

      // Move player
      if (gs.keys['ArrowLeft'] || gs.keys['a']) pl.x -= 5
      if (gs.keys['ArrowRight'] || gs.keys['d']) pl.x += 5
      pl.x = Math.max(pl.w / 2, Math.min(W - pl.w / 2, pl.x))

      // Shoot
      if ((gs.keys[' '] || gs.keys[' ']) && gs.shootCooldown <= 0) {
        gs.bullets.push({ x: pl.x, y: H - 60, w: 3, h: 10, vy: -7 })
        gs.shootCooldown = shootInterval / 16.67
      }
      if (gs.shootCooldown > 0) gs.shootCooldown--

      // Move bullets
      gs.bullets.forEach(b => b.y += b.vy)
      gs.bullets = gs.bullets.filter(b => b.y > -20)

      // Move enemies
      let hitEdge = false
      const aliveEnemies = gs.enemies.filter(e => e.alive)
      for (const e of aliveEnemies) {
        e.x += gs.enemyDir * gs.enemySpeed
        if (e.x - e.w / 2 <= 0 || e.x + e.w / 2 >= W) hitEdge = true
        // Check if enemy reached bottom
        if (e.y + e.h / 2 >= H - 80) {
          gs.gameOver = true
          setGameOver(true)
          return
        }
      }

      if (hitEdge) {
        gs.enemyDir *= -1
        aliveEnemies.forEach(e => e.y += 15)
      }

      // Bullet-enemy collision
      for (const b of gs.bullets) {
        for (const e of gs.enemies) {
          if (!e.alive) continue
          if (
            b.x > e.x - e.w / 2 &&
            b.x < e.x + e.w / 2 &&
            b.y > e.y - e.h / 2 &&
            b.y < e.y + e.h / 2
          ) {
            e.alive = false
            b.y = -100 // remove bullet
            gs.score += (4 - e.type) * 10
            setScore(gs.score)
            const colors = ['#22d3ee', '#a78bfa', '#f472b6', '#34d399']
            spawnParticles(e.x, e.y, colors[e.type])
          }
        }
      }

      // Update particles
      gs.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life-- })
      gs.particles = gs.particles.filter(p => p.life > 0)

      // Check win condition
      if (aliveEnemies.length === 0) {
        // Respawn stronger wave
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 8; col++) {
            gs.enemies.push({
              x: 50 + col * 42,
              y: 60 + row * 40,
              w: 30,
              h: 20,
              alive: true,
              type: row,
            })
          }
        }
        gs.enemySpeed += 0.5
      }

      // Draw
      ctx.fillStyle = '#0b0f1f'
      ctx.fillRect(0, 0, W, H)

      // Stars
      ctx.fillStyle = '#ffffff33'
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 73 + gs.score) % W, (i * 137) % H, 2, 2)
      }

      // Enemies
      for (const e of gs.enemies) drawEnemy(e)

      // Bullets
      ctx.fillStyle = '#facc15'
      for (const b of gs.bullets) {
        ctx.fillRect(b.x - 1.5, b.y, b.w, b.h)
      }

      // Player ship
      const plX = pl.x - pl.w / 2
      const plY = H - 50
      ctx.fillStyle = '#22d3ee'
      ctx.fillRect(plX + pl.w / 2 - 3, plY, 6, pl.h)
      ctx.fillRect(plX, plY + 8, pl.w, pl.h - 8)

      // Particles
      for (const p of gs.particles) {
        ctx.globalAlpha = p.life / 30
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      }
      ctx.globalAlpha = 1

      // HUD score
      ctx.fillStyle = '#facc15'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`SCORE: ${gs.score}`, 10, H - 10)
      ctx.textAlign = 'right'
      ctx.fillText(`ALIVE: ${aliveEnemies.length}`, W - 10, H - 10)

      animId = requestAnimationFrame(frame)
    }

    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [started, score, setScore, setGameOver])

  if (!started) {
    return (
      <div className="relative flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-arcade-cyan/40 bg-gradient-to-br from-[#0b0f1f] to-[#1a365d] p-6">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center"><span className="text-7xl">👾</span></div>
          <h3 className="font-pixel text-xl text-arcade-yellow mb-3">Space Invaders X</h3>
          <p className="text-sm text-slate-400 mb-6">Derrota las oleadas de invasores antes de que lleguen al suelo.</p>
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
            <p><span className="text-arcade-yellow font-pixel">ESPACIO</span> disparar</p>
          </div>
          <button onClick={() => setStarted(true)} className="rounded-lg bg-arcade-cyan/20 px-8 py-3 font-pixel text-sm text-arcade-cyan transition-all hover:bg-arcade-cyan/40">▶ JUGAR</button>
        </div>
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} width={W} height={H} className="max-w-full rounded-lg" style={{ imageRendering: 'pixelated' }} />
  )
}
