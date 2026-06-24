import { AnimatedSection } from '@/components/landing/animated-section';
import { CTASectionButton } from '@/components/landing/cta-button';
import { Button } from '@/components/ui/button';
import { ChevronRight, MessageCircle, Sparkles, ShieldCheck, Lock, Server } from 'lucide-react';

export interface CTASectionProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export function CTASection({
  title = '¿Listo para transformar tu consultorio?',
  subtitle = 'Empieza hoy. En 5 minutos tienes todo configurado. Sin compromisos, sin tarjeta.',
  badgeText = 'Sin tarjeta de crédito · Sin compromisos',
}: CTASectionProps = {}) {
  return (
    <section className="relative overflow-hidden border-t">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent pointer-events-none" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-orb" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-orb-2" />
      </div>

      {/* Security badge — absolute on md+, in-flow on mobile */}
      <div className="relative md:absolute inset-x-0 top-12 md:top-16 flex justify-center pointer-events-none pb-4 md:pb-0">
        <AnimatedSection
          variant="fade-up"
          delay={0}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-primary/70 text-xs sm:text-sm px-4"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" /> Datos 100% protegidos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> IA 100% local
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Server className="h-4 w-4 sm:h-5 sm:w-5" /> Servidor propio en Chile
          </span>
        </AnimatedSection>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 text-center relative">
        <AnimatedSection className="max-w-2xl mx-auto">
          <AnimatedSection
            variant="scale-in"
            delay={0.1}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-medium mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {badgeText}
          </AnimatedSection>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground text-base mb-8">
            {subtitle}
            <br />
            <span className="font-medium text-foreground">14 días de prueba gratis.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CTASectionButton />
            <Button
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 gap-2 btn-press"
              asChild
            >
              <a
                href="https://wa.me/56975680702?text=Hola%20quiero%20m%C3%A1s%20informaci%C3%B3n"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Hablar con ventas
              </a>
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
