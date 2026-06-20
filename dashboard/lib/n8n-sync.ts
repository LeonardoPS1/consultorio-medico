/**
 * Sincronizador de credenciales con n8n.
 *
 * Cuando se actualiza una credencial en el dashboard, este módulo
 * llama a la API REST de n8n para actualizarla también allí.
 *
 * Documentación API n8n:
 *   GET    /api/v1/credentials          → Listar
 *   GET    /api/v1/credentials/{id}     → Ver una
 *   PATCH  /api/v1/credentials/{id}     → Actualizar
 *   POST   /api/v1/credentials          → Crear
 *   DELETE /api/v1/credentials/{id}     → Eliminar
 */

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

/**
 * Tipos de credenciales n8n con su estructura de datos.
 * Cada entrada define qué campos espera n8n para ese tipo.
 */
export const N8N_CREDENTIAL_TYPES: Record<string, {
  displayName: string;
  fields: Record<string, { label: string; type: string; required?: boolean }>;
}> = {
  ollamaApi: {
    displayName: 'Ollama',
    fields: {
      baseUrl: { label: 'Base URL', type: 'string', required: true },
    },
  },
  twilioApi: {
    displayName: 'Twilio API',
    fields: {
      accountSid: { label: 'Account SID', type: 'string', required: true },
      authToken: { label: 'Auth Token', type: 'string', required: true },
    },
  },
  smtp: {
    displayName: 'SMTP',
    fields: {
      user: { label: 'User', type: 'string', required: true },
      password: { label: 'Password', type: 'string', required: true },
      host: { label: 'Host', type: 'string', required: true },
      port: { label: 'Port', type: 'number', required: true },
      ssl: { label: 'SSL', type: 'boolean' },
    },
  },
  imap: {
    displayName: 'IMAP',
    fields: {
      user: { label: 'User', type: 'string', required: true },
      password: { label: 'Password', type: 'string', required: true },
      host: { label: 'Host', type: 'string', required: true },
      port: { label: 'Port', type: 'number', required: true },
      ssl: { label: 'SSL', type: 'boolean' },
    },
  },
  postgres: {
    displayName: 'PostgreSQL',
    fields: {
      host: { label: 'Host', type: 'string', required: true },
      port: { label: 'Port', type: 'number', required: true },
      database: { label: 'Database', type: 'string', required: true },
      user: { label: 'User', type: 'string', required: true },
      password: { label: 'Password', type: 'string', required: true },
    },
  },
  httpBasicAuth: {
    displayName: 'HTTP Basic Auth',
    fields: {
      user: { label: 'User', type: 'string', required: true },
      password: { label: 'Password', type: 'string', required: true },
    },
  },
  googleApi: {
    displayName: 'Google Calendar (OAuth2)',
    fields: {
      email: { label: 'Service Account Email', type: 'string', required: true },
      privateKey: { label: 'Private Key', type: 'string', required: true },
    },
  },
};

/**
 * Mapa de servicio → tipo de credential en n8n.
 * Define cómo se traducen las credenciales del dashboard a n8n.
 */
export const SERVICIO_TO_N8N_TYPE: Record<string, {
  n8nType: string;
  fieldMapping: Record<string, string>; // dashboard_key → n8n_field
  /** Valores fijos que n8n requiere por schema condicional (if/then en vacío) */
  defaults?: Record<string, unknown>;
}> = {
  twilio: {
    n8nType: 'twilioApi',
    fieldMapping: {
      account_sid: 'accountSid',
      auth_token: 'authToken',
    },
    defaults: {
      authType: 'authToken', // Necesario: sin este, el if vacío pide apiKeySid+apiKeySecret
    },
  },
  ollama: {
    n8nType: 'ollamaApi',
    fieldMapping: {
      base_url: 'baseUrl',
    },
    // ollama no tiene condicionales — no necesita defaults
  },
  postgres: {
    n8nType: 'postgres',
    fieldMapping: {
      host: 'host',
      port: 'port',
      database: 'database',
      user: 'user',
      password: 'password',
    },
    defaults: {
      ssl: 'disable',       // Necesario: allowUnauthorizedCerts ausente → if vacío pide ssl
      sshTunnel: false,     // Necesario: sshTunnel ausente → if vacío pide SSH fields
    },
  },
  smtp: {
    n8nType: 'smtp',
    fieldMapping: {
      host: 'host',
      port: 'port',
      user: 'user',
      password: 'password',
      ssl: 'ssl',
    },
  },
  imap: {
    n8nType: 'imap',
    fieldMapping: {
      host: 'host',
      port: 'port',
      user: 'user',
      password: 'password',
      ssl: 'ssl',
    },
  },
  google_calendar: {
    n8nType: 'googleApi',
    fieldMapping: {
      email: 'email',
      private_key: 'privateKey',
    },
  },
};

/**
 * Headers para autenticación en la API de n8n.
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (N8N_API_KEY) {
    headers['X-N8N-API-KEY'] = N8N_API_KEY;
  }
  return headers;
}

/**
 * Construye el objeto `data` que n8n espera para un tipo de credential.
 * Toma un mapa de clave→valor del dashboard y lo traduce según fieldMapping.
 */
