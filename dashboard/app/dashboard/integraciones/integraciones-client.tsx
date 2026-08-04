'use client';

import {
  MessageCircle,
  Calendar,
  CreditCard,
  Brain,
  Workflow,
  Smartphone,
  Headphones,
  BarChart3,
  Stethoscope,
  Link,
  Globe,
  FlaskConical,
  Pill,
  PlugZap,
  Webhook,
  Radio,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import IntegracionesDashboard from '@/components/configuracion/integraciones-dashboard';
import { WebhooksTab } from '@/components/configuracion/webhooks-tab';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { IntegracionCatalog } from '@/lib/integrations-catalog';
import { INTEGRACIONES_CATALOG } from '@/lib/integrations-catalog';

const ICON_MAP: Record<string, React.ElementType> = {
  message: MessageCircle,
  calendar: Calendar,
  credit: CreditCard,
  brain: Brain,
  workflow: Workflow,
  smartphone: Smartphone,
  headset: Headphones,
  chart: BarChart3,
  stethoscope: Stethoscope,
  link: Link,
  globe: Globe,
  flask: FlaskConical,
  pill: Pill,
};

interface IntegracionesClientProps {
  isAdmin: boolean;
}

function IntegracionCard({ item }: { item: IntegracionCatalog }) {
  const Icon = ICON_MAP[item.iconKey] || Globe;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <CardDescription className="text-xs">{item.category}</CardDescription>
            </div>
          </div>
          <Badge
            variant={item.status === 'connected' ? 'default' : 'secondary'}
            className={
              item.status === 'connected'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
            }
          >
            {item.status === 'connected' ? 'Conectado' : 'Próximamente'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        {item.workflow && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Workflow className="h-3 w-3" />
            <span>{item.workflow}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CatalogoTab() {
  const connected = INTEGRACIONES_CATALOG.filter((i) => i.status === 'connected');
  const roadmap = INTEGRACIONES_CATALOG.filter((i) => i.status === 'roadmap');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-muted-foreground">{connected.length} conectadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-sm text-muted-foreground">{roadmap.length} próximamente</span>
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Conectadas
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connected.map((item) => (
            <IntegracionCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {roadmap.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Próximamente
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roadmap.map((item) => (
              <IntegracionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.isAdmin
 */
export function IntegracionesClient({ isAdmin }: IntegracionesClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="skeleton h-8 w-48" />
        </div>
      }
    >
      <IntegracionesContent isAdmin={isAdmin} />
    </Suspense>
  );
}

function IntegracionesContent({ isAdmin }: IntegracionesClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams?.get('tab') || 'catalogo';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.replace(`/dashboard/integraciones?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground">
          Conectá AicoreMed con servicios externos, gestioná webhooks y controlá el estado de tus
          conexiones.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="overflow-x-auto flex-nowrap w-full gap-1">
          <TabsTrigger value="catalogo" className="px-2 sm:px-3 shrink-0">
            <PlugZap className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="px-2 sm:px-3 shrink-0">
            <Webhook className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Webhooks salientes</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="conexiones" className="px-2 sm:px-3 shrink-0">
              <Radio className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Conexiones</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="catalogo" className="mt-6">
          <CatalogoTab />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhooksTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="conexiones" className="mt-6">
            <IntegracionesDashboard isAdmin={isAdmin} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
