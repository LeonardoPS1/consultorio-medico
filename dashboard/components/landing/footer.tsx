'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, Mail, ExternalLink, ChevronDown } from 'lucide-react';

type FooterLink = {
  label: string;
  href: string;
  icon?: typeof MessageCircle;
  external?: boolean;
};

const footerLinks: Record<string, { label: string; links: FooterLink[] }> = {
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
      { label: 'WhatsApp', href: 'https://wa.me/56975680702', icon: MessageCircle, external: true },
      { label: 'info@aicorebots.com', href: 'mailto:info@aicorebots.com', icon: Mail },
      { label: 'aicorebots.com', href: 'https://aicorebots.com', icon: ExternalLink, external: true },
    ],
  },
};

function FooterColumn({
  section,
  defaultOpen = true,
}: {
  section: { label: string; links: FooterLink[] };
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Mobile: accordion toggle — Desktop: static heading */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:cursor-default flex items-center justify-between w-full md:w-auto group"
        aria-expanded={isOpen}
      >
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.label}
        </h4>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 md:hidden ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <motion.ul
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-1 overflow-hidden md:!h-auto md:!opacity-100 mt-3 md:mt-3"
      >
        {section.links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.label}>
              {link.external || link.href.startsWith('mailto:') || link.href.startsWith('https://wa') ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link text-muted-foreground transition-colors inline-flex items-center gap-1.5 py-2 md:py-1 min-h-[44px] md:min-h-0 w-full md:w-auto"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {link.label}
                  {link.href.startsWith('http') && !link.href.includes('wa.me') && !link.href.includes('aicorebots.com/') ? (
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                  ) : null}
                </a>
              ) : link.href.startsWith('#') ? (
                <a
                  href={link.href}
                  className="footer-link text-muted-foreground transition-colors inline-flex items-center gap-1.5 py-2 md:py-1 min-h-[44px] md:min-h-0 w-full md:w-auto"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {link.label}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="footer-link text-muted-foreground transition-colors inline-flex items-center gap-1.5 py-2 md:py-1 min-h-[44px] md:min-h-0 w-full md:w-auto"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  {link.label}
                </Link>
              )}
            </li>
          );
        })}
      </motion.ul>
    </motion.div>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-12">
        {/* Mobile: accordion sections — Desktop: grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 md:gap-8">
          {/* Brand — full width on mobile */}
          <div className="col-span-2 md:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Link href="/" className="inline-flex items-center gap-2 mb-3">
                <img
                  src="/aicoremed_dark_1200.svg"
                  alt="AiCoreMed"
                  className="h-8 md:h-9 w-auto"
                />
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                Sistema de gestión para consultorios médicos con IA local, WhatsApp integrado
                y automatizaciones inteligentes.
              </p>
            </motion.div>
          </div>

          {/* Product + Company — side by side on mobile */}
          <FooterColumn section={footerLinks.product} defaultOpen={false} />
          <FooterColumn section={footerLinks.company} defaultOpen={false} />

          {/* Contact — full width on mobile (wider items with icons) */}
          <div className="col-span-2 md:col-span-1">
            <FooterColumn section={footerLinks.contact} defaultOpen={false} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 md:mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} AiCoreMed. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Hecho con ❤️ por</span>
            <a
              href="https://aicorebots.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Aicore
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
