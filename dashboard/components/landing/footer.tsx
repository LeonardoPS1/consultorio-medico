'use client';

import Link from 'next/link';
import { MessageCircle, Mail, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
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
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Producto
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#specialties" className="text-muted-foreground hover:text-foreground transition-colors">
                  Especialidades
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Compañía
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="https://aicorebots.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  Aicore
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Solicitar demo
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Contacto
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="https://wa.me/56975680702" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:info@aicorebots.com" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  info@aicorebots.com
                </a>
              </li>
              <li>
                <a href="https://aicorebots.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                  <ExternalLink className="h-3 w-3" />
                  aicorebots.com
                </a>
              </li>
            </ul>
          </div>
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
