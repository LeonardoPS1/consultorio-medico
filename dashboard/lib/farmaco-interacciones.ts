// ============================================================
// Interacciones medicamentosas + mapeo de alergias (atención primaria)
//
// Dataset estático (read-only) de combinaciones de alto riesgo y
// familias de medicamentos para cruce con alergias del paciente.
// Solo contiene combos comunes y clínicamente relevantes en atención
// primaria, citados de fuentes públicas. NO reemplaza el criterio médico.
//
// Fuentes citadas:
//  - FDA Drug Interactions / Labeling Guidelines
//  - BNF (British National Formulary) — interacciones comunes
//  - Medscape Drug Interaction Checker (referencia pública)
//  - UpToDate / Lexicomp (referencias estándar de interacción)
// ============================================================

export type RiesgoInteraccion = 'alta' | 'moderada';

export interface Interaccion {
  id: string;
  /** Nombre normalizado del fármaco A (referencia) */
  a: string;
  /** Nombre normalizado del fármaco B (referencia) */
  b: string;
  riesgo: RiesgoInteraccion;
  efecto: string;
  fuentes: string[];
}

export interface AlertaClinica {
  tipo: 'alergia' | 'interaccion';
  medicamento: string;
  con?: string; // alergia registrada o fármaco coexistente
  riesgo: RiesgoInteraccion;
  mensaje: string;
}

// ------------------------------------------------------------
// Familias para detección de alergias (cruce por sustancia)
// ------------------------------------------------------------
// Mapea términos que el paciente pudo registrar en "alergias"
// (texto libre) hacia familia, y la familia hacia medicamentos que
// disparan la alerta. El matching es por normalización + substring.

const FAMILIAS = {
  penicilinas: {
    etiquetas: ['penicilina', 'amoxicilina', 'ampicilina', 'amoxi-clav', 'amoxicilina-clavulanico', 'clavulanico', 'dicloxacilina', 'aulin', 'augmentin'],
    desencadenantes: ['amoxicilina', 'ampicilina', 'penicilina', 'dicloxacilina', 'cloxacilina', 'piperacilina'],
  },
  cefalosporinas: {
    etiquetas: ['cefalexina', 'cefuroxima', 'ceftriaxona', 'cefadroxilo', 'cefalosporina', 'keflex'],
    desencadenantes: ['cefalexina', 'cefuroxima', 'ceftriaxona', 'cefadroxilo'],
  },
  sulfas: {
    etiquetas: ['sulfametoxazol', 'cotrimoxazol', 'sulfa', 'trimetoprima-sulfa', 'bactrim', 'sulfapiridina'],
    desencadenantes: ['sulfametoxazol', 'cotrimoxazol', 'trimetoprima-sulfa'],
  },
  macrolidos: {
    etiquetas: ['eritromicina', 'azitromicina', 'claritromicina', 'macrolido'],
    desencadenantes: ['eritromicina', 'azitromicina', 'claritromicina'],
  },
  aines: {
    etiquetas: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'ketoprofeno', 'aspirina', 'inexmod', 'cataflam'],
    desencadenantes: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'ketoprofeno', 'aspirina', 'ácido acetilsalicílico', 'acido acetilsalicilico'],
  },
  ieca: {
    etiquetas: ['enalapril', 'enalaprilo', 'lisinopril', 'ramipril', 'captopril', 'perindopril', 'ieca'],
    desencadenantes: ['enalapril', 'lisinopril', 'ramipril', 'captopril', 'perindopril'],
  },
  ara2: {
    etiquetas: ['losartan', 'losartán', 'valsartan', 'valsartán', 'telmisartan', 'irbesartan', 'candesartan'],
    desencadenantes: ['losartan', 'valsartan', 'telmisartan', 'irbesartan', 'candesartan'],
  },
  diureticos_ahorradores: {
    etiquetas: ['espironolactona', 'espironolactona', 'eplerenona', 'diurético ahorrador', 'diuretico ahorrador'],
    desencadenantes: ['espironolactona', 'eplerenona'],
  },
  anticoagulantes: {
    etiquetas: ['warfarina', 'warfarina', 'acenocumarol', 'rivaroxaban', 'apixaban', 'dabigatran', 'anticoagulante'],
    desencadenantes: ['warfarina', 'acenocumarol', 'rivaroxaban', 'apixaban', 'dabigatran'],
  },
  isrs: {
    etiquetas: ['fluoxetina', 'sertralina', 'paroxetina', 'citalopram', 'escitalopram', 'isrs', 'antidepresivo'],
    desencadenantes: ['fluoxetina', 'sertralina', 'paroxetina', 'citalopram', 'escitalopram'],
  },
  triptanes: {
    etiquetas: ['sumatriptan', 'sumatriptán', 'rizatriptan', 'naratriptan', 'triptan'],
    desencadenantes: ['sumatriptan', 'rizatriptan', 'naratriptan'],
  },
  estatinas: {
    etiquetas: ['atorvastatina', 'simvastatina', 'rosuvastatina', 'pravastatina', 'estatina'],
    desencadenantes: ['atorvastatina', 'simvastatina', 'rosuvastatina', 'pravastatina'],
  },
} as const;