function buildN8nData(
  servicio: string,
  credenciales: Record<string, string>
): Record<string, any> | null {
  const mapping = SERVICIO_TO_N8N_TYPE[servicio];
  if (!mapping) return null;

  const data: Record<string, any> = {};

  // 1. Aplicar defaults primero (ssl, sshTunnel, authType, etc.)
  //    Necesarios porque n8n usa if/then condicional que evalúa true en vacío.
  if (mapping.defaults) {
    Object.assign(data, mapping.defaults);
  }

  // 2. Mapear campos del dashboard → campos de n8n (sobrescriben defaults)
  for (const [dashboardKey, n8nField] of Object.entries(mapping.fieldMapping)) {
    const valor = credenciales[dashboardKey];
    if (valor !== undefined) {
      // Convertir tipos según el field definition
      const typeDef = N8N_CREDENTIAL_TYPES[mapping.n8nType]?.fields[n8nField];
      if (typeDef?.type === 'number') {
        data[n8nField] = Number(valor);
      } else if (typeDef?.type === 'boolean') {
        data[n8nField] = valor === 'true' || valor === '1';
      } else {
        data[n8nField] = valor;
      }
    }
  }
  return data;
}

/**
 * Sincroniza una credencial (o grupo de credenciales del mismo servicio)
 * con n8n.
 *
 * @param servicio - Nombre del servicio (twilio, ollama, etc.)
 * @param credenciales - Mapa de clave→valor de todas las credenciales del servicio
 * @param n8nCredentialId - ID de la credential en n8n (si ya existe)
 * @returns El ID de la credential en n8n
 */
export async function syncToN8n(
  servicio: string,
  credenciales: Record<string, string>,
  n8nCredentialId?: string | null
): Promise<{ success: boolean; n8nId?: string; error?: string }> {
  const mapping = SERVICIO_TO_N8N_TYPE[servicio];
  if (!mapping) {
    return { success: false, error: `Servicio "${servicio}" no tiene mapping a n8n` };
  }

  if (!N8N_API_KEY) {
    return { success: false, error: 'N8N_API_KEY no configurada en el entorno' };
  }

  const data = buildN8nData(servicio, credenciales);
  if (!data || Object.keys(data).length === 0) {
    return { success: false, error: 'No hay datos para sincronizar' };
  }

  const credentialName = `Consultorio - ${mapping.n8nType}`;

  try {
    if (n8nCredentialId) {
      // ACTUALIZAR credential existente
      const res = await fetch(`${N8N_BASE_URL}/api/v1/credentials/${n8nCredentialId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          name: credentialName,
          type: mapping.n8nType,
          data,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        return { success: false, error: `n8n PATCH error ${res.status}: ${errBody}` };
      }

      return { success: true, n8nId: n8nCredentialId };
    } else {
      // CREAR nueva credential en n8n
      const res = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: credentialName,
          type: mapping.n8nType,
          data,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        return { success: false, error: `n8n POST error ${res.status}: ${errBody}` };
      }

      const result = await res.json();
      return { success: true, n8nId: result.id };
    }
  } catch (err) {
    return { success: false, error: `Error de conexión con n8n: ${(err as Error).message}` };
  }
}

/**
 * Obtiene la lista de credenciales desde n8n para verificar el estado.
 */
export async function getN8nCredentials(): Promise<{
  success: boolean;
  credentials?: Array<{ id: string; name: string; type: string; updatedAt: string }>;
  error?: string;
}> {
  if (!N8N_API_KEY) {
    return { success: false, error: 'N8N_API_KEY no configurada' };
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      return { success: false, error: `Error ${res.status} al consultar n8n` };
    }

    const result = await res.json();
    return { success: true, credentials: result.data };
  } catch (err) {
    return { success: false, error: `Error de conexión: ${(err as Error).message}` };
  }
}

/**
 * Prueba la conexión con un servicio verificando las credenciales.
 * Hace un request mínimo al servicio para validar.
 */
/**
 * Valida que una URL no apunte a IP privada/reservada (protección SSRF).
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]', '169.254.169.254'];
    const hostname = parsed.hostname.toLowerCase();
    if (blockedHosts.includes(hostname)) return false;
    // Bloquear rangos privados IPv4
    if (/^10\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function testCredentialConnection(
  servicio: string,
  credenciales: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  switch (servicio) {
    case 'ollama': {
      const baseUrl = credenciales['base_url'] || 'http://localhost:11434';
      if (!isSafeUrl(baseUrl)) {
        return { success: false, message: '❌ URL de Ollama no válida (IP privada bloqueada)' };
      }
      try {
        const res = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          const models = data.models?.map((m: any) => m.name).join(', ') || 'desconocidos';
          return { success: true, message: `✅ Ollama responde. Modelos: ${models}` };
        }
        return { success: false, message: `❌ Ollama respondió con status ${res.status}` };
      } catch (err) {
        return { success: false, message: `❌ No se pudo conectar: ${(err as Error).message}` };
      }
    }

    case 'n8n': {
      try {
        const res = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
          headers: { 'X-N8N-API-KEY': credenciales['api_key'] || N8N_API_KEY },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          return { success: true, message: '✅ Conexión con n8n exitosa' };
        }
        return { success: false, message: `❌ n8n respondió con status ${res.status}` };
      } catch (err) {
        return { success: false, message: `❌ No se pudo conectar: ${(err as Error).message}` };
      }
    }

    case 'twilio': {
      // Twilio no tiene un endpoint simple de test, devolvemos la data
      const hasSid = !!credenciales['account_sid'];
      const hasToken = !!credenciales['auth_token'];
      if (hasSid && hasToken) {
        return { success: true, message: '✅ Configuración de Twilio completa (no se puede testear sin enviar un mensaje)' };
      }
      return { success: false, message: '❌ Faltan Account SID o Auth Token' };
    }

    case 'postgres': {
      // No podemos testear PostgreSQL desde el frontend por seguridad
      return { success: true, message: 'ℹ️ PostgreSQL se verifica al iniciar el dashboard' };
    }

    default:
      return { success: true, message: `ℹ️ Servicio "${servicio}" no tiene test automático` };
  }
}
