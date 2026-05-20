# 🔐 Acceso Completo — Consultorio Médico (Aicore)

> Última actualización: 20/05/2026

---

## 🖥️ VPS (OVH)

| Campo | Valor |
|-------|-------|
| **IP** | `51.222.207.250` |
| **SSH Usuario** | `ubuntu` |
| **SSH Password** | `********` (ver `.env` local o VPS) |
| **Puerto SSH** | `22` |
| **Conectar** | `ssh ubuntu@51.222.207.250` |

### Conectar desde Python (cuando SSH directo falla):
```python
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('51.222.207.250', username='ubuntu', password='********')
```

---

## 🐳 Dokploy

| Campo | Valor |
|-------|-------|
| **URL** | `https://51.222.207.250:3000` (admin UI) |
| **Apps** | 2 aplicaciones + 1 compose stack |

### App 1: AicoreMed-dashboard
| Campo | Valor |
|-------|-------|
| **ID** | `app-hack-back-end-sensor-jd2eu3` |
| **Directorio** | `/etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code/` |
| **URL** | `https://med.aicorebots.com` |
| **Build** | Automático desde GitHub (branch `main`) |
| **Contenedor** | `consul-dash` (manual), `app-hack-back-end-sensor-...` (Dokploy) |

### App 2: Backend (n8n + PostgreSQL + Ollama + Redis)
| Campo | Valor |
|-------|-------|
| **ID** | `aicore-n8nrunnerpostgresollama-a715gi` |
| **Directorio** | `/etc/dokploy/compose/aicore-n8nrunnerpostgresollama-a715gi/code/` |
| **URL n8n** | `https://n8n.aicorebots.com` |

---

## 🗄️ PostgreSQL

| Campo | Valor |
|-------|-------|
| **Host** | `172.18.0.1:5432` (interno Docker) |
| **Base de datos** | `consultorio_medico` |
| **App User** | `dashboard_user` |
| **App Password** | `********` |
| **Superuser** | `********` |
| **Superuser Pass** | `********` (Dokploy) |
| **Contenedor** | `aicore-n8nrunnerpostgresollama-a715gi-postgres-1` |

### Conectar via CLI:
```bash
sudo docker exec -e PGPASSWORD='********' \
  aicore-n8nrunnerpostgresollama-a715gi-postgres-1 \
  psql -U dashboard_user -d consultorio_medico
```

---

## 🤖 n8n

| Campo | Valor |
|-------|-------|
| **URL** | `https://n8n.aicorebots.com` |
| **API Key (JWT)** | `eyJh... (JWT, ver .env)` |
| **Red Docker** | `aicore-n8nrunnerpostgresollama-a715gi` |
| **Contenedor** | `aicore-n8nrunnerpostgresollama-a715gi-n8n-1` |

### Workflows (7 importados):
| # | Nombre | Estado |
|---|--------|:------:|
| 01 | WhatsApp Inbound + Triaje IA | 📦 |
| 02 | Gestión de Turnos | 📦 |
| 03 | Recordatorios Automáticos | 📦 |
| 04 | Correo Inteligente | 📦 |
| 05 | Resumen Diario del Médico | 📦 |
| 06 | Recetas y Renovaciones | 📦 |
| 07 | Backup Automático Encriptado | 📦 |

### Llamar API n8n desde VPS:
```bash
sudo docker run --rm --network aicore-n8nrunnerpostgresollama-a715gi \
  curlimages/curl:latest -s \
  -H "X-N8N-API-KEY: eyJhbGci..." \
  http://aicore-n8nrunnerpostgresollama-a715gi-n8n-1:5678/api/v1/workflows
```

---

## 📱 Twilio

| Campo | Valor |
|-------|-------|
| **Account SID** | `AC****` |
| **Auth Token** | `********` |
| **WhatsApp Number** | `+18453735358` (Sandbox) |
| **Doctor WhatsApp** | `+18453735358` (usar nro real del médico) |

### Webhook URL (configurar en Twilio Console):
- URL: `https://med.aicorebots.com/api/webhooks/twilio`
- Método: `POST`

---

## 🧠 Ollama

| Campo | Valor |
|-------|-------|
| **URL** | `http://172.18.0.1:11434` (interno) |
| **Modelo** | `mistral` |
| **Contenedor** | `aicore-n8nrunnerpostgresollama-a715gi-ollama-1` |

---

## 🌐 Dashboard

| Campo | Valor |
|-------|-------|
| **URL** | `https://med.aicorebots.com` |
| **Login** | `admin@consultorio.com` |
| **Password** | `admin123` |
| **Médico** | `medico@consultorio.com` / `medico123` |
| **Health Check** | `GET /api/health` |

---

## 📂 GitHub

| Campo | Valor |
|-------|-------|
| **Repo** | `https://github.com/LeonardoPS1/consultorio-medico` |
| **Branch** | `main` |
| **Flujo deploy** | `git push origin main` → Dokploy auto-redeploy |

---

## 🔑 Cómo configurar credenciales (1 clic)

1. Entrar a `https://med.aicorebots.com/login`
2. Login: `admin@consultorio.com` / `admin123`
3. Ir a **Configuración → Credenciales**
4. Click en cada servicio y **Guardar**:
   - **Twilio**: Ya tiene SID y Token de `.env`
   - **PostgreSQL**: Ya tiene host, user, password
   - **Ollama**: `http://ollama:11434`, modelo `mistral`
   - **SMTP/IMAP**: Configurar cuando tengas email
5. Se sincronizan automáticamente a n8n ✅

---

## 🚀 Deploy rápido

```bash
# En local:
git add -A && git commit -m "cambios" && git push origin main

# En VPS (si Dokploy no auto-redeployea):
ssh ubuntu@51.222.207.250
cd /etc/dokploy/applications/app-hack-back-end-sensor-jd2eu3/code
sudo git pull origin main
sudo docker compose up -d --build
```

---

## 🩺 Health Checks

```bash
# Dashboard
curl http://51.222.207.250:3001/api/health

# n8n
sudo docker run --rm --network aicore-n8nrunnerpostgresollama-a715gi \
  curlimages/curl -s http://aicore-n8nrunnerpostgresollama-a715gi-n8n-1:5678/healthz

# PostgreSQL
sudo docker exec aicore-n8nrunnerpostgresollama-a715gi-postgres-1 pg_isready -U dashboard_user -d consultorio_medico

# Ollama
curl http://51.222.207.250:11434/api/tags
```
