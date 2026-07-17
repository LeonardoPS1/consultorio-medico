/**
 * OpenAPI 3.1 spec builder for API v1.
 * Se construye manualmente a partir de los schemas Zod existentes.
 */

const API_VERSION = '1.0.0';

export function buildOpenApiSpec(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'AicoreMed API',
      version: API_VERSION,
      description: 'API pública del Sistema de Gestión para Consultorios Médicos.\n\nRequiere autenticación vía API Key en el header `x-api-key` o JWT de portal paciente.',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com',
        description: 'Producción',
      },
      {
        url: 'http://localhost:3000',
        description: 'Desarrollo local',
      },
    ],
    security: [
      { apiKey: [] },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API Key generada desde el panel de administración',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Mensaje de error' },
          },
        },
        Medico: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            especialidad: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telefono: { type: 'string' },
          },
        },
        Servicio: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            duracionMinutos: { type: 'integer' },
            precio: { type: 'number' },
          },
        },
        Horario: {
          type: 'object',
          properties: {
            dia: { type: 'string', description: 'Día de la semana (0-6)' },
            horaInicio: { type: 'string' },
            horaFin: { type: 'string' },
          },
        },
        TurnoDisponible: {
          type: 'object',
          properties: {
            fecha: { type: 'string', format: 'date' },
            hora: { type: 'string' },
            medicoId: { type: 'string', format: 'uuid' },
            medicoNombre: { type: 'string' },
          },
        },
        CrearTurnoRequest: {
          type: 'object',
          required: ['pacienteId', 'medicoId', 'fecha', 'hora'],
          properties: {
            pacienteId: { type: 'string', format: 'uuid', description: 'ID del paciente' },
            medicoId: { type: 'string', format: 'uuid', description: 'ID del médico' },
            fecha: { type: 'string', format: 'date', description: 'Fecha del turno (YYYY-MM-DD)' },
            hora: { type: 'string', description: 'Hora del turno (HH:mm)' },
            motivo: { type: 'string', description: 'Motivo de la consulta' },
            tipo: { type: 'string', enum: ['consulta', 'control', 'urgencia', 'telemedicina', 'procedimiento', 'otro'], description: 'Tipo de consulta' },
          },
        },
        Paciente: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            apellido: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telefono: { type: 'string' },
          },
        },
      },
    },
    paths: buildPaths(),
  };
}

function buildPaths(): Record<string, Record<string, unknown>> {
  return {
    '/api/v1/medicos': {
      get: buildOperation({
        summary: 'Listar médicos',
        tags: ['Médicos'],
        responses: {
          '200': {
            description: 'Lista de médicos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Medico' },
                },
              },
            },
          },
        },
      }),
    },
    '/api/v1/servicios': {
      get: buildOperation({
        summary: 'Listar servicios',
        tags: ['Servicios'],
        responses: {
          '200': {
            description: 'Lista de servicios',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Servicio' },
                },
              },
            },
          },
        },
      }),
    },
    '/api/v1/horarios': {
      get: buildOperation({
        summary: 'Obtener horarios disponibles',
        tags: ['Horarios'],
        parameters: [
          { name: 'medicoId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Horarios disponibles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Horario' },
                },
              },
            },
          },
        },
      }),
    },
    '/api/v1/turnos/disponibles': {
      get: buildOperation({
        summary: 'Obtener turnos disponibles',
        tags: ['Turnos'],
        parameters: [
          { name: 'fecha', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'medicoId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'servicioId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Slots disponibles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TurnoDisponible' },
                },
              },
            },
          },
        },
      }),
    },
    '/api/v1/turnos': {
      post: buildOperation({
        summary: 'Crear un turno',
        tags: ['Turnos'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CrearTurnoRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Turno creado exitosamente' },
          '400': { description: 'Datos inválidos' },
          '409': { description: 'El horario no está disponible' },
        },
      }),
    },
    '/api/v1/pacientes/{id}': {
      get: buildOperation({
        summary: 'Obtener datos de un paciente',
        tags: ['Pacientes'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Datos del paciente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Paciente' },
              },
            },
          },
          '404': { description: 'Paciente no encontrado' },
        },
      }),
    },
  };
}

function buildOperation(op: {
  summary: string;
  tags: string[];
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    summary: op.summary,
    tags: op.tags,
    parameters: op.parameters,
    requestBody: op.requestBody,
    responses: {
      ...op.responses,
      '401': { description: 'No autorizado — API Key inválida o faltante' },
      '429': { description: 'Demasiadas solicitudes — rate limit excedido' },
    },
  };
}
