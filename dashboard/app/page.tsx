'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  MessageSquare,
  Syringe,
  BarChart3,
  Bot,
  Smartphone,
  Shield,
  Users,
  Clock,
  FileText,
  ChevronRight,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

// ─── Features ─────────────────────────────────────────────────
const features = [
  {
    icon: Calendar,
    title: 'Gestión de Turnos',
    desc: 'Calendario interactivo, filtros, y vista Kanban de atención. Programá, reprogramá y gestioná pacientes en tiempo real.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    desc: 'Tus pacientes te escriben por WhatsApp y la IA responde al instante. Agendan turnos, consultan recetas y más.',
  },
  {
    icon: Bot,
    title: 'Asistente IA',
    desc: 'Un asistente con IA local (Ollama + Mistral) que entiende el contexto del paciente. Sin costos de API externas.',
  },
  {
    icon: Syringe,
    title: 'Recetas Digitales',
    desc: 'Creá, gestioná y enviá recetas por WhatsApp. Con historial de recetas activas y vencidas por paciente.',
  },
  {
    icon: BarChart3,
    title: 'Reportes Analíticos',
    desc: 'Dashboard con KPIs, gráficos interactivos, comparativas mensuales y exportación a PDF o Excel.',
  },
  {
    icon: Users,
    title: 'Pacientes + Historial',
    desc: 'Ficha completa con datos de contacto, obra social, notas médicas, historial clínico con CIE-10.',
  },
  {
    icon: Shield,
    title: 'Seguridad Total',
    desc: '2FA, rate limiting, auditoría de accesos, contraseñas seguras y backup encriptado. Cumplimiento normativo.',
  },
  {
    icon: Smartphone,
    title: 'App Instalable (PWA)',
    desc: 'Instalá AiCoreMed como app en tu celular o escritorio. Notificaciones push y funcionamiento offline parcial.',
  },
];

// ─── Pricing ──────────────────────────────────────────────────
const plans = [
  {
    name: 'Starter',
    price: '$49',
    desc: 'Para consultorios individuales.',
    features: [
      'Hasta 500 pacientes',
      'Gestión de turnos',
      'WhatsApp básico',
      'Recetas digitales',
      'Reportes esenciales',
      'Soporte por email',
    ],
    cta: 'Comprar',
    popular: false,
  },
  {
    name: 'Profesional',
    price: '$99',
    desc: 'Para consultorios en crecimiento.',
    features: [
      'Todo lo de Starter +',
      'IA Assistant ilimitado',
      'Múltiples profesionales',
      'Reportes avanzados',
      'Exportación Excel/PDF',
      'Soporte prioritario',
    ],
    cta: 'Comprar',
    popular: true,
  },
  {
    name: 'Premium',
    price: '$199',
    desc: 'Para clínicas medianas.',
    features: [
      'Todo lo de Profesional +',
      'Integración n8n completa',
      'Workflows personalizados',
      'Google Calendar sync',
      '2FA y auditoría',
      'Backup encriptado',
      'Soporte 24/7',
    ],
    cta: 'Comprar',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: '$499',
    desc: 'Para grandes centros médicos.',
    features: [
      'Todo lo de Premium +',
      'On-premise disponible',
      'SLA garantizado',
      'Capacitación del equipo',
      'Integraciones custom',
      'API dedicada',
      'Gerente de cuenta',
    ],
    cta: 'Contactar',
    popular: false,
  },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/aicoremed_dark_1200.svg"
              alt="AiCoreMed"
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => scrollTo('features')} className="text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollTo('pricing')} className="text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </button>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Iniciar sesión
            </Link>
            <Button size="sm" variant="outline" asChild>
              <Link href="/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion">
                Prueba gratis
              </Link>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile nav */}
        {mobileMenu && (
          <div className="md:hidden border-t bg-background animate-in">
            <nav className="container mx-auto flex flex-col gap-2 px-4 py-4">
              <button
                onClick={() => scrollTo('features')}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                Funcionalidades <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollTo('pricing')}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                Precios <ChevronRight className="h-4 w-4" />
              </button>
              <Link
                href="/login"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => setMobileMenu(false)}
              >
                Iniciar sesión <ChevronRight className="h-4 w-4" />
              </Link>
              <Button className="mt-2" variant="outline" asChild>
                <Link href="/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion" onClick={() => setMobileMenu(false)}>
                  Prueba gratis
                </Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="mb-8 flex justify-center">
              <img
                src="/aicoremed_dark_1200.svg"
                alt="AiCoreMed"
                className="h-20 md:h-28 w-auto"
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
              <Bot className="h-3.5 w-3.5 text-primary" />
              IA local · Sin costos de API
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Gestioná tu consultorio{' '}
              <span className="gradient-text">con IA</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
              Turnos, WhatsApp, recetas, reportes y un asistente con IA local.
              Todo en un solo panel. Sin mensualidades por IA, sin configuraciones complejas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-base h-12 px-8" onClick={() => scrollTo('pricing')}>
                Ver planes
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <Link href="/login">
                  Iniciar sesión
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 md:gap-16 mt-16">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">100%</div>
                <div className="text-xs text-muted-foreground mt-1">Datos locales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">0$</div>
                <div className="text-xs text-muted-foreground mt-1">Costo IA adicional</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground">24/7</div>
                <div className="text-xs text-muted-foreground mt-1">Disponible siempre</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section id="features" className="border-t bg-muted/30 scroll-mt-20">
        <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitás en un solo lugar
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desde la gestión de turnos hasta reportes avanzados, pasando por WhatsApp integrado
              con IA. Sin depender de servicios externos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative rounded-xl border bg-card p-6 hover-card"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="border-t scroll-mt-20">
        <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Planes simples, sin sorpresas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Elegí el plan que mejor se adapte a tu consultorio. Todos incluyen IA local sin costos adicionales.
              Cancelá cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border bg-card p-6 grid grid-rows-[auto_1fr_auto] gap-6 ${
                  plan.popular ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Más elegido
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      {f.startsWith('Todo lo de') ? (
                        <>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            +
                          </span>
                          <span className="font-medium text-foreground/90">
                            {f} <span className="text-primary text-[10px] font-bold">(incluido)</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="self-end">
                  <Button
                    variant={plan.popular ? 'default' : 'outline'}
                    className="w-full"
                    asChild
                  >
                  <Link href={`/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion%26plan%3D${plan.name.toLowerCase()}`}>
                    {plan.cta}
                  </Link>
                </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Todos los planes incluyen 14 días de prueba gratis. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* ─── CTA Final ───────────────────────────────────────── */}
      <section className="border-t bg-primary/5">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Listo para transformar tu consultorio?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Empezá hoy. En 5 minutos tenés todo configurado. Sin compromisos, sin tarjeta.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base h-12 px-8" asChild>
              <Link href="/login?callbackUrl=/dashboard/configuracion%3Ftab%3Dsuscripcion">
                Comenzar prueba gratis
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base h-12 px-8" onClick={() => scrollTo('features')}>
              Ver funcionalidades
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/aicoremed_dark_1200.svg"
                alt="AiCoreMed"
                className="h-7 w-auto"
              />
              <span className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} AiCoreMed. Todos los derechos reservados.
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/login" className="hover:text-foreground transition-colors">
                Iniciar sesión
              </Link>
              <span className="text-border">|</span>
              <a href="https://aicorebots.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                by Aicore
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
