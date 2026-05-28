import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { Specialties } from '@/components/landing/specialties';
import { Gallery } from '@/components/landing/gallery';
import { Testimonials } from '@/components/landing/testimonials';
import { Pricing } from '@/components/landing/pricing';
import { FAQ } from '@/components/landing/faq';
import { ContactForm } from '@/components/landing/contact-form';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';
import { WhatsAppFloat } from '@/components/landing/whatsapp-float';
import { CookieConsentBanner } from '@/components/landing/cookie-consent';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Specialties />
        <Gallery />
        <Testimonials />
        <Pricing />
        <FAQ />
        <ContactForm />
        <CTASection />
      </main>
      <Footer />
      <CookieConsentBanner />
      <WhatsAppFloat />
    </div>
  );
}
