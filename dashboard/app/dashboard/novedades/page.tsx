/**
 * Novedades — Historial completo de versiones
 *
 * Server Component: carga novedades desde API (DB) con fallback a datos estáticos.
 */

export const dynamic = 'force-dynamic';

import { CHANGELOG, type ChangelogEntry } from '@/lib/changelog-data';
import { NovedadesClient } from './novedades-client';

interface ApiNovedad {
  id: string;
  version: string;
  titulo: string;
  items: string[];
  fecha: string;
  tipo: string;
}

function apiToChangelog(n: ApiNovedad): ChangelogEntry {
  const d = new Date(n.fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return {
    version: n.version,
    date: `${dia}/${mes}/${anio}`,
    title: n.titulo,
    items: n.items,
  };
}

export default async function NovedadesPage() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/novedades`, {
      next: { revalidate: 60 }, // ISR cada 60s
    });

    if (res.ok) {
      const json = await res.json();
      const data: ApiNovedad[] = json.data ?? [];

      if (data.length > 0) {
        const changelog = data.map(apiToChangelog);
        return <NovedadesClient changelog={changelog} />;
      }
    }

    // Fallback a datos estáticos si la API no devuelve datos
    return <NovedadesClient changelog={CHANGELOG} />;
  } catch {
    // Fallback si la API falla (ej. DB no disponible)
    return <NovedadesClient changelog={CHANGELOG} />;
  }
}
