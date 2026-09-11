import { Star } from 'lucide-react'
import { games } from '../assets/games'

const bg = 'bg-[#0b0f1f]/60'
const card = 'rounded-xl border border-arcade-cyan/20 bg-black/40 p-5 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-arcade-cyan/60'

export default function GamesCatalogo() {
  return (
    <section id="catalogo" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-14 text-center">
          <p className="mb-3 font-pixel text-xs text-arcade-pink">— LO NUEVO EN EL ARCADE —</p>
          <h2 className="font-pixel text-3xl text-arcade-cyan sm:text-5xl">CÁTAlogo DE JUEGOS</h2>
          <p className="mx-auto mt-6 max-w-lg text-slate-400">
            Una máquina por cada generación. Encara tu clásico favorito y
            enciende los créditos.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <article
              key={game.title}
              className={card}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className={`font-pixel text-[10px] font-bold uppercase tracking-wider text-${game.color}`}>
                  {game.genre}
                </span>
                <span className="text-3xl">{game.emoji}</span>
              </div>

              <div className="flex items-baseline gap-2">
                <h3 className="font-pixel text-sm text-arcade-yellow">{game.title}</h3>
                <span className="text-[10px] text-slate-500">({game.years})</span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-400">{game.blurb}</p>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.round(game.rating) ? 'fill-arcade-yellow text-arcade-yellow' : 'text-slate-700'}`}
                    />
                  ))}
                  <span className="ml-1 font-pixel text-[10px] text-slate-400">{game.rating}</span>
                </div>
                <button className="rounded-md bg-arcade-cyan/15 px-3 py-1.5 font-pixel text-[10px] text-arcade-cyan transition-all hover:bg-arcade-cyan/30">
                  JUGAR ▶
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
