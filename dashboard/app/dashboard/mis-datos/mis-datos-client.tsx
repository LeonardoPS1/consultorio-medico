'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface SolicitudItem {
  id: string;
  tipo: string;
  estado: string;
  createdAt: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteEmail: string | null;
  pacienteTelefono: string;
}

interface Props {
  initialData: SolicitudItem[];
  canView: boolean;
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'procesada') {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
        Procesada
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
      Pendiente
    </Badge>
  );
}

export function MisDatosClient({ initialData, canView }: Props) {
  const [items, setItems] = useState<SolicitudItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mis-datos', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.data)) {
        setItems(data.data as SolicitudItem[]);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las solicitudes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) void cargar();
  }, [canView, cargar]);

  const marcarProcesada = async (id: string) => {
    setMarking(id);
    try {
      const res = await fetch('/api/mis-datos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast({ title: 'Solicitud procesada', description: 'Se actualizó el estado de la solicitud.' });
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, estado: 'procesada' } : it)),
        );
      } else {
        toast({ title: 'Error', description: data?.error ?? 'No se pudo actualizar la solicitud', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' });
    } finally {
      setMarking(null);
    }
  };

  if (!canView) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">No tenés acceso a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de datos"
        description="Solicitudes de eliminación de datos registradas por pacientes del consultorio (Ley 19.628). Revisión manual: marcar como procesada no borra datos automáticamente."
        icon={<ShieldCheck className="size-6" />}
        action={
          <Button variant="outline" size="sm" onClick={() => void cargar()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
          </Button>
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay solicitudes de eliminación pendientes.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Trash2 className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {item.pacienteNombre} {item.pacienteApellido}
                    </CardTitle>
                    <EstadoBadge estado={item.estado} />
                  </div>
                  <span className="text-xs text-muted-foreground">{formatearFecha(item.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground">
                  {item.pacienteEmail ?? '—'} · {item.pacienteTelefono}
                </p>
                {item.estado === 'pendiente' && (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    disabled={marking === item.id}
                    onClick={() => void marcarProcesada(item.id)}
                  >
                    {marking === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Marcar como procesada'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
