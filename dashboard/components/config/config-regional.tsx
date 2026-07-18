'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Globe, Loader2, Check } from 'lucide-react';
import { PAISES } from '@/lib/regions-data';
import type { ConfigRegional } from '@/drizzle/schema';

export function ConfigRegional() {
  const [config, setConfig] = useState<ConfigRegional | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPais, setSelectedPais] = useState('CL');

  useEffect(() => {
    fetch('/api/tenant/regional-config')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setConfig(res.data);
          setSelectedPais(res.data.pais || 'CL');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/regional-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pais: selectedPais }),
      });
      const data = await res.json();
      if (data.data) setConfig(data.data);
      toast({ title: data.message || 'Configuración regional guardada' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const paisActual = PAISES[selectedPais];
  const paisAnterior = config ? PAISES[config.pais] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Regionalización
        </CardTitle>
        <CardDescription>
          Configurí el país y sistema de salud para tu consultorio.
          Esto afecta el formato de documentos (RUT/DNI), moneda, regiones y sistemas de salud disponibles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>País</Label>
          <select
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedPais}
            onChange={(e) => setSelectedPais(e.target.value)}
          >
            {Object.entries(PAISES).map(([codigo, info]) => (
              <option key={codigo} value={codigo}>
                {info.nombre}
              </option>
            ))}
          </select>
        </div>

        {paisActual && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Moneda</p>
              <p className="font-medium">{paisActual.moneda.codigo} ({paisActual.moneda.simbolo})</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Documento de identidad</p>
              <p className="font-medium">{paisActual.documentoId.label} ({paisActual.documentoId.formato})</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sistemas de salud</p>
              <p className="font-medium">{paisActual.sistemaSalud.join(', ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Regiones / Provincias</p>
              <p className="font-medium">{paisActual.regiones.length} regiones</p>
            </div>
          </div>
        )}

        {paisAnterior && config && config.pais !== selectedPais && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">⚠ Cambio de país detectado</p>
            <p className="text-xs mt-1">
              Al cambiar de {paisAnterior.nombre} a {paisActual?.nombre} se actualizarán automíticamente
              la moneda, el formato de documento y los sistemas de salud disponibles.
              Los pacientes existentes no se modifican.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || !selectedPais}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Guardar configuración regional
        </Button>
      </CardContent>
    </Card>
  );
}
