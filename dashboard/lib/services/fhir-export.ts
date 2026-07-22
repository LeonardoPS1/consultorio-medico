import { db } from '@/lib/db';
import { pacientes, turnos, medicos } from '@/drizzle/core';
import { historialMedico, notasSoap, recetas } from '@/drizzle/medical';
import { consentimientos } from '@/drizzle/access';
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';

// ============================================================
// FHIR-lite — Subconjunto simplificado compatible con FHIR R4
// NO es una implementación certificada HL7 FHIR.
// ============================================================

const FHIR_VERSION = '4.0.1';
const DISCLAIMER = 'Formato FHIR-compatible simplificado — no es una implementación certificada HL7 FHIR. Usar como referencia para integración, no como reemplazo de un sistema FHIR completo.';

type FhirIdentifier = {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  system?: string;
  value: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

type FhirCodeableConcept = {
  coding?: FhirCoding[];
  text?: string;
};

type FhirReference = {
  reference: string;
  display?: string;
};

type FhirPeriod = {
  start?: string;
  end?: string;
};

type FhirDosageInstruction = {
  text?: string;
  timing?: {
    code?: FhirCodeableConcept;
  };
  doseAndRate?: {
    doseQuantity?: {
      value?: number;
      unit?: string;
    };
  }[];
};

export type FhirResource =
  | FhirPatient
  | FhirEncounter
  | FhirCondition
  | FhirMedicationRequest;

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: { tag?: { code?: string; display?: string }[] };
  identifier?: FhirIdentifier[];
  name?: { use?: string; family?: string; given?: string[] }[];
  gender?: string;
  birthDate?: string;
  address?: { line?: string[]; city?: string; state?: string; country?: string }[];
  telecom?: { system?: string; value?: string; use?: string }[];
  generalPractitioner?: FhirReference[];
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: string;
  type: FhirCodeableConcept[];
  subject: FhirReference;
  participant?: { individual?: FhirReference }[];
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
  serviceProvider?: FhirReference;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus: FhirCodeableConcept;
  verificationStatus: FhirCodeableConcept;
  code: FhirCodeableConcept;
  subject: FhirReference;
  recorder?: FhirReference;
  recordedDate?: string;
  note?: { text?: string }[];
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  status: string;
  intent: string;
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  requester?: FhirReference;
  dosageInstruction?: FhirDosageInstruction[];
  authoredOn?: string;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection';
  meta: {
    versionId: string;
    lastUpdated: string;
    tag: { code: string; display: string }[];
  };
  disclaimer: string;
  total: number;
  entry: { resource: FhirResource }[];
}

function toFhirDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}

function toFhirIso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString();
}

async function buildPatient(p: typeof pacientes.$inferSelect): Promise<FhirPatient> {
  const fullName = [p.nombre, p.apellido].filter(Boolean).join(' ');
  const identifier: FhirIdentifier[] = [];
  if (p.rut) identifier.push({ use: 'official', system: 'https://www.registrocivil.cl/rut', value: p.rut });
  if (p.dni) identifier.push({ use: 'secondary', system: 'urn:oid:1.2.36.1.2001.1003.0', value: p.dni });

  return {
    resourceType: 'Patient',
    id: p.id,
    meta: { tag: [{ code: 'simplified', display: 'FHIR-lite (no certificado)' }] },
    identifier: identifier.length > 0 ? identifier : undefined,
    name: [{ use: 'official', family: p.apellido || undefined, given: [p.nombre] }],
    ...(p.fechaNacimiento ? { birthDate: toFhirDate(p.fechaNacimiento) } : {}),
    address: p.direccion ? [{ line: [p.direccion], city: p.comuna || undefined, state: p.region || undefined, country: 'CL' }] : undefined,
    telecom: [
      ...(p.telefono ? [{ system: 'phone' as const, value: p.telefono, use: 'mobile' as const }] : []),
      ...(p.email ? [{ system: 'email' as const, value: p.email, use: 'home' as const }] : []),
    ],
  };
}

async function buildEncounters(pacienteId: string): Promise<FhirEncounter[]> {
  const turnosList = await db
    .select()
    .from(turnos)
    .where(and(
      eq(turnos.pacienteId, pacienteId),
      isNull(turnos.deletedAt),
    ))
    .orderBy(desc(turnos.fechaHora));

  const medicoIds = [...new Set(turnosList.map(t => t.medicoId))];
  const medicosMap = new Map<string, string>();
  if (medicoIds.length > 0) {
    const docs = await db
      .select({ id: medicos.id, nombre: medicos.nombre })
      .from(medicos)
      .where(inArray(medicos.id, medicoIds));
    docs.forEach(m => medicosMap.set(m.id, m.nombre));
  }

  return turnosList.map(t => {
    const start = toFhirIso(t.fechaHora);
    const end = t.duracionMinutos && t.fechaHora
      ? toFhirIso(new Date(new Date(t.fechaHora).getTime() + t.duracionMinutos * 60000))
      : undefined;

    return {
      resourceType: 'Encounter',
      id: t.id,
      status: t.estado === 'cancelada' ? 'cancelled' : t.estado === 'atendido' ? 'finished' : 'planned',
      type: [{ coding: [{ system: 'http://snomed.info/sct', code: t.tipoConsulta === 'telemedicina' ? '448337001' : '185463005', display: t.tipoConsulta === 'telemedicina' ? 'Telemedicine consultation' : 'Office visit' }], text: t.tipoConsulta }],
      subject: { reference: `Patient/${pacienteId}` },
      participant: t.medicoId ? [{ individual: { reference: `Practitioner/${t.medicoId}`, display: medicosMap.get(t.medicoId) || undefined } }] : undefined,
      period: start ? { start, ...(end ? { end } : {}) } : undefined,
      reasonCode: t.motivo ? [{ text: t.motivo }] : undefined,
      serviceProvider: t.sucursalId ? { reference: `Organization/${t.sucursalId}` } : undefined,
    };
  });
}

