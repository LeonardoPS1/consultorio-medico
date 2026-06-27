/**
 * Command Palette — Datos estáticos (navegación + acciones rápidas)
 *
 * Define los comandos disponibles en la paleta de comandos (Cmd+K).
 * Los items de navegación se filtran por feature gating y rol.
 * Las acciones rápidas ejecutan navegación con parámetros.
 */

import {
  LayoutDashboard,
  Rocket,
  Activity,
  Video,
  Calendar,
  Users,
  MessageSquare,
  Syringe,
  BarChart3,
  Star,
  ListChecks,
  ArrowRightLeft,
  Ban,
  FileSignature,
  Bell,
  Sliders,
  BookOpen,
  Settings,
  Building2,
  Store,
  ScrollText,
  HardDrive,
  Network,
  Webhook,
  Smartphone,
  Plus,
  FileDown,
  Search,
  UserPlus,
  CalendarPlus,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureId } from '@/lib/features';

// ============================================================
// Tipos
// ============================================================

export interface CommandItem {
  id: string;
  label: string;
  /** Texto secundario para búsqueda (keywords) */
  keywords?: string;
  icon: LucideIcon;
  href: string;
  /** Feature requerida para ver este item. Si no tiene, se oculta. */
  feature?: FeatureId;
  /** Si es true, solo visible para admins */
  adminOnly?: boolean;
  /** Grupo al que pertenece en la paleta */
  group: 'navegacion' | 'admin' | 'acciones' | 'entidad';
}

// ============================================================
// Items de navegación (sección principal)
// ============================================================

const navItems: CommandItem[] = [
  {
    id: 'nav-panel',
    label: 'Panel Principal',
    icon: LayoutDashboard,
    href: '/dashboard',
    keywords: 'dashboard home inicio kpis',
    group: 'navegacion',
  },
  {
    id: 'nav-onboarding',
    label: 'Asistente IA',
    icon: Rocket,
    href: '/dashboard/onboarding',
    feature: 'onboarding',
    keywords: 'onboarding asistente inteligencia artificial setup',
    group: 'navegacion',
  },
  {
    id: 'nav-atencion',
    label: 'Atención',
    icon: Activity,
    href: '/dashboard/atencion',
    feature: 'atencion',
    keywords: 'atencion kanban consultas',
    group: 'navegacion',
  },
  {
    id: 'nav-telemedicina',
    label: 'Telemedicina',
    icon: Video,
    href: '/dashboard/telemedicina',
    feature: 'telemedicina',
    keywords: 'telemedicina videoconsulta videollamada llamada',
    group: 'navegacion',
  },
  {
    id: 'nav-turnos',
    label: 'Turnos',
    icon: Calendar,
    href: '/dashboard/turnos',
    feature: 'turnos',
    keywords: 'turnos citas agenda calendario horario',
    group: 'navegacion',
  },
  {
    id: 'nav-pacientes',
    label: 'Pacientes',
    icon: Users,
    href: '/dashboard/pacientes',
    feature: 'pacientes',
    keywords: 'pacientes personas ficha historial',
    group: 'navegacion',
  },
  {
    id: 'nav-conversaciones',
    label: 'Conversaciones',
    icon: MessageSquare,
    href: '/dashboard/conversaciones',
    feature: 'conversaciones',
    keywords: 'conversaciones chat mensajes whatsapp',
    group: 'navegacion',
  },
  {
    id: 'nav-recetas',
    label: 'Recetas',
    icon: Syringe,
    href: '/dashboard/recetas',
    feature: 'recetas',
    keywords: 'recetas medicamentos prescripcion farmacos',
    group: 'navegacion',
  },
  {
    id: 'nav-reportes',
    label: 'Reportes',
    icon: BarChart3,
    href: '/dashboard/reportes',
    feature: 'reportes',
    keywords: 'reportes estadisticas estadisticas graficos',
    group: 'navegacion',
  },
  {
    id: 'nav-encuestas',
    label: 'Encuestas',
    icon: Star,
    href: '/dashboard/encuestas',
    feature: 'encuestas',
    keywords: 'encuestas satisfaccion feedback',
    group: 'navegacion',
  },
  {
    id: 'nav-lista-espera',
    label: 'Lista de Espera',
    icon: ListChecks,
    href: '/dashboard/lista-espera',
    feature: 'lista-espera',
    keywords: 'lista espera waitlist cola',
    group: 'navegacion',
  },
  {
    id: 'nav-derivaciones',
    label: 'Derivaciones',
    icon: ArrowRightLeft,
    href: '/dashboard/derivaciones',
    feature: 'derivaciones',
    keywords: 'derivaciones referir especialista',
    group: 'navegacion',
  },
  {
    id: 'nav-blacklist',
    label: 'Lista Negra',
    icon: Ban,
    href: '/dashboard/blacklist',
    feature: 'blacklist',
    keywords: 'blacklist lista negra bloqueados',
    group: 'navegacion',
  },
  {
    id: 'nav-consentimientos',
    label: 'Consentimientos',
    icon: FileSignature,
    href: '/dashboard/consentimientos',
    feature: 'consentimiento-informado',
    keywords: 'consentimientos informado firmas legal',
    group: 'navegacion',
  },
  {
    id: 'nav-notificaciones',
    label: 'Notificaciones',
    icon: Bell,
    href: '/dashboard/notificaciones',
    keywords: 'notificaciones alertas avisos',
    group: 'navegacion',
  },
  {
    id: 'nav-configuracion',
    label: 'Ajustes',
    icon: Sliders,
    href: '/dashboard/configuracion',
    keywords: 'ajustes configuracion perfil suscripcion seguridad',
    group: 'navegacion',
  },
  {
    id: 'nav-ayuda',
    label: 'Ayuda',
    icon: BookOpen,
    href: '/dashboard/ayuda',
    keywords: 'ayuda soporte documentacion faq',
    group: 'navegacion',
  },
];

