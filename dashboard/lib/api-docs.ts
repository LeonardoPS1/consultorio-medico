/**
 * OpenAPI 3.1 spec builder para API v1 pública.
 *
 * Genera automáticamente el spec desde los schemas Zod de validations.ts
 * usando \`@asteasolutions/zod-to-openapi\`. Solo expone endpoints /api/v1/*.
 * Los endpoints internos (/api/internal/*, /api/recuperacion/*, etc.) no se registran.
 */

import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

const API_VERSION = '1.0.0';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'apiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'x-api-key',
  description:
    'API Key generada desde el panel de administración. También se acepta como Authorization: Bearer <key>.',
});

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT de portal paciente (alternativa a API key).',
});

// ─── Schemas ──────────────────────────────────────────────

registry.registerComponent('schemas', 'PacienteResponse', {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nombre: { type: 'string' },
    apellido: { type: 'string' },
    email: { type: 'string', format: 'email' },
    telefono: { type: 'string' },
  },
});

registry.registerComponent('schemas', 'MedicoResponse', {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nombre: { type: 'string' },
    especialidad: { type: 'string' },
    email: { type: 'string', format: 'email' },
    telefono: { type: 'string' },
  },
});

registry.registerComponent('schemas', 'ServicioResponse', {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nombre: { type: 'string' },
    descripcion: { type: 'string' },
    duracionMinutos: { type: 'integer' },
    precio: { type: 'number' },
  },
});

registry.registerComponent('schemas', 'HorarioResponse', {
  type: 'object',
  properties: {
    dia: { type: 'integer', description: 'Día de la semana (0=Domingo, 6=Sábado)' },
    horaInicio: { type: 'string' },
    horaFin: { type: 'string' },
  },
});

registry.registerComponent('schemas', 'TurnoDisponible', {
  type: 'object',
  properties: {
    fecha: { type: 'string', format: 'date' },
    hora: { type: 'string' },
    medicoId: { type: 'string', format: 'uuid' },
    medicoNombre: { type: 'string' },
  },
});

registry.registerComponent('schemas', 'TurnoResponse', {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    pacienteId: { type: 'string', format: 'uuid' },
    medicoId: { type: 'string', format: 'uuid' },
    fechaHora: { type: 'string', format: 'date-time' },
    estado: {
      type: 'string',
      enum: ['pendiente', 'confirmada', 'en_atencion', 'atendido', 'cancelada', 'no_asistio'],
    },
    motivo: { type: 'string' },
    tipoConsulta: { type: 'string' },
    duracionMinutos: { type: 'integer' },
    pacienteNombre: { type: 'string' },
    medicoNombre: { type: 'string' },
  },
});

registry.registerComponent('schemas', 'ErrorResponse', {
  type: 'object',
  properties: {
    error: { type: 'string', description: 'Mensaje de error' },
  },
});

// Schema OpenAPI para request body (definido raw para compatibilidad)
registry.registerComponent('schemas', 'CrearTurnoRequest', {
  type: 'object',
  required: ['pacienteId', 'medicoId', 'fecha', 'hora'],
  properties: {
    pacienteId: { type: 'string', format: 'uuid', description: 'ID del paciente' },
    medicoId: { type: 'string', format: 'uuid', description: 'ID del médico' },
    fecha: { type: 'string', format: 'date', description: 'Fecha del turno (YYYY-MM-DD)' },
    hora: { type: 'string', description: 'Hora del turno (HH:mm)' },
    tipoConsulta: {
      type: 'string',
      enum: ['consulta', 'control', 'urgencia', 'telemedicina', 'procedimiento', 'otro'],
      default: 'consulta',
      description: 'Tipo de consulta',
    },
    motivo: { type: 'string', description: 'Motivo de la consulta' },
    duracionMinutos: {
      type: 'integer',
      minimum: 10,
      maximum: 120,
      default: 30,
      description: 'Duración en minutos',
    },
    sucursalId: { type: 'string', format: 'uuid', description: 'ID de la sucursal (opcional)' },
  },
});

// ─── Error responses helpers ──────────────────────────────

