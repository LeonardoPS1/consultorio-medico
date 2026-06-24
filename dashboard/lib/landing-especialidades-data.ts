import type { FeatureItem } from '@/components/landing/features';
import type { FAQItem } from '@/components/landing/faq';
import type { TestimonialItem } from '@/components/landing/testimonials';
import type { HeroProps } from '@/components/landing/hero';
import type { CTASectionProps } from '@/components/landing/cta-section';
import {
  Calendar,
  MessageSquare,
  Bot,
  BarChart3,
  Users,
  Shield,
  Smartphone,
  Stethoscope,
  Eye,
  Sparkles,
  HeartPulse,
  Syringe,
  Video,
} from 'lucide-react';

export interface EspecialidadPageData {
  slug: string;
  metadata: { title: string; description: string };
  hero: HeroProps;
  featuresTitle: string;
  featuresSubtitle: string;
  features: FeatureItem[];
  faq: FAQItem[];
  testimonials: TestimonialItem[];
  cta: CTASectionProps;
}

/* ─── ODONTOLOGÍA ─── */
export const odontologia: EspecialidadPageData = {
  slug: 'odontologia',
  metadata: {
    title: 'Software de Gestión de Turnos para Odontología | AiCoreMed Chile',
    description:
      'Agenda automática, recordatorios por WhatsApp y asistente IA para clínicas dentales. Gestiona pacientes, recetas digitales y reportes. Sin costos de API. Prueba gratis 14 días.',
  },
  hero: {
    badgeText: 'IA local · Sin costos de API · Datos 100% privados',
    titleNormal: 'Gestiona tu clínica dental',
    titleHighlight: 'con IA',
    subtitle:
      'Turnos, recordatorios automáticos, historial clínico digital y un asistente con IA local para tu consultorio odontológico. Todo en un solo panel, sin configuraciones complejas.',
    subtitleBold: 'Reduce ausentismo dental hasta un 85%.',
    stats: [
      { value: '85%', label: 'menos ausentismo' },
      { value: '10h+', label: 'ahorradas/semana' },
      { value: '24/7', label: 'atención con IA' },
    ],
  },
  featuresTitle: 'Todo lo que necesita tu clínica dental',
  featuresSubtitle:
    'Desde la gestión de turnos hasta reportes avanzados, pasando por WhatsApp con IA local. Todo integrado, sin depender de servicios externos.',
  features: [
    {
      icon: Calendar,
      title: 'Agenda Odontológica Inteligente',
      desc: 'Calendario interactivo con vista por sillón dental, odontólogo y especialidad. Programá, reprogramá y gestioná pacientes en tiempo real sin conflictos de horario.',
    },
    {
      icon: MessageSquare,
      title: 'Recordatorios por WhatsApp',
      desc: 'Tus pacientes reciben recordatorios automáticos de sus citas dentales por WhatsApp. Reducí las inasistencias y optimizá tu agenda al máximo.',
    },
    {
      icon: Bot,
      title: 'Asistente IA para Odontólogos',
      desc: 'La IA agenda turnos, responde consultas frecuentes y gestiona cancelaciones automáticamente. Sin costos de API externas, sin enviar datos a la nube.',
    },
    {
      icon: Syringe,
      title: 'Recetas Digitales',
      desc: 'Creá y enviá recetas dentales por WhatsApp al instante. Con historial de recetas activas y vencidas por paciente. Portal público de verificación con QR.',
    },
    {
      icon: BarChart3,
      title: 'Reportes del Consultorio',
      desc: 'Dashboard con KPIs en tiempo real: ingresos mensuales, tasa de ausentismo, tratamientos realizados y más. Exportá a Excel o PDF.',
    },
    {
      icon: Users,
      title: 'Fichas de Pacientes Dentales',
      desc: 'Ficha completa con odontograma digital, historia clínica, radiografías, tratamientos realizados y plan de trabajo. Todo sincronizado y accesible.',
    },
    {
      icon: Shield,
      title: 'Seguridad y Auditoría',
      desc: 'Autenticación 2FA, rate limiting, registro de accesos y backup encriptado automático. Cumplimiento de normativas de salud chilenas.',
    },
    {
      icon: Stethoscope,
      title: 'Videoconsultas Odontológicas',
      desc: 'Consultas virtuales con videollamada integrada vía LiveKit. Creá turnos virtuales, el link se genera automáticamente y el paciente lo recibe por WhatsApp. Sin descargas ni instalaciones.',
    },
  ],
  faq: [
    {
      q: '¿AiCoreMed funciona para clínicas dentales con múltiples odontólogos?',
      a: 'Sí. AiCoreMed soporta múltiples odontólogos, sillones dentales y especialidades. Cada profesional tiene su propia agenda y perfil, y la IA deriva pacientes según la especialidad requerida.',
    },
    {
      q: '¿Puedo integrar odontograma digital?',
      a: 'AiCoreMed incluye fichas de pacientes con historial clínico dental completo. Podés registrar tratamientos, planes de trabajo y hacer seguimiento por pieza dental desde el dashboard.',
    },
    {
      q: '¿Los pacientes pueden sacar turno por WhatsApp sin llamar?',
      a: 'Sí. La IA de AiCoreMed recibe mensajes de WhatsApp, agenda turnos según disponibilidad del odontólogo y confirma automáticamente. Sin intervención del personal administrativo.',
    },
    {
      q: '¿Cómo se manejan las cancelaciones de último momento?',
      a: 'Cuando un paciente cancela, la IA libera el turno al instante y contacta automáticamente a pacientes en lista de espera para ofrecerles esa hora. Reducís las horas muertas a casi cero.',
    },
    {
      q: '¿Se pueden enviar recetas dentales por WhatsApp?',
      a: 'Sí. Creás la receta digital en el sistema y se envía automáticamente por WhatsApp al paciente con un código QR de verificación. El paciente la tiene siempre en su teléfono.',
    },
    {
      q: '¿Necesito conocimientos técnicos para usar AiCoreMed en mi clínica dental?',
      a: 'No. AiCoreMed está diseñado para odontólogos, no para programadores. Nosotros hacemos la configuración inicial. El asistente IA y las automatizaciones funcionan solas desde el día uno.',
    },
  ],
  testimonials: [
    {
      text: 'Desde que implementamos AiCoreMed, nuestras citas dentales se llenan un 30% más rápido y redujimos los ausentes en un 85%. La IA de WhatsApp agenda mientras nosotros atendemos pacientes.',
      author: 'Dra. María González',
      role: 'Clínica Dental Salud, Santiago',
    },
    {
      text: 'El asistente con IA local nos permite tener respuestas inteligentes 24/7 sin depender de APIs externas. Ahorramos al menos 2 horas por día en gestión administrativa.',
      author: 'Dr. Roberto Martínez',
      role: 'Odontólogo, Viña del Mar',
    },
    {
      text: 'La automatización de recordatorios transformó nuestra clínica. Pasamos de perder el 25% de los turnos a tener menos del 5% de ausentismo. Los pacientes valoran el recordatorio por WhatsApp.',
      author: 'Centro Dental Cordillera',
      role: 'Santiago, Chile',
    },
    {
      text: 'Tener la ficha del paciente con su historial dental completo en un solo lugar nos ahorra horas de búsqueda. La integración con WhatsApp es impecable.',
      author: 'Clínica Dental del Pacífico',
      role: 'Viña del Mar, Chile',
    },
  ],
  cta: {
    title: '¿Listo para digitalizar tu clínica dental?',
    subtitle:
      'Empezá hoy. En 5 minutos tenés todo configurado para tu consultorio odontológico. Sin compromisos, sin tarjeta.',
    badgeText: 'Sin tarjeta de crédito · Sin compromisos',
  },
};

