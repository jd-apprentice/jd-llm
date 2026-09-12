import { useRef, useEffect, useState, useCallback } from 'react'

const GAME_WIDTH = 400
const GAME_HEIGHT = 600

// Road settings
const ROAD_W = 2000
const SEG_LEN = 200
const RUMBLE_W = 3 / ROAD_W
const LANES = 3
const DRAW_DIST = 150
const CAMERA_H = 1000
const CAMERA_D = Math.tan((80 / 2) * Math.PI / 180)

// Car settings
const MAX_SPEED = SEG_LEN
const ACCEL = MAX_SPEED / 5
const BRAKE = -MAX_SPEED
const DECEL = -MAX_SPEED / 5
const OFF_ROAD_DECEL = -MAX_SPEED / 2

// Track generation
function generateTrack() {
  const segments = []
  const totalSegs = 1500

  for (let i = 0; i < totalSegs; i++) {
    let curve = 0
    if (i > 20 && i < 80) curve = 2
    else if (i > 100 && i < 150) curve = -3
    else if (i > 200 && i < 260) curve = 4
    else if (i > 300 && i < 380) curve = -2
    else if (i > 400 && i < 500) curve = 3.5
    else if (i > 550 && i < 620) curve = -4
    else if (i > 700 && i < 800) curve = 2.5
    else if (i > 900 && i < 1000) curve = -3
    else if (i > 1100 && i < 1200) curve = 4
    else if (i > 1300 && i < 1400) curve = -2.5

    let h = 0
    if (i > 30 && i < 60) h = Math.sin((i - 30) / 30 * Math.PI) * 30
    else if (i > 120 && i < 160) h = -Math.sin((i - 120) / 40 * Math.PI) * 40
    else if (i > 250 && i < 280) h = Math.sin((i - 250) / 30 * Math.PI) * 50
    else if (i > 450 && i < 510) h = -Math.sin((i - 450) / 60 * Math.PI) * 30
    else if (i > 650 && i < 700) h = Math.sin((i - 650) / 50 * Math.PI) * 45
    else if (i > 850 && i < 920) h = -Math.sin((i - 850) / 70 * Math.PI) * 35
    else if (i > 1100 && i < 1160) h = Math.sin((i - 1100) / 60 * Math.PI) * 40

    const n = Math.floor(i / 3)

    segments.push({
      index: i,
      p1: { world: { z: i * SEG_LEN }, camera: {}, screen: {} },
      p2: { world: { z: (i + 1) * SEG_LEN }, camera: {}, screen: {} },
      curve,
      color: Math.floor(n / 2) % 2
        ? { road: '#374151', grass: '#10b981', rumble: '#ef4444' }
        : { road: '#4b5563', grass: '#059669', rumble: '#ffffff' },
      sprites: [],
      cars: [],
      h,
    })
  }

  for (let i = 0; i < 60; i++) {
    const segIdx = Math.floor(Math.random() * totalSegs)
    const lane = Math.floor(Math.random() * LANES) - 1
    const spriteX = roadToScreen(lane, LANES, segments[segIdx]) + segments[segIdx].p1.screen.x / segments[segIdx].p1.screen.w
    segments[segIdx].cars.push({ x: spriteX, offset: 0, speed: MAX_SPEED * (0.2 + Math.random() * 0.4) })
  }

  return segments
}

function roadToScreen(lane, lanesCount, seg) {
  const w = ROAD_W / 2
  const lanes = LANES
  return w + (lane / lanes) * w - w / lanes
}

