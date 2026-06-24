'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { PLANES, PLANES_ORDERED, type PlanInfo, type PlanId } from '@/lib/planes';

const PAID_PLAN_IDS: PlanId[] = ['starter', 'professional', 'premium', 'enterprise'];

interface SuscripcionData {
  plan: string;
  estado: string;
  planInfo: (PlanInfo & { id: string }) | null;
  periodStart: string | null;
  periodEnd: string | null;
  trialEnd: string | null;
}

export default function SuscripcionTab() {
  const [data, setData] = useState<SuscripcionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const autoTriggerDone = useRef(false);

  useEffect(() => {
    fetch('/api/pagos/status')
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res);
        }
      })
      .catch(() => setError('Error al cargar estado'))
      .finally(() => setLoading(false));
  }, []);

  // Si llegó con un plan desde la landing → auto checkout
  useEffect(() => {
    if (autoTriggerDone.current) return;
    if (loading) return;
    const planParam = new URLSearchParams(window.location.search).get('plan');
    if (planParam && (PAID_PLAN_IDS as readonly string[]).includes(planParam)) {
      autoTriggerDone.current = true;
      const timer = setTimeout(() => handleCheckout(planParam), 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    setError('');

    // Abrir ventana ANTES del await para evitar que el browser
    // bloquee el popup (requisito de Chrome/Safari/Firefox)
    const mpWindow = window.open('', '_blank');

    try {
      const res = await fetch('/api/pagos/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const json = await res.json();

      if (json.error) {
        mpWindow?.close();
        setError(json.error);
        return;
      }

      // En modo TEST usar sandbox_init_point, en producción init_point
      const url = json.sandboxInitPoint || json.initPoint;
      if (url && mpWindow) {
        mpWindow.location.href = url;
      } else if (url) {
        // Fallback: redirigir la página actual
        window.location.href = url;
      } else {
        mpWindow?.close();
        setError('Error al obtener link de pago');
      }
    } catch {
      mpWindow?.close();
      setError('Error al conectar con el procesador de pagos');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const planActual = data?.plan || 'free';
  const estado = data?.estado || 'free';

  const estadoBadge = (est: string) => {
    switch (est) {
      case 'active':
        return <Badge className="bg-emerald-500">Activa</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'expired':
        return <Badge variant="outline">Vencida</Badge>;
      default:
        return <Badge variant="outline">Gratuito</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estado actual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suscripción</CardTitle>
              <CardDescription>Estado de tu plan actual</CardDescription>
            </div>
            {estadoBadge(estado)}
          </div>
        </CardHeader>
        <CardContent>
          {data && data.planInfo && estado !== 'free' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Plan:</span>
                <span className="text-sm">{data.planInfo.nombre}</span>
              </div>
              {data.periodEnd && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Próximo vencimiento:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(data.periodEnd).toLocaleDateString('es-CL')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Actualmente estás usando el plan gratuito. Elegí un plan para acceder a todas las
              funcionalidades.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Planes disponibles */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANES_ORDERED.filter((p) => p.id !== 'free').map((plan) => {
          const isCurrent = planActual === plan.id && estado === 'active';
          const isLoading = checkoutLoading === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative h-full flex flex-col ${isCurrent ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader className="pb-3">
                {plan.id === 'professional' && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-0.5 rounded-full">
                    Más elegido
                  </div>
                )}
                <CardTitle className="text-base">{plan.nombre}</CardTitle>
                <div className="mt-1 space-y-0.5">
                  <div>
                    <span className="text-2xl font-bold">${plan.precioUSD}</span>
                    <span className="text-xs text-muted-foreground"> USD/mes</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ≈ ${plan.precioCLP.toLocaleString('es-CL')} CLP/mes
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      {f.startsWith('Todo lo de') ? (
                        <>
                          <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0 mt-0.5">
                            +
                          </span>
                          <span className="font-medium text-foreground/80">
                            {f}{' '}
                            <span className="text-primary text-[9px] font-bold">(incluido)</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || isLoading}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : isCurrent ? (
                    'Plan actual'
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {plan.cta}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Pagos procesados por MercadoPago en pesos chilenos (CLP). Precios en USD como referencia.
        Todos los montos incluyen IVA.
        {process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.startsWith('TEST-') && (
          <span className="block mt-1 text-amber-600">
            🔧 Modo de prueba — Usá credenciales de prueba de MercadoPago.
          </span>
        )}
      </p>
    </div>
  );
}
