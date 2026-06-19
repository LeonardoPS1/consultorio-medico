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
    version: '1.10.0',
    date: '19/06/2026',
    title: 'Scoring de Pacientes, Seguridad y Conexión IA Real',
    items: [
      'Scoring automático de pacientes (0-100): algoritmo ponderado con no-shows x40, cancelaciones x25, confirmaciones x20, recordatorios x10, asistencia x5',
      'Badge de riesgo visual en lista de pacientes: verde (<40), amarillo (40-69), rojo (≥70)',
      'Bloqueo automático a lista negra: pacientes con score ≥80 y 2+ inasistencias',
      'Alertas de score alto integradas en panel lateral para médicos activos',
      'CSP Hardening: unsafe-eval solo en desarrollo, worker-src y media-src añadidos',
      'Cookie Consent: banner con 3 categorías (esencial/funcional/analytics) y hooks tipados',
      'Rate Limiting específico: register/forgot-password/reset-password/portal-auth (3-5 req/min)',
      'Logging seguro: webhooks Twilio y MercadoPago migrados a safeLog/safeWarn/safeError',
      'Onboarding IA: conexión real con Ollama Gemma3, health check previo, timeouts individuales (15s/intento, 45s global), keep_alive para modelo en memoria, fallback inmediato + loading sutil',
    ],
  },
  {
    version: '1.9.0',
    date: '14/06/2026',
    title: 'Telemedicina en Vivo con LiveKit',
    items: [
      'Telemedicina: videoconsultas en vivo con pacientes a través de LiveKit (self-hosted, sin costos por minuto)',
      'Nueva modalidad "Virtual" al crear turnos: el sistema genera automáticamente una sala de video y envía el link al paciente por WhatsApp',
      'Botón "Video" en el Kanban de Atención para iniciar videollamadas directo desde el panel',
      'Portal del Paciente: botón "Ingresar" para pacientes con turnos virtuales (link con token único)',
      'Feature gating: la telemedicina se habilita automáticamente en el plan Professional o superior',
      'Videollamada segura: tokens JWT temporales, sala privada médico-paciente, sin grabación',
      'Infraestructura: LiveKit server self-hosted en Dokploy con Redis, TURN, Ingress y HTTPS con Let\'s Encrypt',
      'Acceso multiplataforma: funciona en cualquier navegador moderno sin descargar apps',
      'Lista Negra de pacientes: gestioná restricciones de acceso al consultorio con registro de incidentes y control por tipo de restricción',
    ],
  },
  {
    version: '1.8.0',
    date: '13/06/2026',
    title: 'Derivaciones, Alertas Inteligentes y Rediseño Premium',
    items: [
      'Derivaciones entre especialistas: creá, aceptá, rechazá y completá interconsultas con notificaciones en tiempo real al médico destino',
      'Alertas inteligentes: detección automática de cumpleaños, ausentismo recurrente (2+ no asistencias en 30 días), y pacientes críticos (3+ consultas en 60 días)',
      'Temporizador de atención persistente: el tiempo de atención ahora se guarda en DB y sobrevive a recargas de página',
      'Rediseño Premium: animaciones suaves, cards con hover-lift, popovers con origen-aware, KPIs con count-up, sidebar con indicador activo y header glass',
      'Mejora en encuestas post-consulta con análisis de sentimiento usando IA local (Gemma3)',
      'CIE-10 expandido a ~1031 códigos con búsqueda mejorada',
      'Onboarding IA: progreso persistente, 6 etapas con re-ejecución y continuar más tarde',
      'Feature overrides por usuario: admin puede otorgar features de planes superiores a usuarios específicos',
    ],
  },
  {
    version: '1.7.0',
    date: '10/06/2026',
    title: 'Feature Overrides, Onboarding y CIE-10',
    items: [
      'Feature overrides por usuario: un admin puede habilitar features de planes superiores para usuarios específicos',
      'Onboarding IA: progreso persistente entre sesiones, re-ejecución del asistente, continuar más tarde',
      'Fix importancia: onboarding no se podía completar por error en paso 2; persistencia de pasos mejorada',
      'CIE-10 expandido con nuevos códigos comunes en Chile',
      'Encuestas post-consulta con análisis de sentimiento ML usando Gemma3',
    ],
  },
  {
    version: '1.6.0',
    date: '01/06/2026',
    title: 'Mejoras en Turnos, Recetas y Seguridad',
    items: [
      'Nuevo Turno desde la ficha del paciente con atajo de teclado Ctrl+T',
      'Certificados médicos: ahora funciona también para usuarios administradores',
      'Eliminación de recetas con confirmación (soft-delete a historial)',
      'Limpieza de workflows n8n duplicados',
    ],
  },
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
      'Panel de monitoreo de automatizaciones',
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
