'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación no encontrado. Solicitá uno nuevo.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setDone(true);
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-16 w-auto" />
          </div>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>Ingresá tu nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Contraseña actualizada correctamente. Ya podés iniciar sesión con tu nueva
                  contraseña.
                </p>
              </div>
              <Button className="w-full" asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirmPassword">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repetí la contraseña"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Restablecer contraseña'
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