/* ─── CLÍNICAS MÉDICAS ─── */
export const clinicasMedicas: EspecialidadPageData = {
  slug: 'clinicas-medicas',
  metadata: {
    title: 'Sistema de Gestión para Clínicas Médicas con WhatsApp | AiCoreMed Chile',
    description:
      'Agenda turnos, automatiza WhatsApp, gestiona historiales clínicos e historias médicas con IA local. Para clínicas, centros médicos y consultorios en Chile. Prueba gratis 14 días.',
  },
  hero: {
    badgeText: 'IA local · Sin costos de API · Datos 100% privados',
    titleNormal: 'Gestioná tu clínica médica',
    titleHighlight: 'con IA',
    subtitle:
      'Agendá turnos, automatizá WhatsApp, gestioná historias clínicas y recetas digitales con un asistente de IA local. Todo en un solo panel.',
    subtitleBold: 'Ahorrá hasta 10 horas por semana en gestión.',
    stats: [
      { value: '85%', label: 'menos ausentismo' },
      { value: '10h+', label: 'ahorradas/semana' },
      { value: '24/7', label: 'atención con IA' },
    ],
  },
  featuresTitle: 'Todo lo que necesita tu centro médico',
  featuresSubtitle:
    'Gestión integral para clínicas médicas con múltiples especialidades, médicos y sucursales. Automatización con IA local y WhatsApp integrado.',
  features: [
    {
      icon: Calendar,
      title: 'Agenda Médica Multi-especialidad',
      desc: 'Calendario interactivo con vista por médico, especialidad y sucursal. Programá turnos en tiempo real con detección automática de conflictos de horario.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Médico Integrado',
      desc: 'Tus pacientes agendan turnos, consultan recetas y reciben recordatorios por WhatsApp. La IA responde al instante sin intervención del personal.',
    },
    {
      icon: Bot,
      title: 'Asistente IA Local',
      desc: 'Asistente con IA local que entiende el contexto de cada paciente. Sin costos de API externas, sin enviar datos médicos a la nube. Privacidad total.',
    },
    {
      icon: HeartPulse,
      title: 'Historia Clínica con CIE-10',
      desc: 'Fichas de pacientes con historial clínico completo, notas SOAP, códigos CIE-10, evolución y certificados médicos digitales con verificación QR.',
    },
    {
      icon: Syringe,
      title: 'Recetas y Certificados Digitales',
      desc: 'Creá, gestioná y enviá recetas médicas y certificados por WhatsApp con QR de verificación. Portal público para validación desde cualquier dispositivo.',
    },
    {
      icon: BarChart3,
      title: 'Reportes Clínicos Analíticos',
      desc: 'Dashboard con KPIs en tiempo real: ocupación de consultorios, ingresos por médico, tasa de derivaciones y más. Exportá a Excel o PDF.',
    },
    {
      icon: Video,
      title: 'Telemedicina en Vivo',
      desc: 'Videoconsultas integradas con LiveKit para consultas virtuales. El link se genera automáticamente al crear el turno y el paciente lo recibe por WhatsApp. Acceso multiplataforma sin descargas.',
    },
    {
      icon: Shield,
      title: 'Seguridad Sanitaria',
      desc: 'Autenticación 2FA, auditoría de accesos, backup encriptado automático y cumplimiento de normativas de salud chilenas. Datos 100% protegidos.',
    },
  ],
  faq: [
    {
      q: '¿AiCoreMed sirve para clínicas con múltiples especialidades?',
      a: 'Sí. AiCoreMed está diseñado para centros médicos con múltiples especialidades, médicos y sucursales. Cada profesional tiene su agenda independiente y podés gestionar turnos por especialidad.',
    },
    {
      q: '¿Cómo se integra el envío de certificados médicos?',
      a: 'Generás el certificado con un solo clic desde la ficha del paciente. Se envía automáticamente por WhatsApp con un código QR único que permite verificar su autenticidad desde cualquier dispositivo.',
    },
    {
      q: '¿Los pacientes pueden agendar turnos sin llamar?',
      a: 'Sí. La IA responde por WhatsApp 24/7, agenda turnos según disponibilidad del médico y confirma automáticamente. También podés ofrecer autogestión desde el portal del paciente.',
    },
    {
      q: '¿Es seguro almacenar historias clínicas en la nube?',
      a: 'Todos los datos se almacenan en tu propio servidor PostgreSQL en Chile. La IA corre localmente con Ollama. Sin datos médicos enviados a servicios externos. Cumplimos normativas de salud.',
    },
    {
      q: '¿Se pueden gestionar varias sucursales?',
      a: 'Sí. AiCoreMed soporta múltiples sucursales con configuración independiente de horarios, médicos y especialidades. Los reportes se pueden ver por sucursal o consolidados.',
    },
    {
      q: '¿Necesito conocimientos técnicos para implementarlo?',
      a: 'No. Nosotros hacemos la configuración inicial. El dashboard es intuitivo y el asistente IA funciona automáticamente desde el día uno. Incluye capacitación online.',
    },
  ],
  testimonials: [
    {
      text: 'Implementar AiCoreMed en nuestro centro médico fue transformador. La IA agenda turnos por WhatsApp mientras nuestros recepcionistas atienden a los pacientes en sala.',
      author: 'Dr. Andrés Muñoz',
      role: 'Director Médico, Clínica Los Andes',
    },
    {
      text: 'Redujimos el ausentismo de 25% a menos del 5% con los recordatorios automáticos. La gestión de historias clínicas con CIE-10 nos ahorra horas de documentación.',
      author: 'Centro Médico Cordillera',
      role: 'Santiago, Chile',
    },
    {
      text: 'Poder emitir certificados médicos con QR verificable desde la ficha del paciente nos salvó. Los pacientes los reciben al instante por WhatsApp.',
      author: 'Dra. Carolina Rivas',
      role: 'Médico General, Viña del Mar',
    },
    {
      text: 'La IA local fue clave para nosotros. No enviamos datos de pacientes a ningún servicio externo y el asistente entiende perfectamente el contexto de cada consulta.',
      author: 'Clínica Médica del Pacífico',
      role: 'Valparaíso, Chile',
    },
  ],
  cta: {
    title: '¿Listo para transformar tu centro médico?',
    subtitle:
      'Empezá hoy. En 5 minutos tenés todo configurado para tu clínica. Sin compromisos, sin tarjeta.',
    badgeText: 'Sin tarjeta de crédito · Sin compromisos',
  },
};

