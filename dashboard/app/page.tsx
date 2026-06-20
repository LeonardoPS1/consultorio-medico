import type { Metadata } from 'next';
// SEO — Homepage
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { Specialties } from '@/components/landing/specialties';
import { Gallery } from '@/components/landing/gallery';
import { PainPoints } from '@/components/landing/pain-points';
import { Pricing } from '@/components/landing/pricing';
import { FAQ } from '@/components/landing/faq';
import { ContactForm } from '@/components/landing/contact-form';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';
import { WhatsAppFloat } from '@/components/landing/whatsapp-float';
import { CookieConsentBanner } from '@/components/landing/cookie-consent';

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
        <Features />
        <Specialties />
        <Gallery />
        <PainPoints />
        <Pricing />
        <FAQ />
        <ContactForm />
        <CTASection />
      </main>
      <Footer />
      <CookieConsentBanner />
      <WhatsAppFloat />
    </div>
    </>
  );
}
