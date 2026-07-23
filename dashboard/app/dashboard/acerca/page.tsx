/**
 * Acerca de — Información general del sistema
 *
 * Server Component: muestra datos estáticos de la aplicación.
 */

import { Heart, Mail, Globe, HelpCircle, PackageOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'AiCoreMed';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.26.0';
const TENANT_NAME = process.env.NEXT_PUBLIC_TENANT_NAME || 'Consultorio';

const features = [
  {
    title: 'Gestión de turnos',
    description: 'Agendá, reprogramá y cancelá turnos con vista Kanban y calendario integrado.',
  },
  {
    title: 'Atención al paciente',
    description: 'Fichas clínicas completas con notas SOAP, recetas digitales y certificados.',
  },
  {
    title: 'WhatsApp inteligente',
    description: 'Tus pacientes se comunican por WhatsApp con un asistente IA que entiende y responde.',
  },
  {
    title: 'Reportes y analytics',
    description: 'Visualizá ingresos, turnos, pacientes y recetas con datos en tiempo real.',
  },
  {
    title: 'Recordatorios automáticos',
    description: 'Mensajes automaticos 24h y 1h antes de cada turno para reducir inasistencias.',
  },
  {
    title: 'Portal del paciente',
    description: 'Tus pacientes pueden gestionar sus turnos y recetas desde su celular.',
  },
];

export default async function AcercaPage() {
  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-12">
      <PageHeader
        title="Acerca de"
        description={`Información de ${APP_NAME}`}
        icon={<PackageOpen className="size-6" />}
      />

      {/* Hero — Logo + Nombre + Versión */}
      <div className="flex flex-col items-center text-center py-8 space-y-4">
        <div className="relative size-24 sm:size-28">
          <Image
            src="/aicoremed_dark_1200.svg"
            alt={`${APP_NAME} logo`}
            fill
            className="object-contain dark:invert"
            priority
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{APP_NAME}</h2>
          <p className="text-muted-foreground text-sm">
            Versión <span className="font-mono font-medium">{APP_VERSION}</span>
          </p>
          <p className="text-muted-foreground text-xs mt-1">{TENANT_NAME}</p>
        </div>
      </div>

      {/* Descripción */}
      <div className="border rounded-lg p-6 bg-card text-center">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
          {APP_NAME} es un sistema integral de gestión para consultorios médicos,
          desarrollado por{' '}
          <a
            href="https://aicorebots.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Aicore
          </a>
          . Combina automatización inteligente, inteligencia artificial local y
          comunicación por WhatsApp para simplificar la administración diaria de tu
          consultorio.
        </p>
      </div>

      {/* Funcionalidades principales */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Funcionalidades principales
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="border rounded-lg p-4 bg-card space-y-1"
            >
              <p className="font-medium text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Contacto y enlaces */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Contacto y recursos
        </h3>
        <div className="space-y-2">
          <a
            href="https://aicorebots.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <Globe className="size-5 text-primary shrink-0" />
            <span>aicorebots.com</span>
          </a>
          <a
            href="mailto:hola@aicorebots.com"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <Mail className="size-5 text-primary shrink-0" />
            <span>hola@aicorebots.com</span>
          </a>
          <Link
            href="/dashboard/novedades"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <PackageOpen className="size-5 text-primary shrink-0" />
            <span>Novedades y actualizaciones</span>
          </Link>
          <Link
            href="/dashboard/ayuda"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <HelpCircle className="size-5 text-primary shrink-0" />
            <span>Centro de ayuda</span>
          </Link>
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
