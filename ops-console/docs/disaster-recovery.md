# Disaster Recovery — AicoreOps

## Data Architecture
- **Schema**: `platform` (within `consultorio_medico` PostgreSQL database)
- **Tables**: `platform_operators`, `platform_passkeys`, `platform_sessions`, `platform_audit_log`
- **Backup**: Covered by the main DB backup (`backup-encriptado.sh` via n8n WF-07 at 3:00 AM daily)

## RTO / RPO
| Metric | Target | Current |
|--------|--------|---------|
| **RPO** | 24h | 24h (daily backup) |
| **RTO** | 30 min | ~10 min (redeploy) |

## Restore Procedure

### Prerequisites
- GPG key for backup decryption
- Access to backup storage (`/var/backups/consultorio/`)
- Docker access on VPS

### Steps
1. **Restore PostgreSQL backup** (includes `platform.*` schema):
   ```bash
   # Decrypt latest backup
   gpg --decrypt /var/backups/consultorio/consultorio_medico_$(date +%Y%m%d).sql.gz.gpg > /tmp/restore.sql.gz
   gunzip /tmp/restore.sql.gz

   # Restore to database
   docker exec -i $(docker ps -q -f name=postgres) psql -U dashboard_user -d consultorio_medico < /tmp/restore.sql
   ```

2. **Redeploy ops-console**:
   ```bash
   docker service update --force ops-console-23kboo
   ```

3. **Verify**:
   ```bash
   curl -s https://ops.aicorebots.com/api/health | grep '"db":{"connected":true}'
   ```

## Validation (Automated)
The deploy workflow runs post-deploy:
1. Health check (`/api/health` returns 200)
2. Smoke test (DB connectivity verified)
3. If either fails → manual rollback required

## Manual Rollback
```bash
docker service update --image ghcr.io/leonardops1/consultorio-medico-ops:previous-tag ops-console-23kboo
```
