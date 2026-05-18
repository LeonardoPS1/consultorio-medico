'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [orgNombre, setOrgNombre] = useState('Consultorio Médico');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token2fa, setToken2fa] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step2fa, setStep2fa] = useState(false);

  useEffect(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.nombre) setOrgNombre(res.data.nombre);
      })
      .catch(() => console.warn('[Login] Error al cargar organización'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        token2fa: step2fa ? token2fa : '',
        redirect: false,
      });

      if (result?.error) {
        // Si requiere 2FA, mostrar el paso de código
        if (result.error === '2FA_REQUIRED') {
          setStep2fa(true);
          setError('Ingresá el código de 6 dígitos de tu app autenticadora');
          setLoading(false);
          return;
        }

        // Mostrar error real
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep2fa(false);
    setToken2fa('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative animate-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-[360px] w-[360px]">
            <img
              src="/aicoremed_dark_1200.svg"
              alt={orgNombre}
              className="h-full w-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl font-bold">{orgNombre}</CardTitle>
          <CardDescription>
            {step2fa
              ? 'Verificación de dos factores'
              : 'Ingresá a tu panel de gestión'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step2fa ? (
              <>
                {/* Paso 2FA: solo mostrar input de código */}
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Ingresá el código de 6 dígitos que aparece en tu app autenticadora
                </p>

                <div className="space-y-2">
                  <Label htmlFor="token2fa">Código de verificación</Label>
                  <Input
                    id="token2fa"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={token2fa}
                    onChange={(e) => setToken2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || token2fa.length < 6}>
                  {loading ? 'Verificando...' : 'Verificar código'}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={handleBackToLogin}
                >
                  Volver al inicio de sesión
                </Button>
              </>
            ) : (
              <>
                {/* Paso 1: email + password */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </Button>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                {error === '2FA_REQUIRED' ? null : (
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{error}</span>
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {orgNombre}. Todos los derechos reservados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
