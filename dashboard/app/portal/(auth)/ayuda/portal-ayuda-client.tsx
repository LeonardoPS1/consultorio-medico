import { HelpCircle, ChevronDown, Search, Headset, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';
import { PortalCard, PortalButton } from '@/components/portal';

interface HelpFeature {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: string[];
  link?: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  features: HelpFeature[];
}

const helpSections: HelpSection[] = [
  {
    id: 'inicio-agenda',
    title: 'Inicio y Agenda',
    icon: HelpCircle,
    description: 'Gestión del panel principal y programación de turnos',
    features: [
      {
        id: 'dashboard-overview',
        title: 'Panel Principal',
        icon: HelpCircle,
        description: 'Visualiza tus métricas, turnos próximos y actividades recientes',
        steps: [
          'Accede al dashboard desde el menú lateral',
          'Revisa las tarjetas de estadísticas en tiempo real',
          'Observa los turnos próximos en la línea de timeline',
          'Haz clic en cualquier métrica para ver detalles',
        ],
        link: '/portal/dashboard',
      },
      {
        id: 'agendar-turno',
        title: 'Agendar Turno',
        icon: HelpCircle,
        description: 'Programa nuevas consultas médicas',
        steps: [
          'Selecciona "Agendar" en el menú lateral',
          'Elige el médico, fecha y hora disponibles',
          'Ingresa el motivo de la consulta',
          'Confirma el turno y recibe notificación',
        ],
      },
    ],
  },
  {
    id: 'turnos',
    title: 'Turnos',
    icon: HelpCircle,
    description: 'Consulta, modifica o cancela tus turnos médicos',
    features: [
      {
        id: 'ver-turnos',
        title: 'Ver Turnos',
        icon: HelpCircle,
        description: 'Revisa todos tus turnos programados y pasados',
        steps: [
          'Ve a "Turnos" en el menú lateral',
          'Filtra por estado: próximos, pasados o cancelados',
          'Ordena por fecha o médico',
          'Haz clic en un turno para ver detalles completos',
        ],
      },
      {
        id: 'cancelar-turno',
        title: 'Cancelar Turno',
        icon: HelpCircle,
        description: 'Cancela un turno programado siguiendo las políticas',
        steps: [
          'Accede a la lista de turnos',
          'Selecciona el turno que deseas cancelar',
          'Haz clic en "Cancelar turno"',
          'Confirma la cancelación y especifica motivo (opcional)',
        ],
      },
    ],
  },
  {
    id: 'documentos',
    title: 'Documentos',
    icon: HelpCircle,
    description: 'Gestiona tus recetas, certificados y historial médico',
    features: [
      {
        id: 'recetas',
        title: 'Recetas Médicas',
        icon: HelpCircle,
        description: 'Visualiza y renueva tus recetas activas',
        steps: [
          'Selecciona "Recetas" en el menú',
          'Filtra por estado: activa, vencida o renovada',
          'Haz clic en una receta para ver detalles',
          'Utiliza el botón "Renovar" si corresponde',
        ],
      },
      {
        id: 'certificados',
        title: 'Certificados Médicos',
        icon: HelpCircle,
        description: 'Solicita y descarga certificados médicos',
        steps: [
          'Ve a "Certificados" en el menú lateral',
          'Selecciona el tipo de certificado necesario',
          'Completa la información requerida',
          'Envía la solicitud y espera aprobación',
        ],
      },
    ],
  },
  {
    id: 'actividad',
    title: 'Actividad',
    icon: HelpCircle,
    description: 'Revisa tu historial médico y comunicaciones',
    features: [
      {
        id: 'historial-medico',
        title: 'Historial Médico',
        icon: HelpCircle,
        description: 'Consulta tu historial clínico completo',
        steps: [
          'Accede a "Historial" en el menú lateral',
          'Selecciona el tipo de historial a consultar',
          'Filtra por fecha o profesional de salud',
          'Revisa cada entrada con sus detalles médicos',
        ],
      },
      {
        id: 'notificaciones',
        title: 'Notificaciones',
        icon: HelpCircle,
        description: 'Gestiona tus alertas y recordatorios',
        steps: [
          'Ve a "Notificaciones" en el menú',
          'Marca como leídas las notificaciones revisadas',
          'Configura tus preferencias de notificación',
          'Elimina notificaciones antiguas si lo deseas',
        ],
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta y Configuración',
    icon: HelpCircle,
    description: 'Administra tu perfil, preferencias y seguridad',
    features: [
      {
        id: 'perfil',
        title: 'Perfil Personal',
        icon: HelpCircle,
        description: 'Actualiza tus datos personales y de contacto',
        steps: [
          'Selecciona "Perfil" en el menú lateral',
          'Edita tu información básica: nombre, teléfono, email',
          'Actualiza tu dirección y datos de emergencia',
          'Guarda los cambios y verifica la confirmación',
        ],
      },
      {
        id: 'seguridad',
        title: 'Seguridad de Cuenta',
        icon: HelpCircle,
        description: 'Configura autenticación y privacidad de datos',
        steps: [
          'Accede a "Seguridad" en la configuración',
          'Activa autenticación de dos factores (2FA)',
          'Revisa las sesiones activas y cierra las sospechosas',
          'Actualiza tu contraseña periódicamente',
        ],
      },
    ],
  },
];

const PortalAyudaClient: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const filteredSections = helpSections.filter(
    (section) =>
      section.title.toLowerCase().includes(search.toLowerCase()) ||
      section.description.toLowerCase().includes(search.toLowerCase()) ||
      section.features.some(
        (feature) =>
          feature.title.toLowerCase().includes(search.toLowerCase()) ||
          feature.description.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  const allFeatures = helpSections.flatMap((section) => section.features);

  const isSectionExpanded = (id: string) => expandedSection === id;

  return (
    <div className="help-container space-y-6">
      {/* Header */}
      <PortalCard className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold"> Centro de Ayuda</h1>
        </div>
        <p className="text-gray-600">
          Gu&iacute;a completa para utilizar todas las funcionalidades del portal del paciente.
          Encuentra respuestas r&aacute;pidas y tutoriales paso a paso.
        </p>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar gu&iacute;as, funciones o temas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </PortalCard>

      {/* Quick Actions */}
      <PortalCard className="p-6 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Accesos R&aacute;pidos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allFeatures.slice(0, 6).map((feature) => (
            <PortalCard
              key={feature.id}
              className="p-3 hover:shadow-sm cursor-pointer"
              onClick={() => {
                const sectionId = helpSections.find((s) => s.features.includes(feature))?.id;
                if (sectionId) setExpandedSection(sectionId);
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </div>
                <p className="font-medium">{feature.title}</p>
              </div>
            </PortalCard>
          ))}
        </div>
      </PortalCard>

      {/* Help Sections */}
      <div className="space-y-4">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <PortalCard key={section.id} className="border rounded-lg border-gray-200">
              <div
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedSection(isSectionExpanded(section.id) ? null : section.id)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setExpandedSection(isSectionExpanded(section.id) ? null : section.id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    isSectionExpanded(section.id) ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {isSectionExpanded(section.id) && (
                <div className="p-4 space-y-4">
                  {section.features.map((feature) => (
                    <PortalCard
                      key={feature.id}
                      className="border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex gap-3 p-4">
                        <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{feature.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{feature.description}</p>

                          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-3 pl-2">
                            {feature.steps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>

                          {feature.link && (
                            <PortalButton
                              href={feature.link}
                              variant="outline"
                              size="sm"
                              className="mt-2 inline-flex items-center"
                            >
                              Ir a {feature.title.toLowerCase()}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </PortalButton>
                          )}
                        </div>
                      </div>
                    </PortalCard>
                  ))}
                </div>
              )}
            </PortalCard>
          ))
        ) : (
          <PortalCard className="p-6 text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No se encontraron resultados</h3>
            <p className="text-gray-600">
              Intenta con otras palabras clave o revisa tu b&uacute;squeda.
            </p>
          </PortalCard>
        )}
      </div>

      {/* Contact Support */}
      <PortalCard className="p-6 border-t">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Headset className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">&iquest;Necesitas ayuda adicional?</h3>
            <p className="text-gray-600">
              Nuestro equipo de soporte est&aacute; disponible para ayudarte con cualquier consulta.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <PortalButton variant="outline" href="https://wa.me/56912345678">
            <span className="flex items-center gap-2">
              <span>WhatsApp</span>
            </span>
          </PortalButton>
          <PortalButton href="/portal/soporte">
            <span className="flex items-center gap-2">
              <span>Abrir ticket</span>
            </span>
          </PortalButton>
        </div>
      </PortalCard>
    </div>
  );
};

export default PortalAyudaClient;
