'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface NuevaConversacionModalProps {
  onCreated: () => void;
}

export function NuevaConversacionModal({ onCreated }: NuevaConversacionModalProps) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('+569');
  const [mensaje, setMensaje] = useState('');
  const [canal, setCanal] = useState('whatsapp');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/conversaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono,
          nombre,
          apellido,
          mensaje: mensaje || 'Inicio de conversación',
          canal,
        }),
      });

      if (!res.ok) throw new Error('Error al crear conversación');

      setOpen(false);
      onCreated();
      // Reset form
      setNombre('');
      setApellido('');
      setTelefono('+569');
      setMensaje('');
      setCanal('whatsapp');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la conversación. Intentá de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Conversación</DialogTitle>
            <DialogDescription>
              Iniciá una conversación con un paciente por WhatsApp o email
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv-nombre">Nombre *</Label>
                <Input
                  id="conv-nombre"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conv-apellido">Apellido *</Label>
                <Input
                  id="conv-apellido"
                  placeholder="Apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-telefono">Teléfono *</Label>
              <Input
                id="conv-telefono"
                placeholder="+5491155550101"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-mensaje">Mensaje inicial</Label>
              <Textarea
                id="conv-mensaje"
                placeholder="Escribí el primer mensaje de la conversación..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                  <SelectItem value="sms">💬 SMS</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !nombre.trim() || !apellido.trim() || !telefono.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Iniciar conversación'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
