'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devInfo, setDevInfo] = useState<{ token: string; resetUrl: string } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDevInfo(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (json.error) {
        setError(json.error);
      } else {
        setSent(true);
        if (json._dev) {
          setDevInfo(json._dev);
        }
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
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>
            Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Si el email está registrado, recibirás un enlace de recuperación.
                </p>
              </div>

              {devInfo && (
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    🔧 Modo desarrollo — Sin SMTP configurado
                  </p>
                  <a
                    href={devInfo.resetUrl}
                    className="block text-xs text-primary underline break-all hover:text-primary/80"
                  >
                    {devInfo.resetUrl}
                  </a>
                  <p className="text-[10px] text-muted-foreground">
                    Token:{' '}
                    <code className="text-amber-700 dark:text-amber-400">
                      {devInfo.token.substring(0, 20)}...
                    </code>
                  </p>
                </div>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
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
