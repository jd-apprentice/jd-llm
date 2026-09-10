import { doctor1, doctor2, doctor3 } from '../assets/doctors'

const team = [
  {
    name: 'Dra. María González',
    role: 'Directora Médica',
    specialty: 'Cirugía veterinaria con 15 años de experiencia',
    image: doctor1,
  },
  {
    name: 'Dr. Carlos Ruiz',
    role: 'Especialista en Exóticos',
    specialty: 'Aves, reptiles y pequeños mamíferos',
    image: doctor2,
  },
  {
    name: 'Dra. Ana Martínez',
    role: 'Dermatóloga Veterinaria',
    specialty: 'Salud de la piel y alergias en mascotas',
    image: doctor3,
  },
]

export default function Team() {
  return (
    <section id="equipo" className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-emerald-600">Nuestro Equipo</span>
          <h2 className="mt-3 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Profesionales que aman a los animales
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Cada miembro de nuestro equipo comparte una pasión: el bienestar de tu mascota.
          </p>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <div
              key={member.name}
              className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-2xl"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                <p className="mt-1 font-semibold text-emerald-600">{member.role}</p>
                <p className="mt-2 text-sm text-gray-500">{member.specialty}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
