/**
 * Organization Store - Perfil de la clínica / consultorio
 *
 * Almacena la configuración visual y datos de la organización.
 * Persiste en JSON para desarrollo, PostgreSQL para producción.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const ORG_FILE = path.join(DATA_DIR, 'organization.json');

export interface OrganizationData {
  nombre: string;
  eslogan: string;
  descripcion: string;
  logoUrl: string;
  avatarUrl: string;
  fondoUrl: string;
  firmaNombre: string;
  colorPrimario: string;
  colorSecundario: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  telefonoSecundario: string;
  whatsapp: string;
  email: string;
  emailSecundario: string;
  sitioWeb: string;
  horarios: { [key: string]: { activo: boolean; inicio: string; fin: string } | undefined };
  redesSociales: { instagram: string; facebook: string; twitter: string };
}

const DEFAULT_ORG: OrganizationData = {
  nombre: 'Consultorio Médico',
  eslogan: 'Tu salud, nuestra prioridad',
  descripcion: 'Centro médico especializado en atención clínica general y de especialidades.',
  logoUrl: '',
  avatarUrl: '',
  fondoUrl: '',
  firmaNombre: 'Dr. García',
  colorPrimario: '#2563eb',
  colorSecundario: '#7c3aed',
  direccion: 'Av. Providencia 1234',
  ciudad: 'Santiago',
  provincia: 'Región Metropolitana',
  telefono: '+56 9 5555 0000',
  telefonoSecundario: '',
  whatsapp: '+56955550000',
  email: 'info@consultorio.cl',
  emailSecundario: '',
  sitioWeb: 'https://consultorio.cl',
  horarios: {
    lunes: { activo: true, inicio: '09:00', fin: '18:00' },
    martes: { activo: true, inicio: '09:00', fin: '18:00' },
    miercoles: { activo: true, inicio: '09:00', fin: '18:00' },
    jueves: { activo: true, inicio: '09:00', fin: '18:00' },
    viernes: { activo: true, inicio: '09:00', fin: '18:00' },
    sabado: { activo: false, inicio: '09:00', fin: '13:00' },
    domingo: { activo: false, inicio: '09:00', fin: '13:00' },
  },
  redesSociales: {
    instagram: '',
    facebook: '',
    twitter: '',
  },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getOrganization(): OrganizationData {
  try {
    ensureDataDir();
    if (!fs.existsSync(ORG_FILE)) {
      fs.writeFileSync(ORG_FILE, JSON.stringify(DEFAULT_ORG, null, 2), 'utf-8');
      return DEFAULT_ORG;
    }
    const raw = fs.readFileSync(ORG_FILE, 'utf-8');
    return { ...DEFAULT_ORG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ORG;
  }
}

export function updateOrganization(data: Partial<OrganizationData>): OrganizationData {
  const current = getOrganization();
  const updated = { ...current, ...data };
  ensureDataDir();
  fs.writeFileSync(ORG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function getOrgStyle(): Record<string, string> {
  const org = getOrganization();
  return {
    '--org-primary': org.colorPrimario,
    '--org-secondary': org.colorSecundario,
  };
}
