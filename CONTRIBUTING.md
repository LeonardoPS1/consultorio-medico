# Contribuyendo a AicoreMed

Gracias por tu interés en contribuir. Este documento describe el flujo de trabajo y las guías de estilo para mantener la calidad del proyecto.

> 📄 **Documentación principal**: [`AGENTS.md`](./AGENTS.md) contiene el contexto completo del sistema, stack, arquitectura, workflows y convenciones.

---

## 🚀 Primeros pasos

1. Seguí la [guía de instalación](./docs/SETUP.md) para levantar el entorno local
2. Revisá [`AGENTS.md`](./AGENTS.md) para entender la arquitectura y el stack
3. Buscá issues o features en el backlog

## 🧑‍💻 Convenciones de código

Ver [`AGENTS.md → Metodología de Trabajo`](./AGENTS.md#-metodología-de-trabajo) para el detalle completo. En resumen:

| Regla | Estándar |
|-------|----------|
| **Lenguaje** | TypeScript estricto (`strict: true`) |
| **Framework** | Next.js 16 App Router |
| **ORM** | Drizzle ORM puro (sin SQL raw excepto migraciones) |
| **UI** | shadcn/ui + Tailwind CSS |
| **Validación** | Zod en todas las API routes |
| **Testing** | Vitest (unit) + Playwright (e2e) |
| **API Routes** | Patrón RESTful con `apiHandler` |

### Commits

Usamos [commits convencionales](https://www.conventionalcommits.org/):

```
feat(scope): descripción en español
fix(pacientes): corregir validación de RUT
chore(deps): actualizar drizzle-orm a 0.38
docs(api): documentar webhook de Twilio
```

### ESLint y Prettier

```bash
pnpm lint        # Verificar ESLint
pnpm format      # Formatear con Prettier
pnpm type-check  # Verificar tipos TypeScript
```

## ✅ Flujo de PR

1. **Branch**: trabajar desde `main` o crear feature branch
2. **Build**: `pnpm build` debe pasar con **0 errores**
3. **Tests**: `pnpm test` debe pasar. Agregar tests para código nuevo
4. **Lint**: `pnpm lint` sin errores (warns permitidos)
5. **Commit**: mensaje descriptivo siguiendo conventional commits
6. **Push**: a `origin/main` (Dokploy redeploya automáticamente)

> ⚠️ El CI pipeline corre quality + test + build + docker en cada push a `main`.

## 🧪 Tests

```bash
pnpm test        # Tests unitarios (Vitest)
pnpm test:watch  # Modo watch
pnpm e2e         # Tests end-to-end (Playwright)
```

## 📚 Documentación

- `AGENTS.md` — Contexto del sistema, arquitectura, workflows, roadmaps
- `docs/architecture.md` — Diagramas de flujo y decisiones técnicas
- `docs/SETUP.md` — Guía de instalación y configuración

Al agregar features nuevas, actualizá la documentación relevante.