const error401 = {
  description: 'No autorizado — API Key inválida o faltante.',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

const error429 = {
  description: 'Demasiadas solicitudes — rate limit excedido.',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

const commonErrors = { '401': error401, '429': error429 };

const commonGetSecurity: Array<Record<string, string[]>> = [{ apiKey: [] }, { bearerAuth: [] }];
const commonPostSecurity: Array<Record<string, string[]>> = [{ apiKey: [] }];

// ─── Paths ────────────────────────────────────────────────

// GET /api/v1/medicos
registry.registerPath({
  method: 'get',
  path: '/api/v1/medicos',
  summary: 'Listar médicos activos',
  tags: ['Médicos'],
  security: commonGetSecurity,
  responses: {
    '200': {
      description: 'Lista de médicos',
      content: {
        'application/json': {
          schema: { type: 'array', items: { $ref: '#/components/schemas/MedicoResponse' } },
        },
      },
    },
    ...commonErrors,
  },
});

// GET /api/v1/servicios
registry.registerPath({
  method: 'get',
  path: '/api/v1/servicios',
  summary: 'Listar servicios disponibles',
  tags: ['Servicios'],
  security: commonGetSecurity,
  responses: {
    '200': {
      description: 'Lista de servicios',
      content: {
        'application/json': {
          schema: { type: 'array', items: { $ref: '#/components/schemas/ServicioResponse' } },
        },
      },
    },
    ...commonErrors,
  },
});

// GET /api/v1/horarios
registry.registerPath({
  method: 'get',
  path: '/api/v1/horarios',
  summary: 'Obtener horarios de atención',
  tags: ['Horarios'],
  security: commonGetSecurity,
  parameters: [
    {
      name: 'medicoId',
      in: 'query',
      required: false,
      schema: { type: 'string', format: 'uuid' },
      description: 'Filtrar por médico (opcional)',
    },
  ],
  responses: {
    '200': {
      description: 'Horarios de atención',
      content: {
        'application/json': {
          schema: { type: 'array', items: { $ref: '#/components/schemas/HorarioResponse' } },
        },
      },
    },
    ...commonErrors,
  },
});

// GET /api/v1/turnos/disponibles
registry.registerPath({
  method: 'get',
  path: '/api/v1/turnos/disponibles',
  summary: 'Consultar turnos disponibles',
  tags: ['Turnos'],
  security: commonGetSecurity,
  parameters: [
    {
      name: 'fecha',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'date' },
      description: 'Fecha a consultar (YYYY-MM-DD)',
    },
    {
      name: 'medicoId',
      in: 'query',
      required: false,
      schema: { type: 'string', format: 'uuid' },
      description: 'Filtrar por médico (opcional)',
    },
    {
      name: 'servicioId',
      in: 'query',
      required: false,
      schema: { type: 'string', format: 'uuid' },
      description: 'Filtrar por servicio (opcional)',
    },
  ],
  responses: {
    '200': {
      description: 'Slots disponibles para la fecha solicitada',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/TurnoDisponible' },
          },
        },
      },
    },
    '400': {
      description: 'Parámetro fecha requerido',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    ...commonErrors,
  },
});

// POST /api/v1/turnos
registry.registerPath({
  method: 'post',
  path: '/api/v1/turnos',
  summary: 'Crear un turno',
  tags: ['Turnos'],
  security: commonPostSecurity,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CrearTurnoRequest' },
        },
      },
    },
  },
  responses: {
    '201': { description: 'Turno creado exitosamente.' },
    '400': {
      description: 'Datos inválidos o faltan campos obligatorios',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    '409': {
      description: 'El horario no está disponible',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    ...commonErrors,
  },
});

// GET /api/v1/turnos/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/turnos/{id}',
  summary: 'Consultar estado de un turno',
  tags: ['Turnos'],
  security: commonGetSecurity,
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
      description: 'ID del turno',
    },
  ],
  responses: {
    '200': {
      description: 'Datos del turno',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              turno: { $ref: '#/components/schemas/TurnoResponse' },
            },
          },
        },
      },
    },
    '404': {
      description: 'Turno no encontrado',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    ...commonErrors,
  },
});

// GET /api/v1/pacientes/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/pacientes/{id}',
  summary: 'Obtener datos de un paciente',
  tags: ['Pacientes'],
  security: commonGetSecurity,
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
      description: 'ID del paciente',
    },
  ],
  responses: {
    '200': {
      description: 'Datos del paciente',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PacienteResponse' },
        },
      },
    },
    '404': {
      description: 'Paciente no encontrado',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    ...commonErrors,
  },
});

// ─── Build ────────────────────────────────────────────────

let cachedSpec: Record<string, unknown> | null = null;

/**
 * Genera (o devuelve cacheado) el spec OpenAPI 3.1.
 * Solo expone endpoints públicos /api/v1/*.
 * @returns {Record<string, unknown>} Spec OpenAPI 3.1 generado.
 */
export function buildOpenApiSpec(): Record<string, unknown> {
  if (cachedSpec) return cachedSpec;

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const doc = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'AicoreMed API',
      version: API_VERSION,
      description:
        'API pública del Sistema de Gestión para Consultorios Médicos (Chile).\n\n' +
        '**Autenticación:** API Key en header `x-api-key` o como `Authorization: Bearer <key>`.\n' +
        '**Rate limit:** 60 requests/min por API key.\n\n' +
        'Solo se documentan los endpoints públicos `/api/v1/*`. Los endpoints internos ' +
        '(/api/internal/*, /api/deploy/*, etc.) no están expuestos en este spec.',
    },
    servers: [
      { url: BASE_URL, description: 'Producción' },
      { url: 'http://localhost:3000', description: 'Desarrollo local' },
    ],
  });

  cachedSpec = doc as unknown as Record<string, unknown>;
  return cachedSpec;
}

/**
 * Verifica que el spec no contenga paths internos.
 * Útil para tests automatizados.
 * @returns {string[]} Lista de paths públicos del spec.
 */
export function getPublicPaths(): string[] {
  const spec = buildOpenApiSpec();
  const paths = spec.paths as Record<string, unknown> | undefined;
  return paths ? Object.keys(paths) : [];
}