async function buildConditions(pacienteId: string): Promise<FhirCondition[]> {
  // From historial_medico
  const historial = await db
    .select()
    .from(historialMedico)
    .where(and(
      eq(historialMedico.pacienteId, pacienteId),
      isNull(historialMedico.turnoId),  // avoid duplicates with encounters
    ))
    .orderBy(desc(historialMedico.createdAt));

  // From notas_soap (diagnósticos)
  const soap = await db
    .select()
    .from(notasSoap)
    .where(eq(notasSoap.pacienteId, pacienteId))
    .orderBy(desc(notasSoap.createdAt));

  const conditions: FhirCondition[] = [];

  historial.forEach(h => {
    if (h.diagnosticoCodigo || h.diagnosticoDescripcion) {
      conditions.push({
        resourceType: 'Condition',
        id: h.id,
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }] },
        code: {
          coding: h.diagnosticoCodigo ? [{ system: 'http://hl7.org/fhir/sid/icd-10', code: h.diagnosticoCodigo }] : undefined,
          text: h.diagnosticoDescripcion || h.titulo,
        },
        subject: { reference: `Patient/${pacienteId}` },
        recorder: h.medicoId ? { reference: `Practitioner/${h.medicoId}` } : undefined,
        recordedDate: toFhirIso(h.createdAt),
        note: h.descripcion ? [{ text: h.descripcion }] : undefined,
      });
    }
  });

  soap.forEach(s => {
    if (s.cie10Codigo || s.cie10Descripcion) {
      conditions.push({
        resourceType: 'Condition',
        id: `soap-${s.id}`,
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }] },
        code: {
          coding: s.cie10Codigo ? [{ system: 'http://hl7.org/fhir/sid/icd-10', code: s.cie10Codigo }] : undefined,
          text: s.cie10Descripcion || s.assessment || s.plan || '',
        },
        subject: { reference: `Patient/${pacienteId}` },
        recorder: s.medicoId ? { reference: `Practitioner/${s.medicoId}` } : undefined,
        recordedDate: toFhirIso(s.createdAt),
        note: s.assessment ? [{ text: `Assessment: ${s.assessment}` }] : undefined,
      });
    }
  });

  return conditions;
}

async function buildMedicationRequests(pacienteId: string): Promise<FhirMedicationRequest[]> {
  const recetasList = await db
    .select()
    .from(recetas)
    .where(eq(recetas.pacienteId, pacienteId))
    .orderBy(desc(recetas.createdAt));

  return recetasList.map(r => ({
    resourceType: 'MedicationRequest',
    id: r.id,
    status: r.estado === 'emitida' ? 'active' : r.estado === 'anulada' ? 'cancelled' : 'completed',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [{ display: r.medicamento }],
      text: `${r.medicamento} ${r.presentacion || ''}`.trim(),
    },
    subject: { reference: `Patient/${pacienteId}` },
    requester: r.medicoId ? { reference: `Practitioner/${r.medicoId}` } : undefined,
    dosageInstruction: [
      {
        text: [r.dosis, r.frecuencia, r.duracion, r.indicaciones].filter(Boolean).join(' — '),
        timing: r.frecuencia ? { code: { text: r.frecuencia } } : undefined,
      },
    ],
    authoredOn: toFhirIso(r.createdAt),
  }));
}

export interface FhirExportOptions {
  includeEncounterDiagnoses?: boolean;
  maxEntries?: number;
}

export async function verificarConsentimientoExportacion(pacienteId: string): Promise<boolean> {
  const paciente = await db
    .select({ consentimientoEmail: pacientes.consentimientoEmail })
    .from(pacientes)
    .where(eq(pacientes.id, pacienteId))
    .then(r => r[0]);

  if (!paciente) return false;

  // Prefer consentimiento 'datos' firmado
  const consent = await db
    .select({ id: consentimientos.id })
    .from(consentimientos)
    .where(and(
      eq(consentimientos.pacienteId, pacienteId),
      eq(consentimientos.tipo, 'datos'),
      eq(consentimientos.estado, 'firmado'),
    ))
    .then(r => r[0]);

  if (consent) return true;

  // Fallback: consentimientoEmail del paciente
  return paciente.consentimientoEmail === true;
}

export async function exportarFhir(
  pacienteId: string,
  options: FhirExportOptions = {},
): Promise<FhirBundle> {
  const [patient, encounters, conditions, medications] = await Promise.all([
    db.select().from(pacientes).where(eq(pacientes.id, pacienteId)).then(r => r[0]),
    buildEncounters(pacienteId),
    buildConditions(pacienteId),
    buildMedicationRequests(pacienteId),
  ]);

  if (!patient) {
    throw new Error('Paciente no encontrado');
  }

  const patientResource = await buildPatient(patient);

  const allResources: FhirResource[] = [patientResource, ...encounters, ...conditions, ...medications];

  let entries = allResources.map(r => ({ resource: r }));

  if (options.maxEntries && entries.length > options.maxEntries) {
    entries = entries.slice(0, options.maxEntries);
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      tag: [
        { code: 'simplified', display: 'FHIR-lite (no certificado HL7 FHIR)' },
        { code: 'source', display: 'AicoreMed — Sistema de Gestión para Consultorios Médicos' },
      ],
    },
    disclaimer: DISCLAIMER,
    total: entries.length,
    entry: entries,
  };
}
