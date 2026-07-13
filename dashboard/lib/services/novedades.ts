import { db } from '@/lib/db';
import { novedades, type Novedad, type NewNovedad } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';
import { sql } from 'drizzle-orm';
import { execSync } from 'child_process';
import { CHANGELOG } from '@/lib/changelog-data';

// ─── CRUD ─────────────────────────────────────────────────

export interface CreateNovedadInput {
  version: string;
  titulo: string;
  items: string[];
  fecha?: Date;
  tipo?: 'feature' | 'bugfix' | 'improvement' | 'security';
}

export async function listarNovedades(limit?: number): Promise<Novedad[]> {
  const query = db
    .select()
    .from(novedades)
    .orderBy(desc(novedades.fecha));

  if (limit && limit > 0) {
    query.limit(limit);
  }

  return query;
}

export async function obtenerUltimaNovedad(): Promise<Novedad | null> {
  const [entry] = await db
    .select()
    .from(novedades)
    .orderBy(desc(novedades.fecha))
    .limit(1);

  return entry ?? null;
}

export async function crearNovedad(input: CreateNovedadInput): Promise<Novedad> {
  const [entry] = await db
    .insert(novedades)
    .values({
      version: input.version,
      titulo: input.titulo,
      items: input.items as unknown as typeof novedades.$inferInsert.items,
      fecha: input.fecha ?? new Date(),
      tipo: input.tipo ?? 'feature',
    })
    .returning();

  return entry;
}

export async function eliminarNovedad(id: string): Promise<void> {
  const [entry] = await db
    .delete(novedades)
    .where(eq(novedades.id, id))
    .returning({ id: novedades.id });

  if (!entry) {
    notFound('Novedad no encontrada');
  }
}

// ─── Importar CHANGELOG estático ────────────────────────────

/** Importa versiones del CHANGELOG estático que aún no están en la DB */
export async function importarChangelogEstatico(): Promise<number> {
  const existentes = await db
    .select({ version: novedades.version })
    .from(novedades);

  const versionesExistentes = new Set(existentes.map((e) => e.version));

  let count = 0;
  for (const entry of CHANGELOG) {
    if (versionesExistentes.has(entry.version)) continue;
    const [dia, mes, anio] = entry.date.split('/');
    await crearNovedad({
      version: entry.version,
      titulo: entry.title,
      items: entry.items,
      fecha: new Date(Number(anio), Number(mes) - 1, Number(dia)),
    });
    count++;
  }
  return count;
}

// ─── Auto-generación desde mensajes de commits (producción) ─

function parseCommitMessage(message: string): {
  type: GitCommit['type'];
  text: string;
} {
  const cleaned = message
    .replace(/^feat(\(.*\))?:\s*/i, '')
    .replace(/^fix(\(.*\))?:\s*/i, '')
    .replace(/^perf(\(.*\))?:\s*/i, '')
    .replace(/^refactor(\(.*\))?:\s*/i, '')
    .replace(/^chore(\(.*\))?:\s*/i, '')
    .replace(/^test(\(.*\))?:\s*/i, '')
    .replace(/^docs(\(.*\))?:\s*/i, '')
    .trim();

  const type = parseCommitType(message);

  return {
    type,
    text: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
  };
}

/** Genera entradas de novedades desde un array de mensajes de commits */
export async function generarDesdeCommits(commitMessages: string[]): Promise<Novedad[]> {
  const items: string[] = [];
  let tieneFeatures = false;

  for (const msg of commitMessages) {
    const { type, text } = parseCommitMessage(msg);
    if (type !== 'other' && text) {
      items.push(text);
      if (type === 'feature') tieneFeatures = true;
    }
  }

  if (items.length === 0) return [];

  const ultima = await obtenerUltimaNovedad();
  let nuevaVersion = '1.16.0';
  if (ultima) {
    const [major, minor, patch] = ultima.version.split('.').map(Number);
    if (tieneFeatures) {
      nuevaVersion = `${major}.${(minor ?? 0) + 1}.0`;
    } else {
      nuevaVersion = `${major}.${minor ?? 0}.${(patch ?? 0) + 1}`;
    }
  }

  const entry = await crearNovedad({
    version: nuevaVersion,
    titulo: tieneFeatures ? 'Nuevas funcionalidades' : 'Correcciones y mejoras',
    items,
    tipo: 'feature',
    fecha: new Date(),
  });

  return [entry];
}

