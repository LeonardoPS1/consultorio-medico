import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
// SEO — Homepage
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { WhatsAppFloat } from '@/components/landing/whatsapp-float';
import { CookieConsentBanner } from '@/components/landing/cookie-consent';

// Below-fold components: dynamic imports para deferir framer-motion (~35KB) del bundle inicial
const Features = dynamic(() => import('@/components/landing/features').then((m) => m.Features));
const Specialties = dynamic(() =>
  import('@/components/landing/specialties').then((m) => m.Specialties),
);
const Gallery = dynamic(() => import('@/components/landing/gallery').then((m) => m.Gallery));
const PainPoints = dynamic(() =>
  import('@/components/landing/pain-points').then((m) => m.PainPoints),
);
const Pricing = dynamic(() => import('@/components/landing/pricing').then((m) => m.Pricing));
const FAQ = dynamic(() => import('@/components/landing/faq').then((m) => m.FAQ));
const ContactForm = dynamic(() =>
  import('@/components/landing/contact-form').then((m) => m.ContactForm),
);
const CTASection = dynamic(() =>
  import('@/components/landing/cta-section').then((m) => m.CTASection),
);
const Footer = dynamic(() => import('@/components/landing/footer').then((m) => m.Footer));

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
