import Hero from './components/Hero'
import Services from './components/Services'
import Team from './components/Team'
import Testimonials from './components/Testimonials'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Hero />
      <Services />
      <Team />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  )
}
