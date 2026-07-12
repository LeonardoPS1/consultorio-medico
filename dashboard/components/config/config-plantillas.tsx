'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Bot, Eye, Edit3, Trash2 } from 'lucide-react';

interface PlantillaWhatsApp {
  id: string;
  nombre: string;
  contenido: string;
  categoria: string;
  variables: string[];
}

interface Props {
  plantillas: PlantillaWhatsApp[];
  loading: boolean;
  onNew: () => void;
  onEdit: (p: PlantillaWhatsApp) => void;
  onPreview: (p: PlantillaWhatsApp) => void;
  onDelete: (p: PlantillaWhatsApp) => void;
}

export function ConfigPlantillas({ plantillas, loading, onNew, onEdit, onPreview, onDelete }: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {plantillas.length} plantillas configuradas
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Plantilla
        </Button>
      </div>

      {plantillas.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <Bot className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Sin plantillas</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Creí tu primera plantilla de mensaje
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['recordatorios', 'turnos', 'recetas', 'alertas'].map((cat) => {
            const plantillasCat = plantillas.filter((p) => p.categoria === cat);
            if (plantillasCat.length === 0) return null;
            return (
              <Card key={cat}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plantillasCat.map((plantilla) => (
                    <div key={plantilla.id} className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{plantilla.nombre}</p>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {plantilla.variables.length} vars
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {plantilla.contenido}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Vista previa"
                            aria-label="Vista previa"
                            onClick={() => onPreview(plantilla)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar plantilla"
                            className="h-8 w-8"
                            onClick={() => onEdit(plantilla)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar plantilla"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDelete(plantilla)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
