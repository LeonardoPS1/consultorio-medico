'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, Mail, ExternalLink } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Especialidades', href: '#specialties' },
    { label: 'Precios', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  company: [
    { label: 'Aicore', href: 'https://aicorebots.com', external: true },
    { label: 'Iniciar sesión', href: '/login' },
    { label: 'Solicitar demo', href: '#contact' },
  ],
  contact: [
    { label: 'WhatsApp', href: 'https://wa.me/56975680702', icon: MessageCircle, external: true },
    { label: 'info@aicorebots.com', href: 'mailto:info@aicorebots.com', icon: Mail },
    { label: 'aicorebots.com', href: 'https://aicorebots.com', icon: ExternalLink, external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <img
                src="/aicoremed_dark_1200.svg"
                alt="AiCoreMed"
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Sistema de gestión para consultorios médicos con IA local, WhatsApp integrado
              y automatizaciones inteligentes.
            </p>
          </motion.div>

          {/* Product */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Producto
            </h4>
            <ul className="space-y-2 text-xs">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="footer-link text-muted-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Compañía
            </h4>
            <ul className="space-y-2 text-xs">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="footer-link text-muted-foreground transition-colors inline-flex items-center gap-1">
                      {link.label}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <Link href={link.href} className="footer-link text-muted-foreground transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Contacto
            </h4>
            <ul className="space-y-2 text-xs">
              {footerLinks.contact.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="footer-link text-muted-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      {Icon && <Icon className="h-3 w-3" />}
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AiCoreMed. Todos los derechos reservados. Desarrollado para consultorios y clínicas de salud.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
