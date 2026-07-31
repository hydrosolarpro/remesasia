import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroMap3D } from './components/HeroMap3D';
import { RateSimulator } from './components/RateSimulator';
import { PlatformCarousel } from './components/PlatformCarousel';
import { BentoFeatures } from './components/BentoFeatures';
import { ComparisonTable } from './components/ComparisonTable';
import { PricingSection } from './components/PricingSection';
import { FounderSection } from './components/FounderSection';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DemoModal } from './components/DemoModal';

export default function App() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-16 lg:pb-0">
      {/* Navbar */}
      <Header onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* Hero with Interactive 3D Peru ↔ Venezuela Globe Map */}
      <main>
        <HeroMap3D onOpenDemoModal={() => setDemoModalOpen(true)} />

        {/* Live Exchange Rate & Remittance Calculator */}
        <RateSimulator onOpenDemoModal={() => setDemoModalOpen(true)} />

        {/* Platform Screenshots Showcase Carousel */}
        <PlatformCarousel />

        {/* Bento Grid Features */}
        <BentoFeatures />

        {/* Caos vs Eficiencia Comparison Table */}
        <ComparisonTable />

        {/* Subscription Plans */}
        <PricingSection onOpenDemoModal={() => setDemoModalOpen(true)} />

        {/* Founder & Security Statement */}
        <FounderSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* Interactive Demo Request Modal */}
      <DemoModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </div>
  );
}
