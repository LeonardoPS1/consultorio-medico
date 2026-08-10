# Task 6: Renombrado UI "turno ofrecido" + KPI + ayuda

## Files
- **Modify:** `dashboard/app/dashboard/lista-espera/lista-espera-client.tsx` (solo textos)
- **Modify:** `dashboard/app/dashboard/lista-espera/page.tsx` (KPI label)
- **Modify:** `dashboard/lib/ayuda-content.ts` (sección 'lista-espera')

> NO reestructurar HTML ni cambiar lógica en esta task (eso es Task 7). Solo textos visibles al usuario.

## Replacements exactos (respetar pluralidad/género)

### `lista-espera-client.tsx`
| Línea aprox | Actual | Nuevo |
|---|---|---|
| 292 | `El paciente recibirá una oferta cuando se cancele un turno del médico elegido.` | `El paciente recibirá un turno ofrecido cuando se libere un turno del médico elegido.` |
| 364 | `El paciente recibirá una oferta por WhatsApp cuando se cancele un turno del médico.` | `El paciente recibirá un turno ofrecido por WhatsApp cuando se libere un turno del médico.` |
| 278 | `recibirán automáticamente una oferta vía WhatsApp.` | `recibirán automáticamente un turno ofrecido vía WhatsApp.` |
| 468 | `Asignar turno (oferta manual)` | `Asignar turno (turno ofrecido)` |
| 505 | `{asignando ? 'Asignando...' : 'Crear oferta'}` | `{asignando ? 'Asignando...' : 'Ofrecer turno'}` |
| 515 | `aria-label="Ver ofertas"` | `aria-label="Ver turnos ofrecidos"` |
| 542 | `No recibirá más ofertas de turno.` | `No recibirá más turnos ofrecidos.` |
| 562 | `Cargando ofertas...` | `Cargando turnos ofrecidos...` |
| 564 | `Sin ofertas registradas.` | `Sin turnos ofrecidos registrados.` |
| 574 | `Oferta {formatOfertaFecha(oferta.fechaOferta)}` | `Turno ofrecido {formatOfertaFecha(oferta.fechaOferta)}` |

Además reemplazar en LISTA-ESPERA-CLIENT.TSX:
- Botón con texto `Ofertas` (chevron toggle, línea ~523) → `Turnos ofrecidos`.
- `estadoOfertaBadge`: en el badge con estado 'pendiente' cambiar el label de `'Pendiente'` a `'Pendiente de confirmación'` (NO cambiar los demás: aceptada/rechazada/expirada).
- Comentario interno del handler `// Ver ofertas` está en línea 100 — puede quedar (comentario, no visible) pero si tocas el archivo por otra razón, actualiza. La función `cargarOfertas` y estados `ofertasAbiertas`/`ofertasPorItem` NO se renombran (backend/lógica).
- Asegurar que el toast de error en handleAsignarTurno (línea ~195) diga: `'No se pudo ofrecer el turno (debe ser futuro, del mismo médico y sin turno ofrecido pendiente)'`.

### `page.tsx`
- KPI label línea 79: `Sin oferta activa` → `Sin turno ofrecido`.

### `lib/ayuda-content.ts` (sección id 'lista-espera')
- Línea 294 tip: `'Cada paciente recibe máximo 3 ofertas por día'` → `'Cada paciente recibe máximo 3 turnos ofrecidos por día'`.
- Línea 303 tip: `'El paciente recibe un WhatsApp con la oferta del turno'` → `'El paciente recibe un WhatsApp con el turno ofrecido'`.
- Línea 314 respuesta: `'No hay límite de tiempo...hasta que haya una oferta disponible...'` → `'No hay límite de tiempo. Puede esperar hasta que haya un turno disponible o hasta que el consultorio lo retire manualmente.'`.
- Buscar y reemplazar también el título del paso que diga `'Ofertas automáticas'` → `'Turnos ofrecidos automáticamente'` y cualquier otro texto de esa sección que contenga "oferta" en sentido de turno ofrecido (NO tocar "WF-10 Expiracion Waitlist" en línea ~1717 ni referencias a workflows/backend).

## Verificación
```bash
cd dashboard && npx tsc --noEmit && npx eslint app/dashboard/lista-espera/lista-espera-client.tsx app/dashboard/lista-espera/page.tsx lib/ayuda-content.ts
```
- tsc exit 0, eslint 0 errores (warnings pre-existentes ok).
- Verificar con grep que en los 3 archivos ya no queda "oferta" en texto VISIBLE con sentido de turno liberado (puede quedar "ofertasTurno"/"ofertaId"/nombres de funciones/variables — NO renombrar backend).

## Commit (solo los 3 archivos)
```bash
git add dashboard/app/dashboard/lista-espera/lista-espera-client.tsx dashboard/app/dashboard/lista-espera/page.tsx dashboard/lib/ayuda-content.ts
git commit -m "ui: renombra oferta a turno ofrecido en lista de espera y ayuda"
```

## Report
Escribir en `D:\OPENCODE\consultorio-medico\.superpowers\sdd\2026-08-09-lista-espera-v2\reports\task-6-report.md` con: Status (DONE/BLOCKED/...), commit sha, test summary (tsc/eslint), concerns.

## Global Constraints
- Sin migraciones de DB. Renombrado SOLO en texto visible al usuario (UI + ayuda). Backend (`ofertasTurno`, `ofertaId`, `waitlistService`, funciones, variables internas) NO se renombra.
- Español neutro chileno (no "vos"/argentinismos). ESLint `import/order`, Prettier single quotes + trailing commas + printWidth 100.
- Tras el cambio, correr los tests de la suite waitlist que existan (`npx vitest run lib/services/__tests__ lib/__tests__`) por si algún test assertó un texto UI (deberían seguir pasando, son textos de WhatsApp/servicio no dashboard).