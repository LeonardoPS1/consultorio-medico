'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Globe,
  Database,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Wifi,
  RefreshCw,
  Shield,
  Key,
  Trash2,
  RotateCcw,
} from 'lucide-react';

// ============================================================
// Tipos
// ============================================================

interface ServicioConfig {
  servicio: string;
  displayName: string;
  descripcion: string;
  icon: string;
  campos: Array<{
    clave: string;
    etiqueta: string;
    tipo: string;
    requerido: boolean;
    placeholder?: string;
  }>;
  n8nSync: boolean;
  n8nCredentialType?: string;
  testable: boolean;
}

interface CredencialesState {
  [key: string]: string;
}

interface ServicioState {
  guardando: boolean;
  probando: boolean;
  mensaje: string;
  mensajeTipo: 'success' | 'error' | 'info' | '';
  valores: CredencialesState;
  valoresOriginales: CredencialesState;
  modificado: boolean;
  mostrandoPasswords: boolean;
  n8nId?: string;
}

// ============================================================
// Mapa de iconos
// ============================================================

const ICONOS: Record<string, React.ReactNode> = {
  twilio: <Phone className="h-5 w-5 text-red-600 dark:text-red-400" />,
  ollama: <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
  n8n: <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
  smtp: <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  imap: <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />,
  postgres: <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  google_calendar: <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />,
  telefono_doctor: <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
};

// ============================================================
// Componente Principal
// ============================================================

