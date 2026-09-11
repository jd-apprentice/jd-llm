import { Gamepad, Cpu, Trophy, Users } from 'lucide-react'
import { features } from '../assets/games'

const iconMap = {
  Gamepad: Gamepad,
  Cpu: Cpu,
  Trophy: Trophy,
  Users: Users,
}

export default function Servicios() {
  return (
    <section id="servicios" className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-14 text-center">
          <p className="mb-3 font-pixel text-xs text-arcade-pink">— ¿POR QUÉ ELEGIRNOS? —</p>
          <h2 className="font-pixel text-3xl text-arcade-cyan sm:text-5xl">LO QUE HACEMOS</h2>
          <p className="mx-auto mt-6 max-w-lg text-slate-400">
            Encara una sala pensada para gamers de toda la edad. Encuentras
            máquinas impecables y un ambiente para disfrutar.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon]
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-arcade-cyan/20 bg-black/40 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-arcade-cyan/60"
              >
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-arcade-pink/15 text-arcade-pink transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mb-3 font-pixel text-sm text-arcade-yellow">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