// ------------------------------------------------------------
// Interacciones conocidas de alto/moderado riesgo
// (pares normalizados A <-> B, matching bidireccional)
// ------------------------------------------------------------
export const INTERACCIONES: Interaccion[] = [
  {
    id: 'warfarina-aines',
    a: 'warfarina',
    b: 'aines',
    riesgo: 'alta',
    efecto: 'Aumenta el riesgo de sangrado gastrointestinal por sinergia anticoagulante + antiagregación plaquetaria.',
    fuentes: ['FDA', 'BNF', 'Medscape'],
  },
  {
    id: 'acenocumarol-aines',
    a: 'acenocumarol',
    b: 'aines',
    riesgo: 'alta',
    efecto: 'Aumenta el riesgo de sangrado gastrointestinal por sinergia anticoagulante + antiagregación plaquetaria.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'ieca-diuretico-ahorrador',
    a: 'ieca',
    b: 'diureticos_ahorradores',
    riesgo: 'alta',
    efecto: 'Riesgo de hiperpotasemia grave por bloqueo dual del eje renina-angiotensina-aldosterona.',
    fuentes: ['FDA', 'BNF'],
  },
  {
    id: 'ara2-diuretico-ahorrador',
    a: 'ara2',
    b: 'diureticos_ahorradores',
    riesgo: 'moderada',
    efecto: 'Riesgo de hiperpotasemia; monitorear potasio y función renal.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'ieca-aines',
    a: 'ieca',
    b: 'aines',
    riesgo: 'moderada',
    efecto: 'Reduce el efecto antihipertensivo y aumenta el riesgo de daño renal agudo (doble efecto hemodinámico).',
    fuentes: ['FDA', 'BNF'],
  },
  {
    id: 'isrs-triptanes',
    a: 'isrs',
    b: 'triptanes',
    riesgo: 'alta',
    efecto: 'Riesgo de síndrome serotoninérgico (confusión, hiperreflexia, hipertermia). Evitar o vigilar estrechamente.',
    fuentes: ['FDA', 'BNF', 'Medscape'],
  },
  {
    id: 'isrs-aines',
    a: 'isrs',
    b: 'aines',
    riesgo: 'moderada',
    efecto: 'Aumenta el riesgo de sangrado gastrointestinal por serotonina + inhibición plaquetaria.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'estatina-macrolido',
    a: 'estatinas',
    b: 'macrolidos',
    riesgo: 'moderada',
    efecto: 'Inhibe el metabolismo CYP3A4 de la estatina; riesgo de miopatía/rabdomiólisis.',
    fuentes: ['FDA FPISC', 'BNF'],
  },
  {
    id: 'warfarina-macrolido',
    a: 'warfarina',
    b: 'macrolidos',
    riesgo: 'alta',
    efecto: 'Aumenta el efecto anticoagulante; riesgo de sangrado. Vigilar INR.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'acenocumarol-macrolido',
    a: 'acenocumarol',
    b: 'macrolidos',
    riesgo: 'moderada',
    efecto: 'Aumenta el efecto anticoagulante; riesgo de sangrado. Vigilar INR.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'metformina-medio-contraste',
    a: 'metformina',
    b: 'contraste',
    riesgo: 'moderada',
    efecto: 'Riesgo de acidosis láctica si se usa contraste yodado con función renal deteriorada.',
    fuentes: ['FDA'],
  },
  {
    id: 'metronidazol-alcohol',
    a: 'metronidazol',
    b: 'etanol',
    riesgo: 'moderada',
    efecto: 'Reacción tipo disulfiram (náuseas, flushing, taquicardia) al consumir alcohol.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'morfina-benzo',
    a: 'opioide',
    b: 'benzodiazepina',
    riesgo: 'alta',
    efecto: 'Depresión respiratoria y sedación sinérgica; riesgo de sobredosis.',
    fuentes: ['FDA', 'BNF'],
  },
  {
    id: 'tramadol-sertralina',
    a: 'tramadol',
    b: 'isrs',
    riesgo: 'moderada',
    efecto: 'Riesgo de síndrome serotoninérgico y convulsiones.',
    fuentes: ['Medscape'],
  },
  {
    id: 'amiodarona-otros',
    a: 'amiodarona',
    b: 'ieca',
    riesgo: 'moderada',
    efecto: 'Riesgo de bradicardia y prolongación QT al combinar con otros antiarrítmicos.',
    fuentes: ['BNF'],
  },
  {
    id: 'sildenafil-nitratos',
    a: 'sildenafil',
    b: 'nitrato',
    riesgo: 'alta',
    efecto: 'Hipotensión grave potencialmente mortal. Contraindicado.',
    fuentes: ['FDA', 'BNF'],
  },
  {
    id: 'levodopa-antipsicotico',
    a: 'levodopa',
    b: 'antipsicotico',
    riesgo: 'moderada',
    efecto: 'Antagonismo dopaminérgico que reduce la eficacia antiparkinsónica.',
    fuentes: ['BNF'],
  },
  {
    id: 'litio-aines',
    a: 'litio',
    b: 'aines',
    riesgo: 'moderada',
    efecto: 'Aumenta la litiemia al reducir su excreción renal; riesgo de toxicidad.',
    fuentes: ['BNF', 'Medscape'],
  },
  {
    id: 'clopidogrel-omeprazol',
    a: 'clopidogrel',
    b: 'omeprazol',
    riesgo: 'moderada',
    efecto: 'Reduce la activación del clopidogrel y su efecto antiagregante plaquetario.',
    fuentes: ['FDA', 'Medscape'],
  },
  {
    id: 'dabigatran-cetolaire',
    a: 'dabigatran',
    b: 'verapamilo',
    riesgo: 'moderada',
    efecto: 'Aumenta la exposición a dabigatran; riesgo de sangrado.',
    fuentes: ['FDA', 'BNF'],
  },
];