export default function CredencialesTab() {
  const [servicios, setServicios] = useState<ServicioConfig[]>([]);
  const [serviciosState, setServiciosState] = useState<Record<string, ServicioState>>({});
  const [loading, setLoading] = useState(true);
  const [activeServicio, setActiveServicio] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Cargar credenciales
  const loadCredenciales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credenciales?raw=true');
      const data = await res.json();

      if (res.ok) {
        setServicios(data.servicios || []);
        setIsAdmin(data.isAdmin || false);

        // Inicializar estado de cada servicio
        const state: Record<string, ServicioState> = {};
        for (const sv of data.servicios || []) {
          const existingData = data.grouped?.find((g: any) => g.servicio === sv.servicio);
          const valores: CredencialesState = {};
          for (const campo of sv.campos) {
            valores[campo.clave] = existingData?.credenciales?.[campo.clave] || '';
          }

          const n8nCred = existingData?.credenciales?.n8nCredentialId;
          state[sv.servicio] = {
            guardando: false,
            probando: false,
            mensaje: '',
            mensajeTipo: '',
            valores,
            valoresOriginales: { ...valores },
            modificado: false,
            mostrandoPasswords: false,
            n8nId: n8nCred,
          };
        }
        setServiciosState(state);

        // Seleccionar primer servicio como activo
        if (data.servicios?.length > 0 && !activeServicio) {
          setActiveServicio(data.servicios[0].servicio);
        }
      }
    } catch (err) {
      console.error('Error cargando credenciales:', err);
    } finally {
      setLoading(false);
    }
  }, [activeServicio]);

  useEffect(() => {
    loadCredenciales();
  }, []);

  // Actualizar un valor
  const updateValor = (servicio: string, clave: string, valor: string) => {
    setServiciosState((prev) => {
      const s = prev[servicio];
      if (!s) return prev;
      const nuevosValores = { ...s.valores, [clave]: valor };
      return {
        ...prev,
        [servicio]: {
          ...s,
          valores: nuevosValores,
          modificado: JSON.stringify(nuevosValores) !== JSON.stringify(s.valoresOriginales),
          mensaje: '',
          mensajeTipo: '',
        },
      };
    });
  };

  // Guardar credenciales
  const guardar = async (servicio: string) => {
    const s = serviciosState[servicio];
    if (!s) return;

    setServiciosState((prev) => ({
      ...prev,
      [servicio]: { ...prev[servicio], guardando: true, mensaje: '', mensajeTipo: '' },
    }));

    try {
      const res = await fetch('/api/credenciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio,
          credenciales: s.valores,
          n8nCredentialId: s.n8nId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setServiciosState((prev) => ({
          ...prev,
          [servicio]: {
            ...prev[servicio],
            guardando: false,
            valoresOriginales: { ...prev[servicio].valores },
            modificado: false,
            n8nId: data.n8nSync?.n8nId || prev[servicio].n8nId,
            mensaje: data.n8nSync?.success
              ? '✅ Credenciales guardadas y sincronizadas con n8n'
              : data.n8nSync
                ? `✅ Guardado local. ⚠️ n8n: ${data.n8nSync.error || 'error de sync'}`
                : '✅ Credenciales guardadas correctamente',
            mensajeTipo: 'success',
          },
        }));
      } else {
        setServiciosState((prev) => ({
          ...prev,
          [servicio]: {
            ...prev[servicio],
            guardando: false,
            mensaje: `❌ ${data.error || 'Error al guardar'}`,
            mensajeTipo: 'error',
          },
        }));
      }
    } catch (err) {
      setServiciosState((prev) => ({
        ...prev,
        [servicio]: {
          ...prev[servicio],
          guardando: false,
          mensaje: '❌ Error de conexión',
          mensajeTipo: 'error',
        },
      }));
    }
  };

  // Probar conexión
  const probar = async (servicio: string) => {
    const s = serviciosState[servicio];
    if (!s) return;

    setServiciosState((prev) => ({
      ...prev,
      [servicio]: {
        ...prev[servicio],
        probando: true,
        mensaje: '🔄 Probando conexión...',
        mensajeTipo: 'info',
      },
    }));

    try {
      const res = await fetch('/api/credenciales?action=test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicio,
          credenciales: s.valores,
        }),
      });

      const data = await res.json();

      setServiciosState((prev) => ({
        ...prev,
        [servicio]: {
          ...prev[servicio],
          probando: false,
          mensaje: data.success ? `✅ ${data.message}` : `❌ ${data.message}`,
          mensajeTipo: data.success ? 'success' : 'error',
        },
      }));
    } catch (err) {
      setServiciosState((prev) => ({
        ...prev,
        [servicio]: {
          ...prev[servicio],
          probando: false,
          mensaje: '❌ Error de conexión',
          mensajeTipo: 'error',
        },
      }));
    }
  };

  // Eliminar credenciales de un servicio (BORRA de DB)
  const eliminar = async (servicio: string) => {
    const s = serviciosState[servicio];
    if (!s) return;

    setServiciosState((prev) => ({
      ...prev,
      [servicio]: {
        ...prev[servicio],
        guardando: true,
        mensaje: '🔄 Eliminando...',
        mensajeTipo: 'info',
      },
    }));

    try {
      const res = await fetch(`/api/credenciales?servicio=${encodeURIComponent(servicio)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const valoresVacios: CredencialesState = {};
        for (const campo of servicios.find((sv) => sv.servicio === servicio)?.campos || []) {
          valoresVacios[campo.clave] = '';
        }
        setServiciosState((prev) => ({
          ...prev,
          [servicio]: {
            ...prev[servicio],
            guardando: false,
            valores: { ...valoresVacios },
            valoresOriginales: { ...valoresVacios },
            modificado: false,
            n8nId: undefined,
            mensaje: '✅ Credenciales eliminadas. Podés reingresarlas ahora.',
            mensajeTipo: 'success',
          },
        }));
      } else {
        const data = await res.json();
        setServiciosState((prev) => ({
          ...prev,
          [servicio]: {
            ...prev[servicio],
            guardando: false,
            mensaje: `❌ ${data.error || 'Error al eliminar'}`,
            mensajeTipo: 'error',
          },
        }));
      }
    } catch (err) {
      setServiciosState((prev) => ({
        ...prev,
        [servicio]: {
          ...prev[servicio],
          guardando: false,
          mensaje: '❌ Error de conexión',
          mensajeTipo: 'error',
        },
      }));
    }
  };

  // Limpiar campos localmente (no borra de DB hasta que se guarde)
  const limpiarCampos = (servicio: string) => {
    const valoresVacios: CredencialesState = {};
    for (const campo of servicios.find((sv) => sv.servicio === servicio)?.campos || []) {
      valoresVacios[campo.clave] = '';
    }
    const s = serviciosState[servicio];
    setServiciosState((prev) => ({
      ...prev,
      [servicio]: {
        ...prev[servicio],
        valores: { ...valoresVacios },
        modificado: JSON.stringify(valoresVacios) !== JSON.stringify(s?.valoresOriginales || {}),
        mensaje: '',
        mensajeTipo: '',
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Cargando credenciales...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">Acceso restringido</p>
            <p className="text-xs text-muted-foreground mt-1">
              Solo los administradores pueden gestionar credenciales
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Credenciales del Sistema
              </CardTitle>
              <CardDescription>
                Gestioná las API keys y credenciales de servicios externos. Se guardan encriptadas y
                se sincronizan automáticamente con n8n.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Solo admin
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Selector de servicio tipo tabs */}
      <div className="flex flex-wrap gap-2">
        {servicios.map((sv) => {
          const state = serviciosState[sv.servicio];
          const tieneValores = state?.valoresOriginales
            ? Object.values(state.valoresOriginales).some((v) => v.length > 0)
            : false;

          return (
            <Button
              key={sv.servicio}
              variant={activeServicio === sv.servicio ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveServicio(sv.servicio)}
              className="gap-2"
            >
              {ICONOS[sv.servicio] || <Globe className="h-4 w-4" />}
              <span className="hidden sm:inline">{sv.displayName}</span>
              <span className="sm:hidden">{sv.displayName.split(' ')[0]}</span>
              {state?.modificado && <span className="h-2 w-2 rounded-full bg-amber-500" />}
              {tieneValores && !state?.modificado && (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Detalle del servicio activo */}
      {activeServicio && serviciosState[activeServicio] && (
        <ServicioForm
          config={servicios.find((s) => s.servicio === activeServicio)!}
          state={serviciosState[activeServicio]}
          onUpdateValor={(clave, valor) => updateValor(activeServicio, clave, valor)}
          onGuardar={() => guardar(activeServicio)}
          onProbar={() => probar(activeServicio)}
          onEliminar={() => eliminar(activeServicio)}
          onLimpiarCampos={() => limpiarCampos(activeServicio)}
          onTogglePasswords={() =>
            setServiciosState((prev) => ({
              ...prev,
              [activeServicio]: {
                ...prev[activeServicio],
                mostrandoPasswords: !prev[activeServicio]?.mostrandoPasswords,
              },
            }))
          }
        />
      )}
    </div>
  );
}

// ============================================================
// Formulario de Servicio
// ============================================================

function ServicioForm({
  config,
  state,
  onUpdateValor,
  onGuardar,
  onProbar,
  onEliminar,
  onLimpiarCampos,
  onTogglePasswords,
}: {
  config: ServicioConfig;
  state: ServicioState;
  onUpdateValor: (clave: string, valor: string) => void;
  onGuardar: () => void;
  onProbar: () => void;
  onEliminar: () => void;
  onLimpiarCampos: () => void;
  onTogglePasswords: () => void;
}) {
  const mensajeColors: Record<string, string> = {
    success: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
    error: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400',
    info: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
    '': '',
  };

  const hasPassword = config.campos.some((c) => c.tipo === 'password');
  const completado = config.campos
    .filter((c) => c.requerido)
    .every((c) => state.valores[c.clave]?.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              {ICONOS[config.servicio] || <Globe className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{config.displayName}</CardTitle>
              <CardDescription>{config.descripcion}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completado ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Configurado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3 mr-1" /> Incompleto
              </Badge>
            )}
            {config.n8nSync && (
              <Badge variant="outline" className="text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Sync n8n
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campos del formulario */}
        <div className="grid gap-4 md:grid-cols-2">
          {config.campos.map((campo) => (
            <div key={campo.clave} className="space-y-1">
              <Label>
                {campo.etiqueta}
                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <div className="relative">
                {campo.tipo === 'password' && !state.mostrandoPasswords ? (
                  <Input
                    type="password"
                    value={state.valores[campo.clave] || ''}
                    onChange={(e) => onUpdateValor(campo.clave, e.target.value)}
                    placeholder={campo.placeholder || '••••••••'}
                    className="pr-10"
                  />
                ) : campo.tipo === 'number' ? (
                  <Input
                    type="number"
                    value={state.valores[campo.clave] || ''}
                    onChange={(e) => onUpdateValor(campo.clave, e.target.value)}
                    placeholder={campo.placeholder}
                  />
                ) : (
                  <Input
                    type="text"
                    value={state.valores[campo.clave] || ''}
                    onChange={(e) => onUpdateValor(campo.clave, e.target.value)}
                    placeholder={campo.placeholder}
                  />
                )}
                {campo.tipo === 'password' && hasPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mostrar u ocultar contraseña"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={onTogglePasswords}
                  >
                    {state.mostrandoPasswords ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mensaje de estado */}
        {state.mensaje && (
          <div
            className={`text-sm p-3 rounded-lg ${mensajeColors[state.mensajeTipo] || mensajeColors.info}`}
          >
            {state.mensaje}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={onGuardar} disabled={state.guardando || !state.modificado}>
            {state.guardando ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {config.n8nSync ? 'Guardar y sincronizar con n8n' : 'Guardar'}
              </>
            )}
          </Button>

          {config.testable && (
            <Button variant="outline" onClick={onProbar} disabled={state.probando}>
              {state.probando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-1" />
                  Probar conexión
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onLimpiarCampos}
            title="Borra los campos del formulario sin eliminar de la base de datos"
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpiar campos
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                window.confirm(
                  `¿Estás seguro de eliminar TODAS las credenciales de ${config.displayName}?\n\nEsta acción borra los datos de la base de datos y también intenta eliminarlos de n8n.`,
                )
              ) {
                onEliminar();
              }
            }}
            disabled={state.guardando}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            title="Elimina todas las credenciales de la base de datos para este servicio"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Eliminar credenciales
          </Button>
        </div>

        {/* Info de sincronización */}
        {state.n8nId && (
          <p className="text-xs text-muted-foreground">
            n8n credential ID:{' '}
            <code className="font-mono text-xs bg-muted px-1 rounded">{state.n8nId}</code>
            {config.n8nCredentialType && (
              <>
                {' '}
                · Tipo:{' '}
                <code className="font-mono text-xs bg-muted px-1 rounded">
                  {config.n8nCredentialType}
                </code>
              </>
            )}
          </p>
        )}

        {!config.n8nSync && config.servicio !== 'n8n' && (
          <p className="text-xs text-muted-foreground">
            ℹ️ Estas credenciales se usan solo localmente en el dashboard (no se sincronizan con
            n8n).
          </p>
        )}

        {config.servicio === 'n8n' && (
          <p className="text-xs text-muted-foreground">
            ℹ️ Esta conexión se usa para sincronizar automáticamente las demás credenciales con n8n.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
