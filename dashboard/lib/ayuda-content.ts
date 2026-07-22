/**
 * Contenido de la sección Ayuda del sistema.
 * Documentación completa de cada módulo con instrucciones paso a paso.
 */

export interface AyudaSeccion {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  pasos?: AyudaPaso[];
  preguntas?: AyudaPregunta[];
}

export interface AyudaPaso {
  titulo: string;
  descripcion: string;
  tips?: string[];
  enlace?: { href: string; label: string };
}

export interface AyudaPregunta {
  pregunta: string;
  respuesta: string;
}

export const SECCIONES_AYUDA: AyudaSeccion[] = [
  {
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    descripcion: 'Configuración inicial del consultorio para empezar a operar',
    icono: 'Rocket',
    pasos: [
      {
        titulo: '1. Conecta WhatsApp',
        descripcion:
          'Vinculá tu número de WhatsApp empresarial para que los pacientes puedan comunicarse con el consultorio.',
        tips: [
          'Necesitas una cuenta de Twilio con WhatsApp habilitado',
          'Ingresá las credenciales en Sistema → Credenciales → Twilio',
          'Verifica que el webhook esté apuntando a med.aicorebots.com/api/webhook/twilio',
        ],
        enlace: { href: '/dashboard/admin/sistema', label: 'Ir a Sistema → Credenciales' },
      },
      {
        titulo: '2. Agrega un médico',
        descripcion: 'Registrá al menos un profesional para poder asignar turnos y atención.',
        tips: [
          'Completá nombre, especialidad y datos de contacto',
          'El email se usa para notificaciones de turnos',
          'El RUT es obligatorio para facturación chilena',
        ],
        enlace: { href: '/dashboard/configuracion?tab=equipo', label: 'Ir a Ajustes → Equipo' },
      },
      {
        titulo: '3. Configura horarios',
        descripcion: 'Definí los días y horarios de atención del consultorio.',
        tips: [
          'Puedes configurar horarios diferentes por día de la semana',
          'Los turnos se asignan automáticamente dentro de estos horarios',
          'Si tienes varios médicos, cada uno puede tener sus propios horarios',
        ],
        enlace: { href: '/dashboard/configuracion?tab=horarios', label: 'Ir a Ajustes → Horarios' },
      },
      {
        titulo: '4. Agrega pacientes',
        descripcion: 'Cargá pacientes manualmente o esperá a que soliciten turno por WhatsApp.',
        tips: [
          'Los pacientes chilenos requieren RUT y sistema de salud',
          'El teléfono debe tener formato chileno (+569XXXXXXXX)',
          'Puedes cargar región y comuna para datos demográficos',
        ],
        enlace: { href: '/dashboard/pacientes', label: 'Ir a Pacientes' },
      },
      {
        titulo: '5. Activa notificaciones',
        descripcion: 'Configurá alertas automáticas para no perderte ningún evento importante.',
        tips: [
          'Activá urgencias por WhatsApp para atención inmediata',
          'El resumen diario por email ayuda a planificar el día',
          'Las alertas de ausentismo avisan si un paciente no asiste',
        ],
        enlace: {
          href: '/dashboard/configuracion?tab=notificaciones',
          label: 'Ir a Ajustes → Notificaciones',
        },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Cuánto tiempo toma la configuración inicial?',
        respuesta:
          'Aproximadamente 15-20 minutos si ya tienes las credenciales de Twilio. El asistente IA te guía paso a paso con sugerencias personalizadas.',
      },
      {
        pregunta: '¿Puedo cambiar la configuración después?',
        respuesta:
          'Sí, todas las configuraciones se pueden modificar en cualquier momento desde Ajustes o Sistema (admin).',
      },
    ],
  },
  {
    id: 'turnos',
    titulo: 'Gestión de Turnos',
    descripcion: 'Administrá la agenda de turnos de tu consultorio',
    icono: 'Calendar',
    pasos: [
      {
        titulo: 'Crear un turno',
        descripcion: 'Asigná un turno a un paciente existente o nuevo.',
        tips: [
          'Buscá al paciente por nombre o RUT',
          'Seleccioná médico, fecha y hora disponibles',
          'Opcional: agregá motivo de consulta y observaciones',
        ],
        enlace: { href: '/dashboard/turnos', label: 'Ir a Turnos' },
      },
      {
        titulo: 'Gestionar estados',
        descripcion:
          'Los turnos pasan por varios estados: pendiente → en_curso → atendido / cancelado.',
        tips: [
          'Usa la vista Kanban (Atención) para arrastrar turnos entre estados',
          'Los estados se actualizan automáticamente desde WhatsApp',
          'Un turno cancelado libera el horario para otro paciente',
        ],
      },
      {
        titulo: 'Recordatorios automáticos',
        descripcion: 'Los pacientes reciben recordatorios de turno por WhatsApp.',
        tips: [
          'El recordatorio se envía 24 horas antes del turno',
          'El paciente puede confirmar o cancelar desde el mensaje',
          'Si confirma, el turno pasa a "confirmado" automáticamente',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Cómo cancelo un turno?',
        respuesta:
          'Desde la lista de turnos, haz clic en el turno y selecciona "Cancelar". También podés cancelar desde el Kanban de Atención arrastrando a la columna "Cancelados".',
      },
      {
        pregunta: '¿Los pacientes pueden pedir turno por WhatsApp?',
        respuesta:
          'Sí, el asistente IA puede gestionar solicitudes de turno automáticamente. Si está habilitado, el paciente pide turno y el sistema agenda según disponibilidad.',
      },
    ],
  },
  {
    id: 'pacientes',
    titulo: 'Pacientes',
    descripcion: 'Gestión integral de fichas de pacientes con datos chilenos',
    icono: 'Users',
    pasos: [
      {
        titulo: 'Registrar un paciente',
        descripcion: 'Creá una ficha completa con todos los datos del paciente.',
        tips: [
          'El RUT es obligatorio y se valida con dígito verificador',
          'El sistema de salud puede ser FONASA, ISAPRE, Particular u Otro',
          'Región y comuna se cargan desde el listado oficial chileno',
          'El teléfono debe ser chileno (+569XXXXXXXX)',
        ],
        enlace: { href: '/dashboard/pacientes', label: 'Ir a Pacientes' },
      },
      {
        titulo: 'Historial médico',
        descripcion: 'Cada paciente tiene un historial con diagnósticos, recetas y evolución.',
        tips: [
          'Los médicos pueden agregar entradas desde la ficha del paciente',
          'Las recetas se asocian automáticamente al historial',
          'El paciente puede ver su historial desde el Portal',
        ],
      },
      {
        titulo: 'Portal del Paciente (Premium+)',
        descripcion:
          'Los pacientes acceden a su información desde med.aicorebots.com/portal (disponible en plan Premium o superior).',
        tips: [
          'Ingresan con su número de teléfono +569',
          'Reciben un magic link por WhatsApp para acceder',
          'Pueden ver turnos, recetas, historial, paquetes y editar su perfil',
          'Booking Wizard: 4 pasos para agendar turno desde el portal',
        ],
        enlace: { href: '/portal', label: 'Ir al Portal' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Se puede importar una lista de pacientes?',
        respuesta:
          'Actualmente la carga es manual desde el panel. Está planificada la importación por Excel/CSV.',
      },
      {
        pregunta: '¿Los pacientes pueden actualizar sus datos?',
        respuesta:
          'Sí, desde el Portal del Paciente pueden editar email, región, comuna y sistema de salud.',
      },
      {
        pregunta: '¿Cómo registro la previsión de salud de un paciente?',
        respuesta: 'Al crear o editar un paciente, encontrás la sección "Previsión". Seleccioná el tipo (FONASA, ISAPRE, Particular, PRAIS, Otro). Si es FONASA, elegí el tramo (A/B/C/D). Si es ISAPRE, seleccioná la ISAPRE de la lista y opcionalmente el número de afiliado. El badge de previsión se muestra automáticamente en la ficha del paciente.',
      },
    ],
  },
  {
    id: 'atencion',
    titulo: 'Atención Diaria (Kanban)',
    descripcion: 'Panel visual para gestionar la atención del día en tiempo real',
    icono: 'Activity',
    pasos: [
      {
        titulo: 'Usar el Kanban',
        descripcion: 'El Kanban organiza los turnos del día en columnas por estado.',
        tips: [
          'Arrastrá un turno de "Pendiente" a "En Atención" cuando empiece la consulta',
          'Pasalo a "Atendido" al finalizar',
          'Los tiempos de atención se registran automáticamente',
          'Filtrá por médico para ver solo tus turnos',
        ],
        enlace: { href: '/dashboard/atencion', label: 'Ir a Atención' },
      },
      {
        titulo: 'Temporizador en vivo',
        descripcion: 'Cada turno en "En Atención" muestra cuánto tiempo lleva.',
        tips: [
          'El temporizador ayuda a gestionar los tiempos de consulta',
          'No hay límite de tiempo, es solo informativo',
          'Al pasar a "Atendido" se registra la duración total',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué pasa si un paciente no asiste?',
        respuesta:
          'Puedes marcar el turno como "Cancelado" con motivo "ausente". El sistema enviará una notificación para reagendar.',
      },
    ],
  },
  {
    id: 'notas-soap',
    titulo: 'Notas SOAP',
    descripcion: 'Evolución clínica estructurada con diagnóstico CIE-10',
    icono: 'FileText',
    pasos: [
      {
        titulo: 'Crear una nota SOAP',
        descripcion:
          'Registrá la evolución del paciente usando el formato Subjetivo/Objetivo/Análisis/Plan.',
        tips: [
          'Accedé desde la ficha del paciente',
          'Subjetivo: síntomas que reporta el paciente',
          'Objetivo: signos vitales y hallazgos del examen',
          'Análisis: diagnóstico con código CIE-10',
          'Plan: tratamiento, medicamentos y seguimiento',
        ],
        enlace: { href: '/dashboard/pacientes', label: 'Ir a Pacientes' },
      },
      {
        titulo: 'Historial de notas',
        descripcion: 'Todas las notas SOAP quedan registradas cronológicamente.',
        tips: [
          'Cada nota se asocia a un médico y un turno',
          'Podés ver el historial completo desde la ficha del paciente',
          'Las notas no se pueden modificar, solo agregar nuevas',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué es el código CIE-10?',
        respuesta:
          'La Clasificación Internacional de Enfermedades (CIE-10) es el estándar mundial para diagnósticos. El sistema incluye un buscador con ~900 códigos para facilitar la selección.',
      },
    ],
  },
  {
    id: 'lista-espera',
    titulo: 'Lista de Espera',
    descripcion: 'Gestión inteligente de pacientes en espera para turnos disponibles',
    icono: 'Clock',
    pasos: [
      {
        titulo: 'Agregar paciente a lista de espera',
        descripcion:
          'Cuando un paciente necesita turno pero no hay disponibilidad, podés inscribirlo en la lista.',
        tips: [
          'Disponible en plan Professional o superior',
          'Se asigna al médico y especialidad deseada',
          'El sistema respeta orden FIFO (primero en llegar, primero en ser ofrecido)',
          'Cada paciente recibe máximo 3 ofertas por día',
        ],
        enlace: { href: '/dashboard/lista-espera', label: 'Ir a Lista de Espera' },
      },
      {
        titulo: 'Ofertas automáticas',
        descripcion:
          'Cuando se cancela un turno, el sistema busca automáticamente el primer paciente en espera.',
        tips: [
          'El paciente recibe un WhatsApp con la oferta del turno',
          'Tiene 15 minutos para aceptar o rechazar',
          'Si acepta, el turno se asigna automáticamente',
          'Si rechaza, el sistema pasa al siguiente paciente',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Cuánto tiempo espera un paciente en la lista?',
        respuesta:
          'No hay límite de tiempo. Puede esperar hasta que haya una oferta disponible o hasta que el consultorio lo retire manualmente.',
      },
    ],
  },
  {
    id: 'derivaciones',
    titulo: 'Derivaciones entre Especialistas',
    descripcion:
      'Interconsultas y derivaciones de pacientes a otros especialistas con seguimiento completo',
    icono: 'ArrowRightLeft',
    pasos: [
      {
        titulo: 'Crear una derivación',
        descripcion: 'Derivá un paciente a otro especialista dentro del sistema.',
        tips: [
          'Seleccioná el paciente y la especialidad de destino',
          'Opcional: elegí un médico específico o dejalo abierto',
          'Indicá gravedad (normal, prioritaria, urgente)',
          'Incluí motivo, diagnóstico y código CIE-10',
          'El médico destino recibe una notificación automática',
        ],
        enlace: { href: '/dashboard/derivaciones', label: 'Ir a Derivaciones' },
      },
      {
        titulo: 'Gestionar derivaciones recibidas',
        descripcion: 'Como médico destino, podés aceptar, rechazar o completar derivaciones.',
        tips: [
          'Las derivaciones pendientes aparecen en tu lista',
          'Al aceptar, el paciente se asigna a tu agenda',
          'Podés agregar notas al aceptar o completar',
          'El médico origen recibe notificación de cada acción',
        ],
      },
      {
        titulo: 'Seguimiento',
        descripcion: 'Todas las derivaciones tienen trazabilidad completa.',
        tips: [
          'Cada derivación muestra historial de cambios de estado',
          'Podés ver el paciente, diagnósticos y notas de ambos médicos',
          'Las derivaciones completadas quedan en el historial',
          'Disponible en plan Professional o superior',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo derivar a un médico específico o solo a una especialidad?',
        respuesta:
          'Ambos. Podés elegir un médico destino específico si sabés quién debe atender, o dejar la especialidad abierta para que cualquier médico de esa área pueda tomar el caso.',
      },
      {
        pregunta: '¿El paciente recibe notificación de la derivación?',
        respuesta:
          'Por ahora las notificaciones son internas entre médicos. El paciente puede enterarse cuando el médico destino lo contacte para agendar el turno.',
      },
      {
        pregunta: '¿Puedo derivar un paciente a un médico de otra organización?',
        respuesta: 'Sí. Si existe un convenio de intercambio entre organizaciones, podés derivar pacientes a especialistas de otras instituciones. El paciente debe firmar un consentimiento de intercambio de datos, donde se especifica el alcance (historial completo, solo recetas, solo turnos o solo diagnósticos) y la fecha de expiración. Las derivaciones cross-tenant requieren planes Enterprise.',
      },
    ],
  },
  {
    id: 'alertas-inteligentes',
    titulo: 'Alertas Inteligentes',
    descripcion: 'Detección automática de eventos importantes para mejorar la atención',
    icono: 'Bell',
    pasos: [
      {
        titulo: 'Alertas de cumpleaños',
        descripcion: 'El sistema detecta automáticamente pacientes que cumplen años hoy.',
        tips: [
          'Las alertas se generan al ejecutar el proceso',
          'Podés previsualizar antes de enviar',
          'Ideal para enviar saludos personalizados',
        ],
      },
      {
        titulo: 'Alertas de ausentismo recurrente',
        descripcion: 'Detecta pacientes con 2 o más inasistencias en los últimos 30 días.',
        tips: [
          'Ayuda a identificar pacientes que necesitan seguimiento',
          'Los médicos reciben notificación automática',
          'Podés contactar al paciente para reprogramar',
        ],
      },
      {
        titulo: 'Alertas de pacientes críticos',
        descripcion: 'Identifica pacientes con 3 o más consultas en los últimos 60 días.',
        tips: [
          'Útil para seguimiento de pacientes con enfermedades crónicas',
          'Las notificaciones se envían a todos los médicos activos',
          'Permite coordinar atención temprana',
        ],
      },
      {
        titulo: 'Ejecutar alertas',
        descripcion: 'Las alertas se pueden ejecutar manualmente o desde n8n.',
        tips: [
          'Usá GET /api/alertas?preview=true para previsualizar sin enviar',
          'Usá POST /api/alertas para ejecutar y notificar a todos los médicos',
          'Disponible en plan Professional o superior',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Con qué frecuencia se ejecutan las alertas?',
        respuesta:
          'Actualmente se ejecutan manualmente desde la API. Está planificada la automatización vía n8n para ejecución diaria.',
      },
      {
        pregunta: '¿Quién recibe las notificaciones de alertas?',
        respuesta:
          'Todos los médicos activos del consultorio reciben notificaciones push en el dashboard cuando se ejecutan las alertas.',
      },
    ],
  },
  {
    id: 'recetas',
    titulo: 'Recetas Digitales',
    descripcion: 'Prescripciones médicas electrónicas con seguimiento',
    icono: 'Syringe',
    pasos: [
      {
        titulo: 'Crear una receta',
        descripcion: 'Generá una receta digital asociada a un paciente.',
        tips: [
          'Seleccioná paciente y médico prescriptor',
          'Agregá medicamentos con dosis, frecuencia y duración',
          'Puedes incluir indicaciones adicionales',
          'La receta queda registrada en el historial médico del paciente',
        ],
        enlace: { href: '/dashboard/recetas', label: 'Ir a Recetas' },
      },
      {
        titulo: 'Estados de receta',
        descripcion: 'Cada receta puede estar activa, vencida o en historial.',
        tips: [
          'Las recetas activas son las vigentes',
          'Las vencidas se archivan automáticamente',
          'El paciente puede ver sus recetas activas desde el Portal',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿La receta tiene validez legal?',
        respuesta:
          'Las recetas son electrónicas con respaldo en base de datos. Consultá la normativa local para recetas digitales.',
      },
    ],
  },
  {
    id: 'firma-digital',
    titulo: 'Firma Digital QR',
    descripcion: 'Código QR de verificación en recetas para autenticidad',
    icono: 'QrCode',
    pasos: [
      {
        titulo: 'Cómo funciona',
        descripcion: 'Cada receta genera un código QR único basado en hash SHA-256.',
        tips: [
          'Disponible en plan Professional o superior',
          'El QR se imprime en la receta PDF',
          'Cualquier persona puede escanearlo para verificar autenticidad',
          'La verificación pública está en med.aicorebots.com/verificar',
        ],
        enlace: { href: '/dashboard/recetas', label: 'Ir a Recetas' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué datos muestra la verificación QR?',
        respuesta:
          'Muestra paciente, médico, medicamentos, fecha de emisión y vigencia. Confirma que la receta fue emitida por el consultorio.',
      },
    ],
  },
  {
    id: 'certificados',
    titulo: 'Certificados Médicos QR',
    descripcion: 'Certificados digitales con verificación mediante código QR',
    icono: 'FileCheck',
    pasos: [
      {
        titulo: 'Emitir un certificado',
        descripcion: 'Generá certificados médicos con código QR de verificación.',
        tips: [
          'Disponible en plan Professional o superior',
          'Seleccioná paciente, tipo de certificado y período',
          'Incluye diagnóstico con código CIE-10',
          'El QR permite verificar autenticidad en línea',
        ],
        enlace: { href: '/dashboard/pacientes', label: 'Ir a Ficha del Paciente' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿El certificado QR tiene validez oficial?',
        respuesta:
          'El QR verifica que el certificado fue emitido por el consultorio. Cada certificado tiene un hash único que garantiza su integridad.',
      },
    ],
  },
  {
    id: 'conversaciones',
    titulo: 'Conversaciones WhatsApp',
    descripcion: 'Bandeja unificada de mensajes de pacientes con asistencia IA',
    icono: 'MessageSquare',
    pasos: [
      {
        titulo: 'Gestionar mensajes',
        descripcion: 'Todos los mensajes de WhatsApp llegan a esta bandeja.',
        tips: [
          'Los mensajes no leídos aparecen destacados',
          'Puedes responder directamente desde el panel',
          'La IA clasifica automáticamente la intención del mensaje',
          'Las urgencias se marcan y notifican automáticamente',
        ],
        enlace: { href: '/dashboard/conversaciones', label: 'Ir a Conversaciones' },
      },
      {
        titulo: 'Respuestas automáticas con IA',
        descripcion: 'El asistente IA puede responder mensajes comunes automáticamente.',
        tips: [
          'Activá respuestas automáticas desde Sistema → Asistente IA',
          'Puedes personalizar el prompt del sistema',
          'La IA detecta urgencias y las deriva al médico',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿La IA responde todos los mensajes?',
        respuesta:
          'Solo si está habilitado en Sistema → Asistente IA. Las urgencias siempre se derivan al médico. Las respuestas automáticas están limitadas a mensajes no urgentes.',
      },
    ],
  },
  {
    id: 'plantillas',
    titulo: 'Plantillas WhatsApp',
    descripcion: 'Mensajes personalizables para comunicaciones automáticas',
    icono: 'FileEdit',
    pasos: [
      {
        titulo: 'Crear una plantilla',
        descripcion: 'Configurá plantillas para recordatorios, confirmaciones y notificaciones.',
        tips: [
          'Disponible en plan Professional o superior',
          'Usá variables como {{paciente}}, {{fecha}}, {{hora}}',
          'Las plantillas se usan en recordatorios automáticos y respuestas',
          'Podés tener varias plantillas para distintos escenarios',
        ],
        enlace: { href: '/dashboard/configuracion?tab=plantillas', label: 'Ir a Plantillas' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo tener plantillas en distintos idiomas?',
        respuesta:
          'Sí, las plantillas son texto libre. Podés crear versiones en español, inglés o cualquier idioma que necesites.',
      },
    ],
  },
  {
    id: 'reportes',
    titulo: 'Reportes y Estadísticas',
    descripcion: 'Visualizá el rendimiento del consultorio con gráficos, métricas y análisis ejecutivo',
    icono: 'BarChart3',
    pasos: [
      {
        titulo: 'Panel de reportes',
        descripcion: 'Accede a estadísticas generales del consultorio con 6 pestañas de análisis.',
        tips: [
          'General: KPIs principales (turnos, asistencia, nuevos pacientes, conversaciones)',
          'Turnos: distribución por estado con gráfico de barras apiladas + predicción de demanda',
          'Pacientes: nuevos registros y totales con gráfico de evolución',
          'WhatsApp: volumen de mensajes enviados/recibidos + calidad de respuesta',
          'Comparativa: comparación vs período anterior con tabla de KPIs y gráficos',
          'Ejecutivo: resumen con ingresos, ocupación, satisfacción, NPS + charts de tendencia',
        ],
        enlace: { href: '/dashboard/reportes', label: 'Ir a Reportes' },
      },
      {
        titulo: 'Selector de período',
        descripcion: 'Todos los reportes se adaptan al período seleccionado.',
        tips: [
          'Semana: datos diarios (lun-sáb) con 6 puntos en gráficos',
          'Mes: datos semanales (4 semanas) con visión mensual completa',
          'Año: datos mensuales (ene-jun) con tendencia anual',
          'Al cambiar el período, todos los tab se actualizan automáticamente',
        ],
      },
      {
        titulo: 'Tab ejecutivo',
        descripcion: 'Análisis de alto nivel con indicadores clave y tendencias.',
        tips: [
          'KPIs principales: ingresos totales, tasa de ocupación, satisfacción (4.7/5) y NPS',
          'Chart de Ingresos: tendencia por período con valores en millones',
          'Chart de Ocupación: evolución de la tasa de ocupación en el tiempo',
          'Embudo de Conversión: visualización leads → pacientes recurrentes',
          'Los charts se actualizan dinámicamente al cambiar el período',
        ],
      },
      {
        titulo: 'Embudo de conversión',
        descripcion: 'Visualizá cuántos pacientes avanzan en cada etapa del proceso.',
        tips: [
          '5 etapas: Contacto inicial → Respondió WhatsApp → Solicitó turno → Asistió → Recurrente',
          'Los valores escalan según el período seleccionado',
          'Cada etapa muestra cantidad y porcentaje de conversión',
          'El ancho de la barra representa visualmente la retención',
        ],
      },
      {
        titulo: 'Exportar reportes',
        descripcion: 'Descargá reportes en Excel o PDF (plan Professional+).',
        tips: [
          'Usa Exportar Excel para análisis detallado en planillas',
          'Usa Exportar PDF para compartir con el equipo o imprimir',
          'Los datos incluyen el período seleccionado y todas las métricas',
          'El badge "⚡ Datos demo" indica que los datos son de ejemplo',
        ],
      },
    ],
  },
  {
    id: 'encuestas',
    titulo: 'Encuestas Post-Consulta',
    descripcion: 'Recibe feedback automático de pacientes después de cada atención',
    icono: 'Star',
    pasos: [
      {
        titulo: 'Cómo funcionan',
        descripcion: 'Después de cada consulta, el paciente recibe una encuesta por WhatsApp.',
        tips: [
          'La encuesta se envía automáticamente 1 hora después del turno',
          'El paciente responde con emojis (⭐ calificación)',
          'Los resultados se ven en el panel de Encuestas',
          'Las calificaciones bajas notifican al administrador',
        ],
        enlace: { href: '/dashboard/encuestas', label: 'Ir a Encuestas' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Se puede desactivar la encuesta?',
        respuesta:
          'Sí, desde Ajustes → Notificaciones podés desactivar el envío automático de encuestas.',
      },
    ],
  },
  {
    id: 'pwa',
    titulo: 'App Instalable (PWA)',
    descripcion: 'Usá el dashboard como una app nativa en tu celular o computador',
    icono: 'Smartphone',
    pasos: [
      {
        titulo: 'Instalar la app',
        descripcion: 'El dashboard se puede instalar como aplicación en cualquier dispositivo.',
        tips: [
          'En Chrome/Edge: buscá "Instalar app" en el menú (tres puntitos)',
          'En celular Android: aparece un banner "Instalar" automáticamente',
          'En iOS: usá "Agregar a pantalla de inicio" desde Safari',
          'La app instalada funciona con modo offline limitado',
        ],
      },
      {
        titulo: 'Modo offline',
        descripcion: 'Las páginas básicas se muestran incluso sin conexión a internet.',
        tips: [
          'Los datos se actualizan cuando volvés a estar online',
          'La app notifica cuando hay una nueva versión disponible',
          'Se recomienda mantener la app actualizada',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿La PWA consume muchos datos?',
        respuesta:
          'No, la PWA almacena en caché los recursos necesarios y solo descarga datos cuando es necesario. Es más liviana que una app nativa.',
      },
    ],
  },
  {
    id: 'sistema',
    titulo: 'Sistema (Admin)',
    descripcion: 'Configuración avanzada del sistema solo para administradores',
    icono: 'Settings',
    pasos: [
      {
        titulo: 'Feature Toggles',
        descripcion: 'Activá o desactivá funcionalidades completas del sistema.',
        tips: [
          'Los cambios se aplican inmediatamente, sin recargar',
          'Desactivar un feature lo oculta del sidebar',
          'Los módulos principales no se pueden desactivar si hay datos asociados',
          'Algunos features requieren planes específicos (Starter, Professional, Premium, Enterprise)',
        ],
        enlace: { href: '/dashboard/admin/sistema', label: 'Ir a Sistema' },
      },
      {
        titulo: 'Asistente IA',
        descripcion: 'Configurá el comportamiento del asistente virtual del consultorio.',
        tips: [
          'El prompt del sistema define la personalidad y tono del asistente',
          'Temperatura baja (0.1-0.3) = respuestas más predecibles y consistentes',
          'Temperatura alta (0.7-1.0) = respuestas más creativas y variadas',
          'Máx. tokens controla la longitud máxima de las respuestas',
          'Modelo: seleccioná el modelo de IA a usar (gemma3, mistral, etc.)',
          'Modo del asistente: silencioso, sugerente o activo (por defecto)',
        ],
      },
      {
        titulo: 'Credenciales',
        descripcion: 'Gestioná las credenciales de servicios externos del consultorio.',
        tips: [
          'Usa el botón "Probar conexión" para verificar cada servicio',
          'Las credenciales se almacenan encriptadas (AES-256) en la base de datos',
          'La sincronización con n8n se hace automáticamente',
          'Credenciales disponibles: Twilio, LiveKit, Google Calendar, Resend (email)',
        ],
      },
      {
        titulo: 'API Pública',
        descripcion: 'Creá y gestioná API keys para integraciones externas.',
        tips: [
          'Cada key tiene scopes específicos (lectura y/o escritura)',
          'Podés revocar keys en cualquier momento desde el panel',
          'Usa la API para conectar sistemas externos o automatizaciones',
          'Cada key muestra fecha de creación y último uso',
        ],
      },
      {
        titulo: 'Autenticación 2FA',
        descripcion: 'Activá autenticación de dos factores para proteger tu cuenta de administrador.',
        tips: [
          'Disponible en plan Professional o superior',
          'Usá Google Authenticator, Authy o cualquier app compatible con TOTP',
          'Cada usuario puede activar 2FA desde su perfil',
          'Si perdés el acceso al código 2FA, contactá al administrador del sistema',
        ],
      },
      {
        titulo: 'Auditoría de accesos',
        descripcion: 'Registro completo de actividad de usuarios en el sistema.',
        tips: [
          'Disponible en plan Premium o superior',
          'Registra inicios de sesión, cambios de configuración y accesos a datos',
          'Incluye IP, fecha, tipo de acción y usuario responsable',
          'Los registros se conservan por 90 días',
          'Se puede exportar para cumplimiento normativo',
        ],
        enlace: { href: '/dashboard/admin/auditoria', label: 'Ir a Auditoría' },
      },
      {
        titulo: 'Backups',
        descripcion: 'Gestión de respaldos de base de datos automáticos y manuales.',
        tips: [
          'Disponible en plan Premium o superior',
          'Backup automático diario a las 3:00 AM vía n8n',
          'Podés generar backups manuales desde el panel',
          'Los backups incluyen toda la base de datos del consultorio',
          'Podés descargar o eliminar backups antiguos',
        ],
        enlace: { href: '/dashboard/admin/backups', label: 'Ir a Backups' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Quién puede acceder a las secciones de Admin?',
        respuesta:
          'Solo usuarios con rol de administrador. Los médicos y staff no ven las secciones de admin en el sidebar ni pueden acceder a estas rutas.',
      },
      {
        pregunta: '¿Los feature toggles afectan a todos los usuarios?',
        respuesta:
          'Sí, los cambios se aplican a todo el consultorio (todos los médicos y pacientes). No hay configuración por usuario.',
      },
      {
        pregunta: '¿Los backups incluyen los archivos del sistema?',
        respuesta:
          'Los backups automáticos respaldan la base de datos PostgreSQL. Los archivos de configuración y workflows de n8n tienen su propio sistema de respaldo.',
      },
    ],
  },
  {
    id: 'facturacion',
    titulo: 'Facturación y Planes',
    descripcion: 'Gestión de suscripción y planes del consultorio',
    icono: 'CreditCard',
    pasos: [
      {
        titulo: 'Ver plan actual',
        descripcion: 'Conocé qué features incluye tu plan y cuándo vence.',
        tips: [
          'El plan actual se muestra en Ajustes → Suscripción',
          'Cada plan tiene features específicos',
          'Al cambiar de plan, los nuevos features se activan automáticamente',
        ],
        enlace: { href: '/dashboard/configuracion?tab=suscripcion', label: 'Ir a Suscripción' },
      },
      {
        titulo: 'Planes disponibles',
        descripcion: 'Elegí el plan que mejor se adapte a tu consultorio.',
        tips: [
          'Free: Para probar la plataforma (20 pacientes, 5 turnos/mes)',
          'Starter ($79/mes): Consultorios individuales — hasta 500 pacientes, scoring, PWA',
          'Profesional ($149/mes): Crecimiento — IA, telemedicina, firma digital, API',
          'Premium ($249/mes): Clínicas — Portal paciente, n8n, auditoría, Web Vitals',
          'Enterprise ($549/mes): Redes médicas — Multi-sucursal, integraciones, carga masiva',
        ],
      },
      {
        titulo: 'Cambiar de plan',
        descripcion: 'Actualiza o cancela tu suscripción.',
        tips: [
          'Los pagos se procesan via MercadoPago',
          'Puedes pagar con tarjeta de crédito o débito',
          'El cambio es inmediato al confirmar el pago',
          '14 días de prueba gratis en todos los planes',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo probar features Premium antes de contratar?',
        respuesta:
          'Todos los planes incluyen 14 días de prueba gratis. Durante ese período podés probar todas las funcionalidades del plan seleccionado sin compromiso.',
      },
      {
        pregunta: '¿Qué pasa si supero el límite de pacientes de mi plan?',
        respuesta:
          'El sistema te notificará cuando te acerques al límite. Para agregar más pacientes, necesitarás actualizar tu plan al siguiente nivel.',
      },
    ],
  },
  {
    id: 'portal-paciente',
    titulo: 'Portal del Paciente',
    descripcion: 'Acceso web para que pacientes vean turnos, recetas e historial',
    icono: 'ExternalLink',
    pasos: [
      {
        titulo: 'Requisito de plan',
        descripcion: 'El Portal del Paciente está disponible en planes Premium y Enterprise.',
        tips: [
          'Para acceder, el consultorio debe tener un plan Premium o superior',
          'Los pacientes reciben un enlace mágico por WhatsApp para ingresar',
          'El portal es autogestionado por el paciente',
        ],
      },
      {
        titulo: 'Acceder al portal',
        descripcion: 'Los pacientes ingresan con su número de teléfono.',
        tips: [
          'Ingresá a consultorio.aicorebots.com/portal',
          'Escribe tu número con +569 (ej: +56912345678)',
          'Te llega un magic link por WhatsApp',
          'Hacé clic en el enlace para entrar al portal',
        ],
        enlace: { href: '/portal', label: 'Ir al Portal' },
      },
      {
        titulo: 'Funciones del portal',
        descripcion: 'Los pacientes pueden ver y gestionar su información.',
        tips: [
          'Ver próximos turnos y historial de atenciones',
          'Consultar recetas activas y vencidas',
          'Revisar historial médico completo',
          'Editar perfil (email, región, sistema de salud)',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué hago si no me llega el magic link?',
        respuesta:
          'Verifica que el número esté escrito correctamente con +569. Si sigue sin llegar, contacta al consultorio para verificar tus datos.',
      },
    ],
  },
  {
    id: 'blacklist',
    titulo: 'Lista Negra de Pacientes',
    descripcion: 'Gestión de bloqueos por inasistencia o incumplimiento con bloqueo automático',
    icono: 'Ban',
    pasos: [
      {
        titulo: 'Bloquear un paciente',
        descripcion: 'Agregá un paciente a la lista negra para impedir que reserve turnos.',
        tips: [
          'Ingresá el ID del paciente y el motivo del bloqueo',
          'Opcional: configurá un bloqueo temporal con fecha de vencimiento',
          'Los pacientes bloqueados no pueden reservar turnos vía WhatsApp',
          'El bloqueo puede activarse o desactivarse en cualquier momento',
        ],
        enlace: { href: '/dashboard/blacklist', label: 'Ir a Lista Negra' },
      },
      {
        titulo: 'Desbloquear un paciente',
        descripcion: 'Reactivá a un paciente bloqueado cuando regularice su situación.',
        tips: [
          'Desde la lista, hacé clic en "Desbloquear"',
          'El paciente vuelve a estar habilitado para reservar turnos',
          'Podés eliminar la entrada si ya no es necesaria',
        ],
      },
      {
        titulo: 'Bloqueo automático por inasistencia',
        descripcion:
          'El sistema puede bloquear automáticamente pacientes con inasistencias recurrentes.',
        tips: [
          'Configurable desde Ajustes del sistema',
          'Se activa después de N inasistencias en un período',
          'Disponible en plan Professional o superior',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué pasa si un paciente bloqueado intenta agendar un turno?',
        respuesta:
          'El sistema rechazará la solicitud automáticamente y puede enviar un mensaje indicando que debe contactar al consultorio para regularizar su situación.',
      },
      {
        pregunta: '¿El paciente sabe que está bloqueado?',
        respuesta:
          'Por defecto no se le notifica automáticamente, pero podés configurar un mensaje personalizado desde Ajustes.',
      },
    ],
  },
  {
    id: 'telemedicina',
    titulo: 'Telemedicina',
    descripcion: 'Videoconsultas en vivo con pacientes a través de LiveKit',
    icono: 'Video',
    pasos: [
      {
        titulo: 'Agendar una consulta virtual',
        descripcion:
          'Al crear un nuevo turno, seleccioná "Virtual" como modalidad de consulta. El sistema creará automáticamente una sala de videollamada y le enviará el link al paciente por WhatsApp.',
        tips: [
          'Disponible solo en plan Professional o superior',
          'El paciente recibe el link con su token de acceso único',
          'No requiere que el paciente descargue ninguna aplicación',
          'Funciona en cualquier navegador moderno (Chrome, Firefox, Safari, Edge)',
        ],
        enlace: { href: '/dashboard/turnos', label: 'Ir a Turnos' },
      },
      {
        titulo: 'Iniciar una videoconsulta',
        descripcion:
          'Desde el Kanban de Atención, los turnos virtuales tienen un botón "Video" que abre la sala. También podés iniciarla desde el Portal del Paciente.',
        tips: [
          'Hacé clic en "Video" junto al turno en la columna de Pendientes o En Atención',
          'La sala se abre en una ventana nueva a pantalla completa',
          'Activá tu cámara y micrófono cuando el navegador lo solicite',
          'Podés compartir pantalla para mostrar exámenes o resultados',
        ],
        enlace: { href: '/dashboard/atencion', label: 'Ir a Atención' },
      },
      {
        titulo: 'Durante la videollamada',
        descripcion:
          'La sala incluye controles de cámara, micrófono, compartir pantalla y finalizar llamada.',
        tips: [
          'Usá los controles inferiores para mutearte o apagar la cámara',
          'Compartí pantalla para mostrar resultados o indicaciones',
          'Al finalizar, cerrá la ventana o usá el botón "Colgar"',
          'La llamada no se graba (privacidad del paciente)',
        ],
      },
      {
        titulo: 'Acceso del paciente',
        descripcion:
          'El paciente recibe un link por WhatsApp con su token de acceso. Solo necesita hacer clic para ingresar.',
        tips: [
          'El link incluye un token de acceso único y temporal',
          'El paciente debe ingresar 5 minutos antes de la hora agendada',
          'Solo necesita navegador web, no requiere instalar nada',
          'Si el paciente pierde el link, podés reenviarlo desde la ficha del turno',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué necesito para hacer una videoconsulta?',
        respuesta:
          'Solo necesitás un navegador moderno (Chrome, Firefox, Safari o Edge), cámara web y micrófono. No requiere instalar ningún software adicional. Tus pacientes tampoco necesitan descargar nada.',
      },
      {
        pregunta: '¿Cuántos pacientes puedo atender simultáneamente?',
        respuesta:
          'Las videoconsultas son uno a uno (médico-paciente). No hay límite de videoconsultas por día ni por mes.',
      },
      {
        pregunta: '¿Es segura la videollamada?',
        respuesta:
          'Sí. Las salas son privadas y solo pueden acceder el médico y el paciente con su token único. Los tokens son temporales y expiran. La comunicación está encriptada y no se almacena ningún registro de audio o video.',
      },
      {
        pregunta: '¿El paciente necesita crear una cuenta?',
        respuesta:
          'No. El paciente recibe un link directo por WhatsApp con su token de acceso. Solo hace clic y entra a la sala. No requiere registro, contraseña ni descarga de aplicaciones.',
      },
      {
        pregunta: '¿En qué dispositivos funciona?',
        respuesta:
          'Funciona en computadores (Windows, Mac, Linux) y dispositivos móviles (Android, iOS) con cualquier navegador moderno.',
      },
      {
        pregunta: '¿Qué plan incluye telemedicina?',
        respuesta:
          'La telemedicina está disponible en el plan Professional o superior. Incluye videoconsultas ilimitadas con generación automática de sala y notificación al paciente por WhatsApp.',
      },
    ],
  },
  {
    id: 'consentimiento-informado',
    titulo: 'Consentimiento Informado Digital',
    descripcion: 'Registro digital de consentimientos informados con respaldo legal (Ley 20.584)',
    icono: 'FileSignature',
    pasos: [
      {
        titulo: 'Crear un consentimiento',
        descripcion: 'Registrá un consentimiento informado firmado digitalmente por el paciente.',
        tips: [
          'Seleccioná el paciente asociado',
          'Elegí el tipo de consentimiento (cirugía, tratamiento, procedimiento, etc.)',
          'Completá el título y la descripción del procedimiento',
          'Registrá el nombre del paciente tal como firma',
          'Opcional: agregá RUT e IP de firma para auditoría',
          'La fecha de firma se registra automáticamente',
        ],
        enlace: { href: '/dashboard/consentimientos', label: 'Ir a Consentimientos' },
      },
      {
        titulo: 'Ver detalle de un consentimiento',
        descripcion: 'Accedé a la información completa de cada consentimiento.',
        tips: [
          'Hacé clic en cualquier consentimiento de la lista',
          'Podés ver paciente, RUT, tipo, fecha, IP y médico responsable',
          'Si tiene PDF adjunto, podés descargarlo',
        ],
      },
      {
        titulo: 'Respaldo legal',
        descripcion:
          'Cada consentimiento cumple con la Ley 20.584 de derechos y deberes de los pacientes.',
        tips: [
          'La IP de firma permite rastrear dónde se firmó',
          'El nombre registrado es el que el paciente declara al firmar',
          'Todo el historial de consentimientos está disponible',
          'Disponible en plan Professional o superior',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Este consentimiento tiene validez legal?',
        respuesta:
          'Sí. El registro incluye fecha, hora, nombre del paciente, IP de firma y médico responsable, cumpliendo con los requisitos de la Ley 20.584. Para máxima validez, recomendamos adjuntar el PDF firmado.',
      },
      {
        pregunta: '¿Puedo generar un PDF del consentimiento?',
        respuesta:
          'Sí. Podés generar y adjuntar un PDF con la información del consentimiento y la firma del paciente para tener un respaldo físico.',
      },
    ],
  },
  {
    id: 'scoring-pacientes',
    titulo: 'Scoring de Pacientes',
    descripcion: 'Predicción automática de riesgo de inasistencia con badge visual',
    icono: 'TrendingUp',
    pasos: [
      {
        titulo: 'Cómo funciona el scoring',
        descripcion: 'Cada paciente tiene un puntaje de 0 a 100 que predice su probabilidad de inasistencia.',
        tips: [
          'Disponible en plan Starter o superior',
          'Algoritmo ponderado: no-shows x40, cancelaciones x25, confirmaciones x20, recordatorios x10, asistencia x5',
          'Se recalcula automáticamente con cada turno',
          'Badge visual: verde (<40), amarillo (40-69), rojo (≥70)',
        ],
        enlace: { href: '/dashboard/pacientes', label: 'Ir a Pacientes' },
      },
      {
        titulo: 'Bloqueo automático',
        descripcion: 'El sistema puede bloquear automáticamente a pacientes con score alto.',
        tips: [
          'Si un paciente tiene score ≥80 y 2+ inasistencias, se agrega a la Lista Negra',
          'Podés configurar el umbral desde Ajustes del sistema',
          'Las alertas de score alto se integran en el panel lateral',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo desactivar el scoring?',
        respuesta:
          'El scoring se calcula siempre pero podés ocultar los badges desde Feature Toggles en Sistema (admin).',
      },
      {
        pregunta: '¿Con qué frecuencia se actualiza el score?',
        respuesta:
          'Se recalcula automáticamente después de cada turno (asistencia, inasistencia o cancelación). No requiere acción manual.',
      },
    ],
  },
  {
    id: 'portal-analytics',
    titulo: 'Rendimiento y Web Vitals',
    descripcion: 'Métricas de rendimiento del dashboard y portal del paciente',
    icono: 'Gauge',
    pasos: [
      {
        titulo: 'Panel de Rendimiento (Admin)',
        descripcion: 'Visualizá las métricas de rendimiento del dashboard en tiempo real.',
        tips: [
          'Disponible en plan Premium o superior',
          'LCP, INP, CLS, FCP, TTFB con percentiles y tendencias',
          'Filtrá por sección: dashboard, portal, landing o todas',
          'Exportá datos a CSV para análisis externo',
          'Los datos se actualizan automáticamente cada 30 segundos',
        ],
        enlace: { href: '/dashboard/admin/rendimiento', label: 'Ir a Rendimiento' },
      },
      {
        titulo: 'Portal Analytics',
        descripcion: 'Métricas específicas del portal del paciente.',
        tips: [
          'KPIs del portal: LCP, INP, compliance móvil, distribución de dispositivos',
          'Tabla por sección (Booking Wizard, Mis Turnos, etc.)',
          'Timeline de evolución temporal',
          'Comparativa desktop vs mobile',
        ],
        enlace: { href: '/dashboard/admin/portal-analytics', label: 'Ir a Portal Analytics' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué son las Web Vitals?',
        respuesta:
          'Son métricas de Google que miden la experiencia real del usuario: LCP (velocidad de carga), INP (interactividad), CLS (estabilidad visual), FCP (primera pintura) y TTFB (tiempo de respuesta del servidor).',
      },
      {
        pregunta: '¿Los datos de Web Vitals son reales?',
        respuesta:
          'Sí, se capturan automáticamente desde los navegadores reales de tus usuarios cuando navegan el dashboard o portal.',
      },
    ],
  },
  {
    id: 'carga-masiva',
    titulo: 'Carga Masiva de Pacientes',
    descripcion: 'Importá pacientes desde archivos Excel o CSV',
    icono: 'Upload',
    pasos: [
      {
        titulo: 'Preparar el archivo',
        descripcion: 'Descargá la plantilla Excel y completá los datos de tus pacientes.',
        tips: [
          'Disponible en plan Enterprise',
          'Campos obligatorios: nombre, apellido, teléfono',
          'Campos opcionales: RUT, email, sistema de salud, región, comuna',
          'Formatos aceptados: .xlsx y .csv',
        ],
      },
      {
        titulo: 'Subir el archivo',
        descripcion: 'Cargá el archivo desde el panel de Pacientes.',
        tips: [
          'El sistema valida cada fila antes de importar',
          'Los errores se muestran con detalle para corrección',
          'Los pacientes duplicados se omiten automáticamente (por RUT o teléfono)',
          'Máximo 5,000 pacientes por archivo',
        ],
        enlace: { href: '/dashboard/pacientes', label: 'Ir a Pacientes' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué pasa si hay errores en el archivo?',
        respuesta:
          'El sistema muestra un resumen con las filas que tienen errores para que las corrijas. Los pacientes sin error se importan correctamente.',
      },
      {
        pregunta: '¿Puedo usar el mismo formato que Dentalink o Medilink?',
        respuesta:
          'No directamente, pero podemos crear una integración personalizada vía n8n que sincronice los datos automáticamente.',
      },
    ],
  },
  {
    id: 'asistente-ia-flotante',
    titulo: 'Asistente IA Flotante',
    descripcion: 'Chat contextual con IA local en cualquier página del dashboard',
    icono: 'Sparkles',
    pasos: [
      {
        titulo: 'Abrir y usar el asistente',
        descripcion:
          'El asistente flota sobre todas las páginas del dashboard. Hacé clic en el ícono de chispa (✨) abajo a la derecha o presioná Ctrl+Shift+I.',
        tips: [
          'Disponible en plan Professional o superior',
          'Se adapta al contexto de la página actual automáticamente',
          'Sugiere acciones relevantes según lo que estás viendo',
          'Usa IA local (Gemma3 via Ollama) para respuestas rápidas y privadas',
          'Tus datos nunca salen del servidor — todo corre en tu VPS',
        ],
      },
      {
        titulo: 'Modos del asistente',
        descripcion: 'Configurá el comportamiento del asistente desde el panel de ajustes (engranaje).',
        tips: [
          'Silencioso: solo responde cuando le preguntás, sin sugerencias automáticas',
          'Sugerente: muestra 3 cards con sugerencias contextuales sin interrumpir',
          'Activo: chat libre con la IA, responde completo y se ofrece a revisar más datos',
          'Podés cambiar el modo en cualquier momento desde el panel de configuración',
        ],
      },
      {
        titulo: 'Sugerencias contextuales',
        descripcion: 'El asistente analiza la página activa y sugiere acciones relevantes.',
        tips: [
          'En pacientes: sugiere "Buscar paciente por RUT" o "Ver scoring de inasistencia"',
          'En turnos: sugiere "Crear nuevo turno" o "Ver turnos del día"',
          'El carrusel de sugerencias se desplaza con las flechas laterales',
          'Cada sugerencia ejecuta una acción directa al hacer clic',
        ],
      },
      {
        titulo: 'Historial de conversaciones',
        descripcion:
          'Todas las conversaciones con el asistente se guardan automáticamente.',
        tips: [
          'Cada sesión se guarda con fecha y hora',
          'Podés volver a consultar conversaciones anteriores',
          'Usá el botón de historial (reloj) para ver sessiones previas',
          'Las conversaciones se almacenan localmente en tu navegador',
        ],
      },
      {
        titulo: 'Contextos del asistente',
        descripcion:
          'El asistente tiene acceso a 9 contextos del sistema para responder con información precisa.',
        tips: [
          'Dashboard general: métricas y resumen del día',
          'Turnos: datos de agenda y disponibilidad',
          'Pacientes: fichas y scoring',
          'Recetas: prescripciones activas',
          'Conversaciones: mensajes recientes de WhatsApp',
          'Reportes: métricas de rendimiento',
          'Atención: estado del Kanban diario',
          'Lista de espera: pacientes en espera',
          'Alertas: notificaciones activas',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿El asistente usa mis datos para entrenar?',
        respuesta:
          'No. Todo corre en tu propia infraestructura con Ollama (IA local). Tus datos nunca salen del servidor. Es privacidad total.',
      },
      {
        pregunta: '¿Puedo desactivar el asistente?',
        respuesta:
          'Sí, podés cerrarlo con la X o configurarlo en modo Silencioso desde el panel de ajustes. También podés desactivarlo completamente desde Sistema → Feature Toggles.',
      },
      {
        pregunta: '¿Por qué a veces tarda en responder?',
        respuesta:
          'La primera respuesta después de un período de inactividad puede tardar hasta 25 segundos porque el modelo IA debe cargarse en memoria (cold start). Las respuestas siguientes son inmediatas.',
      },
      {
        pregunta: '¿Qué modelo de IA usa?',
        respuesta:
          'Usa Gemma3 (3.3GB) corriendo localmente en tu servidor via Ollama. Es un modelo de Google optimizado para respuestas rápidas y precisas en español.',
      },
    ],
  },
  {
    id: 'command-palette',
    titulo: 'Command Palette (Cmd+K)',
    descripcion: 'Navegación rápida y búsqueda inteligente desde el teclado',
    icono: 'Command',
    pasos: [
      {
        titulo: 'Abrir la paleta',
        descripcion:
          'Presioná Cmd+K (Mac) o Ctrl+K (Windows/Linux) en cualquier página del dashboard.',
        tips: [
          'Disponible en plan Professional o superior',
          'También podés abrirla desde el header, al lado del botón de novedades',
          'La paleta aparece sobre la página actual sin interrumpir tu flujo',
        ],
      },
      {
        titulo: 'Buscar y ejecutar comandos',
        descripcion: 'Escribí para buscar entre más de 30 comandos disponibles.',
        tips: [
          'Navegación: buscá "turnos", "pacientes", "reportes" para ir directamente',
          'Admin: buscá "rendimiento", "auditoría", "webhooks" si tenés permisos',
          'Acciones: buscá "nuevo turno", "nuevo paciente", "exportar" para crear rápido',
          'Los comandos admin tienen un ícono de escudo para identificarlos',
          'Usá las flechas del teclado para navegar y Enter para ejecutar',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué comandos están disponibles?',
        respuesta:
          'Hay 17 comandos de navegación (todas las páginas del dashboard), 9 comandos de admin (si tenés permisos) y 6 acciones rápidas (crear turno, paciente, exportar, etc.).',
      },
      {
        pregunta: '¿Puedo personalizar los comandos?',
        respuesta:
          'No todavía, pero estamos trabajando en una versión con accesos directos configurables.',
      },
    ],
  },
  {
    id: 'panel-principal',
    titulo: 'Panel Principal',
    descripcion: 'Vista general del consultorio con métricas en tiempo real y acceso rápido',
    icono: 'LayoutDashboard',
    pasos: [
      {
        titulo: 'Tarjetas de métricas',
        descripcion: 'El panel principal muestra 4 tarjetas con los KPIs más importantes del día.',
        tips: [
          'Turnos hoy: cantidad total de turnos agendados para el día actual',
          'Pacientes nuevos: pacientes registrados en las últimas 24 horas',
          'Atenciones: turnos completados vs pendientes con indicador de progreso',
          'Alertas: notificaciones activas que requieren atención (con badge numérico)',
        ],
        enlace: { href: '/dashboard', label: 'Ir al Panel Principal' },
      },
      {
        titulo: 'Calendario de turnos',
        descripcion: 'Vista semanal del calendario con todos los turnos agendados.',
        tips: [
          'Cada turno muestra hora, paciente, médico y estado (color)',
          'Turnos virtuales tienen ícono de video',
          'Hacé clic en un turno para ver detalle o modificarlo',
          'Podés navegar entre semanas con las flechas del calendario',
        ],
      },
      {
        titulo: 'Gráfico de actividad semanal',
        descripcion: 'Evolución de turnos completados vs cancelados en los últimos 7 días.',
        tips: [
          'Barras verdes: turnos completados por día',
          'Barras amarillas: cancelaciones por día',
          'El gráfico se actualiza automáticamente cada vez que ingresás',
          'Pasá el mouse sobre cada barra para ver el detalle exacto',
        ],
      },
      {
        titulo: 'Notificaciones activas',
        descripcion: 'Alertas y recordatorios visibles directamente desde el panel.',
        tips: [
          'Las notificaciones se muestran con diferentes niveles de prioridad',
          'Urgente (rojo): requiere acción inmediata',
          'Importante (amarillo): requiere atención pronto',
          'Informativo (azul): solo para conocimiento',
          'Hacé clic en una notificación para ir directamente a la acción',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Los datos del panel se actualizan solos?',
        respuesta:
          'Sí, los datos se actualizan automáticamente cada vez que cargás la página. También podés usar el botón de recargar para forzar una actualización.',
      },
    ],
  },
  {
    id: 'onboarding',
    titulo: 'Configuración Inicial (Onboarding)',
    descripcion: 'Asistente paso a paso para configurar tu consultorio por primera vez',
    icono: 'Rocket',
    pasos: [
      {
        titulo: 'Iniciar el onboarding',
        descripcion: 'Al ingresar por primera vez, el sistema te guía con un asistente de configuración.',
        tips: [
          'Completá los pasos en orden para una configuración óptima',
          'Podés saltar pasos y completarlos después desde Ajustes',
          'El progreso se guarda automáticamente al avanzar',
          'Siempre podés volver al onboarding desde el sidebar',
        ],
        enlace: { href: '/dashboard/onboarding', label: 'Ir a Onboarding' },
      },
      {
        titulo: 'Pasos del onboarding',
        descripcion: 'El asistente cubre toda la configuración fundamental del consultorio.',
        tips: [
          'WhatsApp: conectá tu número de Twilio para habilitar comunicación con pacientes',
          'Equipo médico: registrá los profesionales del consultorio',
          'Horarios: definí días y horarios de atención',
          'Especialidades: configurá las especialidades médicas disponibles',
          'Servicios: definí los servicios que ofrece el consultorio',
          'Temas: personalizá la apariencia del dashboard (color, logo)',
          '¡Listo! Resumen final de la configuración completa',
        ],
      },
      {
        titulo: 'Saltar el onboarding',
        descripcion: 'Si ya conocés el sistema, podés omitir el asistente.',
        tips: [
          'Usá el botón "Saltar" en la parte inferior',
          'Los pasos incompletos se pueden configurar después desde Ajustes',
          'Podés volver a ejecutar el onboarding en cualquier momento',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo volver a hacer el onboarding después?',
        respuesta:
          'Sí, siempre podés acceder desde el sidebar en "Configuración Inicial" o desde Ajustes.',
      },
      {
        pregunta: '¿Qué pasa si cierro el onboarding a la mitad?',
        respuesta:
          'El progreso se guarda. Cuando vuelvas a entrar, podés continuar desde donde lo dejaste.',
      },
    ],
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones',
    descripcion: 'Centro de notificaciones con alertas inteligentes y prioridades',
    icono: 'Bell',
    pasos: [
      {
        titulo: 'Acceder a notificaciones',
        descripcion: 'Hacé clic en la campana (🔔) en el header o andá a la página de Notificaciones.',
        tips: [
          'El badge en la campana muestra la cantidad de notificaciones no leídas',
          'Las notificaciones se organizan por fecha y prioridad',
          'Podés marcar como leídas individualmente o todas juntas',
          'Las notificaciones persistentes se quedan hasta que las resuelvas',
        ],
        enlace: { href: '/dashboard/notificaciones', label: 'Ir a Notificaciones' },
      },
      {
        titulo: 'Tipos de notificaciones',
        descripcion: 'El sistema genera notificaciones automáticas para eventos importantes.',
        tips: [
          'Urgencias: mensajes de pacientes con palabras clave de emergencia',
          'Recordatorios: turnos próximos y tareas pendientes',
          'Alertas: cumpleaños, ausentismo recurrente, pacientes críticos',
          'Sistema: actualizaciones, errores de conexión, cambios de configuración',
        ],
      },
      {
        titulo: 'Niveles de prioridad',
        descripcion: 'Cada notificación tiene un nivel que determina su urgencia.',
        tips: [
          'Crítica (borde rojo): requiere atención inmediata',
          'Alta (naranja): importante, resolver pronto',
          'Normal (azul): informativa, sin urgencia',
          'Baja (gris): solo para registro, puede ignorarse',
        ],
      },
      {
        titulo: 'Silenciar notificaciones',
        descripcion: 'Podés silenciar temporalmente las notificaciones no críticas.',
        tips: [
          'Usá el toggle "Silenciar" para pausar notificaciones no urgentes',
          'Las notificaciones críticas siempre se muestran, incluso en silencio',
          'El badge de la campana se oculta al silenciar',
          'Podés reactivar las notificaciones en cualquier momento',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Las notificaciones se borran solas?',
        respuesta:
          'Las notificaciones leídas se archivan después de 7 días. Las no leídas se mantienen hasta que las marques como leídas o resueltas.',
      },
      {
        pregunta: '¿Puedo recibir notificaciones en mi celular?',
        respuesta:
          'Por ahora las notificaciones solo están disponibles dentro del dashboard. Si tenés la PWA instalada, podés recibir notificaciones push en tu dispositivo.',
      },
    ],
  },
  {
    id: 'novedades',
    titulo: 'Novedades y Actualizaciones',
    descripcion: 'Historial de cambios y nuevas funcionalidades del sistema',
    icono: 'Newspaper',
    pasos: [
      {
        titulo: 'Ver novedades',
        descripcion: 'La página de Novedades muestra un timeline con todos los cambios del sistema.',
        tips: [
          'Cada entrada muestra versión, fecha, tipo y descripción del cambio',
          'Los cambios se agrupan en: nuevas funcionalidades, mejoras y correcciones',
          'Las novedades se generan automáticamente desde los commits de GitHub',
          'Podés hacer clic en "Ver más" para expandir la descripción completa',
        ],
        enlace: { href: '/dashboard/novedades', label: 'Ir a Novedades' },
      },
      {
        titulo: 'Generar novedades',
        descripcion: 'Las novedades se actualizan automáticamente desde el repositorio.',
        tips: [
          'Al hacer push a main en GitHub, un workflow de n8n dispara la actualización',
          'El sistema analiza los commits y los clasifica por tipo (feat, fix, improvement)',
          'Las entradas se guardan en la base de datos para consulta histórica',
          'También podés generar manualmente desde la API interna',
        ],
      },
      {
        titulo: 'Versionado semántico',
        descripcion: 'El sistema usa versionado semántico para tracking de cambios.',
        tips: [
          'Major (1.x.x): cambios grandes que pueden afectar funcionalidades existentes',
          'Minor (x.1.x): nuevas funcionalidades (se incrementa con commits feat)',
          'Patch (x.x.1): correcciones y mejoras menores',
          'La versión actual se muestra en la página Acerca de',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo ver novedades de versiones anteriores?',
        respuesta:
          'Sí, la página de Novedades muestra el historial completo con scroll infinito. También podés filtrar por tipo de cambio.',
      },
      {
        pregunta: '¿Las novedades se generan solas o las escribo yo?',
        respuesta:
          'Se generan automáticamente analizando los mensajes de commit del repositorio. Si querés detalles más específicos, podés editar la entrada desde la base de datos.',
      },
    ],
  },
  {
    id: 'configuracion-ajustes',
    titulo: 'Configuración (Ajustes)',
    descripcion: 'Centro de configuración del consultorio con pestañas organizadas',
    icono: 'Sliders',
    pasos: [
      {
        titulo: 'Pestañas de configuración',
        descripcion: 'Todas las opciones de configuración están organizadas en pestañas.',
        tips: [
          'Perfil: datos del consultorio, logo, información de contacto',
          'Horarios: días y horarios de atención por médico',
          'Notificaciones: configuración de alertas y recordatorios',
          'Plantillas: mensajes personalizados para WhatsApp',
          'Equipo: gestión de médicos y staff del consultorio',
          'Suscripción: plan actual, facturación y cambios de plan',
          'Temas: personalización visual (modo oscuro, color acento)',
        ],
        enlace: { href: '/dashboard/configuracion', label: 'Ir a Configuración' },
      },
      {
        titulo: 'Perfil del consultorio',
        descripcion: 'Configurá los datos básicos de tu consultorio.',
        tips: [
          'Nombre: el nombre visible en el dashboard y comunicaciones',
          'Logo: imagen que aparece en el header y portal del paciente',
          'Dirección: ubicación física del consultorio',
          'Teléfono: número de contacto principal',
          'RUT empresarial: para facturación chilena',
        ],
      },
      {
        titulo: 'Personalización (Temas)',
        descripcion: 'Adaptá la apariencia del dashboard a tu preferencia.',
        tips: [
          'Modo claro/oscuro: cambiá entre tema claro y oscuro',
          'Color acento: seleccioná el color principal del dashboard (azul, verde, morado, etc.)',
          'La configuración se guarda en tu navegador y se sincroniza entre dispositivos',
          'El tema se aplica inmediatamente sin recargar la página',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Los cambios en Ajustes afectan a todos los usuarios?',
        respuesta:
          'Depende. El perfil, horarios y equipo afectan a todo el consultorio. El tema y notificaciones son por usuario.',
      },
      {
        pregunta: '¿Puedo tener horarios diferentes para cada médico?',
        respuesta:
          'Sí. Cada médico puede tener su propio set de horarios. Si no se configuran horarios específicos, se usan los horarios generales del consultorio.',
      },
    ],
  },
  {
    id: 'webhooks',
    titulo: 'Webhooks',
    descripcion: 'Recepción y monitoreo de eventos entrantes (Twilio, n8n, GitHub)',
    icono: 'Webhook',
    pasos: [
      {
        titulo: 'Ver logs de webhooks',
        descripcion: 'La página de Webhooks muestra un registro de todas las solicitudes entrantes.',
        tips: [
          'Cada entrada muestra método, ruta, estado HTTP y timestamp',
          'Los errores se destacan en rojo para identificación rápida',
          'Podés filtrar por estado (éxito/error) o por ruta',
          'Los logs ayudan a diagnosticar problemas de integración',
        ],
        enlace: { href: '/dashboard/webhooks', label: 'Ir a Webhooks' },
      },
      {
        titulo: 'Endpoints principales',
        descripcion: 'El sistema expone varios webhooks para integraciones externas.',
        tips: [
          'POST /api/webhook/twilio: entrada de mensajes WhatsApp',
          'POST /api/webhook/twilio/status: actualizaciones de estado de mensajes',
          'POST /webhook/novedades-generar: dispara actualización de novedades (n8n)',
          'Cada webhook tiene su propio registro de actividad',
        ],
      },
      {
        titulo: 'Diagnóstico de errores',
        descripcion: 'Usá los logs de webhooks para identificar y resolver problemas.',
        tips: [
          'Errores 4xx: problema con la solicitud (payload inválido, faltan headers)',
          'Errores 5xx: error interno del servidor',
          'Timeouts: la respuesta tardó más de 30 segundos',
          'Si un webhook falla repetidamente, revisá la configuración del servicio externo',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Cuánto tiempo se conservan los logs?',
        respuesta:
          'Los logs de webhooks se conservan por 30 días. Después se eliminan automáticamente.',
      },
      {
        pregunta: '¿Puedo reprocesar un webhook fallido?',
        respuesta:
          'No directamente desde la interfaz. Si necesitás reprocesar un webhook, podés simular la solicitud desde la consola de Twilio o n8n.',
      },
    ],
  },
  {
    id: 'admin-n8n',
    titulo: 'Automatización n8n',
    descripcion: 'Workflows automatizados para tareas recurrentes del consultorio',
    icono: 'Network',
    pasos: [
      {
        titulo: 'Workflows activos',
        descripcion: 'n8n ejecuta workflows automáticos en segundo plano para diversas tareas.',
        tips: [
          'Recordatorios de turnos: envío automático 24h antes del turno',
          'Resumen diario: reporte matutino con turnos y alertas del día',
          'Backup diario: respaldo automático de BD a las 3:00 AM',
          'Novedades: actualización automática desde commits de GitHub',
          'Correo inteligente: gestión de correos del consultorio',
        ],
        enlace: { href: '/dashboard/admin/n8n', label: 'Ir a n8n' },
      },
      {
        titulo: 'Estado del servicio',
        descripcion: 'El panel de n8n muestra el estado actual de la automatización.',
        tips: [
          'Indicador verde: n8n funcionando correctamente',
          'Indicador rojo: servicio caído o error de conexión',
          'Podés ver la última ejecución de cada workflow',
          'Los errores de ejecución se muestran con detalle',
        ],
      },
      {
        titulo: 'Workflows disponibles (vía n8n)',
        descripcion: 'Workflows configurados en n8n para automatización del consultorio:',
        tips: [
          'WF-02 Gestión de Turnos: procesa solicitudes de turno vía WhatsApp',
          'WF-03 Recordatorios: envía recordatorios automáticos 24h antes',
          'WF-04 Correo Inteligente: gestión IMAP/SMTP',
          'WF-05 Resumen Diario: reporte diario al médico',
          'WF-06 Recetas: gestión de recetas y renovaciones',
          'WF-08 Google Calendar Sync: sincronización con Google Calendar',
          'WF-09 Anonimizar: anonimización de datos para testing',
          'WF-10 Expiracion Waitlist: gestión de vencimiento de lista de espera',
          'WF-11 Novedades: actualización automática de novedades desde GitHub',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo crear mis propios workflows?',
        respuesta:
          'Sí, si tenés conocimientos técnicos podés acceder a n8n desde n8n.aicorebots.com y crear tus propias automatizaciones. Los workflows personalizados están disponibles en plan Enterprise.',
      },
      {
        pregunta: '¿Los workflows afectan el rendimiento del dashboard?',
        respuesta:
          'No, n8n corre como un servicio independiente en el servidor. No afecta el rendimiento del dashboard ni la atención a pacientes.',
      },
    ],
  },
  {
    id: 'admin-tenants-sucursales',
    titulo: 'Tenants y Sucursales (Admin)',
    descripcion: 'Administración multi-tenant y multi-sucursal para redes médicas',
    icono: 'Building2',
    pasos: [
      {
        titulo: 'Tenants (redes médicas)',
        descripcion: 'Gestioná múltiples consultorios desde un solo panel de administración.',
        tips: [
          'Disponible en plan Enterprise',
          'Cada tenant es un consultorio independiente con su propia configuración',
          'Los datos de cada tenant están aislados (base de datos separada)',
          'Podés crear, suspender o eliminar tenants desde este panel',
        ],
        enlace: { href: '/dashboard/admin/tenants', label: 'Ir a Tenants' },
      },
      {
        titulo: 'Sucursales',
        descripcion: 'Administrá múltiples sucursales de un mismo consultorio.',
        tips: [
          'Disponible en plan Enterprise',
          'Cada sucursal tiene sus propios médicos, horarios y turnos',
          'Los pacientes pueden atenderse en cualquier sucursal',
          'Las métricas se pueden ver por sucursal o consolidadas',
        ],
        enlace: { href: '/dashboard/admin/sucursales', label: 'Ir a Sucursales' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Los pacientes pueden ver todas las sucursales?',
        respuesta:
          'Depende de la configuración. Pueden ver solo la sucursal donde se atienden o todas las sucursales del consultorio.',
      },
      {
        pregunta: '¿Cada tenant tiene su propia base de datos?',
        respuesta:
          'Sí, cada tenant tiene datos completamente aislados en su propio esquema de base de datos para garantizar privacidad y seguridad.',
      },
    ],
  },
  {
    id: 'proxy-arquitectura',
    titulo: 'Proxy y Sistema Multi-Agente',
    descripcion: 'Arquitectura del proxy de seguridad y los agentes de IA conversacionales',
    icono: 'Shield',
    pasos: [
      {
        titulo: 'Proxy de Seguridad (Next.js 16+)',
        descripcion: 'El proxy reemplaza al middleware tradicional de Next.js. Se encarga de la seguridad y autenticación de todas las peticiones.',
        tips: [
          'Migrado de middleware.ts a proxy.ts en julio 2026',
          'Inyecta headers de seguridad: CSP, HSTS, COOP, COEP, CORP',
          'Aplica rate limiting: login 5/min, API 120/min, magic link 3/min',
          'Detecta el tenant por subdominio y lo pasa como header x-tenant-id',
          'Protege rutas del dashboard (requiere sesión) y del portal (requiere portal_session)',
        ],
      },
      {
        titulo: 'WF-01: WhatsApp Multi-Agente',
        descripcion: 'El workflow de WhatsApp usa 2 agentes de IA especializados con handoff conversacional.',
        tips: [
          'Triaje Agent: saluda, responde info general, clasifica intención y decide si deriva',
          'Agenda Agent: crea, cancela, modifica y consulta turnos',
          'Handoff: cuando Triaje detecta una solicitud de turno, emite ###HANDOFF### y deriva a Agenda',
          'Memoria compartida: ambos agentes usan el mismo Postgres Chat Memory (sessionKey=teléfono)',
          'El paciente no nota el cambio de agente — la conversación fluye naturalmente',
        ],
      },
      {
        titulo: 'ADRs (Architecture Decision Records)',
        descripcion: 'Decisiones de arquitectura documentadas en el repositorio.',
        tips: [
          'ADR-0001 reemplazado por ADR-0006 (multi-agente especializado con handoff)',
          'ADR-0002: Pre-carga de datos vs toolCode (vigente)',
          'ADR-0006 documenta la arquitectura multi-agente actual',
          'Los ADRs están en docs/decisiones/ del repositorio',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Qué pasa si el Triaje Agent no entiende la intención?',
        respuesta: 'Responde un mensaje amigable pidiendo clarificación. Si el paciente insiste con algo que no puede manejar, deriva al médico vía notificación.',
      },
      {
        pregunta: '¿Los agentes recuerdan conversaciones anteriores?',
        respuesta: 'Sí. La memoria conversacional se guarda en PostgreSQL (n8n_chat_histories) asociada al número de WhatsApp del paciente. La ventana de contexto es de 10 mensajes.',
      },
    ],
  },
  {
    id: 'transcripcion-soap',
    titulo: 'Transcripción Automática y SOAP por IA',
    descripcion: 'Grabación de videoconsultas, transcripción automática con Whisper y generación de notas SOAP con IA',
    icono: 'Mic',
    pasos: [
      {
        titulo: 'Configurar transcripción',
        descripcion: 'Activá la transcripción automática desde Configuración → IA.',
        tips: [
          'Disponible en plan Starter+',
          'Activá "Transcripción habilitada" y configurá horas de retención de audio',
          'Sin esta activación, las videoconsultas funcionan normalmente sin grabación',
        ],
      },
      {
        titulo: 'Consentimiento del paciente',
        descripcion: 'Al agendar una teleconsulta con transcripción activa, el paciente ve una pantalla de consentimiento antes de entrar a la sala.',
        tips: [
          'Si acepta → se inicia la grabación automática (Egress de LiveKit)',
          'Si no acepta → entra a la videollamada sin grabación',
          'El médico puede iniciar la grabación manualmente durante la llamada',
          'El consentimiento queda registrado en consentimiento_log para auditoría',
        ],
      },
      {
        titulo: 'Pipeline post-consulta',
        descripcion: 'Cuando termina la videoconsulta, el sistema procesa el audio automáticamente.',
        tips: [
          'LiveKit Egress guarda el audio grabado',
          'Whisper.cpp transcribe el audio a texto',
          'Ollama Gemma3 analiza el texto y genera una nota SOAP estructurada (S/O/A/P)',
          'La nota se guarda en estado "pendiente" marcada como generada por IA',
          'El médico recibe una notificación (Twilio + in-app) para revisarla',
        ],
      },
      {
        titulo: 'Revisar notas SOAP generadas',
        descripcion: 'Accedé desde la ficha del paciente o desde el panel de revisión.',
        tips: [
          'Abrí la nota SOAP generada: tiene los campos S/O/A/P completados por IA',
          'Podés editar cualquier campo antes de aprobar',
          'Al aprobar → la nota se guarda definitivamente, el audio se elimina',
          'Al rechazar → la nota se elimina por completo, el audio se elimina',
          'Si no revisás en 48h → el sistema elimina el audio y conserva la transcripción textual',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Dónde se procesa el audio? ¿Se envía a servidores externos?',
        respuesta: 'No. Todo el procesamiento es 100% local en tu VPS: Whisper.cpp corre en Docker, Ollama con Gemma3 también. Ningún dato sale del servidor.',
      },
      {
        pregunta: '¿Qué modelo de Whisper se usa?',
        respuesta: 'Whisper.cpp con modelo "small" (~500MB). Corre eficientemente en CPU y tiene buena precisión para español.',
      },
      {
        pregunta: '¿Qué pasa con el audio después de la transcripción?',
        respuesta: 'Se elimina automáticamente cuando el médico aprueba o rechaza la nota. Si no revisa en 48 horas, el sistema elimina el audio pero conserva la transcripción textual.',
      },
    ],
  },
  {
    id: 'documentos-ocr',
    titulo: 'Documentos Médicos con OCR',
    descripcion: 'Subí documentos desde el portal del paciente, extraé datos automáticamente con IA especializada y revisalos en el dashboard',
    icono: 'Scan',
    pasos: [
      {
        titulo: 'Paciente sube documento',
        descripcion: 'Desde el Portal del Paciente, se puede subir una foto o PDF de cualquier documento médico.',
        tips: [
          'Formatos aceptados: JPG, PNG, PDF',
          'Tamaño máximo: 20MB',
          'Ejemplos: estudios de laboratorio, recetas externas, certificados, órdenes médicas',
          'Antes de subir, seleccioná el tipo de documento (laboratorio, receta, etc.)',
          'La subida dispara automáticamente el proceso OCR',
        ],
      },
      {
        titulo: 'OCR especializado por tipo de documento',
        descripcion: 'Ollama llava usa prompts específicos según el tipo de documento para extraer datos estructurados precisos.',
        tips: [
          'Modelo llava (~4GB) corre 100% local en el VPS',
          'Laboratorio: extrae tipo de examen, fecha, laboratorio, valores con nombre/unidad/rango/flags',
          'Receta: extrae medicamento, dosis, frecuencia, duración, indicaciones',
          'Otros documentos: extracción genérica con texto completo',
          'Devuelve confianza de extracción (0-100%)',
          'Si falla o confianza baja, el documento queda marcado para revisión manual',
        ],
      },
      {
        titulo: 'Confirmación del paciente',
        descripcion: 'El paciente ve los datos extraídos y puede confirmar, editar o descartar.',
        tips: [
          'Si los datos son correctos → Confirma (pasa a revisión médica)',
          'Si hay errores → Edita manualmente los campos antes de confirmar',
          'También puede ver la imagen original haciendo clic en "Ver original"',
          'Si no sirve → Descarta el documento',
        ],
      },
      {
        titulo: 'Revisión médica en Dashboard',
        descripcion: 'El médico revisa los documentos desde la ficha del paciente con opciones de Aprobar, Rechazar o Editar.',
        tips: [
          'Accedé al tab "Documentos" en la ficha del paciente',
          'Estado pendiente: documentos sin revisar (requieren acción)',
          'Aprobar: los datos extraídos se integran al historial médico del paciente',
          'Rechazar: se solicita un motivo y el documento se elimina',
          'Editar: permite modificar los datos extraídos antes de guardar',
          'Disponible en plan Starter+',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿El OCR es preciso con fotos de mala calidad?',
        respuesta: 'Depende de la calidad de la imagen. Fotos bien iluminadas y enfocadas tienen alta precisión. Si el OCR falla o tiene baja confianza, el documento se marca para revisión manual del médico.',
      },
      {
        pregunta: '¿Qué modelo de IA se usa para el OCR?',
        respuesta: 'Ollama llava, un modelo de visión-lenguaje que corre 100% local en tu VPS. No se envía ninguna imagen a servidores externos.',
      },
      {
        pregunta: '¿Los documentos aprobados quedan en el historial?',
        respuesta: 'Sí. Cuando el médico aprueba un documento, los datos extraídos se guardan como una entrada estructurada en el historial médico del paciente, visible tanto en el dashboard como en el portal.',
      },
    ],
  },
  {
    id: 'fhir-export',
    titulo: 'Exportación FHIR-lite',
    descripcion: 'Exportá el historial clínico de pacientes en formato FHIR R4 simplificado para interoperabilidad',
    icono: 'FileDown',
    pasos: [
      {
        titulo: 'Verificar consentimiento',
        descripcion: 'Antes de exportar, el paciente debe tener consentimiento firmado para exportación de datos.',
        tips: [
          'Revisá los consentimientos del paciente en su ficha',
          'Se requiere consentimiento "datos" o "consentimientoEmail" firmado',
          'Si no hay consentimiento, el endpoint devuelve error 403',
        ],
      },
      {
        titulo: 'Exportar desde la API',
        descripcion: 'Endpoint protegido que genera un Bundle FHIR R4 con los datos del paciente.',
        tips: [
          'GET /api/exportar-fhir/[pacienteId] requiere sesión de médico/admin',
          'Devuelve Content-Type: application/fhir+json',
          'Headers: X-FHIR-Version: 4.0.1, X-FHIR-Profile: simplified',
          'Incluye disclaimer de que es FHIR-lite (no certificado HL7 FHIR)',
        ],
      },
      {
        titulo: 'Datos incluidos en el Bundle',
        descripcion: 'El Bundle FHIR contiene 4 tipos de recursos del paciente.',
        tips: [
          'Patient: datos demográficos, RUT, fecha de nacimiento, contacto',
          'Encounter[]: turnos con estado, médico, fecha, motivo de consulta',
          'Condition[]: diagnósticos desde historial clínico y notas SOAP con codificación ICD-10',
          'MedicationRequest[]: recetas con dosis, frecuencia, duración e indicaciones',
        ],
      },
      {
        titulo: 'Disponibilidad por plan',
        descripcion: 'La exportación FHIR-lite está disponible en plan Professional+.',
        tips: [
          'Plan Starter: no incluye exportación FHIR',
          'Plan Professional+: acceso completo a exportación FHIR-lite',
          'Feature gate: fhir-export',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Es compatible con HL7 FHIR oficial?',
        respuesta: 'Es FHIR-lite: usa el formato y estructura de FHIR R4 pero no está certificado por HL7. Es útil para interoperabilidad básica con otros sistemas que soporten FHIR.',
      },
      {
        pregunta: '¿Qué datos del paciente se exportan?',
        respuesta: 'Datos demográficos, turnos (encounters), diagnósticos (conditions) y recetas (medication requests). No incluye documentos adjuntos, conversaciones ni datos de facturación.',
      },
      {
        pregunta: '¿Se necesita consentimiento del paciente?',
        respuesta: 'Sí. El paciente debe haber firmado un consentimiento de exportación de datos. Si no está firmado, el endpoint devuelve 403 Forbidden.',
      },
    ],
  },
  {
    id: 'integraciones',
    titulo: 'Integraciones y Webhooks',
    descripcion: 'Configuración de webhooks salientes para conectar AicoreMed con tus sistemas externos',
    icono: 'Webhook',
    pasos: [
      {
        titulo: '1. Crear un webhook',
        descripcion: 'En Configuración → Integraciones, hacé clic en "Agregar Webhook". Seleccioná el evento (turno creado, paciente actualizado, etc.) y la URL donde recibirás las notificaciones.',
        tips: [
          'La URL debe ser HTTPS (no HTTP)',
          'Los eventos disponibles son: turno.creado, turno.actualizado, turno.cancelado, paciente.creado, paciente.actualizado, receta.creada, derivacion.creada, pago.completado',
          'Cada webhook recibe un secreto HMAC único generado automáticamente',
        ],
      },
      {
        titulo: '2. Verificar la firma HMAC',
        descripcion: 'Cada webhook incluye headers de verificación: X-Webhook-Signature (sha256=<hmac>), X-Webhook-Timestamp y X-Webhook-Event. Tu sistema debe verificar la firma con el secreto usando HMAC-SHA256.',
        tips: [
          'El payload se firma como JSON.stringify(body)',
          'Usá timingSafeEqual para comparación segura',
          'El timestamp permite evitar replay attacks (recomendado tolerancia 5 min)',
        ],
      },
      {
        titulo: '3. Monitorear entregas',
        descripcion: 'Cada webhook tiene logs de delivery visibles en la misma interfaz. Podés ver status code, tiempo de respuesta, número de intentos y errores.',
        tips: [
          '3 reintentos automáticos con backoff exponencial (1s, 2s, 4s)',
          'Si fallan todos los reintentos, el webhook se marca con estado "error"',
          'Podés probar un webhook manualmente con el botón "Probar"',
          'Si necesitás regenerar el secreto, usá la opción en el menú de cada webhook',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Los webhooks funcionan en cualquier plan?',
        respuesta: 'Los webhooks salientes están disponibles en planes Professional y superiores. En Starter podés recibir webhooks entrantes desde n8n, pero no configurar webhooks salientes.',
      },
      {
        pregunta: '¿Puedo tener múltiples webhooks para el mismo evento?',
        respuesta: 'Sí. Podés crear varios webhooks para el mismo evento, cada uno con una URL y secreto diferente. Todos recibirán el payload cuando el evento ocurra.',
      },
    ],
  },
  {
    id: 'acerca-de',
    titulo: 'Acerca de',
    descripcion: 'Información del sistema, versión, créditos y documentación técnica',
    icono: 'Info',
    pasos: [
      {
        titulo: 'Versión del sistema',
        descripcion: 'La página Acerca de muestra la versión actual del dashboard.',
        tips: [
          'La versión sigue el formato semántico (ej: v1.16.0)',
          'Incluye fecha de último despliegue',
          'Muestra el número de funcionalidades activas actualmente',
          'Podés ver el hash del commit actual para referencia técnica',
        ],
        enlace: { href: '/dashboard/acerca', label: 'Ir a Acerca de' },
      },
      {
        titulo: 'Stack tecnológico',
        descripcion: 'Tecnologías utilizadas en el sistema.',
        tips: [
          'Frontend: Next.js 16 + Tailwind CSS + shadcn/ui',
          'Base de datos: PostgreSQL 16 con Drizzle ORM',
          'IA Local: Ollama + Gemma3 (todo corre en tu servidor)',
          'Automatización: n8n self-hosted',
          'Comunicaciones: Twilio (WhatsApp, SMS, voz)',
          'Videoconsultas: LiveKit self-hosted',
        ],
      },
      {
        titulo: 'Landing page',
        descripcion: 'Información sobre la página de aterrizaje pública.',
        tips: [
          'La landing muestra features, planes y precios del sistema',
          'Total de funcionalidades: 76+ distribuidas en 5 planes',
          'Incluye sección de FAQ, comparativa de planes y contacto',
          'Accesible desde med.aicorebots.com',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Cada cuánto se actualiza la versión?',
        respuesta:
          'Las actualizaciones se despliegan automáticamente cuando hay cambios en la rama main del repositorio. El versionado semántico se actualiza según el tipo de cambios.',
      },
    ],
  },
];

export function getSeccionAyuda(id: string): AyudaSeccion | undefined {
  return SECCIONES_AYUDA.find((s) => s.id === id);
}

export function getAyudaSidebarLinks() {
  return SECCIONES_AYUDA.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    icono: s.icono,
  }));
}
