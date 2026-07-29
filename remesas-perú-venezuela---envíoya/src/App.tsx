import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ProblemCard } from './components/ProblemCard';
import { FeaturesGrid } from './components/FeaturesGrid';
import { PlatformScreenshotsCarousel } from './components/PlatformScreenshotsCarousel';
import { ProcessStepsSection } from './components/ProcessStepsSection';
import { FAQSection } from './components/FAQSection';
import { CallToAction } from './components/CallToAction';
import { Footer } from './components/Footer';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';

import { TelegramSimulatorModal } from './components/TelegramSimulatorModal';
import { WhatsAppChatDrawer } from './components/WhatsAppChatDrawer';

import { RemittanceOrder } from './types';
import { MessageCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [telegramDemoOpen, setTelegramDemoOpen] = useState(false);
  const [whatsAppDrawerOpen, setWhatsAppDrawerOpen] = useState(false);

  const [activeOrder, setActiveOrder] = useState<RemittanceOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenTelegramDemoWithOrder = (order: RemittanceOrder) => {
    setActiveOrder(order);
    setTelegramDemoOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0b1c30] text-[#eaf1ff] font-inter antialiased flex flex-col justify-between selection:bg-[#2dd4bf] selection:text-[#002045]">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 max-w-md p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xl border border-emerald-300 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
          <div className="text-xs font-bold leading-tight">{toastMessage}</div>
        </div>
      )}

      {/* Main Header */}
      <Header />

      {/* Main Page Layout Sections */}
      <main className="flex-1">
        
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Problem Statement Banner */}
        <ProblemCard />

        {/* 3. Features Grid ("Por qué somos diferentes") */}
        <FeaturesGrid />

        {/* 4. Real Platform Screenshots Showcase Carousel */}
        <PlatformScreenshotsCarousel />

        {/* 5. Process Steps ("El proceso más sencillo del mercado") */}
        <ProcessStepsSection />

        {/* 5. FAQs */}
        <FAQSection onOpenWhatsAppSupport={() => setWhatsAppDrawerOpen(true)} />

        {/* 6. Call To Action */}
        <CallToAction />

      </main>

      {/* Footer */}
      <Footer />

      {/* Background Motivational Music Controller */}
      <BackgroundMusicPlayer />

      {/* Modals & Interactive Drawers */}
      <TelegramSimulatorModal
        isOpen={telegramDemoOpen}
        onClose={() => setTelegramDemoOpen(false)}
        order={activeOrder}
      />

      <WhatsAppChatDrawer
        isOpen={whatsAppDrawerOpen}
        onClose={() => setWhatsAppDrawerOpen(false)}
      />

      {/* Floating Action Button - WhatsApp Direct Support */}
      {!whatsAppDrawerOpen && (
        <button
          onClick={() => setWhatsAppDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/40 flex items-center gap-2 font-bold text-xs transition-all hover:scale-110 group border-2 border-emerald-300"
          aria-label="Soporte WhatsApp"
        >
          <MessageCircle className="w-6 h-6 fill-current" />
          <span className="hidden sm:inline-block pr-1 font-montserrat">
            Operador Humano
          </span>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-300 animate-ping"></span>
        </button>
      )}

    </div>
  );
}
