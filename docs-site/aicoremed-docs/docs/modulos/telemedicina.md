# Módulo Telemedicina

## Arquitectura

```
No tiene tabla dedicada — usa turnos.tipoConsulta = 'telemedicina' y turnos.linkVideollamada.

API
  └── api/livekit/token/route.ts  → POST (genera token JWT LiveKit)

Pages
  ├── videollamada/[turnoId]/page.tsx  → Video call (paciente con token en URL, médico via API)
  └── dashboard/telemedicina/
      ├── page.tsx                     → Server component (lista turnos virtuales)
      └── telemedicina-client.tsx      → Filtros, stats, botones Unirse

Components (components/videollamada/)
  ├── video-room.tsx           → 707 líneas: UI completa (focus/grid layout, chat, controles)
  ├── prejoin-lobby.tsx        → Preview cámara antes de unirse
  ├── custom-control-bar.tsx   → Controles en español (mic, cam, pantalla, chat, pantalla completa, colgar)
  └── custom-chat.tsx          → Chat tipo drawer

Service: lib/services/livekit-telemedicina.ts
Tokens: lib/livekit.ts (server-side)
Client: lib/livekit-client.ts (constantes + helpers)

Infraestructura: livekit-server/
  ├── livekit.yaml            → Config servidor (Redis, TURN, puertos)
  ├── docker-compose.yml      → LiveKit + Redis
  └── traefik-livekit.yml     → Routing livekit.aicorebots.com
```

## Flujo de creación

```
turnosService.create(tipoConsulta='telemedicina')
  → inserta turno en DB
  → fire-and-forget: telemedicinaService.configurarSala()
      → genera roomName: 'consultorio_{turnoId}'
      → generateMedicoToken() + generatePacienteToken()
      → guarda linkPaciente en turnos.linkVideollamada
      → envía WhatsApp al paciente con enlace + fecha/hora
```

## Token Lifecycle

| Propiedad | Valor |
|-----------|-------|
| Room name | `consultorio_{turnoId}` |
| Token TTL | 24h |
| Medico grants | roomAdmin: true (puede gestionar participantes) |
| Paciente grants | roomAdmin: false (solo publicar/subscribir) |
| Room creation | Implícita (LiveKit crea room al primer join) |
| Room cleanup | Automática al desconectar último participante |

## Seguridad

- **Medico**: requiere sesión NextAuth (`requireAuth()`)
- **Paciente**: requiere portal session JWT + verifica que el turno le pertenezca
- **Fallback**: si no hay `LIVEKIT_API_KEY`, `configurarSala()` retorna null sin error
- **WhatsApp**: solo a pacientes con `consentimientoWhatsapp = true`

## Componentes

### VideoRoom (707 líneas)
- PreJoinLobby con preview de cámara/mic
- FocusLayoutContainer + CarouselLayout + GridLayout
- Pin de participante por click
- ControlBar en español (M=mic, C=cámara, F=fullscreen, V=chat, Escape=cerrar chat)
- Timer de conexión
- Toasts de entrada/salida de participantes
- 6 categorías de error con mensajes contextuales (permisos, token, room, red, genérico)

### PreJoinLobby (223 líneas)
- `getUserMedia` raw (antes de conectar a LiveKit)
- Toggles mic/cámara
- Keyboard shortcut hints
- Términos de teleconsulta

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| telemedicina | Professional |

## Integraciones

- **LiveKit** (self-hosted): servidor en VPS, Redis para estado, TURN para NAT traversal
- **n8n**: WF-01 maneja consultas de pacientes sobre videollamadas
- **Twilio**: notificación WhatsApp con enlace
- **Turnos**: integración directa en `turnosService.create()` (fire-and-forget)

## Infraestructura LiveKit

| Componente | Puerto |
|-----------|--------|
| HTTP/WS | 7880 |
| TCP media | 7881 |
| UDP media | 7882 |
| UDP range | 50000-60000 |
| TURN TLS | 5349 |
| TURN UDP | 3478 |
| Redis | 6379 |

URL pública: `wss://livekit.aicorebots.com`
