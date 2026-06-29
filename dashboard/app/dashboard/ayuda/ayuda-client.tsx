'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Rocket,
  Calendar,
  Users,
  Activity,
  Syringe,
  MessageSquare,
  BarChart3,
  Star,
  Settings,
  CreditCard,
  ExternalLink as ExternalLinkIcon,
  Search,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Sparkles,
  Command,
  PanelRight,
  Upload,
  Gauge,
} from 'lucide-react';
import type { AyudaSeccion } from '@/lib/ayuda-content';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

interface AyudaClientProps {
  sections: AyudaSeccion[];
  iconMap: Record<string, string>;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Rocket,
  Calendar,
  Users,
  Activity,
  Syringe,
  MessageSquare,
  BarChart3,
  Star,
  Settings,
  CreditCard,
  ExternalLink: ExternalLinkIcon,
  Sparkles,
  Command,
  PanelRight,
  Upload,
  Gauge,
};

export function AyudaClient({ sections, iconMap: _iconMap }: AyudaClientProps) {
  const [busqueda, setBusqueda] = useState('');
  const [seccionActiva, setSeccionActiva] = useState<string | null>(null);

  const seccionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return sections;
    const q = busqueda.toLowerCase();
    return sections.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.descripcion.toLowerCase().includes(q) ||
        s.pasos?.some(
          (p) => p.titulo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q),
        ) ||
        s.preguntas?.some(
          (p) => p.pregunta.toLowerCase().includes(q) || p.respuesta.toLowerCase().includes(q),
        ),
    );
  }, [busqueda, sections]);

  const seccionActual = useMemo(() => {
    if (!seccionActiva) return null;
    return sections.find((s) => s.id === seccionActiva) || null;
  }, [seccionActiva, sections]);

  return (
    <div className="space-y-6 animate-in max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Centro de Ayuda"
        description="Guía completa de uso del sistema — instrucciones paso a paso, tips y preguntas frecuentes"
      />

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscá en la ayuda..."
          className="pl-9"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setSeccionActiva(null);
          }}
        />
      </div>

      {seccionActual ? (
        /* ─── Vista detalle de sección ─────────────────────── */
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSeccionActiva(null)}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Volver al índice
          </Button>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">{seccionActual.titulo}</h2>
            <p className="text-muted-foreground mt-1">{seccionActual.descripcion}</p>
          </div>

          {/* Pasos */}
          {seccionActual.pasos && seccionActual.pasos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Instrucciones</h3>
              {seccionActual.pasos.map((paso, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {i + 1}
                      </span>
                      {paso.titulo}
                    </CardTitle>
                    <CardDescription>{paso.descripcion}</CardDescription>
                  </CardHeader>
                  {paso.tips && paso.tips.length > 0 && (
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 p-3">
                        <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                            Tips
                          </p>
                          <ul className="space-y-1">
                            {paso.tips.map((tip, j) => (
                              <li
                                key={j}
                                className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-1.5"
                              >
                                <span className="text-amber-500 mt-0.5">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {paso.enlace && (
                        <Link
                          href={paso.enlace.href}
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          <ExternalLinkIcon className="h-3.5 w-3.5" />
                          {paso.enlace.label}
                        </Link>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Preguntas frecuentes */}
          {seccionActual.preguntas && seccionActual.preguntas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Preguntas frecuentes</h3>
              <div className="space-y-2">
                {seccionActual.preguntas.map((pq, i) => (
                  <details
                    key={i}
                    className="group rounded-lg border border-border p-3 transition-colors hover:border-muted-foreground/30"
                  >
                    <summary className="flex items-center justify-between cursor-pointer text-sm font-medium list-none">
                      {pq.pregunta}
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90 text-muted-foreground" />
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground border-t border-border pt-2">
                      {pq.respuesta}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── Índice de secciones ──────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seccionesFiltradas.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No se encontraron resultados para &ldquo;{busqueda}&rdquo;
            </div>
          ) : (
            seccionesFiltradas.map((seccion) => {
              const Icon = ICON_MAP[seccion.icono] || BookOpen;
              return (
                <button
                  key={seccion.id}
                  onClick={() => setSeccionActiva(seccion.id)}
                  className="text-left group"
                >
                  <Card className="h-full transition-all duration-200 hover:border-primary/30 hover:shadow-sm cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base">{seccion.titulo}</CardTitle>
                          <CardDescription className="text-sm mt-0.5 line-clamp-2">
                            {seccion.descripcion}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1.5">
                        {seccion.pasos && (
                          <Badge variant="secondary" className="text-[10px]">
                            {seccion.pasos.length} pasos
                          </Badge>
                        )}
                        {seccion.preguntas && (
                          <Badge variant="outline" className="text-[10px]">
                            {seccion.preguntas.length} FAQ
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
