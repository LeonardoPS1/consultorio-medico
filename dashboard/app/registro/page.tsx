'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear la cuenta.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 2000);
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <Card className="w-full max-w-md relative animate-in">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-xl">¡Cuenta creada!</CardTitle>
            <CardDescription>
              Redirigiendo al inicio de sesión...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative animate-in">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="mx-auto block">
            <div className="mx-auto h-36 w-72 flex items-center justify-center">
              <Logo className="h-full w-full object-contain" />
            </div>
          </Link>
          <CardTitle className="text-xl font-bold">Crear cuenta</CardTitle>
          <CardDescription>
            Comenzá gratis con todas las funcionalidades básicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del consultorio</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Consultorio Dr. Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </Button>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Iniciá sesión
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3 inline mr-1" />
              Volver a AiCoreMed
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
