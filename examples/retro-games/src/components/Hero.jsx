import { useState } from 'react'
import { Menu, X, Gamepad2, Clock, MapPin, Phone } from 'lucide-react'

const heroImage =
  'https://images.unsplash.com/photo-1538481199705-70165c9Ae608?w=1400&h=800&fit=crop&q=80'

export default function Hero() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Máquinas', href: '#catalogo' },
    { label: 'Géneros', href: '#generos' },
    { label: 'Lo que hacemos', href: '#servicios' },
    { label: 'Opiniones', href: '#opiniones' },
    { label: 'Contacto', href: '#contacto' },
  ]

  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-arcade-gradient">
      {/* CRT scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 4px)',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-arcade-pink/30 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-arcade-cyan/20 blur-3xl" />

      {/* Top bar */}
      <div className="relative z-10 border-b border-arcade-pink/20 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs font-medium text-slate-300 sm:gap-6">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-arcade-cyan" /> +34 912 345 678
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-arcade-yellow" /> Mar-Dom: 15:00 - 23:00
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-arcade-pink" /> Calle Neón 42, Madrid
            </span>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-arcade-pink text-2xl shadow-arcade-pink animate-glow">
              🕹️
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-pixel text-lg font-bold text-arcade-cyan">PIXEL HAVEN</span>
              <span className="text-[10px] tracking-widest text-slate-400">ARCADE RETRO</span>
            </div>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-pixel text-slate-300 transition-colors hover:text-arcade-cyan"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="rounded-lg border-2 border-arcade-yellow px-5 py-2 text-sm font-pixel text-arcade-yellow shadow-arcade-yellow transition-all hover:bg-arcade-yellow/10"
            >
              ¡JUEGA YA!
            </a>
          </div>

          <button
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-slate-300 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="mt-4 border-t border-arcade-pink/20 bg-black/50 p-4 backdrop-blur-sm md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-3 font-pixel text-sm text-slate-300 hover:text-arcade-cyan"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="mt-2 block rounded-lg bg-arcade-yellow px-6 py-3 text-center font-pixel text-sm text-slate-900"
              onClick={() => setMenuOpen(false)}
            >
              ¡JUEGA YA!
            </a>
          </div>
        )}
      </nav>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 py-16 md:py-28 lg:grid-cols-2">
          <div>
            <span className="mb-5 inline-block rounded-full border border-arcade-cyan/40 bg-arcade-cyan/10 px-4 py-2 font-pixel text-xs text-arcade-cyan">
              ★ SALA ARCADE #1 — MADRID ★
            </span>
            <h1 className="font-pixel text-3xl leading-tight text-arcade-yellow sm:text-5xl lg:text-6xl">
              RETRO GAMES
              <br />
              <span className="text-arcade-pink">DIVIÉRTETE HOY</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-300">
              Encara la mejor sala de juegos retro de la ciudad. Miles de
              arcade, 8-bits y consolas de 16-bits, con luces de neón y música
              que te transportan al pasado.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#catalogo"
                className="rounded-lg bg-arcade-pink px-7 py-3.5 font-pixel text-sm text-white shadow-arcade-pink transition-all hover:bg-arcade-pink/80 hover:-translate-y-0.5"
              >
                VER CATÁLOGO →
              </a>
              <a
                href="#generos"
                className="rounded-lg border-2 border-arcade-cyan px-7 py-3.5 font-pixel text-sm text-arcade-cyan transition-all hover:bg-arcade-cyan/10"
              >
                CONOCERNOS
              </a>
            </div>

            <div className="mt-14 flex flex-wrap gap-8">
              {[
                { value: '400+', label: 'Juegos' },
                { value: '16-bit', label: 'Emulación' },
                { value: '4.9★', label: 'Valoración' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-pixel text-xl text-arcade-cyan">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Arcade cabinet visual */}
          <div className="relative">
            <div className="animate-float rounded-2xl border border-arcade-pink/30 bg-black/40 p-6 shadow-2xl backdrop-blur-sm">
              <div className="rounded-xl bg-gradient-to-br from-arcade-purple to-arcade-pink p-1">
                <div className="rounded-lg bg-[#0a0a1a] p-4">
                  <div className="mb-3 flex items-center justify-between font-pixel text-[10px] text-arcade-cyan">
                    <span>SCORE: 10000</span>
                    <span className="animate-blink text-arcade-yellow">READY?</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['👾', '👾', '👽', '👽', '🛸', '🛰️', '👾', '👽', '🛸'].map(
                      (alien, i) => (
                        <div
                          key={i}
                          className="flex h-12 items-center justify-center rounded border border-slate-700 text-xl"
                        >
                          {alien}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-3 flex justify-center gap-3 font-pixel text-[9px] text-slate-500">
                    <span className="text-arcade-green">◀ A</span>
                    <span className="text-arcade-pink">B ▶</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="animate-glow mt-3 flex items-center justify-center font-pixel text-xs text-arcade-yellow">
              ▶ INSERT COIN ◀
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
