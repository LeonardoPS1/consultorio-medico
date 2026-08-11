'use client';

import { ContactForm } from '@/components/landing/contact-form';
import { CookieConsentBanner } from '@/components/landing/cookie-consent';
import { CTASection } from '@/components/landing/cta-section';
import { FAQ } from '@/components/landing/faq';
import { Features } from '@/components/landing/features';
import { Footer } from '@/components/landing/footer';
import { Gallery } from '@/components/landing/gallery';
import { Hero } from '@/components/landing/hero';
import { Navbar } from '@/components/landing/navbar';
import { Pricing } from '@/components/landing/pricing';
import { Testimonials } from '@/components/landing/testimonials';
import { WhatsAppFloat } from '@/components/landing/whatsapp-float';
import {
  odontologia,
  clinicasMedicas,
  estetica,
  oftalmologia,
} from '@/lib/landing-especialidades-data';
import type { EspecialidadPageData } from '@/lib/landing-especialidades-data';

const dataMap: Record<string, EspecialidadPageData> = {
  odontologia,
  'clinicas-medicas': clinicasMedicas,
  estetica,
  oftalmologia,
};

interface Props {
  slug: string;
}

/**
 *
 * @param root0
 * @param root0.slug
 */
export function LandingEspecialidad({ slug }: Props) {
  const data = dataMap[slug];
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero
          badgeText={data.hero.badgeText}
          titleNormal={data.hero.titleNormal}
          titleHighlight={data.hero.titleHighlight}
          subtitle={data.hero.subtitle}
          subtitleBold={data.hero.subtitleBold}
          stats={data.hero.stats}
        />
        <Features
          title={data.featuresTitle}
          subtitle={data.featuresSubtitle}
          features={data.features}
        />
        <Gallery />
        <Testimonials testimonials={data.testimonials} />
        <Pricing />
        <FAQ items={data.faq} />
        <ContactForm />
        <CTASection
          title={data.cta.title}
          subtitle={data.cta.subtitle}
          badgeText={data.cta.badgeText}
        />
      </main>
      <Footer />
      <CookieConsentBanner />
      <WhatsAppFloat />
    </div>
  );
}
