export interface IntegracionCatalog {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'roadmap';
  workflow: string | null;
  description: string;
  iconKey: string;
}

export const INTEGRACIONES_CATALOG: IntegracionCatalog[] = [
  {
    id: 'twilio',
    name: 'Twilio WhatsApp',
    category: 'Mensajería',
    status: 'connected',
    workflow: 'WF-01',
    description:
      'WhatsApp entrante y saliente con triaje IA. Agente conversacional multi-especialidad para pacientes.',
    iconKey: 'message',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'Calendario',
    status: 'connected',
    workflow: 'WF-08',
    description:
      'Sincronización automática bidireccional de turnos entre AicoreMed y Google Calendar.',
    iconKey: 'calendar',
  },
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    category: 'Pagos',
    status: 'connected',
    workflow: '-',
    description:
      'Cobros y suscripciones en CLP vía MercadoPago Checkout. Webhooks con validación HMAC-SHA256.',
    iconKey: 'credit',
  },
  {
    id: 'ollama',
    name: 'Ollama (Gemma3)',
    category: 'IA Local',
    status: 'connected',
    workflow: 'WF-01/02/04/05/06',
    description:
      'Modelos de lenguaje locales para triaje, clasificación de emails, resúmenes diarios y recetas.',
    iconKey: 'brain',
  },
  {
    id: 'n8n',
    name: 'n8n',
    category: 'Automatización',
    status: 'connected',
    workflow: '16 workflows',
    description:
      'Orquestador principal con 16 workflows de automatización clínica y administrativa.',
    iconKey: 'workflow',
  },
  {
    id: 'evolution',
    name: 'Evolution API',
    category: 'Mensajería',
    status: 'connected',
    workflow: '-',
    description: 'WhatsApp Business API para integración multi-dispositivo con número dedicado.',
    iconKey: 'smartphone',
  },
  {
    id: 'chatwoot',
    name: 'Chatwoot',
    category: 'Soporte',
    status: 'connected',
    workflow: '-',
    description: 'Inbox conversacional multi-canal para atención al paciente y soporte interno.',
    iconKey: 'headset',
  },
  {
    id: 'metabase',
    name: 'Metabase',
    category: 'Analítica',
    status: 'connected',
    workflow: '-',
    description:
      'Dashboards y reportes analíticos sobre datos clínicos y operativos. Acceso read-only.',
    iconKey: 'chart',
  },
  {
    id: 'dentalink',
    name: 'Dentalink',
    category: 'Gestión Clínica',
    status: 'roadmap',
    workflow: null,
    description:
      'Integración con Dentalink para sincronización de fichas clínicas odontológicas. Plan Enterprise.',
    iconKey: 'stethoscope',
  },
  {
    id: 'medilink',
    name: 'Medilink',
    category: 'Gestión Clínica',
    status: 'roadmap',
    workflow: null,
    description:
      'Integración con Medilink para interoperabilidad de datos de pacientes. Plan Enterprise.',
    iconKey: 'link',
  },
  {
    id: 'doctoralia',
    name: 'Doctoralia',
    category: 'Agenda Online',
    status: 'roadmap',
    workflow: null,
    description:
      'Sincronización de agenda con Doctoralia para reservas desde el portal de pacientes. Plan Enterprise.',
    iconKey: 'globe',
  },
  {
    id: 'laboratorios',
    name: 'Laboratorios',
    category: 'Resultados',
    status: 'roadmap',
    workflow: null,
    description:
      'Recepción automática de resultados de laboratorio con notificación al médico y al paciente.',
    iconKey: 'flask',
  },
  {
    id: 'farmacias',
    name: 'Farmacias',
    category: 'Recetas',
    status: 'roadmap',
    workflow: null,
    description:
      'Envío de recetas electrónicas a farmacias conectadas con validación de firma digital QR.',
    iconKey: 'pill',
  },
];
