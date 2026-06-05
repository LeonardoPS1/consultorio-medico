import path from 'path';
import os from 'os';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

let _uploadDir: string | null = null;

/**
 * Retorna el directorio de uploads, intentando usar UPLOAD_DIR env primero,
 * con fallback automático a os.tmpdir() si el directorio configurado no es escribible.
 *
 * En Docker, si no se configura UPLOAD_DIR, la app no tiene permisos para crear
 * /app/.data/uploads (EACCES). Este helper detecta el error y cae a /tmp/.
 *
 * Para persistencia entre redeploys, configurar UPLOAD_DIR en Dokploy apuntando
 * a un volumen montado (ej: /data/dashboard/uploads).
 */
export function getUploadDir(): string {
  if (_uploadDir) return _uploadDir;

  const configured = process.env.UPLOAD_DIR || path.join(process.cwd(), '.data', 'uploads');

  try {
    if (!existsSync(configured)) {
      mkdirSync(configured, { recursive: true });
    }
    // Verificar que sea escribible con un archivo de prueba
    const testFile = path.join(configured, '.write-test');
    writeFileSync(testFile, 'test');
    rmSync(testFile);
    _uploadDir = configured;
    return _uploadDir;
  } catch {
    const fallback = path.join(os.tmpdir(), 'consultorio-uploads');
    if (!existsSync(fallback)) {
      mkdirSync(fallback, { recursive: true });
    }
    console.warn(
      `[Upload] UPLOAD_DIR no escribible ("${configured}"), ` +
        `usando fallback: "${fallback}". ` +
        `Configurá UPLOAD_DIR en Dokploy para persistencia entre redeploys.`
    );
    _uploadDir = fallback;
    return _uploadDir;
  }
}
