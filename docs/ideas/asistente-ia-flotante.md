# 🤖 Asistente IA Flotante

## Problem Statement

**¿Cómo podríamos crear un asistente IA que esté siempre disponible sin estorbar, que se adapte al contexto del médico y que realmente ahorre tiempo?**

La IA es útil cuando es proactiva, y molesta cuando es entrometida. Necesitamos un equilibrio donde el médico tenga control total sobre **cuándo** y **cuánto** participa el asistente, y cuando aparece, valga la pena.

---

## Recommended Direction

**Asistente Híbrido (Ghost + Context-Aware + Ambient)**

Un asistente flotante que vive como FAB (Floating Action Button) en la esquina inferior derecha, se expande en un panel lateral, y ofrece tres modos de funcionamiento configurables por el usuario:

1. **Modo Silencioso** (por defecto): Solo responde cuando lo llamás. Cero sugerencias proactivas. Es un chat con contexto de la página actual.
2. **Modo Sugerente**: Detecta la página actual y muestra sugerencias relevantes como "pills" debajo del input. No interrumpe, solo ofrece. Ej: en conversaciones → "Sugerir respuesta", en pacientes → "Resumir historial".
3. **Modo Activo**: Muestra sugerencias proactivas como toasts sutiles cuando detecta algo relevante. Ej: "Turno de Juan Pérez en 15 min" o "3 mensajes sin responder".

El médico puede cambiar de modo en cualquier momento desde la ruedita de config del panel, y puede silenciar categorías individuales de sugerencias.

---

## Arquitectura

### Capas

```
┌─────────────────────────────────────────┐
│  AsistenteFlotante (FAB + Panel)        │
│  ├── FAB (bottom-right, siempre visible)│
│  ├── Panel expandible (380px desktop,   │
│  │   90vw mobile, Sheet en mobile)     │
│  ├── Chat area (mensajes + input)       │
│  ├── Sugerencias pills (modo Sugerente) │
│  └── Settings (modo, categorías, etc.)  │
├─────────────────────────────────────────┤
│  AsistenteProvider (React Context)      │
│  ├── Estado global (open/closed, modo)  │
│  ├── Historial de chat (en memoria)     │
│  ├── Sugerencias contextuales           │
│  └── Config del usuario (localStorage)  │
├─────────────────────────────────────────┤
│  API Layer                              │
│  ├── POST /api/ia/chat → Ollama         │
│  ├── GET /api/ia/sugerencias → context  │
│  └── GET/PUT /api/ia/settings → config  │
└─────────────────────────────────────────┘
```

### Modelo de datos

**Extensión de `tenants.config_ia`** (JSONB existente):

```typescript
export interface ConfigIa {
  // Existentes (para el bot de WhatsApp via n8n)
  prompt: string;
  maxTokens: number;
  temperatura: number;

  // Nuevos — Asistente Flotante
  asistenteHabilitado: boolean;      // true por defecto
  modoDefault: 'silencioso' | 'sugerente' | 'activo';  // 'silencioso'
  sugerenciasHabilitadas: {
    conversaciones: boolean;   // sugerir respuestas
    pacientes: boolean;       // resumir historial
    turnos: boolean;          //提醒 próximo turno
    recetas: boolean;         // sugerir renovación
  };
}
```

**Config por usuario (localStorage)**: Overrides del tenant config. El usuario puede cambiar modo y silenciar categorías individualmente sin tocar la config del tenant.

### Flujo de Chat

```
Usuario escribe mensaje
  → POST /api/ia/chat { mensaje, contexto: { pagina, datos } }
  → API arma system prompt con:
     - Config general del asistente
     - Contexto de la página actual (ruta, paciente seleccionado, conversación activa, etc.)
     - Últimos 10 mensajes del chat (historial en memoria)
  → ollamaChat() con temp=0.3, maxTokens=400
  → Response streamed o batch (empezamos con batch por simplicidad)
  → Se agrega al historial del chat en memoria
```

### Flujo de Sugerencias

```
Usuario navega a página
  → AsistenteProvider detecta pathname
  → Si modo Sugerente o Activo:
    → GET /api/ia/sugerencias?contexto=conversaciones&datos=...
    → API retorna pills: [{ texto: "Sugerir respuesta", accion: "sugerir-respuesta" }]
    → Se muestran debajo del input del chat
  → Si modo Activo + hay algo notable:
    → Toast sutil: "Juan Pérez tiene turno en 15 min"
```

### Contexto por Página

