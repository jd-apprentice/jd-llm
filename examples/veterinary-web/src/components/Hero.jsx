import { useState } from 'react'
import { Menu, X, Phone, Clock, MapPin } from 'lucide-react'

const heroImage = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&h=800&fit=crop&q=80'

export default function Hero() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Servicios', href: '#servicios' },
    { label: 'Equipo', href: '#equipo' },
    { label: 'Testimonios', href: '#testimonios' },
    { label: 'Contacto', href: '#contacto' },
  ]

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100">
      {/* Hero Image Background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Perro feliz con su veterinario"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/50 to-transparent" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 border-b border-emerald-100 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> +34 912 345 678
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <Clock className="h-4 w-4" /> Lun-Sáb: 9:00 - 20:00
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Calle Gran Vía 42, Madrid
            </span>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-2xl font-extrabold text-emerald-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              🐾
            </span>
            VetCare
          </a>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-emerald-600"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-xl"
            >
              Reservar Cita
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 text-gray-600 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="mt-4 border-t border-emerald-100 bg-white/90 p-4 backdrop-blur-sm md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-3 text-sm font-medium text-gray-600 hover:text-emerald-600"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contacto"
              className="mt-2 block rounded-full bg-emerald-600 px-6 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Reservar Cita
            </a>
          </div>
        )}
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl pt-16 md:pt-32">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
            ✨ Tu mascota merece lo mejor
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Cuidamos a quien te hace{' '}
            <span className="relative text-emerald-600">
              feliz
              <svg className="absolute -bottom-2 left-0 h-3 w-full text-emerald-300" viewBox="0 0 200 8" fill="none">
                <path d="M1 5C30 1 70 1 100 4C130 7 170 3 199 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            Atención veterinaria profesional con tecnología de vanguardia y un equipo que ama lo que hace. 
            Desde chequeos rutinarios hasta cirugías especializadas — estamos para tu mascota.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#contacto"
              className="rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-2xl hover:-translate-y-0.5"
            >
              Agendar Consulta →
            </a>
            <a
              href="#servicios"
              className="rounded-full border-2 border-gray-300 px-8 py-3.5 text-sm font-bold text-gray-600 transition-all hover:border-emerald-400 hover:text-emerald-600"
            >
              Ver Servicios
            </a>
          </div>

          {/* Stats */}
          <div className="mt-14 flex gap-10">
            {[
              { value: '15k+', label: 'Mascotas atendidas' },
              { value: '12', label: 'Años de experiencia' },
              { value: '98%', label: 'Clientes satisfechos' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-extrabold text-emerald-600">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
