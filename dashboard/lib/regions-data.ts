export interface RegionEntry {
  id: string;
  nombre: string;
}

export interface PaisConfig {
  codigo: string;
  nombre: string;
  moneda: { codigo: string; simbolo: string; decimales: number; formato: string };
  documentoId: { tipo: string; label: string; formato: string };
  sistemaSalud: string[];
  regiones: RegionEntry[];
}

export const PAISES: Record<string, PaisConfig> = {
  CL: {
    codigo: 'CL',
    nombre: 'Chile',
    moneda: { codigo: 'CLP', simbolo: '$', decimales: 0, formato: 'CLP' },
    documentoId: { tipo: 'RUT', label: 'RUT', formato: 'XX.XXX.XXX-X' },
    sistemaSalud: ['Fonasa', 'Isapre', 'Particular'],
    regiones: [
      { id: 'RM', nombre: 'Región Metropolitana' },
      { id: 'I', nombre: 'Región de Tarapacá' },
      { id: 'II', nombre: 'Región de Antofagasta' },
      { id: 'III', nombre: 'Región de Atacama' },
      { id: 'IV', nombre: 'Región de Coquimbo' },
      { id: 'V', nombre: 'Región de Valparaíso' },
      { id: 'VI', nombre: "Región del Libertador Gral. Bernardo O'Higgins" },
      { id: 'VII', nombre: 'Región del Maule' },
      { id: 'VIII', nombre: 'Región del Biobío' },
      { id: 'IX', nombre: 'Región de La Araucanía' },
      { id: 'X', nombre: 'Región de Los Lagos' },
      { id: 'XI', nombre: 'Región Aysén del Gral. Carlos Ibáñez del Campo' },
      { id: 'XII', nombre: 'Región de Magallanes y de la Antártica Chilena' },
      { id: 'XIV', nombre: 'Región de Los Ríos' },
      { id: 'XV', nombre: 'Región de Arica y Parinacota' },
      { id: 'XVI', nombre: 'Región de Ñuble' },
    ],
  },
  AR: {
    codigo: 'AR',
    nombre: 'Argentina',
    moneda: { codigo: 'ARS', simbolo: '$', decimales: 2, formato: 'ARS' },
    documentoId: { tipo: 'DNI', label: 'DNI', formato: 'XX.XXX.XXX' },
    sistemaSalud: ['Obra Social', 'Prepaga', 'PAMI', 'Particular'],
    regiones: [
      { id: 'CABA', nombre: 'Ciudad Autónoma de Buenos Aires' },
      { id: 'BA', nombre: 'Buenos Aires' },
      { id: 'CAT', nombre: 'Catamarca' },
      { id: 'CHA', nombre: 'Chaco' },
      { id: 'CHU', nombre: 'Chubut' },
      { id: 'CBA', nombre: 'Córdoba' },
      { id: 'CTES', nombre: 'Corrientes' },
      { id: 'ER', nombre: 'Entre Ríos' },
      { id: 'FOR', nombre: 'Formosa' },
      { id: 'JUJ', nombre: 'Jujuy' },
      { id: 'LP', nombre: 'La Pampa' },
      { id: 'LR', nombre: 'La Rioja' },
      { id: 'MZA', nombre: 'Mendoza' },
      { id: 'MIS', nombre: 'Misiones' },
      { id: 'NQN', nombre: 'Neuquén' },
      { id: 'RN', nombre: 'Río Negro' },
      { id: 'SAL', nombre: 'Salta' },
      { id: 'SJ', nombre: 'San Juan' },
      { id: 'SL', nombre: 'San Luis' },
      { id: 'SC', nombre: 'Santa Cruz' },
      { id: 'SF', nombre: 'Santa Fe' },
      { id: 'SDE', nombre: 'Santiago del Estero' },
      { id: 'TDF', nombre: 'Tierra del Fuego' },
      { id: 'TUC', nombre: 'Tucumán' },
    ],
  },
};

export function getMonedaLabel(pais: string): string {
  return PAISES[pais]?.moneda?.codigo || 'CLP';
}

export function getDocumentoLabel(pais: string): string {
  return PAISES[pais]?.documentoId?.label || 'RUT';
}

export function getSistemasSalud(pais: string): string[] {
  return PAISES[pais]?.sistemaSalud || ['Fonasa', 'Isapre'];
}

export function getRegiones(pais: string): RegionEntry[] {
  return PAISES[pais]?.regiones || PAISES.CL.regiones;
}
