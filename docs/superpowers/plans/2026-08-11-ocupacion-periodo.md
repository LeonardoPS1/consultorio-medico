# Ocupación sensible al período — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que la pestaña Ocupación de Reportes re-fetchee con la ventana de tiempo del selector Semana/Mes/Año superior.

**Architecture:** El selector `periodo` (reportes-client.tsx) se pasa como query param `periodo` al endpoint `/api/reportes/ocupacion`, que lo mapea a semanas (1/4/52). Se agrega helper `labelSemanas(n)` para textos correctos.

**Tech Stack:** Next.js App Router, TypeScript, client-safe module `ocupacion-grilla.ts`.

## Global Constraints

- Aditivo/no rompe contrato: si `periodo` está presente gana sobre `semanas`; sin `periodo`, comportamiento actual (12 semanas).
- Textos visibles en español neutro chileno.
- ESLint + prettier según repo; tsc --noEmit 0 errores.

---

### Task 1: Helper `labelSemanas` en ocupacion-grilla.ts

**Files:**
- Modify: `dashboard/lib/services/ocupacion-grilla.ts`

**Interfaces:**
- Produces: `export function labelSemanas(n: number): string` → `1` = 'última semana', `4` = 'último mes', `52` = 'el último año', resto = `últimas ${n} semanas`.

- [ ] **Step 1:** Agregar la función exportada al final del archivo (después de `generarRecomendaciones`):

```ts
/**
 * Devuelve el texto humano para una ventana expresada en semanas.
 *
 * @param n - Cantidad de semanas de la ventana.
 * @returns Etiqueta en español (ej. 'última semana', 'último mes', 'el último año').
 */
export function labelSemanas(n: number): string {
  if (n === 1) return 'última semana';
  if (n === 4) return 'último mes';
  if (n === 52) return 'el último año';
  return `últimas ${n} semanas`;
}
```

- [ ] **Step 2:** Verificar que ocupa contexto: `db.select()` del server importa desde aquí solo consts/tipos; una función pura no rompe nada.

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 3:** Commit

```bash
git add dashboard/lib/services/ocupacion-grilla.ts
git commit -m "feat(ocupacion): helper labelSemanas para textos de ventana"
```

---

### Task 2: Param `periodo` en API route

**Files:**
- Modify: `dashboard/app/api/reportes/ocupacion/route.ts`

**Interfaces:**
- Consumes: `getDemoOcupacion({semanas})`, `calcularOcupacionFranjas({semanas,sucursalId,medicoId})` (sin cambios).
- Produces: nuevo query param `periodo=semana|mes|año` (opcional, gana sobre `semanas`); clamp de `semanas` ampliado a `1-52`.

- [ ] **Step 1:** Ampliar el clamp y mapear periodo. Reemplazar líneas 31-34 por:

```ts
  const forceDemo = searchParams.get('demo') !== 'false';
  const periodo = searchParams.get('periodo') as 'semana' | 'mes' | 'año' | null;
  const semanasMap: Record<string, number> = { semana: 1, mes: 4, año: 52 };
  const semanasRaw = Number(searchParams.get('semanas') ?? '12');
  const semanasClamped =
    Number.isFinite(semanasRaw) && semanasRaw >= 1 && semanasRaw <= 52 ? semanasRaw : 12;
  const semanas = periodo && semanasMap[periodo] ? semanasMap[periodo] : semanasClamped;
  const sucursalId = searchParams.get('sucursalId') ?? undefined;
  const medicoId = searchParams.get('medicoId') ?? undefined;
```

- [ ] **Step 2:** Verificar tipos. Run: `cd dashboard && npx tsc --noEmit` → Expected: 0 errores.

- [ ] **Step 3:** Commit

```bash
git add dashboard/app/api/reportes/ocupacion/route.ts
git commit -m "feat(ocupacion): parametro periodo en endpoint (semana/mes/año)"
```

---

### Task 3: Wire periodo en reportes-client.tsx

**Files:**
- Modify: `dashboard/app/dashboard/reportes/reportes-client.tsx` (useEffect línea 340-358 + header línea 530)

**Interfaces:**
- Consumes: `labelSemanas` de `@/lib/services/ocupacion-franjas` (re-exporta desde ocupacion-grilla). Uso directo en `value {ocupacionData?.semanas ?? 12}`.

- [ ] **Step 1:** Agregar `periodo` a deps del useEffect de Ocupación y al URL. Cambiar línea 347 a:

```ts
        const res = await fetch(
          `/api/reportes/ocupacion?demo=${ocupacionDemo ? 'true' : 'false'}&periodo=${periodo}`,
          { cache: 'no-store' },
        );
```

y línea 358 (array de deps) a:

```ts
  }, [canVerOcupacion, ocupacionDemo, fetchKey, periodo]);
```

- [ ] **Step 2:** Importar `labelSemanas`. Agregar (en el bloque de imports desde `@/lib/services/ocupacion-franjas`, cerca de `OcupacionReporte` línea 38):

```ts
  labelSemanas,
```

- [ ] **Step 3:** Reemplazar el texto del header (línea 530):

```ts
                  <p className="text-xs text-muted-foreground">
                    Demanda histórica por día y franja horaria ({labelSemanas(ocupacionData?.semanas ?? 12)}).
                  </p>
```

- [ ] **Step 4:** Run: `cd dashboard && npx tsc --noEmit` → Expected: 0 errores.

- [ ] **Step 5:** Commit

```bash
git add dashboard/app/dashboard/reportes/reportes-client.tsx
git commit -m "feat(ocupacion): refetch al cambiar periodo del selector"
```

---

### Task 4: Usar labelSemanas en heatmap-franjas.tsx

**Files:**
- Modify: `dashboard/components/reportes/heatmap-franjas.tsx`

**Interfaces:**
- Consumes: `labelSemanas` (importar del mismo módulo que `DIAS_ABREV`).

- [ ] **Step 1:** Importar `labelSemanas` en el import de `@/lib/services/ocupacion-grilla`.
- [ ] **Step 2:** Reemplazar líneas 136-137:

```ts
        {data.totalTurnos.toLocaleString('es-ES')} turnos analizados en {labelSemanas(data.semanas)}.
```

- [ ] **Step 3:** Run: `cd dashboard && npx tsc --noEmit` → Expected: 0 errores.

- [ ] **Step 4:** Commit

```bash
git add dashboard/components/reportes/heatmap-franjas.tsx
git commit -m "feat(ocupacion): texto de ventana con labelSemanas"
```

---

### Task 5: Verificación + push

- [ ] **Step 1:** `cd dashboard && npm run build` → Expected: exit 0.
- [ ] **Step 2:** Push: `git push origin main`.
- [ ] **Step 3:** Documentar en memorie session-log (`.opencode/memory/session-log.md`, git-ignored).