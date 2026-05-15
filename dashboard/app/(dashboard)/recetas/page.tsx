'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Syringe, Download, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const recetas = [
  { id: '1', paciente: 'Juan Pérez', medicamento: 'Amoxicilina 500mg', dosis: '1 comprimido c/8hs', duracion: '7 días', estado: 'activa', vence: '2026-05-21', renovable: true },
  { id: '2', paciente: 'María García', medicamento: 'Ibuprofeno 600mg', dosis: '1 comprimido c/12hs', duracion: '5 días', estado: 'activa', vence: '2026-05-19', renovable: true },
  { id: '3', paciente: 'Pedro Sánchez', medicamento: 'Enalapril 10mg', dosis: '1 comprimido por día', duracion: '30 días', estado: 'activa', vence: '2026-06-10', renovable: true },
  { id: '4', paciente: 'Ana López', medicamento: 'Omeprazol 20mg', dosis: '1 comprimido en ayunas', duracion: '15 días', estado: 'vencida', vence: '2026-05-01', renovable: true },
];

export default function RecetasPage() {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recetas</h2>
          <p className="text-muted-foreground">
            Recetas activas, vencidas y renovaciones
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      <Tabs defaultValue="activas">
        <TabsList>
          <TabsTrigger value="activas">Activas</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="activas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recetas.filter(r => r.estado === 'activa').map((receta) => (
                  <div key={receta.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Syringe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{receta.paciente}</p>
                      <p className="text-sm text-muted-foreground">{receta.medicamento}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {receta.dosis} · {receta.duracion}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      <p className="text-xs">Vence</p>
                      <p className="font-medium text-foreground">{formatDate(receta.vence, 'dd/MM')}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Descargar PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Enviar por WhatsApp">
                        <Send className="h-4 w-4" />
                      </Button>
                      {receta.renovable && (
                        <Button variant="outline" size="sm" className="text-xs">
                          Renovar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recetas.filter(r => r.estado === 'vencida').map((receta) => (
                  <div key={receta.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{receta.paciente}</p>
                      <p className="text-sm text-muted-foreground">{receta.medicamento}</p>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      Vencida
                    </Badge>
                    <Button variant="outline" size="sm">Renovar</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardContent className="flex items-center justify-center h-48">
              <div className="text-center">
                <Syringe className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Historial completo de recetas por paciente</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Seleccioná un paciente para ver su historial</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
