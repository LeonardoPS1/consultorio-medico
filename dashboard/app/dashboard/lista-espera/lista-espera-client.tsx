'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';

interface WaitlistItem {
  id: string;
  pacienteId: string;
  medicoId: string;
  fechaInscripcion: Date;
  estado: string;
  notas: string | null;
  pacienteNombre: string | null;
  pacienteApellido: string | null;
  pacienteTelefono: string | null;
  medicoNombre: string | null;
}

export function ListaEsperaClient({ initialItems }: { initialItems: WaitlistItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al quitar paciente');
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: 'Paciente quitado de la lista de espera' });
    } catch {
      toast({ title: 'Error al quitar paciente', variant: 'destructive' });
    } finally {
      setRemoving(null);
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/waitlist?estado=activa');
      const json = await res.json();
      const items = (json.data || []).map((item: Record<string, unknown>) => ({
        ...item,
        fechaInscripcion: new Date(item.fechaInscripcion as string),
      }));
      setItems(items);
      toast({ title: 'Lista actualizada' });
    } catch {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const formatDate = (date: Date) => {
    try {
      return format(date, "d 'de' MMMM '·' HH:mm", { locale: es });
    } catch {
      return date.toISOString();
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-3">
              <X className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No hay pacientes en espera</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Cuando un turno se cancele, los pacientes en lista de espera recibirán
              automáticamente una oferta vía WhatsApp.
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {items.length} paciente{items.length !== 1 ? 's' : ''} en espera
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {item.pacienteNombre} {item.pacienteApellido}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {item.medicoNombre}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{item.pacienteTelefono}</span>
                  <span>·</span>
                  <span>{formatDate(item.fechaInscripcion)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={item.estado === 'activa' ? 'default' : 'secondary'}>
                  {item.estado === 'activa' ? 'Esperando' : item.estado}
                </Badge>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Quitar paciente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {item.pacienteNombre} {item.pacienteApellido} será quitado
                        de la lista de espera. No recibirá más ofertas de turno.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemove(item.id)}
                        disabled={removing === item.id}
                      >
                        {removing === item.id ? 'Quitando...' : 'Quitar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