// ------------------------------------------------------------
// Normalización de texto libre de medicamentos/alergias
// ------------------------------------------------------------

/**
 * Normaliza el nombre de un fármaco eliminando unidades, presentaciones
 * y caracteres no alfabéticos para mejorar el matching por alias.
 * @param nombre
 */
export function normalizarFarmaco(nombre: string): string {
  return (nombre ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(
      /\d*(?:[,.]\d+)?\s*(mg|g|ml|mcg|cg|ui|comprimido|comprimidos|tableta|tabletas|capsula|capsulas|ampolla|jarabe|suspension|solucion|crema|unguento|pomada|gotas|sobre|inyeccion|parche)\b/g,
      ' ',
    )
    .replace(/\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina si un término normalizado dispara un medicamento de una familia.
 * @param familia
 * @param termino
 */
function matcheaFamilia(familia: string, termino: string): boolean {
  const def = FAMILIAS[familia as keyof typeof FAMILIAS];
  if (!def || !def.desencadenantes.length) return false;
  return def.desencadenantes.some((d) => termino.includes(normalizarFarmaco(d)));
}

/**
 * Determina si un término normalizado contiene una familia (para alergias).
 * @param familia
 * @param termino
 */
function matcheaEtiquetaFamilia(familia: string, termino: string): boolean {
  const def = FAMILIAS[familia as keyof typeof FAMILIAS];
  if (!def) return false;
  return [...def.etiquetas, ...(def.desencadenantes as readonly string[])].some((e) =>
    termino.includes(normalizarFarmaco(e)),
  );
}

/**
 * Normaliza la lista de familias de las que participa un término.
 * @param termino
 */
function familiasDeTermino(termino: string): string[] {
  return (Object.keys(FAMILIAS) as string[])
    .filter((f) => matcheaFamilia(f, termino))
    .filter((f) => FAMILIAS[f as keyof typeof FAMILIAS].desencadenantes.length > 0);
}

/**
 * Verifica un medicamento nuevo contra:
 *  (a) alergias registradas del paciente (texto libre → familias) y
 *  (b) medicamentos ya vigentes en otras recetas activas.
 * Devuelve alertas de alergia e interacción. Nunca bloquea por sí mismo.
 * @param params
 * @param params.medicamento
 * @param params.alergias
 * @param params.medicamentosActivos
 */
export function verificarReceta(params: {
  medicamento: string;
  alergias?: string | null;
  medicamentosActivos?: string[];
}): AlertaClinica[] {
  const alertas: AlertaClinica[] = [];
  const terminoNuevo = normalizarFarmaco(params.medicamento);
  if (!terminoNuevo) return alertas;

  // --- (a) Alergias del paciente ---
  const alergias = (params.alergias ?? '')
    .split(/[;,.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const alAlergia of alergias) {
    const termAlergia = normalizarFarmaco(alAlergia);
    if (!termAlergia) continue;
    // Cruz directo de sustancia (ej. "amoxicilina" ↔ "Amoxicilina 500mg")
    const cruceDirecto = terminoNuevo.includes(termAlergia) || termAlergia.includes(terminoNuevo);
    // Cruz por familia (ej. alergia "penicilina" ↔ "Amoxicilina")
    const cruceFamilia = (Object.keys(FAMILIAS) as string[])
      .filter((f) => FAMILIAS[f as keyof typeof FAMILIAS].desencadenantes.length > 0)
      .some((f) => matcheaEtiquetaFamilia(f, termAlergia) && matcheaFamilia(f, terminoNuevo));

    if (cruceDirecto || cruceFamilia) {
      alertas.push({
        tipo: 'alergia',
        medicamento: params.medicamento,
        con: alAlergia,
        riesgo: 'alta',
        mensaje: `Alergia registrada: el paciente tiene alergia a "${alAlergia}". Verifique antes de prescribir ${params.medicamento}.`,
      });
    }
  }

  // --- (b) Interacciones con recetas vigentes ---
  for (const activo of params.medicamentosActivos ?? []) {
    const termActivo = normalizarFarmaco(activo);
    if (!termActivo || termActivo === terminoNuevo) continue;
    const familiasNuevo = familiasDeTermino(terminoNuevo);
    const familiasActivo = familiasDeTermino(termActivo);

    for (const inter of INTERACCIONES) {
      const novEsA = familiasNuevo.includes(inter.a) || terminoNuevo.includes(inter.a) || inter.a === terminoNuevo;
      const novEsB = familiasNuevo.includes(inter.b) || terminoNuevo.includes(inter.b) || inter.b === terminoNuevo;
      const actEsB = familiasActivo.includes(inter.b) || termActivo.includes(inter.b) || inter.b === termActivo;
      const actEsA = familiasActivo.includes(inter.a) || termActivo.includes(inter.a) || inter.a === termActivo;
      if ((novEsA && actEsB) || (novEsB && actEsA)) {
        alertas.push({
          tipo: 'interaccion',
          medicamento: params.medicamento,
          con: activo,
          riesgo: inter.riesgo,
          mensaje: `Interacción ${inter.riesgo === 'alta' ? 'de alto riesgo' : 'potencial'} con ${activo}: ${inter.efecto}`,
        });
      }
    }
  }

  return alertas;
}