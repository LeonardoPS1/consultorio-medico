/**
 * Portal Mensajes — Redirección amable hacia WhatsApp.
 *
 * El chat web del portal se eliminó para unificar la comunicación con el
 * paciente en una sola vía (WhatsApp). Esta página evita un 404 seco para
 * cualquier paciente que conserve un acceso antiguo a /portal/mensajes.
 *
 * NOTA: las tablas `conversaciones` / `mensajes` (canal='web') quedan
 * huérfanas intencionalmente para trazabilidad — sus datos NO se borran.
 */

import Link from 'next/link';
import { ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';
import { cn } from '@/lib/utils';

function whatsappLink(): string | null {
  const raw =
    process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || '';
  const digits = raw.replace(/whatsapp:|\+|[\s\-()]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

const PRIMARY_BTN =
  'inline-flex items-center justify-center rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer px-5 py-2.5 h-11 w-full bg-gradient-to-r from-portal-primary to-portal-accent text-white shadow-[0_4px_12px_hsl(var(--portal-primary)/0.25)] hover:shadow-[0_6px_20px_hsl(var(--portal-primary)/0.35)] active:scale-[0.97]';

const GHOST_BTN =
  'inline-flex items-center justify-center rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer px-5 py-2.5 h-11 w-full bg-transparent text-portal-muted-fg/60 hover:text-portal-fg active:scale-[0.97]';

export default function PortalMensajesRedirectPage() {
  const waLink = whatsappLink();

  return (
    <div className="flex flex-col items-center px-4 pt-10 text-center">
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
        }}
      >
        <MessageCircle className="h-8 w-8 text-white" />
      </div>

      <h1 className="text-xl font-semibold text-portal-fg">
        Hablame por WhatsApp
      </h1>
      <p className="text-sm text-portal-muted-fg mt-2 max-w-sm">
        A partir de ahora, todas las consultas se atienden directo por
        WhatsApp. Es más rápido y podés adjuntar archivos.
      </p>

      <PortalCard
        className="mt-6 w-full max-w-sm text-left"
        padding="lg"
      >
        <p className="text-sm text-portal-fg">
          👋 ¡Hola! Para comunicarte con el equipo médico, escribinos por
          WhatsApp y te respondemos a la brevedad.
        </p>
      </PortalCard>

      <div className="mt-8 w-full max-w-sm space-y-3">
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={PRIMARY_BTN}
          >
            Abrir WhatsApp
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        ) : (
          <p className="text-xs text-portal-muted-fg/70 px-4">
            El consultorio aún no configuró su número de WhatsApp. Comunicate
            por el canal habitual hasta que esté disponible.
          </p>
        )}

        <Link href="/portal/dashboard" className={cn(GHOST_BTN)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}