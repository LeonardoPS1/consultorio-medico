'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter, redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Brain, Link, Shield, Key, Lock } from 'lucide-react';
import SistemaTab from '@/components/configuracion/sistema-tab';

const SYSTEM_TABS = [
  { id: 'toggles', label: 'Feature Toggles', icon: Settings },
  { id: 'ia', label: 'Asistente IA', icon: Brain },
  { id: 'integraciones', label: 'Integraciones', icon: Link },
  { id: 'credenciales', label: 'Credenciales', icon: Shield },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'privacidad', label: 'Privacidad', icon: Lock },
] as const;

const VALID_TABS = SYSTEM_TABS.map(t => t.id);
const DEFAULT_TAB = 'toggles';

export default function AdminSistemaPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Leer tab desde URL o usar default
  const tabFromUrl = searchParams.get('tab');
  type TabId = typeof VALID_TABS[number];
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl as TabId) ? (tabFromUrl as TabId) : DEFAULT_TAB;
  const [tab, setTab] = useState(initialTab);

  // Sincronizar URL con el estado del tab
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === DEFAULT_TAB) {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const newUrl = params.toString()
      ? `/dashboard/admin/sistema?${params.toString()}`
      : '/dashboard/admin/sistema';
    router.replace(newUrl, { scroll: false });
  }, [tab, router, searchParams]);

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

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
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
