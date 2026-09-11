import Hero from './components/Hero'
import Generos from './components/Generos'
import GamesCatalogo from './components/GamesCatalogo'
import Servicios from './components/Servicios'
import Opiniones from './components/Opiniones'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#06121f]">
      <Hero />
      <div className="border-t border-arcade-pink/20 bg-black/20">
        <Generos />
      </div>
      <GamesCatalogo />
      <div className="border-t border-arcade-cyan/20">
        <Servicios />
      </div>
      <Opiniones />
      <Contact />
      <Footer />
    </div>
  )
}
