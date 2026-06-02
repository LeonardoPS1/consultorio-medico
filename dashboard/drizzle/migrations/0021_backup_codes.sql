-- Migration 0021: Agregar columna backup_codes (2FA) a usuarios
-- Agregada en schema en commit 7cc4179 pero nunca migrada.
-- La columna almacena los códigos de respaldo encriptados para 2FA.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS backup_codes text;
