/**
 * System prompts dinámicos del asistente IA flotante.
 *
 * Cada función recibe contexto de la página actual y retorna
 * el system prompt + los mensajes de historial para Ollama.
 */

import type { ConfigIa } from '@/drizzle/schema';

// ============================================================
// Tipos
// ============================================================

export type ModoAsistente = 'silencioso' | 'sugerente' | 'activo';

export interface Sugerencia {
  id: string;
  texto: string;
  /** Texto que se envía al chat al hacer click */
  prompt: string;
  icono?: string;
  categoria: 'conversaciones' | 'pacientes' | 'turnos' | 'recetas' | 'general';
}

export interface ContextoPagina {
  ruta: string;
  /** Datos extra según la página (id paciente, id conversación, etc.) */
  datos?: Record<string, unknown>;
}

export interface MensajeChat {
  rol: 'user' | 'assistant';
  contenido: string;
  timestamp: number;
}

// ============================================================
// Prompt base del asistente
// ============================================================

const DEFAULT_PROMPT_ASISTENTE =
  'Sos el asistente IA del consultorio médico. Ayudás al médico con información rápida, sugerencias de respuestas para pacientes, resúmenes de historiales y recordatorios de turnos. Respondés en español neutro chileno, de forma concisa y profesional. Si no sabés algo, decilo honestamente. Nunca inventes datos médicos.';

// ============================================================
// Prompts contextuales por página
// ============================================================

const CONTEXT_PROMPTS: Record<string, (datos?: Record<string, unknown>) => string> = {
  '/dashboard/conversaciones': (datos) => {
    const partes = [
      'El médico está viendo la bandeja de conversaciones con pacientes por WhatsApp.',
      'Podés sugerir respuestas a mensajes de pacientes, resumir conversaciones o detectar urgencias.',
    ];
    if (datos?.pacienteNombre) {
      partes.push(`Conversación activa con: ${datos.pacienteNombre}.`);
    }
    if (datos?.ultimoMensaje) {
      partes.push(`Último mensaje del paciente: "${datos.ultimoMensaje}"`);
    }
    return partes.join(' ');
  },
  '/dashboard/pacientes': () =>
    'El médico está en la lista de pacientes. Podés ayudar a buscar información rápida, resumir historiales o sugerir acciones.',
  '/dashboard/pacientes/[id]': (datos) => {
    const partes = ['El médico está viendo la ficha de un paciente.'];
    if (datos?.pacienteNombre) {
      partes.push(`Paciente: ${datos.pacienteNombre}.`);
    }
    partes.push('Podés resumir el historial médico, listar próximos turnos o recetas activas.');
    return partes.join(' ');
  },
  '/dashboard/turnos': () =>
    'El médico está gestionando turnos. Podés mostrar resumen de turnos del día, listar pacientes sin confirmar o advertir sobre bloqueos de agenda.',
  '/dashboard/recetas': () =>
    'El médico está gestionando recetas. Podés identificar recetas por vencer o sugerir renovaciones.',
  '/dashboard/atencion': () =>
    'El médico está en el panel de atención (Kanban). Hay pacientes en espera. Podés indicar siguiente paciente o tiempo promedio de espera.',
  '/dashboard': () =>
    'El médico está en el panel principal. Mostrá resúmenes breves del día si te lo piden.',
  '/dashboard/reportes': () =>
    'El médico está viendo reportes y estadísticas del consultorio.',
  '/dashboard/configuracion': () =>
    'El médico está en la configuración del sistema. Ayudá con dudas sobre opciones disponibles.',
};

// ============================================================
// Obtener prompt completo
// ============================================================

/**
 * Construye el system prompt completo para el asistente,
 * combinando el prompt base con el contexto de la página actual.
 */
export function buildSystemPrompt(
  contexto: ContextoPagina,
  configIa: ConfigIa | null | undefined,
): string {
  const basePrompt = configIa?.promptAsistente || DEFAULT_PROMPT_ASISTENTE;

  // Buscar prompt contextual (match exacto o por patrón)
  let contextPrompt = '';
  if (CONTEXT_PROMPTS[contexto.ruta]) {
    contextPrompt = CONTEXT_PROMPTS[contexto.ruta](contexto.datos);
  } else {
    // Match por patrón (ej: /dashboard/pacientes/xxx)
    const rutaBase = contexto.ruta.replace(/\/[\w-]+$/, '/[id]');
    if (CONTEXT_PROMPTS[rutaBase]) {
      contextPrompt = CONTEXT_PROMPTS[rutaBase](contexto.datos);
    }
  }

  const disclaimer =
    '\n\nImportante: Sos un asistente de IA. La información que das es orientativa y no reemplaza el criterio médico. Siempre sugerí al médico verificar los datos antes de actuar.';

  return contextPrompt ? `${basePrompt}\n\nContexto: ${contextPrompt}${disclaimer}` : basePrompt + disclaimer;
}

// ============================================================
// Sugerencias por página
// ============================================================

