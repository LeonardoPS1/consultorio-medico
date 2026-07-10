'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Shield, Smartphone, Copy, Check, Download } from 'lucide-react';
import { playCopy } from '@/lib/sound';

export default function Setup2FA() {
  const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup');
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      setSecret(data.secret);
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      setStep('qr');
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la configuración',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (token.length < 6) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, token }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: 'Código inválido',
          description: data.error || 'Verifica la hora de tu teléfono',
          variant: 'destructive',
        });
        return;
      }

      setStep('done');
      toast({
        title: '✅ 2FA activado',
        description: 'Tu cuenta ahora está protegida con doble factor',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo verificar el código',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('¿Estás seguro? Desactivar 2FA reduce la seguridad de tu cuenta.')) return;

    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'DELETE' });
      if (res.ok) {
        setStep('idle');
        setSecret('');
        setQrCode('');
        setBackupCodes([]);
        toast({
          title: '2FA desactivado',
          description: 'La autenticación de dos factores fue desactivada',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo desactivar 2FA', variant: 'destructive' });
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    playCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: '✅ Códigos copiados', description: 'Guardalos en un lugar seguro' });
  };

  if (step === 'done') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Autenticación de dos factores
          </CardTitle>
          <CardDescription>Tu cuenta está protegida con 2FA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-200">
              <Shield className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-700">2FA activo</p>
                <p className="text-xs text-muted-foreground">
                  Se requiere código de verificación para iniciar sesión
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Códigos de respaldo</p>
              <div className="grid grid-cols-2 gap-1 font-mono text-xs bg-muted p-3 rounded-lg">
                {backupCodes.map((code, i) => (
                  <span key={i} className="text-center">
                    {code}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Guardalos en un lugar seguro. Cada código solo puede usarse una vez.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copiar códigos
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisable}>
                Desactivar 2FA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'qr') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Configurar 2FA
          </CardTitle>
          <CardDescription>Escaneá el código QR con Google Authenticator o Authy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="Código QR para 2FA - Escanea con tu app de autenticación" className="w-48 h-48 border rounded-lg" aria-label="Código QR para configuración de doble factor de autenticación" />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              También podés ingresar manualmente esta clave en la app:
            </p>
            <p className="text-center font-mono text-sm bg-muted p-2 rounded-lg select-all">
              {secret}
            </p>
          </div>

          <div className="space-y-4 pt-2 border-t">
            <div>
              <Label htmlFor="verify-token">Código de verificación</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Ingresá el código de 6 dígitos que aparece en tu app
              </p>
              <Input
                id="verify-token"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('idle')}>
                Cancelar
              </Button>
              <Button onClick={handleVerify} disabled={loading || token.length < 6}>
                {loading ? 'Verificando...' : 'Verificar y activar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Autenticación de dos factores
        </CardTitle>
        <CardDescription>Añadí una capa extra de seguridad a tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Smartphone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">¿Cómo funciona?</p>
              <p className="text-xs text-muted-foreground">
                Además de tu contraseña, vas a necesitar un código de 6 dígitos generado por una app
                como Google Authenticator o Authy.
              </p>
            </div>
          </div>

          <Button onClick={handleStartSetup} disabled={loading}>
            {loading ? 'Preparando...' : 'Configurar 2FA'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
