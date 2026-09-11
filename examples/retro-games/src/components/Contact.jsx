import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, Gamepad2 } from 'lucide-react'

const contactInfo = [
  { icon: <Phone className="h-5 w-5" />, label: 'Teléfono', value: '+34 912 345 678' },
  { icon: <Mail className="h-5 w-5" />, label: 'Email', value: 'hola@pixelhaven.es' },
  { icon: <MapPin className="h-5 w-5" />, label: 'Dirección', value: 'Calle Neón 42, 28013 Madrid' },
  { icon: <Clock className="h-5 w-5" />, label: 'Horario', value: 'Mar-Dom: 15:00 - 23:00' },
]

export default function Contact() {
  const [sent, setSent] = useState(false)

  return (
    <section id="contacto" className="relative py-24">
      <div className="absolute inset-x-0 top-0 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-arcade-pink/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-arcade-cyan/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Info */}
          <div>
            <span className="text-sm font-pixel tracking-widest text-arcade-pink">
              CONTACTO
            </span>
            <h2 className="mt-3 font-pixel text-3xl text-arcade-yellow sm:text-5xl">
              ¡VEN A JUGAR!
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Reserva tu sesión, encaps en un evento especial o lllamarnos.
              Estamos aquí para que disfrutes la mejor experiencia retro de la ciudad.
            </p>

            <div className="mt-10 space-y-6">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-arcade-cyan/30 text-arcade-cyan">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-pixel uppercase tracking-widest text-slate-500">
                      {item.label}
                    </p>
                    <p className="text-sm font-pixel text-slate-200">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-arcade-cyan/30 bg-black/50 p-8 backdrop-blur-sm">
            <h3 className="mb-6 font-pixel text-xl text-arcade-cyan">RESERVAR SESIÓN</h3>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                setSent(true)
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  placeholder="Tu nombre"
                  disabled={sent}
                  className="w-full rounded-lg border border-arcade-pink/40 bg-arcade-pink/5 px-4 py-3 font-pixel text-xs text-slate-100 outline-none transition-all focus:border-arcade-pink focus:bg-arcade-pink/10"
                />
                <input
                  type="text"
                  required
                  placeholder="Nombre del juego"
                  disabled={sent}
                  className="w-full rounded-lg border border-arcade-pink/40 bg-arcade-pink/5 px-4 py-3 font-pixel text-xs text-slate-100 outline-none transition-all focus:border-arcade-pink focus:bg-arcade-pink/10"
                />
              </div>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                disabled={sent}
                className="w-full rounded-lg border border-arcade-pink/40 bg-arcade-pink/5 px-4 py-3 font-pixel text-xs text-slate-100 outline-none transition-all focus:border-arcade-pink focus:bg-arcade-pink/10"
              />
              <input
                type="tel"
                required
                placeholder="Teléfono"
                disabled={sent}
                className="w-full rounded-lg border border-arcade-pink/40 bg-arcade-pink/5 px-4 py-3 font-pixel text-xs text-slate-100 outline-none transition-all focus:border-arcade-pink focus:bg-arcade-pink/10"
              />
              <select
                disabled={sent}
                className="w-full rounded-lg border border-arcade-pink/40 bg-arcade-pink/5 px-4 py-3 font-pixel text-xs text-slate-400 outline-none transition-all focus:border-arcade-pink focus:bg-arcade-pink/10"
              >
                <option value="">Selecciona una consola</option>
                <option value="arcade">Arcade</option>
                <option value="nes">Nintendo Entertainment System</option>
                <option value="sfc">Super Nintendo</option>
                <option value="gb">Game Boy</option>
                <option value="segasaturn">Sega Saturn</option>
                <option value="pc">PC Emulado</option>
              </select>
              <textarea
                placeholder="Cuéntanos más..."
                rows={4}
                disabled={sent}
                className="w-full rounded-lg border border-arcade-pink/40 bg-arcade-pink/5 px-4 py-3 font-pixel text-xs text-slate-100 outline-none transition-all focus:border-arcade-pink focus:bg-arcade-pink/10"
              />
              <button
                type="submit"
                disabled={sent}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-arcade-pink px-8 py-3.5 font-pixel text-sm text-white shadow-arcade-pink transition-all hover:bg-arcade-pink/80 disabled:cursor-not-allowed"
              >
                <Gamepad2 className="h-4 w-4" />
                {sent ? '¡RESERVA CONFIRMADA!' : 'RESERVAR SESIÓN'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
