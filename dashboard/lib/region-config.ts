import {
  PAISES,
  getMonedaLabel,
  getDocumentoLabel,
  getSistemasSalud,
  getRegiones,
  type RegionEntry,
} from './regions-data';

export type PaisId = 'CL' | 'AR';

export interface RegionConfigDisplay {
  pais: PaisId;
  paisNombre: string;
  moneda: { codigo: string; simbolo: string; decimales: number; formato: string };
  documentoId: { tipo: string; label: string; formato: string };
  sistemaSalud: string[];
  regiones: RegionEntry[];
}

export function getRegionConfig(pais?: string): RegionConfigDisplay {
  const paisValido = (pais === 'AR' ? 'AR' : 'CL') as PaisId;
  const cfg = PAISES[paisValido];
  return {
    pais: paisValido,
    paisNombre: cfg.nombre,
    moneda: cfg.moneda,
    documentoId: cfg.documentoId,
    sistemaSalud: cfg.sistemaSalud,
    regiones: cfg.regiones,
  };
}

export function formatMoneda(cantidad: number, pais?: string): string {
  const cfg = getRegionConfig(pais);
  return `${cfg.moneda.simbolo} ${cantidad.toFixed(cfg.moneda.decimales).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function formatDocumentoId(numero: string, pais?: string): string {
  const cfg = getRegionConfig(pais);
  // Simple formatter — strips non-digits and applies basic format
  const digits = numero.replace(/\D/g, '');
  if (cfg.documentoId.tipo === 'RUT') {
    // RUT: XX.XXX.XXX-X
    if (digits.length <= 1) return digits;
    const body = digits.slice(0, -1);
    const dv = digits.slice(-1);
    const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${bodyFormatted}-${dv}`;
  }
  if (cfg.documentoId.tipo === 'DNI') {
    // DNI: XX.XXX.XXX
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return numero;
}

export { getMonedaLabel, getDocumentoLabel, getSistemasSalud, getRegiones };
export type { RegionEntry };
