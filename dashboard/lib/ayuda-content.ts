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
    descripcion: 'Visualizá el rendimiento del consultorio con gráficos y métricas',
    icono: 'BarChart3',
    pasos: [
      {
        titulo: 'Panel de reportes',
        descripcion: 'Accede a estadísticas generales del consultorio.',
        tips: [
          'La pestaña General muestra KPIs principales',
          'Turnos: distribución por estado y evolución temporal',
          'Pacientes: nuevos registros y totales por período',
          'WhatsApp: volumen de mensajes y tasa de respuesta',
        ],
        enlace: { href: '/dashboard/reportes', label: 'Ir a Reportes' },
      },
      {
        titulo: 'Exportar reportes',
        descripcion: 'Descargá reportes en Excel o PDF (plan Professional+).',
        tips: [
          'Usa Exportar Excel para análisis detallado',
          'Usa Exportar PDF para compartir con el equipo',
          'Los datos incluyen el período seleccionado',
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
        ],
        enlace: { href: '/dashboard/admin/sistema', label: 'Ir a Sistema' },
      },
      {
        titulo: 'Asistente IA',
        descripcion: 'Configurá el comportamiento del asistente virtual.',
        tips: [
          'El prompt del sistema define la personalidad del asistente',
          'Temperatura baja (0.3) = respuestas más predecibles',
          'Máx. tokens controla la longitud de las respuestas',
        ],
      },
      {
        titulo: 'Credenciales',
        descripcion: 'Gestioná las credenciales de servicios externos.',
        tips: [
          'Usa el botón "Probar conexión" para verificar cada servicio',
          'Las credenciales se almacenan encriptadas (AES-256)',
          'La sincronización con n8n se hace automáticamente',
        ],
      },
      {
        titulo: 'API Pública',
        descripcion: 'Creá API keys para integraciones externas.',
        tips: [
          'Cada key tiene scopes específicos (lectura/escritura)',
          'Puedes revocar keys en cualquier momento',
          'Usa la API para conectar sistemas externos',
        ],
      },
      {
        titulo: '2FA / Seguridad',
        descripcion: 'Activá autenticación de dos factores para proteger tu cuenta.',
        tips: [
          'Disponible en plan Professional o superior',
          'Usá Google Authenticator o cualquier app TOTP',
          'Cada usuario puede activar 2FA desde su perfil',
          'Si perdés el acceso, contactá al administrador',
        ],
      },
      {
        titulo: 'Auditoría de accesos',
        descripcion: 'Registro completo de actividad de usuarios en el sistema.',
        tips: [
          'Disponible en plan Premium o superior',
          'Registra inicios de sesión, cambios y accesos',
          'Incluye IP, fecha, tipo de acción y usuario',
          'Los registros se conservan por 90 días',
        ],
        enlace: { href: '/dashboard/admin/auditoria', label: 'Ir a Auditoría' },
      },
      {
        titulo: 'Backups y Webhooks',
        descripcion: 'Gestión de respaldos de base de datos y logs de webhooks.',
        tips: [
          'Disponible en plan Premium o superior',
          'Los backups se almacenan en el servidor',
          'Podés descargar o eliminar backups manualmente',
          'Los logs de webhooks muestran actividad de Twilio y n8n',
        ],
        enlace: { href: '/dashboard/admin/backups', label: 'Ir a Backups' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Quién puede acceder a Sistema?',
        respuesta:
          'Solo usuarios con rol de administrador. Los médicos y staff no ven esta sección.',
      },
      {
        pregunta: '¿Los feature toggles afectan a todos los usuarios?',
        respuesta:
          'Sí, los cambios se aplican a todo el consultorio (todos los médicos y pacientes).',
      },
      {
        pregunta: '¿Los backups son automáticos?',
        respuesta:
          'Sí, n8n ejecuta un backup diario a las 3:00 AM. También podés generar backups manuales desde Sistema.',
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
    descripcion: 'Chat contextual con IA en cualquier página del dashboard',
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
          'Usa IA local (Gemma3) para respuestas rápidas y privadas',
        ],
      },
      {
        titulo: 'Modos del asistente',
        descripcion: 'Configurá el comportamiento del asistente según tu preferencia.',
        tips: [
          'Silencioso: solo responde cuando le preguntás, sin sugerencias automáticas',
          'Sugerente: muestra cards con sugerencias contextuales sin interrumpir',
          'Activo: chat libre con la IA, responde completo y se ofrece a revisar más datos',
          'Podés cambiar el modo desde el panel de configuración del asistente',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿El asistente usa mis datos para entrenar?',
        respuesta:
          'No. Todo corre en tu propia infraestructura con Ollama (IA local). Tus datos nunca salen del servidor.',
      },
      {
        pregunta: '¿Puedo desactivar el asistente?',
        respuesta:
          'Sí, podés cerrarlo con la X o configurarlo en modo Silencioso desde el panel de ajustes.',
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
    id: 'historial-lateral',
    titulo: 'Historial Lateral de Pacientes',
    descripcion: 'Acceso rápido a la ficha del paciente sin cambiar de página',
    icono: 'PanelRight',
    pasos: [
      {
        titulo: 'Abrir el panel lateral',
        descripcion:
          'Presioná Ctrl+Shift+P o hacé clic en el botón de paciente en el header del dashboard.',
        tips: [
          'Disponible en plan Professional o superior',
          'El panel se abre desde la derecha sin recargar la página',
          'Aparece sobre la página actual, no la reemplaza',
        ],
      },
      {
        titulo: 'Buscar pacientes',
        descripcion:
          'Usá el buscador con autocompletado inteligente para encontrar pacientes rápidamente.',
        tips: [
          'Búsqueda fuzzy: no necesitás escribir exacto, funciona con aproximaciones',
          'Muestra score de inasistencia con puntos de colores (verde/amarillo/rojo)',
          'Acciones rápidas: abrí la ficha completa o enviá WhatsApp directamente',
        ],
      },
      {
        titulo: 'Resumen del paciente',
        descripcion: 'El panel muestra un resumen completo sin abrir la ficha completa.',
        tips: [
          'Datos personales, alergias y contacto de emergencia',
          'Turnos próximos y recetas activas',
          'Última nota SOAP registrada',
          'Desde acá podés crear un nuevo turno o ver el historial completo',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo tener varios pacientes abiertos a la vez?',
        respuesta:
          'No, el panel muestra un paciente por vez. Al buscar otro, se reemplaza la vista actual.',
      },
      {
        pregunta: '¿El panel funciona en mobile?',
        respuesta:
          'Sí, se adapta al ancho de la pantalla. En mobile ocupa todo el ancho disponible como un modal.',
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
