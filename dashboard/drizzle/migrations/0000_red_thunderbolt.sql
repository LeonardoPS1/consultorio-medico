CREATE TABLE IF NOT EXISTS "auditoria_accesos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"usuario_email" varchar(255),
	"usuario_nombre" varchar(255),
	"accion" varchar(100) NOT NULL,
	"entidad" varchar(100) NOT NULL,
	"entidad_id" varchar(255),
	"detalle" text,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bloqueos_agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medico_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone NOT NULL,
	"tipo" varchar(20) DEFAULT 'bloqueo' NOT NULL,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid,
	"canal" varchar(20) DEFAULT 'whatsapp' NOT NULL,
	"estado" varchar(20) DEFAULT 'activa' NOT NULL,
	"opt_out" boolean DEFAULT false NOT NULL,
	"opt_out_at" timestamp with time zone,
	"ultimo_mensaje" text,
	"ultimo_mensaje_rol" varchar(20),
	"ultima_intencion" varchar(30),
	"ultima_interaccion" timestamp with time zone DEFAULT now() NOT NULL,
	"proximo_recordatorio" timestamp with time zone,
	"contexto_ia" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credenciales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servicio" varchar(50) NOT NULL,
	"clave" varchar(100) NOT NULL,
	"valor" text NOT NULL,
	"encriptado" boolean DEFAULT true NOT NULL,
	"etiqueta" varchar(255),
	"n8n_credential_id" varchar(255),
	"n8n_credential_type" varchar(100),
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "facturacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"turno_id" uuid,
	"servicio_id" uuid,
	"tipo" varchar(20) DEFAULT 'consulta' NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"forma_pago" varchar(30) DEFAULT 'efectivo',
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"pagada_at" timestamp with time zone,
	"observaciones" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historial_medico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid,
	"turno_id" uuid,
	"tipo" varchar(30) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"diagnostico_codigo" varchar(10),
	"diagnostico_descripcion" text,
	"archivos" jsonb DEFAULT '[]'::jsonb,
	"visible_para_paciente" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "horarios_atencion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dia" varchar(20) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"inicio" varchar(5) DEFAULT '09:00' NOT NULL,
	"fin" varchar(5) DEFAULT '18:00' NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "horarios_atencion_dia_unique" UNIQUE("dia")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"nombre" varchar(255) NOT NULL,
	"especialidad" varchar(255) NOT NULL,
	"email" varchar(255),
	"telefono" varchar(20),
	"whatsapp" varchar(20),
	"matricula" varchar(50),
	"horarios" jsonb DEFAULT '{}'::jsonb,
	"duracion_turno_minutos" integer DEFAULT 30 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"color_evento" varchar(7) DEFAULT '#3B82F6',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"rol" varchar(20) NOT NULL,
	"contenido" text NOT NULL,
	"contenido_procesado" text,
	"tipo" varchar(20) DEFAULT 'texto' NOT NULL,
	"intencion" varchar(30),
	"confianza_intencion" numeric(4, 3),
	"twilio_sid" varchar(255),
	"twilio_status" varchar(50),
	"template_name" varchar(100),
	"template_params" jsonb DEFAULT '{}'::jsonb,
	"costo" numeric(10, 6),
	"n8n_execution_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paciente_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"descripcion" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pacientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telefono" varchar(20) NOT NULL,
	"email" varchar(255),
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255) NOT NULL,
	"dni" varchar(20),
	"fecha_nacimiento" date,
	"direccion" text,
	"obra_social" varchar(255),
	"numero_afiliado" varchar(100),
	"alergias" text,
	"medicacion_cronica" text,
	"notas_medicas" text,
	"canal_preferido" varchar(20) DEFAULT 'whatsapp',
	"consentimiento_whatsapp" boolean DEFAULT false,
	"consentimiento_email" boolean DEFAULT false,
	"fuente" varchar(50) DEFAULT 'whatsapp',
	"tags" text[] DEFAULT ,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pacientes_telefono_unique" UNIQUE("telefono")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plantillas_mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"contenido" text NOT NULL,
	"categoria" varchar(50) DEFAULT 'recordatorios' NOT NULL,
	"variables" text[] DEFAULT '{}',
	"activa" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plantillas_whatsapp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"idioma" varchar(10) DEFAULT 'es' NOT NULL,
	"categoria" varchar(30) NOT NULL,
	"contenido" text NOT NULL,
	"variables" text[] DEFAULT '{}',
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"twilio_template_sid" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preferencias_notificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"urgencias_whatsapp" boolean DEFAULT true NOT NULL,
	"resumen_diario_email" boolean DEFAULT true NOT NULL,
	"alertas_ausentismo" boolean DEFAULT true NOT NULL,
	"nuevos_pacientes" boolean DEFAULT false NOT NULL,
	"whatsapp_personal" varchar(20) DEFAULT '',
	"tenant_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid NOT NULL,
	"turno_id" uuid,
	"estado" varchar(20) DEFAULT 'activa' NOT NULL,
	"medicamento" varchar(255) NOT NULL,
	"presentacion" varchar(255),
	"dosis" varchar(255) NOT NULL,
	"frecuencia" varchar(255) NOT NULL,
	"duracion" varchar(255),
	"cantidad_total" varchar(100),
	"indicaciones" text,
	"fecha_inicio" date DEFAULT CURRENT_DATE NOT NULL,
	"fecha_fin" date,
	"requiere_autorizacion" boolean DEFAULT false,
	"autorizacion_obra_social" boolean DEFAULT false,
	"receta_anterior_id" uuid,
	"pdf_generado" boolean DEFAULT false,
	"pdf_url" text,
	"whatsapp_enviado" boolean DEFAULT false,
	"whatsapp_enviado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "servicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medico_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"descripcion" text,
	"duracion_minutos" integer DEFAULT 30 NOT NULL,
	"precio" numeric(10, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suscripciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"estado" varchar(50) DEFAULT 'free' NOT NULL,
	"mercadopago_preference_id" varchar(255),
	"mercadopago_payment_id" varchar(255),
	"mercadopago_merchant_order_id" varchar(255),
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tareas_pendientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid,
	"tipo" varchar(30) NOT NULL,
	"descripcion" text NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"prioridad" varchar(10) DEFAULT 'normal' NOT NULL,
	"asignado_a" uuid,
	"fecha_limite" timestamp with time zone,
	"completada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"logo_url" text DEFAULT '/aicoremed_dark_1200.svg',
	"colores" jsonb DEFAULT '{"primary":"#2563eb"}'::jsonb,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turnos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid NOT NULL,
	"fecha_hora" timestamp with time zone NOT NULL,
	"duracion_minutos" integer DEFAULT 30 NOT NULL,
	"motivo" text,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"tipo_consulta" varchar(20) DEFAULT 'presencial' NOT NULL,
	"link_videollamada" text,
	"notas_paciente" text,
	"notas_medico" text,
	"recordatorio_24h_enviado" boolean DEFAULT false NOT NULL,
	"recordatorio_1h_enviado" boolean DEFAULT false NOT NULL,
	"recordatorio_24h_leido" boolean DEFAULT false,
	"recordatorio_1h_leido" boolean DEFAULT false,
	"confirmo_asistencia" boolean DEFAULT false,
	"fuente" varchar(20) DEFAULT 'whatsapp',
	"creado_por" uuid,
	"cancelado_por" varchar(20),
	"motivo_cancelacion" text,
	"google_calendar_event_id" varchar(500),
	"n8n_workflow_execution_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"rol" varchar(20) DEFAULT 'medico' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_acceso" timestamp with time zone,
	"secreto_2fa" varchar(255),
	"activo_2fa" boolean DEFAULT false NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"reset_token" varchar(255),
	"reset_token_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar(255) NOT NULL,
	"execution_id" varchar(255),
	"nodo" varchar(255),
	"codigo" varchar(50),
	"mensaje_error" text,
	"detalle" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar(255) NOT NULL,
	"workflow_name" varchar(255),
	"execution_id" varchar(255),
	"nivel" varchar(10) DEFAULT 'info' NOT NULL,
	"mensaje" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria_accesos" ADD CONSTRAINT "auditoria_accesos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bloqueos_agenda" ADD CONSTRAINT "bloqueos_agenda_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "facturacion" ADD CONSTRAINT "facturacion_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "facturacion" ADD CONSTRAINT "facturacion_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "facturacion" ADD CONSTRAINT "facturacion_servicio_id_servicios_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historial_medico" ADD CONSTRAINT "historial_medico_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historial_medico" ADD CONSTRAINT "historial_medico_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historial_medico" ADD CONSTRAINT "historial_medico_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medicos" ADD CONSTRAINT "medicos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paciente_eventos" ADD CONSTRAINT "paciente_eventos_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recetas" ADD CONSTRAINT "recetas_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recetas" ADD CONSTRAINT "recetas_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recetas" ADD CONSTRAINT "recetas_turno_id_turnos_id_fk" FOREIGN KEY ("turno_id") REFERENCES "public"."turnos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recetas" ADD CONSTRAINT "recetas_receta_anterior_id_recetas_id_fk" FOREIGN KEY ("receta_anterior_id") REFERENCES "public"."recetas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "servicios" ADD CONSTRAINT "servicios_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_organizacion_id_tenants_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tareas_pendientes" ADD CONSTRAINT "tareas_pendientes_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tareas_pendientes" ADD CONSTRAINT "tareas_pendientes_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tareas_pendientes" ADD CONSTRAINT "tareas_pendientes_asignado_a_usuarios_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "turnos" ADD CONSTRAINT "turnos_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "turnos" ADD CONSTRAINT "turnos_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "turnos" ADD CONSTRAINT "turnos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_accion" ON "auditoria_accesos" USING btree ("accion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_entidad" ON "auditoria_accesos" USING btree ("entidad");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_created_at" ON "auditoria_accesos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_usuario" ON "auditoria_accesos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conversaciones_estado" ON "conversaciones" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_credenciales_unique" ON "credenciales" USING btree ("servicio","clave");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credenciales_servicio" ON "credenciales" USING btree ("servicio");