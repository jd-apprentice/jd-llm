import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Laura Fernández',
    pet: 'Max — Golden Retriever',
    text: 'Increíble atención. El equipo de VetCare salvó a Max cuando tuvo una emergencia a medianoche. Siempre estaremos agradecidos.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
  },
  {
    name: 'Pablo Rodríguez',
    pet: 'Luna — Gata persa',
    text: 'La Dra. Martínez encontró el problema de salud de Luna cuando otros veterinarios no pudieron. Su experiencia en dermatología es impresionante.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
  },
  {
    name: 'Sofía Herrera',
    pet: 'Rocky — Bulldog Francés',
    text: 'El servicio de vacunación es rápido y profesional. Rocky siempre sale con un lazo de oro. ¡100% recomendado!',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonios" className="py-24 bg-emerald-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-emerald-300">Testimonios</span>
          <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="relative rounded-2xl bg-emerald-800/50 p-8 backdrop-blur-sm">
              <Quote className="mb-4 h-10 w-10 text-emerald-500 opacity-40" />
              <p className="mb-6 leading-relaxed text-emerald-100">{t.text}</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="h-12 w-12 rounded-full border-2 border-emerald-500" />
                <div>
                  <p className="font-bold">{t.name}</p>
                  <p className="text-sm text-emerald-300">{t.pet}</p>
                </div>
              </div>
              <div className="absolute right-8 top-8 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
