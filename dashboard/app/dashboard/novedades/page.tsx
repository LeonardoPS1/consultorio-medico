import type { ChangelogEntry } from '@/lib/changelog-data';
import { CHANGELOG } from '@/lib/changelog-data';
import { listarNovedades, importarChangelogEstatico } from '@/lib/services/novedades';
import type { Novedad } from '@/drizzle/schema';
import { NovedadesClient } from './novedades-client';

export const dynamic = 'force-dynamic';

function novedadToChangelog(n: Novedad): ChangelogEntry & { tipo: string } {
  const d = new Date(n.fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  const items = Array.isArray(n.items) ? (n.items as string[]) : [];
  return {
    version: n.version,
    date: `${dia}/${mes}/${anio}`,
    title: n.titulo,
    items,
    tipo: n.tipo,
  };
}

export default async function NovedadesPage() {
  try {
    await importarChangelogEstatico();

    let entries = await listarNovedades();

    if (entries.length > 0) {
      const changelog = entries.map(novedadToChangelog);
      return <NovedadesClient changelog={changelog} />;
    }

    return <NovedadesClient changelog={CHANGELOG.map((e) => ({ ...e, tipo: 'feature' as const }))} />;
  } catch {
    return <NovedadesClient changelog={CHANGELOG.map((e) => ({ ...e, tipo: 'feature' as const }))} />;
  }
}
