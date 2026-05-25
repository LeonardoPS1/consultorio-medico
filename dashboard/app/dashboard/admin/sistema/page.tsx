'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Brain, Link, Shield, Key } from 'lucide-react';
import SistemaTab from '@/components/configuracion/sistema-tab';

const SYSTEM_TABS = [
  { id: 'toggles', label: 'Feature Toggles', icon: Settings },
  { id: 'ia', label: 'Asistente IA', icon: Brain },
  { id: 'integraciones', label: 'Integraciones', icon: Link },
  { id: 'credenciales', label: 'Credenciales', icon: Shield },
  { id: 'apikeys', label: 'API Keys', icon: Key },
] as const;

export default function AdminSistemaPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState('toggles');

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Configuración avanzada del consultorio
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {SYSTEM_TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="gap-2">
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {SYSTEM_TABS.map(t => (
          <TabsContent key={t.id} value={t.id} className="mt-4">
            <SistemaTab isAdmin={true} section={t.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
