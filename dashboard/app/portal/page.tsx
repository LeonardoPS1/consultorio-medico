'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function PortalLoginPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/portal?telefono=${encodeURIComponent(telefono.trim())}`);
      if (!res.ok) {
        toast({
          title: 'Paciente no encontrado',
          description: 'Verifica el numero de telefono. Debe ser el mismo registrado en el consultorio.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      router.push(`/portal/${encodeURIComponent(telefono.trim())}`);
    } catch {
      toast({ title: 'Error de conexion', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Portal del Paciente</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Ingresa tu numero de telefono para ver tus turnos y recetas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Numero de telefono</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="+5491155550101"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="text-lg h-12"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Usa el mismo numero que registraste en el consultorio
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || !telefono.trim()}
            >
              {loading ? (
                'Verificando...'
              ) : (
                <>
                  Ver mis datos <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Solo se muestran datos asociados a tu numero
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
