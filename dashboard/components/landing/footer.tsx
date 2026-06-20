import Link from 'next/link';
import { ShieldCheck, Lock, Server } from 'lucide-react';
import { FooterColumn } from '@/components/landing/landing-footer-column';
import { ScrollToTop } from '@/components/landing/scroll-to-top';
import { Logo } from '@/components/layout/logo';

const footerLinks: Record<string, { label: string; links: Array<{ label: string; href: string; external?: boolean }> }> = {
  product: {
    label: 'Producto',
    links: [
      { label: 'Funcionalidades', href: '#features' },
      { label: 'Especialidades', href: '#specialties' },
      { label: 'Precios', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  company: {
    label: 'Compañía',
    links: [
      { label: 'Aicore', href: 'https://aicorebots.com', external: true },
      { label: 'Iniciar sesión', href: '/login' },
      { label: 'Solicitar demo', href: '#contact' },
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Términos', href: '/terminos' },
    ],
  },
  contact: {
    label: 'Contacto',
    links: [
      { label: 'WhatsApp', href: 'https://wa.me/56975680702', external: true },
      { label: 'info@aicorebots.com', href: 'mailto:info@aicorebots.com' },
      { label: 'aicorebots.com', href: 'https://aicorebots.com', external: true },
    ],
  },
};

export function Footer() {
  return (
    <footer className="relative border-t bg-gradient-to-b from-background to-muted/30">
      {/* Security Trust Badge */}
      <div className="border-b bg-primary/5">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Datos protegidos con cifrado AES-256</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>IA 100% local — tus datos nunca salen de tu servidor</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-primary" />
              <span>Infraestructura propia en Chile</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Cumplimiento Ley 19.628 — Protección de datos</span>
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 mb-3">
                <Logo className="h-8 md:h-9 w-auto" />
              </Link>
              <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-xs mb-3">
                Sistema de gestión para consultorios médicos con IA local, WhatsApp integrado
                y automatizaciones inteligentes.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  Datos seguros
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-3 w-3" />
                  IA Local
                </span>
              </div>
            </div>
          </div>

          <FooterColumn section={footerLinks.product} defaultOpen={false} />
          <FooterColumn section={footerLinks.company} defaultOpen={false} />

          <div className="col-span-2 md:col-span-1">
            <FooterColumn section={footerLinks.contact} defaultOpen={false} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 md:mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
          <p className="text-xs text-muted-foreground/60 text-center sm:text-left">
            © {new Date().getFullYear()} AiCoreMed. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <span>Hecho por</span>
              <a
                href="https://aicorebots.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                Aicore
              </a>
            </div>
            <span className="text-muted-foreground/20">|</span>
            <ScrollToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
