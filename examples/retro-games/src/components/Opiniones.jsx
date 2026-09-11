import { Star } from 'lucide-react'
import { reviewers } from '../assets/games'

function Stars({ count }) {
  return (
    <div className="flex items-center gap-0.5 text-arcade-yellow">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? 'fill-current text-current' : 'text-slate-700'}`}
        />
      ))}
    </div>
  )
}

export default function Opiniones() {
  return (
    <section id="opiniones" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-14 text-center">
          <p className="mb-3 font-pixel text-xs text-arcade-cyan">— LA COMUNIDAD LO DICE —</p>
          <h2 className="font-pixel text-3xl text-arcade-yellow sm:text-5xl">OPINIONES</h2>
          <p className="mx-auto mt-6 max-w-lg text-slate-400">
            Miles de gamers nos recomiendan cada semana. Encara su opinión y
            enciende el motor.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviewers.map((review) => (
            <article
              key={review.handle}
              className="rounded-xl border border-arcade-cyan/20 bg-black/40 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-arcade-cyan/60"
            >
              <Stars count={review.rating} />
              <p className="mt-4 text-sm leading-relaxed text-slate-300">"{review.comment}"</p>

              <div className="mt-6 flex items-center gap-3 border-t border-arcade-cyan/20 pt-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-arcade-pink/15 text-2xl">
                  {review.avatar}
                </span>
                <div>
                  <div className="font-pixel text-xs text-arcade-cyan">{review.name}</div>
                  <div className="text-xs text-slate-500">{review.handle}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
