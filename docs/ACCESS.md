# 🔐 ACCESO COMPLETO — Consultorio Médico (Aicore)

> ⚠️ ESTE ARCHIVO CONTIENE CREDENCIALES REALES — NO SUBIR A GIT
> Última actualización: 20/05/2026

---

## 🖥️ VPS (OVH)

| Campo | Valor |
|-------|-------|
| **IP** | `51.222.207.250` |
| **SSH** | `ubuntu` / `Cool220479..@` |
| **Puerto** | `22` |
| **Conectar** | `ssh ubuntu@51.222.207.250` |

### Conectar desde Python (si SSH falla):
```python
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('51.222.207.250', username='ubuntu', password='Cool220479..@')
```

---

## 🐳 Dokploy

| Campo | Valor |
|-------|-------|
| **URL Admin** | `https://51.222.207.250:3000` |
| **Dashboard App ID** | `app-hack-back-end-sensor-jd2eu3` |
| **Dashboard App Dir** | `/etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code/` |
| **Backend Compose ID** | `aicore-n8nrunnerpostgresollama-a715gi` |
| **Backend Compose Dir** | `/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code/` |

### Contenedores activos:
| Nombre | Rol | Red |
|--------|-----|-----|
| `med-dashboard` | Dashboard Next.js | `dokploy-network` |
| `aicore-n8n...-n8n-1` | n8n | `aicore-...` |
| `aicore-n8n...-postgres-1` | PostgreSQL | `aicore-...` |
| `aicore-n8n...-ollama-1` | Ollama | `aicore-...` |
| `dokploy-traefik` | Reverse Proxy | `dokploy-network` |

### Comando para levantar el dashboard (si se cae):
```bash
sudo docker rm -f med-dashboard 2>/dev/null
sudo docker run -d --name med-dashboard \
  --network dokploy-network --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://dashboard_user:****@172.18.0.1:5432/consultorio_medico \
  -e AUTH_SECRET=**** \
  -e TWILIO_ACCOUNT_SID=**** \
  -e TWILIO_AUTH_TOKEN=**** \
  -e TWILIO_WHATSAPP_NUMBER=whatsapp:+18453735358 \
  -e N8N_BASE_URL=http://172.18.0.1:5678 \
  -e N8N_API_KEY=**** \
  -e N8N_WEBHOOK_INBOUND_URL=http://172.18.0.1:5678/webhook/consultorio-inbound \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.med-dash.rule=Host(\`med.aicorebots.com\`)" \
  -l "traefik.http.routers.med-dash.entrypoints=websecure" \
  -l "traefik.http.routers.med-dash.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.med-dash.loadbalancer.server.port=3000" \
  code-dashboard
```

---

## 🗄️ PostgreSQL

| Campo | Valor |
|-------|-------|
| **Host interno** | `172.18.0.1:5432` |
| **Base de datos** | `consultorio_medico` |
| **App User** | `dashboard_user` |
| **App Password** | `****` |
| **Superuser** | `reece.schmeler67` |
| **Contenedor** | `aicore-n8nrunnerpostgresollama-a715gi-postgres-1` |

### Conectar via CLI:
```bash
sudo docker exec -e PGPASSWORD='****' \
  aicore-n8nrunnerpostgresollama-a715gi-postgres-1 \
  psql -U dashboard_user -d consultorio_medico -c "SELECT COUNT(*) FROM pacientes"
```

---

## 📱 Twilio

| Campo | Valor |
|-------|-------|
| **Account SID** | `****` |
| **Auth Token** | `****` |
| **WhatsApp Sandbox** | `+18453735358` |
| **Webhook URL** | `https://med.aicorebots.com/api/webhooks/twilio` |

---

## 🤖 n8n

| Campo | Valor |
|-------|-------|
| **URL** | `https://n8n.aicorebots.com` |
| **API interna** | `http://172.18.0.1:5678` (sin Cloudflare) |
| **API Key** | `eyJhbGciOiJIUzI1NiIs...oaF3o` (JWT completo en .env) |
| **Red Docker** | `aicore-n8nrunnerpostgresollama-a715gi` |
| **Contenedor** | `aicore-n8nrunnerpostgresollama-a715gi-n8n-1` |

### Workflows importados (7):
01 - WhatsApp Inbound + Triaje IA
02 - Gestión de Turnos
03 - Recordatorios Automáticos
04 - Correo Inteligente
05 - Resumen Diario del Médico
06 - Recetas y Renovaciones
07 - Backup Automático Encriptado

### Activar workflow via API:
```bash
sudo docker run --rm --network aicore-n8nrunnerpostgresollama-a715gi \
  curlimages/curl -s -X POST \
  -H "X-N8N-API-KEY: eyJhbGci..." \
  http://aicore-n8nrunnerpostgresollama-a715gi-n8n-1:5678/api/v1/workflows/{ID}/activate
```

---

## 🧠 Ollama

| Campo | Valor |
|-------|-------|
| **URL interna** | `http://172.18.0.1:11434` |
| **Modelo** | `mistral` |
| **Contenedor** | `aicore-n8nrunnerpostgresollama-a715gi-ollama-1` |

---

## 🌐 URLs

| Servicio | URL |
|----------|-----|
| **Dashboard** | `https://med.aicorebots.com` |
| **n8n** | `https://n8n.aicorebots.com` |
| **Dokploy** | `https://51.222.207.250:3000` |

### Credenciales Dashboard:
| Usuario | Password | Rol |
|---------|----------|-----|
| `admin@consultorio.com` | `admin123` | admin |
| `medico@consultorio.com` | `medico123` | medico |

---

## 📂 GitHub

| Campo | Valor |
|-------|-------|
| **Repo** | `https://github.com/LeonardoPS1/consultorio-medico` |
| **Branch** | `main` |
| **Flujo** | `git push origin main` → Dokploy auto-redeploy |

---

## 🔧 Comandos útiles

```bash
# Ver todos los contenedores
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'

# Logs dashboard
sudo docker logs med-dashboard --tail 50

# Logs n8n
sudo docker logs aicore-n8nrunnerpostgresollama-a715gi-n8n-1 --tail 50

# Health checks
curl -s https://med.aicorebots.com/api/health
curl -s https://n8n.aicorebots.com/healthz
curl -s http://51.222.207.250:11434/api/tags

# Reiniciar dashboard
sudo docker restart med-dashboard
```
