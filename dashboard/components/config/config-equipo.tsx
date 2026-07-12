'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Shield, Trash2 } from 'lucide-react';

interface MiembroEquipo {
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  ultimo: string;
}

interface Props {
  miembros: MiembroEquipo[];
  loading: boolean;
  onInvite: () => void;
}

export function ConfigEquipo({ miembros, loading, onInvite }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Miembros del equipo</CardTitle>
          <CardDescription>Usuarios con acceso al dashboard</CardDescription>
        </div>
        <Button size="sm" onClick={onInvite}>
          <Plus className="h-4 w-4 mr-1" />
          Invitar miembro
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : miembros.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sin miembros en el equipo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {miembros.map((miembro) => (
              <div
                key={miembro.email}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                    {miembro.nombre
                      .split(' ')
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{miembro.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{miembro.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {miembro.rol}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {miembro.ultimo}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar miembro"
                    className="h-8 w-8 text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