// ─── Auto-generación desde git log ─────────────────────────

interface GitCommit {
  hash: string;
  date: string;
  message: string;
  type: 'feature' | 'bugfix' | 'improvement' | 'security' | 'other';
}

/** Parsea un commit message en formato conventional commits */
function parseCommitType(message: string): GitCommit['type'] {
  if (message.startsWith('feat')) return 'feature';
  if (message.startsWith('fix')) return 'bugfix';
  if (message.startsWith('perf')) return 'improvement';
  if (message.startsWith('security') || message.includes('security')) return 'security';
  if (message.startsWith('refactor') || message.startsWith('chore')) return 'improvement';
  return 'other';
}

/** Lee commits desde git log desde un tag o commit hasta HEAD */
function leerCommitsDesde(desdeTag?: string): GitCommit[] {
  const range = desdeTag ? `${desdeTag}..HEAD` : '--since="7 days ago"';
  const format = `--format=%H|%ai|%s`;
  const raw = execSync(`git log ${range} ${format} --no-merges`, {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
  });

  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, ...rest] = line.split('|');
      const date = rest[0];
      const message = rest.slice(1).join('|');
      return {
        hash,
        date,
        message,
        type: parseCommitType(message),
      } as GitCommit;
    });
}

/** Agrupa commits por tipo y genera un título coherente */
function generarTitulo(commits: GitCommit[]): string {
  const features = commits.filter((c) => c.type === 'feature').length;
  const fixes = commits.filter((c) => c.type === 'bugfix').length;
  const improvements = commits.filter((c) => c.type === 'improvement').length;

  const parts: string[] = [];
  if (features > 0) parts.push('Nuevas funcionalidades');
  if (fixes > 0) parts.push('Correcciones');
  if (improvements > 0) parts.push('Mejoras');

  return parts.length > 0 ? parts.join(', ') : 'Actualizaciones del sistema';
}

/** Genera una entrada de novedades desde los commits recientes */
export async function generarDesdeGitLog(desdeTag?: string): Promise<Novedad[]> {
  const commits = leerCommitsDesde(desdeTag);

  if (commits.length === 0) {
    return [];
  }

  // Agrupar commits por tipo
  const items: string[] = [];
  for (const c of commits) {
    if (c.type !== 'other') {
      const msg = c.message
        .replace(/^feat(\(.*\))?:\s*/i, '')
        .replace(/^fix(\(.*\))?:\s*/i, '')
        .replace(/^perf(\(.*\))?:\s*/i, '')
        .replace(/^refactor(\(.*\))?:\s*/i, '')
        .replace(/^chore(\(.*\))?:\s*/i, '');
      items.push(msg.charAt(0).toUpperCase() + msg.slice(1));
    }
  }

  if (items.length === 0) return [];

  // Generar versión auto-incremental
  // feat → minor (ej: 1.15.0 → 1.16.0) | solo fix/improvement → patch (ej: 1.15.0 → 1.15.1)
  const tieneFeatures = commits.some((c) => c.type === 'feature');
  const ultima = await obtenerUltimaNovedad();
  let nuevaVersion = '1.16.0';
  if (ultima) {
    const [major, minor, patch] = ultima.version.split('.').map(Number);
    if (tieneFeatures) {
      nuevaVersion = `${major}.${(minor ?? 0) + 1}.0`;
    } else {
      nuevaVersion = `${major}.${minor ?? 0}.${(patch ?? 0) + 1}`;
    }
  }

  const titulo = generarTitulo(commits);

  const entry = await crearNovedad({
    version: nuevaVersion,
    titulo,
    items,
    tipo: 'feature',
    fecha: new Date(),
  });

  return [entry];
}
