import { consoleGenres } from '../assets/games'

export default function Generos() {
  return (
    <section id="generos" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-14 text-center">
          <p className="mb-3 font-pixel text-xs text-arcade-cyan">— ELIGE TU ESTILO DE JUEGO —</p>
          <h2 className="font-pixel text-3xl text-arcade-yellow sm:text-5xl">GÉNEROS</h2>
          <p className="mx-auto mt-6 max-w-lg text-slate-400">
            Encaps para todo el mundo. Encara el género que más te motive y
            selecciona una máquina al momento.
          </p>
        </header>

        <div id="generos-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {consoleGenres.map((genre) => (
            <article
              key={genre.id}
              className="group flex flex-col rounded-xl border border-arcade-pink/20 bg-black/40 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-arcade-pink/60"
            >
              <span className="mb-4 text-5xl transition-transform duration-300 group-hover:scale-110">
                {genre.emoji}
              </span>
              <h3 className="mb-2 font-pixel text-lg text-arcade-cyan">{genre.title}</h3>
              <p className="mb-4 text-xs tracking-widest text-slate-500">{genre.subtitle}</p>
              <p className="flex-1 text-sm leading-relaxed text-slate-400">{genre.description}</p>
              <span className="mt-6 font-pixel text-[10px] text-arcade-pink">EXPLORAR ▶</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
