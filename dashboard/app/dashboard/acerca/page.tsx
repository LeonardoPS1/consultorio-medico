/**
 * Acerca de — Información del proyecto y repositorio
 *
 * Server Component: muestra datos estáticos del proyecto.
 */

import { Info, Github, ExternalLink, PackageOpen, Heart } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'AiCoreMed';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || '#';
const TENANT_NAME = process.env.NEXT_PUBLIC_TENANT_NAME || 'Consultorio';

export default async function AcercaPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader
        title="Acerca de"
        description={`Información del proyecto ${APP_NAME}`}
        icon={<Info className="size-6" />}
      />

      {/* Versión y repo */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border rounded-lg p-5 bg-card space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Versión
          </h3>
          <p className="text-2xl font-bold">v{APP_VERSION}</p>
          <p className="text-sm text-muted-foreground">
            {TENANT_NAME} &mdash; {APP_NAME}
          </p>
        </div>

        <div className="border rounded-lg p-5 bg-card space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Repositorio
          </h3>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Github className="size-5" />
            GitHub
            <ExternalLink className="size-3" />
          </a>
          <p className="text-sm text-muted-foreground">
            Código fuente, issues y contribuciones
          </p>
        </div>
      </div>

      {/* Links útiles */}
      <div className="border rounded-lg p-5 bg-card">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Enlaces útiles
        </h3>
        <div className="space-y-3">
          <a
            href="/dashboard/novedades"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
          >
            <PackageOpen className="size-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Novedades</p>
              <p className="text-xs text-muted-foreground">
                Historial completo de versiones
              </p>
            </div>
          </a>
          <a
            href={REPO_URL + '/issues'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Github className="size-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Reportar un problema</p>
              <p className="text-xs text-muted-foreground">
                Abrí un issue en GitHub
              </p>
            </div>
            <ExternalLink className="size-3 ml-auto text-muted-foreground" />
          </a>
          <a
            href={REPO_URL + '/releases'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
          >
            <PackageOpen className="size-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Releases en GitHub</p>
              <p className="text-xs text-muted-foreground">
                Cambios técnicos detallados por versión
              </p>
            </div>
            <ExternalLink className="size-3 ml-auto text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Tech stack */}
      <div className="border rounded-lg p-5 bg-card">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Stack tecnológico
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Frontend', value: 'Next.js + Tailwind + shadcn/ui' },
            { label: 'Base de datos', value: 'PostgreSQL + Drizzle ORM' },
            { label: 'Autenticación', value: 'NextAuth + JWT + 2FA' },
            { label: 'IA Local', value: 'Ollama + Gemma3' },
            { label: 'Automatización', value: 'n8n self-hosted' },
            { label: 'WhatsApp', value: 'Twilio API' },
            { label: 'Infraestructura', value: 'Docker + Dokploy' },
            { label: 'Pagos', value: 'MercadoPago (CLP)' },
            { label: 'Hecho por', value: 'Aicore — aicorebots.com' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        Hecho con <Heart className="size-3 text-red-500" /> por{' '}
        <a
          href="https://aicorebots.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Aicore
        </a>
      </p>
    </div>
  );
}
