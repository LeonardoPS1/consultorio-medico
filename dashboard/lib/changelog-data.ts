/**
 * Historial de versiones / novedades de la app.
 * Se muestra en el modal de novedades cuando hay una actualización disponible.
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '31/05/2026',
    title: 'Notas SOAP, Certificados QR y CIE-10',
    items: [
      'Notas SOAP: evolución clínica estructurada (Subjetivo, Objetivo, Assessment, Plan) con CIE-10 integrado en la ficha del paciente',
      'Certificados médicos con QR: hash SHA-256, verificación pública y descarga en PDF',
      'Buscador CIE-10 con autocomplete integrado en SOAP, historial y certificados',
      'Reportes con datos reales de la base de datos (4 tabs: ingresos, turnos, pacientes, recetas)',
    ],
  },
  {
    version: '1.4.0',
    date: '30/05/2026',
    title: 'Recordatorios y PWA',
    items: [
      'Recordatorios WhatsApp con confirmación/cancelación desde el mensaje',
      'Alerta al médico cuando un paciente cancela',
      'PWA: app instalable con modo offline y actualizaciones automáticas',
      'Diseño responsive: footer, sidebar, header y KPIs adaptados a mobile',
    ],
  },
  {
    version: '1.3.0',
    date: '29/05/2026',
    title: 'Firma Digital QR y Exportación',
    items: [
      'Firma digital QR en recetas con verificación pública',
      'Exportación de pacientes y recetas a Excel y PDF',
      'Múltiples médicos con agendas independientes',
      'n8n Monitoring Dashboard en vivo',
    ],
  },
  {
    version: '1.2.0',
    date: '28/05/2026',
    title: 'Lista de Espera y Cancelaciones',
    items: [
      'Lista de espera inteligente con ofertas automáticas al cancelar turnos',
      'Cumplimiento ARCO: derecho de supresión, anonimización y retención configurable',
      'Panel de administración del sistema con feature toggles',
    ],
  },
  {
    version: '1.1.0',
    date: '27/05/2026',
    title: 'Asistente IA y Suscripciones',
    items: [
      'Onboarding asistido por IA con prompts contextuales',
      'Suscripciones vía MercadoPago con planes Free/Starter/Professional/Premium/Enterprise',
      'Google Calendar Sync bidireccional',
    ],
  },
  {
    version: '1.0.0',
    date: '25/05/2026',
    title: 'Lanzamiento',
    items: [
      'Dashboard con KPIs en tiempo real',
      'Gestión de turnos con agenda y Kanban de atención',
      'Ficha de pacientes con historial clínico',
      'Recetas digitales con envío por WhatsApp',
      'Conversaciones WhatsApp con pacientes',
      'Autenticación 2FA',
    ],
  },
];
