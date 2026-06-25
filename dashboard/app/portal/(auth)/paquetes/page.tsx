/**
 * Portal — Paquetes de turnos
 * Muestra paquetes disponibles y suscripciones activas del paciente.
 */

'use client';

import { useState, useEffect } from 'react';
import { Package, CheckCircle, ArrowRight, CreditCard } from 'lucide-react';

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
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const suscripcionActiva = suscripciones.find((s) => s.activa);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paquetes de Turnos</h1>
        <p className="text-muted-foreground mt-1">Ahorrá comprando turnos por adelantado</p>
      </div>

      {/* Suscripción activa */}
      {suscripcionActiva && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">{suscripcionActiva.nombre}</p>
              <p className="text-sm text-emerald-600">
                {suscripcionActiva.turnosRestantes} de {suscripcionActiva.turnosTotales} turnos
                disponibles
              </p>
            </div>
          </div>
          <div className="mt-3 bg-emerald-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{
                width: `${(suscripcionActiva.turnosRestantes / suscripcionActiva.turnosTotales) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Paquetes disponibles */}
      {paquetes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">
          <Package className="h-12 w-12 mx-auto mb-3" />
          <p>No hay paquetes disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paquetes.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-foreground">{p.nombre}</h3>
                {p.descripcion && <p className="text-sm text-muted-foreground mt-1">{p.descripcion}</p>}
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {p.cantidadTurnos} turno{p.cantidadTurnos !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">
                  ${p.precio.toLocaleString('es-CL')}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  ${Math.round(p.precio / p.cantidadTurnos).toLocaleString('es-CL')} c/u
                </p>
                <button
                  onClick={() => comprarPaquete(p.id)}
                  disabled={buyingId === p.id}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 rounded-xl transition-all duration-200"
                >
                  {buyingId === p.id ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <>
                      Comprar <CreditCard className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info extra */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-sm text-primary">
        <p className="font-medium mb-1">💡 ¿Cómo funciona?</p>
        <ul className="space-y-1 text-primary/80">
          <li>• Comprás un paquete y los turnos se acreditan automáticamente</li>
          <li>• Al agendar, podés usar un turno de tu paquete sin pagar extra</li>
          <li>• Los turnos del paquete no vencen (salvo que se indique lo contrario)</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <a
          href="/portal/turnos"
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          Ver mis turnos <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
