/** Types for the Patient Panel (lateral sheet) */

/** Lightweight patient for search results + panel header */
export interface PatientSummaryLite {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  alergias: string | null;
  medicacionCronica: string | null;
  tags: string[];
  totalTurnos: number;
  totalRecetas: number;
  totalHistorial: number;
  totalNotasSoap: number;
}

/** Last SOAP note for quick preview */
export interface LastSoapNote {
  id: string;
  subjetivo: string | null;
  objetivo: string | null;
  assessment: string | null;
  plan: string | null;
  cie10Codigo: string | null;
  cie10Descripcion: string | null;
  createdAt: string;
  medicoNombre: string | null;
}

/** Active prescription for panel display */
export interface ActiveReceta {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
}

/** Upcoming appointment for panel display */
export interface UpcomingTurno {
  id: string;
  fechaHora: string;
  estado: string;
  tipoConsulta: string | null;
  motivo: string | null;
  medicoNombre: string | null;
  duracionMinutos: number | null;
}

/** Full panel data (lite summary + detail fetch) */
export interface PatientPanelData {
  patient: PatientSummaryLite;
  lastSoap: LastSoapNote | null;
  activeRecetas: ActiveReceta[];
  upcomingTurnos: UpcomingTurno[];
  loadedAt: number; // timestamp for staleness check
}
