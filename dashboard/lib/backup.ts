/**
 * Sistema de Backup Encriptado
 *
 * Genera backups de la base de datos como script SQL,
 * los encripta con AES-256-GCM y los almacena en disco.
 */

import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

const BACKUP_DIR = path.join(process.cwd(), '.data', 'backups');

export interface BackupInfo {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  tables: number;
  rows: number;
}

/**
 * Obtiene la lista de backups almacenados
 */
export function listBackups(): BackupInfo[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.enc'))
      .sort()
      .reverse();

    return files.map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      const metaPath = path.join(BACKUP_DIR, f.replace('.enc', '.meta.json'));
      let meta = { tables: 0, rows: 0 };
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch { /* ignora */ }

      return {
        id: f.replace('.sql.enc', ''),
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
        tables: meta.tables,
        rows: meta.rows,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Genera un backup completo de la base de datos
 */
export async function createBackup(): Promise<BackupInfo> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupId = `backup_${timestamp}`;

  // Obtener lista de tablas públicas
  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);

  const tableNames = tables.map((t: any) => t.table_name);
  let sqlOutput = `-- Backup generado: ${new Date().toISOString()}\n`;
  sqlOutput += `-- Base de datos: consultorio_medico\n\n`;
  sqlOutput += `BEGIN;\n\n`;

  let totalRows = 0;

  for (const tableName of tableNames) {
    try {
      // Obtener columnas
      const columns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `);

      const colNames = columns.map((c: any) => c.column_name);

      // Obtener datos
      const rowsResult = await db.execute(sql.raw(
        `SELECT * FROM "${tableName}" ORDER BY 1`
      ));

      const rows = rowsResult as any[];
      if (rows.length === 0) continue;

      totalRows += rows.length;

      sqlOutput += `-- Tabla: ${tableName} (${rows.length} registros)\n`;

      // Generar INSERTs
      for (const row of rows) {
        const values = colNames.map(col => {
          const val = (row as any)[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          // Escapar comillas simples para strings
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        sqlOutput += `INSERT INTO "${tableName}" ("${colNames.join('", "')}") VALUES (${values.join(', ')});\n`;
      }

      sqlOutput += '\n';
    } catch (err) {
      sqlOutput += `-- ERROR en tabla ${tableName}: ${err}\n\n`;
    }
  }

  sqlOutput += 'COMMIT;\n';

  // Encriptar
  const encrypted = encrypt(sqlOutput);
  const filename = `${backupId}.sql.enc`;
  fs.writeFileSync(path.join(BACKUP_DIR, filename), encrypted, 'utf-8');

  // Guardar metadata
  const meta = { tables: tableNames.length, rows: totalRows };
  fs.writeFileSync(
    path.join(BACKUP_DIR, `${backupId}.meta.json`),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );

  const stat = fs.statSync(path.join(BACKUP_DIR, filename));

  return {
    id: backupId,
    filename,
    sizeBytes: stat.size,
    createdAt: stat.birthtime.toISOString(),
    tables: meta.tables,
    rows: meta.rows,
  };
}

/**
 * Lee y desencripta un backup
 */
export function readBackup(backupId: string): string | null {
  const filename = `${backupId}.sql.enc`;
  const filePath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filePath)) return null;

  const { decrypt } = require('@/lib/encryption');
  const encrypted = fs.readFileSync(filePath, 'utf-8');
  return decrypt(encrypted);
}

/**
 * Elimina un backup
 */
export function deleteBackup(backupId: string): boolean {
  const basePath = path.join(BACKUP_DIR, backupId);
  let deleted = false;
  for (const ext of ['.sql.enc', '.meta.json']) {
    const p = basePath + ext;
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      deleted = true;
    }
  }
  return deleted;
}