const SUGERENCIAS_POR_PAGINA: Record<string, Sugerencia[]> = {
  '/dashboard/conversaciones': [
    {
      id: 'sugerir-respuesta',
      texto: 'Sugerir respuesta',
      prompt: 'Sugerime una respuesta profesional y empática para el último mensaje del paciente en esta conversación.',
      icono: '💬',
      categoria: 'conversaciones',
    },
    {
      id: 'resumir-conversacion',
      texto: 'Resumir conversación',
      prompt: 'Resumí brevemente los puntos clave de esta conversación con el paciente.',
      icono: '📋',
      categoria: 'conversaciones',
    },
    {
      id: 'detectar-urgencia',
      texto: 'Detectar urgencia',
      prompt: 'Analizá los mensajes de esta conversación y determiná si hay signos de urgencia médica que requieran atención inmediata.',
      icono: '🚨',
      categoria: 'conversaciones',
    },
  ],
  '/dashboard/pacientes': [
    {
      id: 'buscar-info',
      texto: 'Buscar información',
      prompt: '¿Qué información necesitás buscar? Puedo ayudarte a encontrar datos de pacientes.',
      icono: '🔍',
      categoria: 'pacientes',
    },
  ],
  '/dashboard/pacientes/[id]': [
    {
      id: 'resumir-historial',
      texto: 'Resumir historial',
      prompt: 'Resumí el historial médico de este paciente de forma concisa, destacando las condiciones más relevantes.',
      icono: '📋',
      categoria: 'pacientes',
    },
    {
      id: 'proximos-turnos-paciente',
      texto: 'Próximos turnos',
      prompt: 'Listá los próximos turnos de este paciente, indicando fecha, hora y médico.',
      icono: '📅',
      categoria: 'pacientes',
    },
    {
      id: 'recetas-activas',
      texto: 'Recetas activas',
      prompt: 'Listá las recetas activas de este paciente con medicamentos y fechas.',
      icono: '💊',
      categoria: 'pacientes',
    },
  ],
  '/dashboard/turnos': [
    {
      id: 'turnos-hoy',
      texto: 'Turnos de hoy',
      prompt: 'Dame un resumen de los turnos de hoy: cuántos hay, cuántos confirmados, cuántos cancelados y si hay espacios libres.',
      icono: '📅',
      categoria: 'turnos',
    },
    {
      id: 'sin-confirmar',
      texto: 'Sin confirmar',
      prompt: 'Listá los turnos que aún no han sido confirmados por los pacientes.',
      icono: '❓',
      categoria: 'turnos',
    },
  ],
  '/dashboard/recetas': [
    {
      id: 'recetas-por-vencer',
      texto: 'Por vencer',
      prompt: 'Identificá las recetas que están próximas a vencer o que necesitan renovación.',
      icono: '⏰',
      categoria: 'recetas',
    },
  ],
  '/dashboard/atencion': [
    {
      id: 'siguiente-paciente',
      texto: 'Siguiente paciente',
      prompt: '¿Quién es el siguiente paciente en la lista de espera?',
      icono: '👉',
      categoria: 'turnos',
    },
  ],
  '/dashboard': [
    {
      id: 'resumen-dia',
      texto: 'Resumen del día',
      prompt: 'Dame un resumen breve de la actividad del día: turnos, pacientes nuevos y mensajes pendientes.',
      icono: '📊',
      categoria: 'general',
    },
  ],
};

/**
 * Retorna las sugerencias disponibles para la ruta actual,
 * filtradas por las categorías habilitadas en la config.
 */
export function getSugerencias(
  ruta: string,
  categoriasHabilitadas: ConfigIa['sugerenciasHabilitadas'],
): Sugerencia[] {
  let sugerencias = SUGERENCIAS_POR_PAGINA[ruta] || [];

  // Match por patrón si no hay match exacto
  if (sugerencias.length === 0) {
    const rutaBase = ruta.replace(/\/[\w-]+$/, '/[id]');
    sugerencias = SUGERENCIAS_POR_PAGINA[rutaBase] || [];
  }

  // Filtrar por categorías habilitadas
  const hab = categoriasHabilitadas || {};
  return sugerencias.filter((s) => {
    if (s.categoria === 'general') return true;
    return hab[s.categoria as keyof typeof hab] !== false;
  });
}

// ============================================================
// Constantes exportadas
// ============================================================

export function buildModoPrompt(modo: ModoAsistente): string {
  const prompts: Record<ModoAsistente, string> = {
    silencioso:
      '📌 Modo SILENCIOSO: Respondé solo cuando te pregunten directamente. Sé breve (máximo 1-2 párrafos). No ofrezcas ayuda adicional ni sugerencias no solicitadas.',
    sugerente:
      '📌 Modo SUGERENTE: Respondé de forma clara y concisa con los datos disponibles. Ofrecé información útil de forma natural.',
    activo:
      '📌 Modo ACTIVO: Respondé de forma completa y ofrecete proactivamente a ayudar. Después de responder, preguntá si el médico necesita revisar algo más (turnos, pacientes, recetas) o analizar algo en detalle.',
  };
  return prompts[modo];
}

export const MODOS_ASISTENTE: { id: ModoAsistente; label: string; descripcion: string; icono: string }[] = [
  {
    id: 'silencioso',
    label: 'Silencioso',
    descripcion: 'Solo responde cuando lo llamás',
    icono: '🔇',
  },
  {
    id: 'sugerente',
    label: 'Sugerente',
    descripcion: 'Muestra sugerencias relevantes',
    icono: '💡',
  },
  {
    id: 'activo',
    label: 'Activo',
    descripcion: 'Sugerencias + alertas proactivas',
    icono: '🔔',
  },
];