| Página |system prompt extra| Sugerencias disponibles |
|--------|-------------------|------------------------|
| `/conversaciones` | "El médico está viendo conversaciones con pacientes por WhatsApp. Podés sugerir respuestas a mensajes del paciente." | "Sugerir respuesta", "Resumir conversación", "Detectar urgencia" |
| `/pacientes/[id]` | "El médico está viendo la ficha de {paciente}. Tenés acceso al historial médico, recetas y turnos." | "Resumir historial", "Próximos turnos", "Recetas activas" |
| `/turnos` | "El médico está gestionando turnos. Tenés info de disponibilidad y agenda." | "Turnos de hoy", "Pacientes sin confirmar", "Bloqueos de agenda" |
| `/recetas` | "El médico está gestionando recetas. Podés sugerir renovaciones." | "Recetas por vencer", "Sugerir renovación" |
| `/atencion` | "El médico está en el Kanban de atención. Hay pacientes en espera." | "Siguiente paciente", "Tiempo promedio espera" |
| `/dashboard` | "El médico está en el panel principal. Mostrá KPIs resumidos." | "Resumen del día", "Alertas pendientes" |

---

## Key Assumptions to Validate

- [ ] **Ollama responde en <5s** para la mayoría de consultas del asistente — si es >5s, el UX se degrada y hay que mostrar loading states claros
- [ ] **El médico quiere ayuda en conversaciones** — la feature principal es sugerir respuestas a mensajes de WhatsApp, no un chat genérico
- [ ] **localStorage es suficiente** para config por usuario — no necesitamos una tabla en DB para overrides individuales (al menos en MVP)
- [ ] **El system prompt contextual es suficiente** — no necesitamos tool calling ni function calling en el MVP, solo prompts con contexto inyectado
- [ ] **3 modos son suficientes** — no necesitamos granularidad por sugerencia individual en la primera versión, solo on/off por categoría

---

## MVP Scope

### IN (v1)
- ✅ FAB flotante bottom-right con badge de "IA" y animación sutil
- ✅ Panel expandible con chat funcional conectado a Ollama
- ✅ 3 modos de comportamiento (silencioso/sugerente/activo)
- ✅ Contexto por página (system prompt dinámico según ruta)
- ✅ Sugerencias pills en página de conversaciones ("Sugerir respuesta", "Resumir")
- ✅ Historial de chat en memoria (se pierde al cambiar de página — MVP honesto)
- ✅ Ruedita de config para cambiar modo y silenciar categorías
- ✅ Feature gating: `ia-assistant` (professional+)
- ✅ Extensión de `ConfigIa` en schema + migration
- ✅ API: POST /api/ia/chat, GET /api/ia/sugerencias, GET/PUT settings
- ✅ Respuesta batch (no streaming) — Ollama local es rápido suficiente

### NOT (v1)
- ❌ Streaming de respuestas — se agrega en v2 si el UX lo necesita
- ❌ Historial persistente en DB — se agrega si los users lo piden
- ❌ Tool calling / Function calling — demasiado complejo para MVP
- ❌ Toasts proactivos (modo Activo) — se agrega en v2,Arrancamos con modo Silencioso y Sugerente
- ❌ Integración con n8n — el asistente es frontend+API directo, no necesita n8n
- ❌ Voz / Audio — fuera de scope
- ❌ Canvas / generar imágenes
- ❌ Historial compartido entre dispositivos — localStorage es local

---

## Open Questions

1. **¿El FAB interfiere con el Patient Panel?** — Ambos están en la derecha. Solución: FAB bottom-right, Patient Panel se abre desde la derecha como Sheet. No se solapan.
2. **¿Cómo manejar cuando Ollama está caído?** — Mostrar state de "IA no disponible" con retry. No bloquear la UI.
3. **¿El médico puede usar el asistente mientras atiende videollamadas?** — Sí, el panel es flotante e independiente del video.

---

## UX Details

### FAB
- Posición: `bottom-6 right-6` (desktop), `bottom-4 right-4` (mobile)
- Tamaño: 56x56px con shadow-xl
- Icono: Sparkles (lucide) con gradient fondo
- Animación: pulse sutil cuando hay sugerencias pendientes en modo Sugerente
- Badge: número de sugerencias pendientes (solo modo Sugerente/Activo)
- Click: toggle panel abierto/cerrado
- Teclado: `Ctrl+Shift+I` para abrir/cerrar

### Panel
- Desktop: 380px ancho, posición bottom-right, con slide-up animation
- Mobile: Sheet desde abajo (bottom sheet), 90vw
- Z-index: 40 (debajo de modals, encima de todo lo demás)
- Header: "Asistente IA" + modo badge (silencioso/sugerente/activo) + settings ⚙️
- Chat: scroll area con mensajes (user/assistant), markdown básico
- Input: textarea auto-resize + send button + sugerencia pills arriba del input
- Settings: popover con switches para modo y categorías

### Sugerencias (pills)
- Aparecen como chips clickeables arriba del input
- Máximo 3 sugerencias a la vez
- Click en pill → envía como mensaje pre-formateado al chat
- Se descartan automáticamente al cambiar de página

### Respuestas del Chat
- Formato: texto con markdown básico (negrita, listas, código)
- No автodenigrar — el asistente es knapp och professionell
- Idioma: español neutro chileno (coherente con el resto del sistema)
- Disclaimer: "Soy un asistente de IA. Revisá siempre la información antes de actuar."
