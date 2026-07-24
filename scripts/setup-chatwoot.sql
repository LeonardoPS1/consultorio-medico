-- ============================================================================
-- Setup Chatwoot — Base de datos + usuario + creación inicial
-- ============================================================================
-- Ejecutar en la base de datos principal de PostgreSQL.
-- Luego Chatwoot creará sus propias tablas vía `rails db:chatwoot_prepare`.
-- ============================================================================

-- Crear base de datos y usuario para Chatwoot
CREATE DATABASE chatwoot;
CREATE USER chatwoot_user WITH PASSWORD '${CHATWOOT_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE chatwoot TO chatwoot_user;
ALTER DATABASE chatwoot OWNER TO chatwoot_user;

-- Conectarse a chatwoot y dar permisos de schema
\c chatwoot
GRANT ALL ON SCHEMA public TO chatwoot_user;
GRANT CREATE ON SCHEMA public TO chatwoot_user;
