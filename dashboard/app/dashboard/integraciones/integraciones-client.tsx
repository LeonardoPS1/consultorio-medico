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
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

/**
 *
 */
export function IntegracionesClient() {
  const connected = INTEGRACIONES_CATALOG.filter((i) => i.status === 'connected');
  const roadmap = INTEGRACIONES_CATALOG.filter((i) => i.status === 'roadmap');

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground">
          Conectá AicoreMed con servicios externos, APIs y sistemas de terceros.
        </p>
      </div>

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

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4" />
        Gestioná tus API keys y webhooks en{' '}
        <a href="/dashboard/configuracion?tab=integraciones" className="font-medium underline">
          Configuración &rarr; Integraciones
        </a>
      </div>
    </div>
  );
}
