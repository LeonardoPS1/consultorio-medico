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
// Alerta proactiva (solo modo activo)
// ============================================================

export interface AlertaProactiva {
  id: string;
  tipo: 'turnos_sin_confirmar' | 'mensajes_acumulados' | 'recetas_por_vencer' | 'pacientes_sin_turno' | 'anomalia_horaria';
  titulo: string;
  descripcion: string;
  severidad: 'info' | 'warning' | 'critical';
  href?: string;
}

// ============================================================
// Constantes exportadas
// ============================================================

export function buildModoPrompt(modo: ModoAsistente): string {
  const prompts: Record<ModoAsistente, string> = {
    silencioso:
      [
        '📌 Modo SILENCIOSO',
        '',
        'Reglas:',
        '- Respondé SOLO cuando te hagan una pregunta directa.',
        '- Sé breve: máximo 1-2 párrafos. No agregues información no solicitada.',
        '- NO ofrezcas ayuda adicional ni sugerencias no solicitadas.',
        '- NO analices los datos por iniciativa propia.',
      ].join('\n'),
    sugerente:
      [
        '📌 Modo SUGERENTE — Asistente pasivo con sugerencias contextuales',
        '',
        'Reglas:',
        '- Respondé preguntas de forma clara y concisa usando los datos disponibles.',
        '- Ofrecé información útil cuando sea relevante, pero sin insistir.',
        '- Esperá a que el médico solicite antes de profundizar.',
        '- Las sugerencias aparecen como botones en pantalla — no las repitas en texto.',
        '- No analices datos por iniciativa propia a menos que te lo pidan.',
      ].join('\n'),
    activo:
      [
        '📌 Modo ACTIVO — Asistente proactivo con alertas inteligentes',
        '',
        'REGLAS ESTRICTAS:',
        '',
        '1. ANALIZÁ los datos disponibles ANTES de responder. Identificá patrones, anomalías y oportunidades.',
        '2. ANTICIPATE: si ves algo que el médico debería saber (turnos sin confirmar próximos, recetas por vencer, mensajes acumulados, pacientes que no vienen hace tiempo), DECILO aunque no te lo hayan preguntado.',
        '3. Después de responder sobre un tema específico, ofrecé insights adicionales relacionados.',
        '4. Preguntá activamente si el médico necesita que revises algo más:',
        '   - "¿Querés que revise los turnos sin confirmar de mañana?"',
        '   - "Hay 3 pacientes que no han confirmado turno para esta semana. ¿Te aviso si no confirman?"',
        '   - "Detecté que X paciente tiene 2 inasistencias seguidas. ¿Querés que lo contacte?"',
        '5. Tono profesional y directo. No seas insistente — ofrecé, no exijas.',
        '6. Si el médico dice "no" o "después", no volvás a ofrecer sobre el mismo tema en esa conversación.',
      ].join('\n'),
  };
  return prompts[modo];
}

export const MODOS_ASISTENTE: { id: ModoAsistente; label: string; descripcion: string; descripcionLarga: string; icono: string }[] = [
  {
    id: 'silencioso',
    label: 'Silencioso',
    descripcion: 'Solo responde cuando lo llamás',
    descripcionLarga: 'El asistente está en segundo plano. No muestra sugerencias ni alertas. Solo responde preguntas directas. Ideal cuando querés trabajar sin distracciones.',
    icono: '🔇',
  },
  {
    id: 'sugerente',
    label: 'Sugerente',
    descripcion: 'Sugerencias pasivas en pantalla',
    descripcionLarga: 'Muestra sugerencias contextuales como botones. El asistente responde preguntas pero no se anticipa. Ideal cuando querés ayuda a pedido sin interrupciones.',
    icono: '💡',
  },
  {
    id: 'activo',
    label: 'Activo',
    descripcion: 'Alertas proactivas + análisis automático',
    descripcionLarga: 'El asistente monitorea activamente el consultorio. Detecta anomalías, anticipa necesidades y ofrece insights sin que se los pidas. Ideal para no perderte nada importante.',
    icono: '🔔',
  },
];

export function getAlertasProactivas(datosContextoDB: string | null): AlertaProactiva[] {
  if (!datosContextoDB) return [];

  const alertas: AlertaProactiva[] = [];
  const lines = datosContextoDB.split('\n');

  // Detectar turnos sin confirmar mencionados en los datos
  const pendientes = lines.filter(l => l.includes('pendiente') && !l.includes('confirmado'));
  if (pendientes.length > 0) {
    alertas.push({
      id: 'turnos-sin-confirmar',
      tipo: 'turnos_sin_confirmar',
      titulo: 'Turnos sin confirmar',
      descripcion: `Hay ${pendientes.length} turnos pendientes de confirmación. Revisalos para evitar ausencias.`,
      severidad: 'warning',
      href: '/dashboard/turnos',
    });
  }

  // Detectar mensajes sin responder
  const msgMatch = datosContextoDB.match(/(\d+)\s*mensajes?\s*sin\s*responder/i);
  if (msgMatch && parseInt(msgMatch[1]) > 3) {
    alertas.push({
      id: 'mensajes-acumulados',
      tipo: 'mensajes_acumulados',
      titulo: `${msgMatch[1]} mensajes sin responder`,
      descripcion: `Tenés ${msgMatch[1]} mensajes de pacientes esperando respuesta. Revisá la bandeja de conversaciones.`,
      severidad: parseInt(msgMatch[1]) > 5 ? 'critical' : 'warning',
      href: '/dashboard/conversaciones',
    });
  }

  // Detectar recetas por vencer
  const recetasMatch = datosContextoDB.match(/(\d+)\s*por\s*vencer/i);
  if (recetasMatch && parseInt(recetasMatch[1]) > 0) {
    alertas.push({
      id: 'recetas-por-vencer',
      tipo: 'recetas_por_vencer',
      titulo: `${recetasMatch[1]} receta${parseInt(recetasMatch[1]) !== 1 ? 's' : ''} por vencer`,
      descripcion: `Revisá las recetas próximas a vencer y gestioná las renovaciones necesarias.`,
      severidad: 'info',
      href: '/dashboard/recetas',
    });
  }

  // Detectar si no hay turnos programados (anomalía)
  const noHayTurnos = datosContextoDB.includes('No hay turnos programados');
  if (noHayTurnos) {
    alertas.push({
      id: 'sin-turnos-programados',
      tipo: 'anomalia_horaria',
      titulo: 'Sin turnos en los próximos 7 días',
      descripcion: 'No hay turnos programados para la semana. ¿Querés que revise la agenda o active la lista de espera?',
      severidad: 'warning',
      href: '/dashboard/turnos',
    });
  }

  return alertas;
}