// ============================================================
// Items de administración (solo role=admin)
// ============================================================

const adminItems: CommandItem[] = [
  {
    id: 'admin-sistema',
    label: 'Sistema',
    icon: Settings,
    href: '/dashboard/admin/sistema',
    keywords: 'sistema configuracion global admin',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-tenants',
    label: 'Tenants',
    icon: Building2,
    href: '/dashboard/admin/tenants',
    keywords: 'tenants organizaciones empresas',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-sucursales',
    label: 'Sucursales',
    icon: Store,
    href: '/dashboard/admin/sucursales',
    keywords: 'sucursales sedes locales oficinas',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-auditoria',
    label: 'Auditoría',
    icon: ScrollText,
    href: '/dashboard/admin/auditoria',
    keywords: 'auditoria logs accesos seguridad',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-backups',
    label: 'Backups',
    icon: HardDrive,
    href: '/dashboard/admin/backups',
    keywords: 'backups copias seguridad respaldo',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-n8n',
    label: 'n8n',
    icon: Network,
    href: '/dashboard/admin/n8n',
    keywords: 'n8n workflows automatizaciones',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-rendimiento',
    label: 'Rendimiento',
    icon: BarChart3,
    href: '/dashboard/admin/rendimiento',
    keywords: 'rendimiento performance web vitals metricas',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-portal-analytics',
    label: 'Portal Analytics',
    icon: Smartphone,
    href: '/dashboard/admin/portal-analytics',
    keywords: 'portal analytics paciente metricas lcp inp',
    adminOnly: true,
    group: 'admin',
  },
  {
    id: 'admin-webhooks',
    label: 'Webhooks',
    icon: Webhook,
    href: '/dashboard/webhooks',
    keywords: 'webhooks integraciones logs twilio',
    adminOnly: true,
    group: 'admin',
  },
];

// ============================================================
// Acciones rápidas (no son páginas, son acciones comunes)
// ============================================================

const actionItems: CommandItem[] = [
  {
    id: 'action-nuevo-paciente',
    label: 'Nuevo Paciente',
    icon: UserPlus,
    href: '/dashboard/pacientes?nuevo=true',
    feature: 'pacientes',
    keywords: 'nuevo paciente crear agregar alta',
    group: 'acciones',
  },
  {
    id: 'action-nuevo-turno',
    label: 'Nuevo Turno',
    icon: CalendarPlus,
    href: '/dashboard/turnos?nuevo=true',
    feature: 'turnos',
    keywords: 'nuevo turno cita agendar reservar',
    group: 'acciones',
  },
  {
    id: 'action-nueva-receta',
    label: 'Nueva Receta',
    icon: Stethoscope,
    href: '/dashboard/recetas?nueva=true',
    feature: 'recetas',
    keywords: 'nueva receta prescripcion medicamento',
    group: 'acciones',
  },
  {
    id: 'action-exportar-pacientes',
    label: 'Exportar Pacientes',
    icon: FileDown,
    href: '/api/pacientes/exportar',
    feature: 'exportacion',
    keywords: 'exportar pacientes excel csv descargar',
    group: 'acciones',
  },
  {
    id: 'action-exportar-recetas',
    label: 'Exportar Recetas',
    icon: FileDown,
    href: '/api/recetas/exportar',
    feature: 'exportacion',
    keywords: 'exportar recetas excel csv descargar',
    group: 'acciones',
  },
  {
    id: 'action-buscar-paciente',
    label: 'Buscar Paciente...',
    icon: Search,
    href: '/dashboard/pacientes?focusSearch=true',
    feature: 'pacientes',
    keywords: 'buscar paciente encontrar buscar',
    group: 'acciones',
  },
];

// ============================================================
// All items combined
// ============================================================

export const ALL_COMMAND_ITEMS: CommandItem[] = [
  ...navItems,
  ...adminItems,
  ...actionItems,
];

// ============================================================
// Grupos labels para la paleta
// ============================================================

export const GROUP_LABELS: Record<string, string> = {
  navegacion: 'Navegación',
  admin: 'Administración',
  acciones: 'Acciones rápidas',
  entidad: 'Resultados de búsqueda',
};

// ============================================================
// Group order for display
// ============================================================

export const GROUP_ORDER = ['acciones', 'navegacion', 'admin', 'entidad'] as const;
