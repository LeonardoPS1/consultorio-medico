'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SistemaTab from '@/components/configuracion/sistema-tab';

export default function AdminSistemaPage() {
  const { data: session } = useSession();

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Configuración avanzada del sistema — feature toggles, IA, integraciones, credenciales y API keys
        </p>
      </div>
      <SistemaTab isAdmin={true} />
    </div>
  );
}
