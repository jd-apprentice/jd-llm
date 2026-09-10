import { Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Contact() {
  return (
    <section id="contacto" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Info */}
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-emerald-600">Contacto</span>
            <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl">
              Agenda la próxima visita de tu mascota
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Llámanos o reserva en línea. Estamos aquí para ayudar a tu compañero peludo, emplumado o escamoso.
            </p>

            <div className="mt-10 space-y-6">
              {[
                { icon: <Phone className="h-5 w-5" />, label: 'Teléfono', value: '+34 912 345 678' },
                { icon: <Mail className="h-5 w-5" />, label: 'Email', value: 'hola@vetcare.es' },
                { icon: <MapPin className="h-5 w-5" />, label: 'Dirección', value: 'Calle Gran Vía 42, 28013 Madrid' },
                { icon: <Clock className="h-5 w-5" />, label: 'Horario', value: 'Lun-Sáb: 9:00 - 20:00' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{item.label}</p>
                    <p className="text-base font-semibold text-gray-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Reservar Cita</h3>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-5 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                <input
                  type="text"
                  placeholder="Nombre de tu mascota"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <input
                type="email"
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100">
                <option value="">Selecciona un servicio</option>
                <option>Consulta General</option>
                <option>Vacunación</option>
                <option>Cirugía</option>
                <option>Laboratorio</option>
                <option>Odontología</option>
                <option>Emergencia</option>
              </select>
              <textarea
                placeholder="Cuéntanos más..."
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-xl"
              >
                Reservar Ahora →
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