/* ─── ESTÉTICA ─── */
export const estetica: EspecialidadPageData = {
  slug: 'estetica',
  metadata: {
    title: 'Agenda Automática para Centros de Estética con IA | AiCoreMed Chile',
    description:
      'Agenda inteligente, WhatsApp automatizado y gestión de pacientes para centros de estética, depilación láser, cosmetología y spa. IA local sin costos de API. Prueba gratis 14 días.',
  },
  hero: {
    badgeText: 'IA local · Sin costos de API · Datos 100% privados',
    titleNormal: 'Gestioná tu centro de estética',
    titleHighlight: 'con IA',
    subtitle:
      'Agendá turnos, automatizá WhatsApp, gestioná fichas de pacientes y promociones con un asistente de IA local. Todo en un solo panel, sin complicaciones.',
    subtitleBold: 'Ahorrá hasta 10 horas por semana.',
    stats: [
      { value: '85%', label: 'menos ausentismo' },
      { value: '10h+', label: 'ahorradas/semana' },
      { value: '24/7', label: 'atención con IA' },
    ],
  },
  featuresTitle: 'Todo lo que necesita tu centro de estética',
  featuresSubtitle:
    'Gestión inteligente para centros de estética, depilación, cosmetología y spa. Automatización con IA local y WhatsApp integrado.',
  features: [
    {
      icon: Calendar,
      title: 'Agenda para Estética Inteligente',
      desc: 'Calendario interactivo con vista por profesional, tratamiento y cabina. Programá turnos con duración variable según cada procedimiento estético.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Automatizado',
      desc: 'Tus pacientes reservan turnos, consultan precios y reciben recordatorios por WhatsApp automáticamente. La IA responde al instante, incluso fuera del horario.',
    },
    {
      icon: Bot,
      title: 'Asistente IA para Estética',
      desc: 'La IA recomienda tratamientos según el historial del paciente, agenda recordatorios de sesiones y responde consultas sobre precios y disponibilidad 24/7.',
    },
    {
      icon: Sparkles,
      title: 'Fichas con Historial de Tratamientos',
      desc: 'Registrá cada sesión: fotos de evolución, productos utilizados, contraindaciones y protocolos. Historial completo del paciente con línea de tiempo visual.',
    },
    {
      icon: Users,
      title: 'Gestión de Pacientes',
      desc: 'Ficha completa con datos de contacto, historial de tratamientos, paquetes adquiridos y sesiones restantes. Segmentación por tipo de tratamiento.',
    },
    {
      icon: BarChart3,
      title: 'Reportes del Centro',
      desc: 'Dashboard con KPIs: ocupación de profesionales, ingresos por tratamiento, tasa de retorno de pacientes, venta de paquetes y más. Exportá a Excel o PDF.',
    },
    {
      icon: Shield,
      title: 'Seguridad y Privacidad',
      desc: 'Autenticación 2FA, backup encriptado y datos almacenados en tu servidor en Chile. La IA corre localmente sin enviar información a servicios externos.',
    },
    {
      icon: Video,
      title: 'Telemedicina para Estética',
      desc: 'Consultas virtuales con videollamada integrada. Creá turnos virtuales para seguimiento de tratamientos, consultas post-procedimiento y evaluación de resultados a distancia.',
    },
  ],
  faq: [
    {
      q: '¿AiCoreMed funciona para centros de estética con múltiples tratamientos?',
      a: 'Sí. Podés configurar distintos tipos de tratamientos estéticos con duraciones variables, profesionales asignados y precios. La IA agenda según la disponibilidad de cada profesional.',
    },
    {
      q: '¿Puedo llevar el registro de fotos de evolución de mis pacientes?',
      a: 'Sí. La ficha del paciente permite adjuntar fotos de evolución con fecha y notas. Creás una línea de tiempo visual del progreso del tratamiento estético.',
    },
    {
      q: '¿Los pacientes pueden reservar turnos por WhatsApp sin llamar?',
      a: 'Sí. La IA recibe mensajes de WhatsApp, consulta disponibilidad y agenda turnos automáticamente. También responde consultas sobre precios, duración de tratamientos y promociones.',
    },
    {
      q: '¿Se pueden gestionar paquetes de sesiones?',
      a: 'Sí. Podés crear paquetes de sesiones (ej: 6 sesiones de depilación láser), llevar control de sesiones restantes y enviar recordatorios automáticos cuando se acerca la próxima sesión.',
    },
    {
      q: '¿Los datos de mis pacientes están seguros?',
      a: 'Todos los datos se almacenan en tu propio servidor PostgreSQL en Chile. La IA corre localmente con Ollama. Sin datos enviados a servicios externos.',
    },
    {
      q: '¿Puedo probarlo antes de comprar?',
      a: 'Sí. Todos los planes incluyen 14 días de prueba gratis sin tarjeta de crédito. Configurás tu centro en minutos y probás todas las funcionalidades.',
    },
  ],
  testimonials: [
    {
      text: 'La IA agenda turnos de depilación láser por WhatsApp mientras atendemos pacientes. Redujimos las llamadas perdidas en un 70% y los pacientes pueden reservar las 24 horas.',
      author: 'Centro Estético Luz',
      role: 'Santiago, Chile',
    },
    {
      text: 'El registro de fotos de evolución con línea de tiempo nos encanta. Las pacientes ven su progreso y eso aumenta la retención. Además los recordatorios automáticos redujeron las inasistencias.',
      author: 'María José Fernández',
      role: 'Cosmetóloga, Viña del Mar',
    },
    {
      text: 'Poder gestionar paquetes de sesiones y saber cuántas le quedan a cada paciente desde el panel nos ahorra horas de administración.',
      author: 'Spa Cordillera',
      role: 'Santiago, Chile',
    },
    {
      text: 'La IA local fue clave porque manejamos datos sensibles de pacientes. Saber que ningún dato sale de nuestro servidor nos da tranquilidad absoluta.',
      author: 'Clínica Estética del Pacífico',
      role: 'Valparaíso, Chile',
    },
  ],
  cta: {
    title: '¿Listo para digitalizar tu centro de estética?',
    subtitle:
      'Empezá hoy. En 5 minutos tenés todo configurado para tu centro. Sin compromisos, sin tarjeta.',
    badgeText: 'Sin tarjeta de crédito · Sin compromisos',
  },
};

