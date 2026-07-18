# AicoreMed — Documentación Técnica

Bienvenido a la documentación técnica de **AicoreMed**, la plataforma de gestión clínica
multi-tenant de [Aicore Agency](https://aicorebots.com).

Esta documentación vive en el repositorio (`docs/`), se versiona junto al código y se
publica automáticamente en cada push a `main`. Si algo cambia en el producto, este sitio
debe cambiar en el mismo PR — no hay "documentación aparte" que se desactualice.

## Empezar aquí

<div class="grid cards" markdown>

- **:material-rocket-launch: Instalación**
  Cómo levantar el proyecto en local o en un VPS nuevo.
  [→ Guía de instalación](existente/instalacion.md)

- **:material-sitemap: Arquitectura**
  Las 5 capas del sistema, diagramas de flujo, y el stack completo.
  [→ Ver arquitectura](existente/arquitectura.md)

- **:material-database: Base de datos**
  Esquema completo, relaciones y migraciones.
  [→ Ver esquema](existente/base-de-datos.md)

- **:material-shield-lock: Seguridad**
  Autenticación, 2FA, rate limiting, HMAC, sanitización IA.
  [→ Ver seguridad](existente/seguridad.md)

</div>

## Qué es AicoreMed

AicoreMed es un SaaS multi-tenant para clínicas y médicos independientes en Chile
(con expansión planeada a Argentina y México) que combina:

- **Dashboard de gestión clínica** — turnos, pacientes, recetas, reportes, facturación.
- **Automatización conversacional** — un agente de IA (n8n + Ollama) que atiende WhatsApp
  y email, agenda turnos, responde consultas y hace triaje de urgencias.
- **Portal de pacientes** — acceso propio vía magic link por WhatsApp.
- **Telemedicina integrada** — videoconsultas vía LiveKit.
- **Infraestructura 100% self-hosted** — sin intermediarios SaaS de terceros, corre
  íntegramente en la VPS propia sobre Docker.

## Stack tecnológico (resumen)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router), TypeScript, shadcn/ui, Tailwind, TanStack Query |
| Backend | API Routes, Drizzle ORM, Zod |
| Base de datos | PostgreSQL |
| Automatización | n8n (self-hosted) |
| IA conversacional | Ollama + Gemma3 (local, sin llamadas externas) |
| Mensajería | Twilio (WhatsApp / SMS) |
| Video | LiveKit |
| Pagos | MercadoPago |
| Infraestructura | Docker Swarm + Traefik |

Detalle completo, versiones exactas y diagramas: [Arquitectura →](existente/arquitectura.md)

## Cómo está organizada esta documentación

- **`existente/`** — documentación técnica de referencia (instalación, arquitectura,
  base de datos, seguridad, workflows). Es la fuente de verdad de cómo funciona el sistema.
- **`modulos/`** — un documento por feature de producto (turnos, pacientes, conversaciones,
  recetas, telemedicina, portal de pacientes), pensado para quien necesita entender *un*
  módulo sin leer todo el sistema.
- **`api/`** — referencia de la API pública v1 (autogenerada desde los schemas Zod).
- **`decisiones/`** — Architecture Decision Records (ADRs): por qué se tomó cada decisión
  técnica relevante, para que nadie tenga que adivinar o repetir una discusión ya cerrada.

## Contribuir a esta documentación

Si cambias un comportamiento del sistema, el PR que lo implementa debe incluir el update
de la página correspondiente en `docs/`. Si tomas una decisión de arquitectura no trivial
(elegir una librería, un patrón, una migración), agrega un ADR nuevo en `docs/decisiones/`
siguiendo la plantilla existente.
