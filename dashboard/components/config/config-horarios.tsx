'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface HorarioData {
  id?: string;
  dia: string;
  activo: boolean;
  tipo: string;
  inicio: string;
  fin: string;
  inicio2?: string | null;
  fin2?: string | null;
}

interface Props {
  horarios: HorarioData[];
  loading: boolean;
  onHorariosChange: (horarios: HorarioData[]) => void;
}

export function ConfigHorarios({ horarios, loading, onHorariosChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Horarios de Atención</CardTitle>
        <CardDescription>Configurí la disponibilidad del consultorio</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 skeleton rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {horarios.map((dia, idx) => (
              <div
                key={dia.dia}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30"
              >
                <div className="w-16 sm:w-24 font-medium text-sm pt-1">{dia.dia}</div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dia.activo}
                      onCheckedChange={(checked) => {
                        const nuevos = [...horarios];
                        nuevos[idx] = { ...nuevos[idx], activo: checked };
                        onHorariosChange(nuevos);
                      }}
                    />
                    {!dia.activo && (
                      <span className="text-sm text-muted-foreground">Cerrado</span>
                    )}
                  </div>

                  {dia.activo && (
                    <div className="flex flex-col gap-2 pl-1">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`tipo-${dia.dia}`}
                            checked={dia.tipo === 'corrido'}
                            onChange={() => {
                              const nuevos = [...horarios];
                              nuevos[idx] = {
                                ...nuevos[idx],
                                tipo: 'corrido',
                                inicio2: null,
                                fin2: null,
                              };
                              onHorariosChange(nuevos);
                            }}
                            className="accent-primary"
                          />
                          <span className="text-xs font-medium">Corrido</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`tipo-${dia.dia}`}
                            checked={dia.tipo === 'partido'}
                            onChange={() => {
                              const nuevos = [...horarios];
                              nuevos[idx] = {
                                ...nuevos[idx],
                                tipo: 'partido',
                                inicio2: nuevos[idx].inicio2 || '15:00',
                                fin2: nuevos[idx].fin2 || '19:00',
                              };
                              onHorariosChange(nuevos);
                            }}
                            className="accent-primary"
                          />
                          <span className="text-xs font-medium">Mañana y Tarde</span>
                        </label>
                      </div>

                      {dia.tipo === 'corrido' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">de</span>
                          <Input
                            type="time"
                            value={dia.inicio}
                            onChange={(e) => {
                              const nuevos = [...horarios];
                              nuevos[idx] = { ...nuevos[idx], inicio: e.target.value };
                              onHorariosChange(nuevos);
                            }}
                            className="w-[5.5rem] sm:w-24 h-8 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">a</span>
                          <Input
                            type="time"
                            value={dia.fin}
                            onChange={(e) => {
                              const nuevos = [...horarios];
                              nuevos[idx] = { ...nuevos[idx], fin: e.target.value };
                              onHorariosChange(nuevos);
                            }}
                            className="w-[5.5rem] sm:w-24 h-8 text-sm"
                          />
                        </div>
                      )}

                      {dia.tipo === 'partido' && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-14">Mañana</span>
                            <span className="text-xs text-muted-foreground">de</span>
                            <Input
                              type="time"
                              value={dia.inicio}
                              onChange={(e) => {
                                const nuevos = [...horarios];
                                nuevos[idx] = { ...nuevos[idx], inicio: e.target.value };
                                onHorariosChange(nuevos);
                              }}
                              className="w-[5.5rem] sm:w-24 h-8 text-sm"
                            />
                            <span className="text-muted-foreground text-sm">a</span>
                            <Input
                              type="time"
                              value={dia.fin}
                              onChange={(e) => {
                                const nuevos = [...horarios];
                                nuevos[idx] = { ...nuevos[idx], fin: e.target.value };
                                onHorariosChange(nuevos);
                              }}
                              className="w-[5.5rem] sm:w-24 h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-14">Tarde</span>
                            <span className="text-xs text-muted-foreground">de</span>
                            <Input
                              type="time"
                              value={dia.inicio2 || '15:00'}
                              onChange={(e) => {
                                const nuevos = [...horarios];
                                nuevos[idx] = { ...nuevos[idx], inicio2: e.target.value };
                                onHorariosChange(nuevos);
                              }}
                              className="w-[5.5rem] sm:w-24 h-8 text-sm"
                            />
                            <span className="text-muted-foreground text-sm">a</span>
                            <Input
                              type="time"
                              value={dia.fin2 || '19:00'}
                              onChange={(e) => {
                                const nuevos = [...horarios];
                                nuevos[idx] = { ...nuevos[idx], fin2: e.target.value };
                                onHorariosChange(nuevos);
                              }}
                              className="w-[5.5rem] sm:w-24 h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/horarios', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ horarios }),
                    });
                    if (res.ok) toast({ title: 'Horarios guardados' });
                    else toast({ title: 'Error al guardar', variant: 'destructive' });
                  } catch {
                    toast({ title: 'Error de conexión', variant: 'destructive' });
                  }
                }}
              >
                <Save className="h-4 w-4 mr-1" />
                Guardar Horarios
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetch('/api/horarios')
                    .then((r) => r.json())
                    .then((res) => {
                      if (res.data) onHorariosChange(res.data);
                    });
                }}
              >
                Restablecer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