/* ─── OFTALMOLOGÍA ─── */
export const oftalmologia: EspecialidadPageData = {
  slug: 'oftalmologia',
  metadata: {
    title: 'Software de Gestión de Pacientes para Oftalmología | AiCoreMed Chile',
    description:
      'Agenda turnos, historial clínico oftalmológico, recetas digitales y WhatsApp automatizado para consultorios y clínicas oftalmológicas. IA local, sin costos de API. Prueba gratis 14 días.',
  },
  hero: {
    badgeText: 'IA local · Sin costos de API · Datos 100% privados',
    titleNormal: 'Gestioná tu consultorio oftalmológico',
    titleHighlight: 'con IA',
    subtitle:
      'Agendá turnos, gestioná historias clínicas oftalmológicas, recetas de lentes y certificados con un asistente de IA local. Todo en un solo panel.',
    subtitleBold: 'Reducí el ausentismo hasta un 85%.',
    stats: [
      { value: '85%', label: 'menos ausentismo' },
      { value: '10h+', label: 'ahorradas/semana' },
      { value: '24/7', label: 'atención con IA' },
    ],
  },
  featuresTitle: 'Todo lo que necesita tu clínica oftalmológica',
  featuresSubtitle:
    'Gestión integral para consultorios y clínicas oftalmológicas. Automatización con IA local, WhatsApp integrado y historial clínico especializado.',
  features: [
    {
      icon: Calendar,
      title: 'Agenda Oftalmológica',
      desc: 'Calendario interactivo con vista por oftalmólogo, subespecialidad y consultorio. Programá turnos con duración variable según el tipo de consulta o procedimiento.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp para Oftalmología',
      desc: 'Tus pacientes agendan consultas oftalmológicas, reciben recordatorios de controles y consultan resultados por WhatsApp. La IA responde al instante.',
    },
    {
      icon: Bot,
      title: 'Asistente IA Local',
      desc: 'Asistente con IA local que entiende el contexto oftalmológico. Agenda controles post-operatorios, responde dudas sobre cirugías y gestiona la agenda sin intervención humana.',
    },
    {
      icon: Eye,
      title: 'Historia Clínica Oftalmológica',
      desc: 'Fichas especializadas con agudeza visual, refracción, presión intraocular, fondo de ojo y más. Registro de cirugías, tratamientos y evoluciones con línea de tiempo.',
    },
    {
      icon: Syringe,
      title: 'Recetas de Lentes y Medicamentos',
      desc: 'Creá recetas de lentes oftálmicos y medicamentos directamente desde la ficha del paciente. Enviá por WhatsApp con QR de verificación automáticamente.',
    },
    {
      icon: Users,
      title: 'Gestión de Pacientes Oftalmológicos',
      desc: 'Ficha completa con historial de consultas, cirugías, tratamientos, recetas de lentes y certificados. Búsqueda por RUT, nombre o teléfono.',
    },
    {
      icon: Shield,
      title: 'Seguridad de Datos Médicos',
      desc: 'Autenticación 2FA, backup encriptado y datos almacenados en tu servidor en Chile. La IA corre localmente. Cumplimiento de normativas sanitarias.',
    },
    {
      icon: Video,
      title: 'Telemedicina Oftalmológica',
      desc: 'Consultas virtuales con videollamada integrada vía LiveKit. Ideal para controles post-operatorios, lecturas de exámenes y consultas de baja complejidad a distancia.',
    },
  ],
  faq: [
    {
      q: '¿AiCoreMed sirve para clínicas oftalmológicas con múltiples especialistas?',
      a: 'Sí. Soportamos múltiples oftalmólogos con subespecialidades (córnea, retina, glaucoma, cataratas, etc.). Cada profesional tiene su agenda independiente y la IA deriva según la especialidad.',
    },
    {
      q: '¿Se pueden registrar agudeza visual y refracción?',
      a: 'Sí. La ficha oftalmológica incluye campos específicos para agudeza visual, refracción, presión intraocular, fondo de ojo y otros exámenes. Todo con línea de tiempo para seguimiento.',
    },
    {
      q: '¿Los pacientes pueden agendar controles post-operatorios por WhatsApp?',
      a: 'Sí. La IA agenda controles automáticamente según el protocolo post-operatorio configurado. También envía recordatorios automáticos de controles programados.',
    },
    {
      q: '¿Se pueden generar recetas de lentes oftálmicos?',
      a: 'Sí. Creás la receta de lentes con los valores de graduación directamente en el sistema. Se envía por WhatsApp al paciente con un código QR de verificación.',
    },
    {
      q: '¿Cómo se gestionan las cancelaciones de cirugías?',
      a: 'Cuando un paciente cancela una cirugía o consulta, la IA libera el turno y contacta automáticamente a pacientes en lista de espera. Optimizás los tiempos quirúrgicos.',
    },
    {
      q: '¿Es seguro para datos oftalmológicos sensibles?',
      a: 'Todos los datos se almacenan en tu servidor PostgreSQL en Chile. La IA corre localmente sin enviar datos a servicios externos. Cumplimos con normativas de salud chilenas.',
    },
  ],
  testimonials: [
    {
      text: 'AiCoreMed transformó nuestra clínica oftalmológica. Los pacientes agendan consultas por WhatsApp mientras nosotros realizamos exámenes. La historia clínica oftalmológica es completa.',
      author: 'Dr. Pablo Ramírez',
      role: 'Oftalmólogo, Santiago',
    },
    {
      text: 'Los recordatorios automáticos redujeron drásticamente las inasistencias. Los pacientes agradecen el recordatorio por WhatsApp de sus controles de glaucoma y retinopatía.',
      author: 'Clínica Oftalmológica Los Andes',
      role: 'Santiago, Chile',
    },
    {
      text: 'Poder emitir recetas de lentes con la graduación exacta y enviarlas por WhatsApp al instante es increíble. Los pacientes llegan a la óptica con la receta digital.',
      author: 'Dra. Daniela Soto',
      role: 'Oftalmóloga, Viña del Mar',
    },
    {
      text: 'La IA agenda los controles post-operatorios de cataratas automáticamente según el protocolo. Ya no tenemos que llamar uno por uno para programar los controles.',
      author: 'Centro Oftalmológico del Pacífico',
      role: 'Valparaíso, Chile',
    },
  ],
  cta: {
    title: '¿Listo para digitalizar tu consultorio oftalmológico?',
    subtitle:
      'Empezá hoy. En 5 minutos tenés todo configurado para tu clínica oftalmológica. Sin compromisos, sin tarjeta.',
    badgeText: 'Sin tarjeta de crédito · Sin compromisos',
  },
};
