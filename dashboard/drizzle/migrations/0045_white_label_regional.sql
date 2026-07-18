ALTER TABLE "tenants" ADD COLUMN "dominio_custom" varchar(255);
ALTER TABLE "tenants" ADD COLUMN "config_regional" jsonb DEFAULT '{"pais":"CL","moneda":{"codigo":"CLP","simbolo":"$","decimales":0,"formato":"CLP"},"documentoId":{"tipo":"RUT","label":"RUT","formato":"XX.XXX.XXX-X"},"sistemaSalud":["Fonasa","Isapre"],"regiones":"cl"}'::jsonb;
