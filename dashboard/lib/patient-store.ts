/**
 * Patient extra store - Notas médicas e historial clínico
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const HISTORIAL_FILE = path.join(DATA_DIR, 'historial-medico.json');
const PAC_DETALLE_FILE = path.join(DATA_DIR, 'pacientes-detalle.json');

function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
function read<T>(file: string, fallback: T): T {
  try { ensureDir(); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : fallback; }
  catch { return fallback; }
}
function write<T>(file: string, data: T) { ensureDir(); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8'); }

// ============================================================
// Datos extra de pacientes (notas, alergias, etc.)
// ============================================================

export interface PacienteDetalle {
  pacienteId: string;
  notasMedicas: string;
  alergias: string;
  medicacionCronica: string;
}

export function getPacienteDetalle(pacienteId: string): PacienteDetalle {
  const all = read<Record<string, PacienteDetalle>>(PAC_DETALLE_FILE, {});
  return all[pacienteId] || { pacienteId, notasMedicas: '', alergias: '', medicacionCronica: '' };
}

export function updatePacienteDetalle(pacienteId: string, data: Partial<PacienteDetalle>): PacienteDetalle {
  const all = read<Record<string, PacienteDetalle>>(PAC_DETALLE_FILE, {});
  const current = all[pacienteId] || { pacienteId, notasMedicas: '', alergias: '', medicacionCronica: '' };
  all[pacienteId] = { ...current, ...data };
  write(PAC_DETALLE_FILE, all);
  return all[pacienteId];
}

// ============================================================
// Historial médico
// ============================================================

export interface HistorialEntry {
  id: string;
  pacienteId: string;
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  codigo: string;
  createdAt: string;
}

export function getHistorial(pacienteId: string): HistorialEntry[] {
  const all = read<HistorialEntry[]>(HISTORIAL_FILE, []);
  return all
    .filter(e => e.pacienteId === pacienteId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function addHistorialEntry(pacienteId: string, data: Omit<HistorialEntry, 'id' | 'pacienteId' | 'createdAt'>): HistorialEntry {
  const all = read<HistorialEntry[]>(HISTORIAL_FILE, []);
  const entry: HistorialEntry = {
    id: crypto.randomUUID(),
    pacienteId,
    ...data,
    createdAt: new Date().toISOString(),
  };
  all.push(entry);
  write(HISTORIAL_FILE, all);
  return entry;
}

export function updateHistorialEntry(entryId: string, data: Partial<Omit<HistorialEntry, 'id' | 'pacienteId' | 'createdAt'>>): HistorialEntry | null {
  const all = read<HistorialEntry[]>(HISTORIAL_FILE, []);
  const idx = all.findIndex(e => e.id === entryId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data };
  write(HISTORIAL_FILE, all);
  return all[idx];
}

export function deleteHistorialEntry(entryId: string): boolean {
  const all = read<HistorialEntry[]>(HISTORIAL_FILE, []);
  const filtered = all.filter(e => e.id !== entryId);
  if (filtered.length === all.length) return false;
  write(HISTORIAL_FILE, filtered);
  return true;
}
