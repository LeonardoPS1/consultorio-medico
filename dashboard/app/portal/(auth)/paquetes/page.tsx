/**
 * Portal — Paquetes de turnos
 * Muestra paquetes disponibles y suscripciones activas del paciente.
 */

'use client';

import { useState, useEffect } from 'react';
import { Package, ArrowRight, CreditCard } from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalButton } from '@/components/portal/portal-button';

interface Paquete {
  id: string;
  nombre: string;
  descripcion: string | null;
  cantidadTurnos: number;
  precio: number;
}

interface Suscripcion {
  id: string;
  paqueteId: string;
  nombre: string;
  turnosRestantes: number;
  turnosTotales: number;
  activa: boolean;
}

export default function PaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/portal/paquetes')
      .then((r) => r.json())
      .then((data) => {
        setPaquetes(data.paquetes || []);
        setSuscripciones(data.suscripciones || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function comprarPaquete(paqueteId: string) {
    setBuyingId(paqueteId);
    try {
      const res = await fetch('/api/portal/paquetes/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paqueteId }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert(data.error || 'Error al iniciar pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setBuyingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 rounded-full animate-spin"
          style={{
            border: '2px solid hsl(var(--portal-primary))',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  const suscripcionActiva = suscripciones.find((s) => s.activa);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--portal-foreground))' }}>Paquetes de Turnos</h1>
        <p className="mt-1" style={{ color: 'hsl(var(--portal-muted-foreground))' }}>Ahorrá comprando turnos por adelantado</p>
      </div>

      {suscripcionActiva && (
        <PortalCard
          style={{
            background: 'hsl(var(--portal-primary) / 0.06)',
            border: '1px solid hsl(var(--portal-primary) / 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6" style={{ color: 'hsl(var(--portal-primary))' }} />
            <div>
              <p className="font-semibold" style={{ color: 'hsl(var(--portal-foreground))' }}>{suscripcionActiva.nombre}</p>
              <p className="text-sm" style={{ color: 'hsl(var(--portal-primary))' }}>
                {suscripcionActiva.turnosRestantes} de {suscripcionActiva.turnosTotales} turnos disponibles
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-full h-2 overflow-hidden" style={{ background: 'hsl(var(--portal-primary) / 0.12)' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: 'hsl(var(--portal-primary))',
                width: `${(suscripcionActiva.turnosRestantes / suscripcionActiva.turnosTotales) * 100}%`,
                transition: 'width 300ms ease-out',
              }}
            />
          </div>
        </PortalCard>
      )}

      {paquetes.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
          <Package className="h-12 w-12 mx-auto mb-3" style={{ color: 'hsl(var(--portal-muted-foreground))' }} />
          <p>No hay paquetes disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paquetes.map((p) => (
            <PortalCard key={p.id} hover padding="lg" className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold" style={{ color: 'hsl(var(--portal-foreground))' }}>{p.nombre}</h3>
                {p.descripcion && (
                  <p className="text-sm mt-1" style={{ color: 'hsl(var(--portal-muted-foreground))' }}>{p.descripcion}</p>
                )}
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
                  {p.cantidadTurnos} turno{p.cantidadTurnos !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: 'hsl(var(--portal-foreground))' }}>
                  ${p.precio.toLocaleString('es-CL')}
                </p>
                <p className="text-xs" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
                  ${Math.round(p.precio / p.cantidadTurnos).toLocaleString('es-CL')} c/u
                </p>
                <PortalButton
                  onClick={() => comprarPaquete(p.id)}
                  loading={buyingId === p.id}
                >
                  Comprar <CreditCard className="h-3.5 w-3.5" />
                </PortalButton>
              </div>
            </PortalCard>
          ))}
        </div>
      )}

      <PortalCard
        className="text-sm"
        style={{
          background: 'hsl(var(--portal-primary) / 0.06)',
          border: '1px solid hsl(var(--portal-primary) / 0.12)',
          color: 'hsl(var(--portal-primary))',
        }}
      >
        <p className="font-medium mb-1">💡 ¿Cómo funciona?</p>
        <ul className="space-y-1" style={{ color: 'hsl(var(--portal-primary) / 0.8)' }}>
          <li>• Comprás un paquete y los turnos se acreditan automáticamente</li>
          <li>• Al agendar, podés usar un turno de tu paquete sin pagar extra</li>
          <li>• Los turnos del paquete no vencen (salvo que se indique lo contrario)</li>
        </ul>
      </PortalCard>

      <div className="flex justify-center">
        <a
          href="/portal/turnos"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: 'hsl(var(--portal-primary))' }}
        >
          Ver mis turnos <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
