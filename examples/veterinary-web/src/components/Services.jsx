import { HeartPulse, Syringe, Activity, Stethoscope, ForkKnife, Ambulance } from 'lucide-react'

const services = [
  {
    icon: <HeartPulse className="h-7 w-7" />,
    title: 'Consultas Generales',
    desc: 'Revisión completa del estado de salud de tu mascota con diagnóstico preciso.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: <Syringe className="h-7 w-7" />,
    title: 'Vacunación',
    desc: 'Programa completo de vacunación para cachorros y adultos adaptado a cada especie.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <ForkKnife className="h-7 w-7" />,
    title: 'Cirugía',
    desc: 'Quirófano equipado con tecnología de última generación para intervenciones seguras.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: <Activity className="h-7 w-7" />,
    title: 'Laboratorio Clínico',
    desc: 'Análisis de sangre, orina y más con resultados rápidos y confiables.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: <Stethoscope className="h-7 w-7" />,
    title: 'Odontología',
    desc: 'Limpieza dental y tratamientos para la salud bucal de tu compañero.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: <Ambulance className="h-7 w-7" />,
    title: 'Emergencias 24/7',
    desc: 'Atención de urgencias las 24 horas del día, los 7 días de la semana.',
    color: 'from-red-500 to-orange-500',
  },
]

export default function Services() {
  return (
    <section id="servicios" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-emerald-600">Nuestros Servicios</span>
          <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Todo lo que tu mascota necesita
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Ofrecemos una atención integral con los más altos estándares de calidad y profesionalismo.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-all duration-300 hover:border-emerald-200 hover:bg-white hover:shadow-xl hover:-translate-y-1"
            >
              <div
                className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${service.color} text-white shadow-lg`}
              >
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{service.title}</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">{service.desc}</p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
