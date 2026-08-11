import type { Novedad } from '@/drizzle/schema';
import type { ChangelogEntry } from '@/lib/changelog-data';
import { CHANGELOG } from '@/lib/changelog-data';
import { listarNovedades, importarChangelogEstatico } from '@/lib/services/novedades';
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

/**
 * Página de novedades del sistema.
 */
export default async function NovedadesPage() {
  let itemsChangelog: (ChangelogEntry & { tipo: string })[];

  try {
    await importarChangelogEstatico();

    const entries = await listarNovedades();

    itemsChangelog =
      entries.length > 0
        ? entries.map(novedadToChangelog)
        : CHANGELOG.map((e) => ({ ...e, tipo: 'feature' as const }));
  } catch {
    itemsChangelog = CHANGELOG.map((e) => ({ ...e, tipo: 'feature' as const }));
  }

  return <NovedadesClient changelog={itemsChangelog} />;
}
