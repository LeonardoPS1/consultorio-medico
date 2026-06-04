import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Readable } from 'stream';

// ============================================================
// Config
// ============================================================

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), '.backups');

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ============================================================
// GET /api/admin/backups — Listar backups
// ============================================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    ensureDir();
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql.gz'))
      .sort()
      .reverse();

    const backups = files.map(f => {
      const filePath = path.join(BACKUP_DIR, f);
      try {
        const stat = fs.statSync(filePath);
        const id = f.replace(/\.sql\.gz$/, '');
        return {
          id,
          filename: f,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          tables: 0,
          rows: 0,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('[Backups] Error al listar:', error);
    return NextResponse.json(
      { error: 'Error al cargar backups', backups: [] },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/admin/backups — Crear backup
// ============================================================

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    ensureDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const id = `backup_${timestamp}`;
    const filename = `${id}.sql.gz`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Obtener todas las tablas públicas
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tableNames: string[] = [];
    for (const row of tablesResult) {
      tableNames.push(row.table_name as string);
    }

    let sqlDump = `-- ============================================================\n`;
    sqlDump += `-- Backup generado: ${new Date().toISOString()}\n`;
    sqlDump += `-- Base de datos: consultorio_medico\n`;
    sqlDump += `-- ============================================================\n\n`;
    sqlDump += `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\n\n`;
    sqlDump += `BEGIN;\n\n`;

    let totalTables = 0;
    let totalRows = 0;

    for (const tableName of tableNames) {
      totalTables++;

      // Obtener estructura de columnas
      const columnsResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `);

      const colNames: string[] = [];
      for (const col of columnsResult) {
        colNames.push(col.column_name as string);
      }

      if (colNames.length === 0) continue;

      // Obtener datos
      try {
        const rows = await db.execute(
          sql.raw(`SELECT * FROM "${tableName}" ORDER BY 1`)
        );

        if (rows.length > 0) {
          const quotedCols = colNames.map(c => `"${c}"`).join(', ');

          for (const row of rows) {
            const values = colNames.map(col => {
              const val = (row as Record<string, unknown>)[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val.toString();
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (val instanceof Date) return `'${val.toISOString()}'`;
              const str = String(val).replace(/'/g, "''");
              return `'${str}'`;
            });
            sqlDump += `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${values.join(', ')});\n`;
            totalRows++;
          }
          sqlDump += '\n';
        }
      } catch (err) {
        console.warn(`[Backup] Error al procesar tabla ${tableName}:`, err);
        sqlDump += `-- ⚠️ Error al respaldar tabla "${tableName}"\n\n`;
      }
    }

    sqlDump += 'COMMIT;\n';

    // Comprimir y escribir archivo
    await new Promise<void>((resolve, reject) => {
      const readStream = Readable.from([sqlDump]);
      const gzip = zlib.createGzip();
      const writeStream = fs.createWriteStream(filepath);

      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    const stats = fs.statSync(filepath);

    return NextResponse.json({
      data: {
        id,
        filename,
        sizeBytes: stats.size,
        createdAt: new Date().toISOString(),
        tables: totalTables,
        rows: totalRows,
      },
      message: 'Backup creado exitosamente',
    });
  } catch (error) {
    console.error('[Backup] Error al crear:', error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? `Error al crear backup: ${error.message}`
          : 'Error al crear backup',
      },
      { status: 500 }
    );
  }
}
