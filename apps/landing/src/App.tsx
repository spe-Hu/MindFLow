import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import BackgroundOrbs from './components/BackgroundOrbs'
import Hero from './sections/Hero'
import Features from './sections/Features'
import HowItWorks from './sections/HowItWorks'
import SocialProof from './sections/SocialProof'
import CTA from './sections/CTA'
import Footer from './sections/Footer'

function App() {
  const [theme] = useState<'dark'>('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return (
    <div className="relative min-h-screen">
      <BackgroundOrbs />
      <div className="relative" style={{ zIndex: 1 }}>
        <Navbar />
        <main>
          <Hero />
          <Features />
          <HowItWorks />
          <SocialProof />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default App
