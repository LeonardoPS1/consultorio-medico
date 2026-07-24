'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, MessageCircle, Mail, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export function SoporteContent() {
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    setEnviando(true);
    try {
      const res = await fetch('/api/soporte/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto: asunto.trim() || 'Consulta desde Dashboard',
          mensaje: mensaje.trim(),
        }),
      });

      if (!res.ok) throw new Error('Error al enviar mensaje');

      toast({ title: 'Mensaje enviado', description: 'Te responderemos a la brevedad' });
      setAsunto('');
      setMensaje('');
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje. Intentá de nuevo.', variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Enviar mensaje
          </CardTitle>
          <CardDescription>
            Escribinos tu consulta o feedback. Te responderemos a la brevedad.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asunto">Asunto</Label>
              <Input
                id="asunto"
                placeholder="Ej: Consulta sobre facturación"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje</Label>
              <Textarea
                id="mensaje"
                placeholder="Describí tu consulta o feedback..."
                rows={5}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={enviando || !mensaje.trim()}>
              {enviando ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Enviar mensaje</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Otros canales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0" />
            <span>soporte@aicorebots.com</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Respuesta en hasta 24h hábiles</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
