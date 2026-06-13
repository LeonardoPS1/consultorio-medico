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
        descripcion: 'Vinculá tu número de WhatsApp empresarial para que los pacientes puedan comunicarse con el consultorio.',
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
        enlace: { href: '/dashboard/configuracion?tab=notificaciones', label: 'Ir a Ajustes → Notificaciones' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Cuánto tiempo toma la configuración inicial?',
        respuesta: 'Aproximadamente 15-20 minutos si ya tienes las credenciales de Twilio. El asistente IA te guía paso a paso con sugerencias personalizadas.',
      },
      {
        pregunta: '¿Puedo cambiar la configuración después?',
        respuesta: 'Sí, todas las configuraciones se pueden modificar en cualquier momento desde Ajustes o Sistema (admin).',
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
        descripcion: 'Los turnos pasan por varios estados: pendiente → en_curso → atendido / cancelado.',
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
        respuesta: 'Desde la lista de turnos, haz clic en el turno y selecciona "Cancelar". También podés cancelar desde el Kanban de Atención arrastrando a la columna "Cancelados".',
      },
      {
        pregunta: '¿Los pacientes pueden pedir turno por WhatsApp?',
        respuesta: 'Sí, el asistente IA puede gestionar solicitudes de turno automáticamente. Si está habilitado, el paciente pide turno y el sistema agenda según disponibilidad.',
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
        descripcion: 'Los pacientes acceden a su información desde consultorio.aicorebots.com/portal (disponible en plan Premium+).',
        tips: [
          'Ingresan con su número de teléfono +569',
          'Reciben un magic link por WhatsApp para acceder',
          'Pueden ver turnos, recetas, historial y editar su perfil',
        ],
        enlace: { href: '/portal', label: 'Ir al Portal' },
      },
    ],
    preguntas: [
      {
        pregunta: '¿Se puede importar una lista de pacientes?',
        respuesta: 'Actualmente la carga es manual desde el panel. Está planificada la importación por Excel/CSV.',
      },
      {
        pregunta: '¿Los pacientes pueden actualizar sus datos?',
        respuesta: 'Sí, desde el Portal del Paciente pueden editar email, región, comuna y sistema de salud.',
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
        respuesta: 'Puedes marcar el turno como "Cancelado" con motivo "ausente". El sistema enviará una notificación para reagendar.',
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
        descripcion: 'Registrá la evolución del paciente usando el formato Subjetivo/Objetivo/Análisis/Plan.',
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
        respuesta: 'La Clasificación Internacional de Enfermedades (CIE-10) es el estándar mundial para diagnósticos. El sistema incluye un buscador con ~900 códigos para facilitar la selección.',
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
        descripcion: 'Cuando un paciente necesita turno pero no hay disponibilidad, podés inscribirlo en la lista.',
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
        descripcion: 'Cuando se cancela un turno, el sistema busca automáticamente el primer paciente en espera.',
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
        respuesta: 'No hay límite de tiempo. Puede esperar hasta que haya una oferta disponible o hasta que el consultorio lo retire manualmente.',
      },
    ],
  },
  {
    id: 'derivaciones',
    titulo: 'Derivaciones entre Especialistas',
    descripcion: 'Interconsultas y derivaciones de pacientes a otros especialistas con seguimiento completo',
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
        respuesta: 'Ambos. Podés elegir un médico destino específico si sabés quién debe atender, o dejar la especialidad abierta para que cualquier médico de esa área pueda tomar el caso.',
      },
      {
        pregunta: '¿El paciente recibe notificación de la derivación?',
        respuesta: 'Por ahora las notificaciones son internas entre médicos. El paciente puede enterarse cuando el médico destino lo contacte para agendar el turno.',
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
        respuesta: 'Actualmente se ejecutan manualmente desde la API. Está planificada la automatización vía n8n para ejecución diaria.',
      },
      {
        pregunta: '¿Quién recibe las notificaciones de alertas?',
        respuesta: 'Todos los médicos activos del consultorio reciben notificaciones push en el dashboard cuando se ejecutan las alertas.',
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
        respuesta: 'Las recetas son electrónicas con respaldo en base de datos. Consultá la normativa local para recetas digitales.',
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
        respuesta: 'Muestra paciente, médico, medicamentos, fecha de emisión y vigencia. Confirma que la receta fue emitida por el consultorio.',
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
        respuesta: 'El QR verifica que el certificado fue emitido por el consultorio. Cada certificado tiene un hash único que garantiza su integridad.',
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
        respuesta: 'Solo si está habilitado en Sistema → Asistente IA. Las urgencias siempre se derivan al médico. Las respuestas automáticas están limitadas a mensajes no urgentes.',
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
        respuesta: 'Sí, las plantillas son texto libre. Podés crear versiones en español, inglés o cualquier idioma que necesites.',
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
        respuesta: 'Sí, desde Ajustes → Notificaciones podés desactivar el envío automático de encuestas.',
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
        respuesta: 'No, la PWA almacena en caché los recursos necesarios y solo descarga datos cuando es necesario. Es más liviana que una app nativa.',
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
        respuesta: 'Solo usuarios con rol de administrador. Los médicos y staff no ven esta sección.',
      },
      {
        pregunta: '¿Los feature toggles afectan a todos los usuarios?',
        respuesta: 'Sí, los cambios se aplican a todo el consultorio (todos los médicos y pacientes).',
      },
      {
        pregunta: '¿Los backups son automáticos?',
        respuesta: 'Sí, n8n ejecuta un backup diario a las 3:00 AM. También podés generar backups manuales desde Sistema.',
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
        titulo: 'Cambiar de plan',
        descripcion: 'Actualiza o cancela tu suscripción.',
        tips: [
          'Los pagos se procesan via MercadoPago',
          'Puedes pagar con tarjeta de crédito o débito',
          'El cambio es inmediato al confirmar el pago',
        ],
      },
    ],
    preguntas: [
      {
        pregunta: '¿Puedo probar features Premium antes de contratar?',
        respuesta: 'Los features bloqueados muestran el plan requerido. No hay período de prueba automático, contactanos para evaluar tu caso.',
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
        respuesta: 'Verifica que el número esté escrito correctamente con +569. Si sigue sin llegar, contacta al consultorio para verificar tus datos.',
      },
    ],
  },
];

export function getSeccionAyuda(id: string): AyudaSeccion | undefined {
  return SECCIONES_AYUDA.find(s => s.id === id);
}

export function getAyudaSidebarLinks() {
  return SECCIONES_AYUDA.map(s => ({
    id: s.id,
    titulo: s.titulo,
    icono: s.icono,
  }));
}
