import Navbar from './components/Navbar'
import Hero from './sections/Hero'
import Manifesto from './sections/Manifesto'
import Features from './sections/Features'
import HowItWorks from './sections/HowItWorks'
import Moments from './sections/Moments'
import Changelog from './sections/Changelog'
import CTA from './sections/CTA'
import Footer from './sections/Footer'

function App() {
  return (
    <div className="min-h-screen bg-paper text-ink-muted">
      <Navbar />
      <main>
        <Hero />
        <Manifesto />
        <Features />
        <HowItWorks />
        <Moments />
        <Changelog />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}

export default App