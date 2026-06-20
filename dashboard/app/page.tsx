import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
// SEO — Homepage
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { WhatsAppFloat } from '@/components/landing/whatsapp-float';
import { CookieConsentBanner } from '@/components/landing/cookie-consent';

// Below-fold components: dynamic imports para deferir framer-motion (~35KB) del bundle inicial
const Features = dynamic(() => import('@/components/landing/features'));
const Specialties = dynamic(() => import('@/components/landing/specialties'));
const Gallery = dynamic(() => import('@/components/landing/gallery'));
const PainPoints = dynamic(() => import('@/components/landing/pain-points'));
const Pricing = dynamic(() => import('@/components/landing/pricing'));
const FAQ = dynamic(() => import('@/components/landing/faq'));
const ContactForm = dynamic(() => import('@/components/landing/contact-form'));
const CTASection = dynamic(() => import('@/components/landing/cta-section'));
const Footer = dynamic(() => import('@/components/landing/footer'));

export const metadata: Metadata = {
  title: {
    absolute: 'AiCoreMed – Software de Gestión para Consultorios con IA | Chile',
  },
  description:
    'Agenda turnos, automatiza WhatsApp y gestiona historiales clínicos con IA local. Sin costos de API. Prueba gratis 14 días. Para médicos en Chile.',
};

const jsonLd: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AiCoreMed',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '49',
    priceCurrency: 'USD',
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <div className="content-visibility-auto">
          <Features />
        </div>
        <div className="content-visibility-auto">
          <Specialties />
        </div>
        <div className="content-visibility-auto">
          <Gallery />
        </div>
        <div className="content-visibility-auto">
          <PainPoints />
        </div>
        <div className="content-visibility-auto">
          <Pricing />
        </div>
        <div className="content-visibility-auto">
          <FAQ />
        </div>
        <div className="content-visibility-auto">
          <ContactForm />
        </div>
        <div className="content-visibility-auto">
          <CTASection />
        </div>
      </main>
      <Footer />
      <CookieConsentBanner />
      <WhatsAppFloat />
    </div>
    </>
  );
}