export default function Racing({ score, setScore, setGameOver }) {
  const canvasRef = useRef(null)
  const [started, setStarted] = useState(false)
  const gameStateRef = useRef({
    position: 0,
    speed: 0,
    x: 0,
    playerX: 0,
    steerDir: 0,
    keys: {},
    score: 0,
    finished: false,
  })

  const handleKeyDown = useCallback((e) => {
    const gs = gameStateRef.current
    gs.keys[e.key] = true
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault()
    }
  }, [])

  const handleKeyUp = useCallback((e) => {
    gameStateRef.current.keys[e.key] = false
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
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animFrameId
    let lastTime = performance.now()
    const track = generateTrack()

    function project(p1, p2, cameraX, cameraY, cameraZ) {
      p1.camera.x = p1.world.x - cameraX
      p1.camera.y = p1.world.y - cameraY
      p1.camera.z = p1.world.z - cameraZ
      if (p1.camera.z <= 0) { p1.screen.scale = 0; return }
      p1.screen.scale = CAMERA_D / p1.camera.z
      p1.screen.x = Math.round(GAME_WIDTH / 2 + p1.screen.scale * p1.camera.x * GAME_WIDTH / 2)
      p1.screen.y = Math.round(GAME_HEIGHT / 2 - p1.screen.scale * p1.camera.y * GAME_HEIGHT / 2)
      p1.screen.w = Math.round(p1.screen.scale * ROAD_W * GAME_WIDTH / 2)
    }

    function renderSegment(ctx, x1, y1, w1, x2, y2, w2, color) {
      ctx.fillStyle = color.grass
      ctx.fillRect(0, y2, GAME_WIDTH, y1 - y2)
      ctx.fillStyle = color.rumble
      ctx.fillRect(x1 - w1 * (1 + RUMBLE_W), y1, w1 * (1 + RUMBLE_W) * 2, y2 - y1)
      ctx.fillRect(x2 - w2 * (1 + RUMBLE_W), y2, w2 * (1 + RUMBLE_W) * 2, y1 - y2)
      ctx.fillStyle = color.road
      ctx.fillRect(x1 - w1, y1, w1 * 2, y2 - y1)
      ctx.fillStyle = '#eab30844'
      const lw1 = w1 / 20, lw2 = w2 / 20
      for (let l = 1; l < LANES; l++) {
        const lx1 = x1 - w1 + (2 * w1 * l) / LANES
        const lx2 = x2 - w2 + (2 * w2 * l) / LANES
        ctx.fillRect(lx1 - lw1, y1, lw1 * 2, y2 - y1)
        ctx.fillRect(lx2 - lw2, y2, lw2 * 2, y1 - y2)
      }
    }

    function renderCar(ctx, x, y, w, h, isPlayer) {
      if (isPlayer) {
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(x - w / 2, y - h, w, h)
        ctx.fillStyle = '#dc2626'
        ctx.fillRect(x - w * 0.35, y - h * 1.15, w * 0.7, h * 0.4)
        ctx.fillStyle = '#93c5fd'
        ctx.fillRect(x - w * 0.25, y - h * 1.1, w * 0.5, h * 0.25)
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(x - w / 2 - w * 0.08, y - h * 0.15, w * 0.1, h * 0.3)
        ctx.fillRect(x + w / 2 - w * 0.02, y - h * 0.15, w * 0.1, h * 0.3)
      } else {
        const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']
        const c = colors[Math.floor(Math.abs(x * 17) % colors.length)]
        ctx.fillStyle = c
        ctx.fillRect(x - w / 2, y - h, w, h)
        ctx.fillStyle = '#e5e7eb66'
        ctx.fillRect(x - w * 0.3, y - h * 1.1, w * 0.6, h * 0.3)
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(x - w / 2 - w * 0.05, y - h * 0.2, w * 0.08, h * 0.25)
        ctx.fillRect(x + w / 2 - w * 0.03, y - h * 0.2, w * 0.08, h * 0.25)
      }
    }

    function renderTree(ctx, x, y, scale) {
      const w = 40 * scale * GAME_WIDTH / 2
      const h = 120 * scale * GAME_WIDTH / 2
      if (w < 1) return
      ctx.fillStyle = '#78350f'
      ctx.fillRect(x - w * 0.1, y - h * 0.6, w * 0.2, h * 0.6)
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.moveTo(x, y - h)
      ctx.lineTo(x - w * 0.5, y - h * 0.2)
      ctx.lineTo(x + w * 0.5, y - h * 0.2)
      ctx.closePath()
      ctx.fill()
    }

    function renderSky(ctx) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT / 3)
      skyGrad.addColorStop(0, '#0f172a')
      skyGrad.addColorStop(0.5, '#1e293b')
      skyGrad.addColorStop(1, '#f97316')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 3)

      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.arc(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.12, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f59e0b44'
      ctx.beginPath()
      ctx.arc(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.12, 50, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#1e1b4b'
      ctx.beginPath()
      ctx.moveTo(0, GAME_HEIGHT / 3)
      for (let i = 0; i <= GAME_WIDTH; i += 20) {
        const mh = Math.sin(i * 0.01 + 1) * 30 + Math.cos(i * 0.025) * 20 + GAME_HEIGHT / 3 - 60
        ctx.lineTo(i, mh)
      }
      ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 3)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#312e81'
      ctx.beginPath()
      ctx.moveTo(0, GAME_HEIGHT / 3)
      for (let i = 0; i <= GAME_WIDTH; i += 15) {
        const mh = Math.sin(i * 0.02 + 3) * 25 + Math.cos(i * 0.04) * 15 + GAME_HEIGHT / 3 - 30
        ctx.lineTo(i, mh)
      }
      ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 3)
      ctx.closePath()
      ctx.fill()
    }

    function renderHUD(ctx) {
      const gs = gameStateRef.current
      const spd = Math.floor(gs.speed / MAX_SPEED * 280)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(GAME_WIDTH - 140, GAME_HEIGHT - 70, 130, 55)
      ctx.strokeStyle = '#22d3ee88'
      ctx.lineWidth = 1
      ctx.strokeRect(GAME_WIDTH - 140, GAME_HEIGHT - 70, 130, 55)

      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${spd}`, GAME_WIDTH - 50, GAME_HEIGHT - 38)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.fillText('KM/H', GAME_WIDTH - 16, GAME_HEIGHT - 38)

      const barW = 110
      const barH = 6
      const speedFrac = gs.speed / MAX_SPEED
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(GAME_WIDTH - 135, GAME_HEIGHT - 28, barW, barH)
      const barColor = speedFrac > 0.8 ? '#ef4444' : speedFrac > 0.5 ? '#f59e0b' : '#22c55e'
      ctx.fillStyle = barColor
      ctx.fillRect(GAME_WIDTH - 135, GAME_HEIGHT - 28, barW * speedFrac, barH)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(10, GAME_HEIGHT - 70, 140, 55)
      ctx.strokeStyle = '#ec489988'
      ctx.strokeRect(10, GAME_HEIGHT - 70, 140, 55)

      ctx.fillStyle = '#ec4899'
      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`${gs.score}`, 22, GAME_HEIGHT - 38)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.fillText('SCORE', 20, GAME_HEIGHT - 38)

      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('TURBO OUTRUN', GAME_WIDTH / 2, 30)

      ctx.fillStyle = '#475569'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('↑↓←→ / WASD', GAME_WIDTH / 2, GAME_HEIGHT - 10)
    }

    function update(dt) {
      const gs = gameStateRef.current
      const currentSeg = track[Math.floor(gs.position / SEG_LEN) % track.length]
      const speedPercent = gs.speed / MAX_SPEED
      const dx = dt * 2 * speedPercent

      if (gs.keys['ArrowUp'] || gs.keys['w']) gs.speed += ACCEL * dt
      else if (gs.keys['ArrowDown'] || gs.keys['s']) gs.speed += BRAKE * dt
      else gs.speed += DECEL * dt

      if (gs.speed > 0) {
        if (gs.keys['ArrowLeft'] || gs.keys['a']) gs.playerX -= dx * (1 - speedPercent * 0.5)
        if (gs.keys['ArrowRight'] || gs.keys['d']) gs.playerX += dx * (1 - speedPercent * 0.5)
      }

      gs.playerX -= dx * speedPercent * currentSeg.curve * 0.8

      if (Math.abs(gs.playerX) > 1) {
        gs.speed += OFF_ROAD_DECEL * dt
        const rumble = Math.sin(gs.position / 50)
        gs.playerX += rumble * dx * 0.3
      }

      gs.playerX = Math.max(-2.5, Math.min(2.5, gs.playerX))
      gs.speed = Math.max(0, Math.min(MAX_SPEED, gs.speed))
      gs.position += dx * gs.speed * 0.15
      if (gs.position >= track.length * SEG_LEN) {
        gs.finished = true
      }

      const playerSegIdx = Math.floor(gs.position / SEG_LEN) % track.length
      for (let n = 0; n < DRAW_DIST; n++) {
        const seg = track[(playerSegIdx + n) % track.length]
        for (const car of seg.cars) {
          const carW = 0.12
          if (n < 5 && Math.abs(gs.playerX - car.x / ROAD_W * LANES) < carW * 1.8) {
            gs.speed *= 0.3
          }
        }
      }

      gs.score = Math.floor(gs.position / SEG_LEN)
      setScore(gs.score)
    }

    function render() {
      const gs = gameStateRef.current
      const startIdx = Math.floor(gs.position / SEG_LEN)
      let maxy = GAME_HEIGHT
      let x = 0
      const dx2 = -(gs.playerX * LANES * CAMERA_D)

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      renderSky(ctx)

      ctx.fillStyle = '#1a365d'
      ctx.fillRect(0, GAME_HEIGHT / 3 + 20, GAME_WIDTH, GAME_HEIGHT - GAME_HEIGHT / 3)

      let curveX = 0
      const positions = []

      for (let n = 0; n < DRAW_DIST; n++) {
        const segIdx = (startIdx + n) % track.length
        const seg = track[segIdx]

        seg.p1.world.x = curveX
        seg.p2.world.x = curveX + seg.curve

        project(seg.p1, seg.p2, CAMERA_H * -dx2 / LANES, CAMERA_H, gs.position - ((startIdx + n) >= track.length ? track.length * SEG_LEN : 0))

        curveX += seg.curve
        x += dx2

        if (seg.p1.camera.z <= 0 || seg.p2.screen.y >= maxy || seg.p2.screen.y >= seg.p1.screen.y) {
          positions.push({ n, visible: false })
          continue
        }

        const colorIdx = Math.floor((startIdx + n) / 3) % 2
        const c = colorIdx === 0
          ? { road: '#374151', grass: '#10b981', rumble: '#ef4444' }
          : { road: '#4b5563', grass: '#059669', rumble: '#ffffff' }

        renderSegment(ctx, seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w, seg.p2.screen.x, seg.p2.screen.y, seg.p2.screen.w, c)

        for (const car of seg.cars) {
          if (!car._screenX) {
            car._screenX = seg.p1.screen.x + seg.p1.screen.w * (car.x / ROAD_W * LANES - dx2 / LANES)
          }
          const carScale = seg.p1.screen.scale * 30000
          if (carScale > 0 && seg.p1.screen.y < maxy) {
            renderCar(ctx, car._screenX, seg.p1.screen.y, carScale, carScale * 0.6, false)
          }
        }

        if (n % 8 === 0 && n > 5) {
          const treeOffset = Math.sin(n * 0.7) > 0 ? 1 : -1
          const treeX = seg.p1.screen.x + seg.p1.screen.w * (treeOffset * 1.3 - dx2 / LANES)
          renderTree(ctx, treeX, seg.p1.screen.y, seg.p1.screen.scale * 50)
        }

        positions.push({ n, visible: true })
        maxy = seg.p2.screen.y
      }

      const bounce = gs.speed > 0 ? Math.sin(gs.position / 30) * (gs.speed / MAX_SPEED) * 2 : 0
      const carW = 60
      const carH = 35
      const playerX2 = GAME_WIDTH / 2 + gs.playerX * carW * 0.8
      renderCar(ctx, playerX2, GAME_HEIGHT - 60 + bounce, carW, carH, true)

      if ((gs.keys['ArrowLeft'] || gs.keys['a']) && gs.speed > 0) {
        ctx.fillStyle = '#facc15'
        ctx.fillRect(GAME_WIDTH / 2 - 30, GAME_HEIGHT - 70 + bounce, 8, 6)
      }
      if ((gs.keys['ArrowRight'] || gs.keys['d']) && gs.speed > 0) {
        ctx.fillStyle = '#facc15'
        ctx.fillRect(GAME_WIDTH / 2 + 22, GAME_HEIGHT - 70 + bounce, 8, 6)
      }

      renderHUD(ctx)
    }

    function loop(now) {
      const dt = Math.min(1, (now - lastTime) / 1000)
      lastTime = now
      update(dt)
      render()
      if (!gameStateRef.current.finished) {
        animFrameId = requestAnimationFrame(loop)
      } else {
        setGameOver(true)
      }
    }

    animFrameId = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(animFrameId)
  }, [started, setScore, setGameOver])

  if (!started) {
    return (
      <div className="relative flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-arcade-pink/40 bg-gradient-to-br from-[#0b0f1f] to-[#1a365d] p-6">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center"><span className="text-7xl">🏎️</span></div>
          <h3 className="font-pixel text-xl text-arcade-yellow mb-3">Turbo Outrun</h3>
          <p className="text-sm text-slate-400 mb-6">Esquiva el tráfico y recorre la mayor distancia posible.</p>
          <div className="mb-6 space-y-1 text-xs text-slate-500">
            <p><span className="text-arcade-cyan font-pixel">↑ / W</span> acelerar</p>
            <p><span className="text-arcade-cyan font-pixel">↓ / S</span> frenar</p>
            <p><span className="text-arcade-cyan font-pixel">← → / A D</span> mover</p>
          </div>
          <button onClick={() => setStarted(true)} className="rounded-lg bg-arcade-pink/20 px-8 py-3 font-pixel text-sm text-arcade-pink transition-all hover:bg-arcade-pink/40">▶ JUGAR</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center rounded-2xl border-2 border-dashed border-arcade-cyan/40 bg-[#0b0f1f] p-2">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="max-w-full rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}
