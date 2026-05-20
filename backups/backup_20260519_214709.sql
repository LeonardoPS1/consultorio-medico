--
-- PostgreSQL database cluster dump
--

\restrict Q5PdYn5soq1QjP88iPmMTcbFNFhh80RG3Rcron3Es0m3baEIvbaPSIFx9Yl58aS

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE dashboard_user;
ALTER ROLE dashboard_user WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:uFIYl3e4CaPCNrCbQD9EXg==$626m2/8BKjQxPNnI9hrV6abmNX25VHz78tzvbHZzpVA=:v8Sid2a5dA/LD/KM2KG3sbDJZe7chIefOTY2fmUOVM0=';
CREATE ROLE "reece.schmeler67";
ALTER ROLE "reece.schmeler67" WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:Anl+lkSe2o6brsQ4E/KWcQ==$tslDWN71FoJ/i4jGLRoEcQlez0cXMLXRZLKgc2gfDH4=:mUUgt7qeYoQdypnSY4ufdRT5wyRQLYqbrBOS/pFIrc4=';

--
-- User Configurations
--








\unrestrict Q5PdYn5soq1QjP88iPmMTcbFNFhh80RG3Rcron3Es0m3baEIvbaPSIFx9Yl58aS

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict bqXHrKqucXJahrK93bzN6oNem8w8KuCUuaERwiZ6OOzlFlAjl8atV1jZ4Mi3NYY

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict bqXHrKqucXJahrK93bzN6oNem8w8KuCUuaERwiZ6OOzlFlAjl8atV1jZ4Mi3NYY

--
-- Database "consultorio_medico" dump
--

--
-- PostgreSQL database dump
--

\restrict g0NrzgoYppQNE7CbzhehBEHo8hjKSLKYcnZBNY3PMlHj8jxF67bSDVhtQe5WGjS

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: consultorio_medico; Type: DATABASE; Schema: -; Owner: reece.schmeler67
--

CREATE DATABASE consultorio_medico WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE consultorio_medico OWNER TO "reece.schmeler67";

\unrestrict g0NrzgoYppQNE7CbzhehBEHo8hjKSLKYcnZBNY3PMlHj8jxF67bSDVhtQe5WGjS
\connect consultorio_medico
\restrict g0NrzgoYppQNE7CbzhehBEHo8hjKSLKYcnZBNY3PMlHj8jxF67bSDVhtQe5WGjS

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: dashboard_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO dashboard_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    accion character varying(50) NOT NULL,
    entidad character varying(50) NOT NULL,
    entidad_id uuid,
    detalle jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO dashboard_user;

--
-- Name: auditoria_accesos; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.auditoria_accesos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    usuario_email character varying(255),
    usuario_nombre character varying(255),
    accion character varying(100) NOT NULL,
    entidad character varying(100) NOT NULL,
    entidad_id character varying(255),
    detalle text,
    ip character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auditoria_accesos OWNER TO dashboard_user;

--
-- Name: bloqueos_agenda; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.bloqueos_agenda (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medico_id uuid NOT NULL,
    titulo character varying(255) NOT NULL,
    fecha_inicio timestamp with time zone NOT NULL,
    fecha_fin timestamp with time zone NOT NULL,
    tipo character varying(20) DEFAULT 'bloqueo'::character varying NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bloqueos_agenda_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['bloqueo'::character varying, 'vacaciones'::character varying, 'feriado'::character varying, 'capacitacion'::character varying])::text[])))
);


ALTER TABLE public.bloqueos_agenda OWNER TO dashboard_user;

--
-- Name: conversaciones; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.conversaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    medico_id uuid,
    canal character varying(20) DEFAULT 'whatsapp'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    opt_out boolean DEFAULT false NOT NULL,
    opt_out_at timestamp with time zone,
    ultimo_mensaje text,
    ultimo_mensaje_rol character varying(20),
    ultima_intencion character varying(30),
    ultima_interaccion timestamp with time zone DEFAULT now() NOT NULL,
    contexto_ia jsonb DEFAULT '{}'::jsonb,
    proximo_recordatorio timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversaciones_canal_check CHECK (((canal)::text = ANY ((ARRAY['whatsapp'::character varying, 'sms'::character varying, 'email'::character varying, 'web'::character varying])::text[]))),
    CONSTRAINT conversaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'pendiente'::character varying, 'cerrada'::character varying, 'derivada'::character varying])::text[])))
);


ALTER TABLE public.conversaciones OWNER TO dashboard_user;

--
-- Name: credenciales; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.credenciales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio character varying(50) NOT NULL,
    clave character varying(100) NOT NULL,
    valor text NOT NULL,
    encriptado boolean DEFAULT true NOT NULL,
    etiqueta character varying(255),
    n8n_credential_id character varying(255),
    n8n_credential_type character varying(100),
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.credenciales OWNER TO dashboard_user;

--
-- Name: credenciales_activas; Type: VIEW; Schema: public; Owner: dashboard_user
--

CREATE VIEW public.credenciales_activas AS
 SELECT id,
    servicio,
    clave,
    valor,
    encriptado,
    etiqueta,
    n8n_credential_id,
    n8n_credential_type,
    orden,
    created_at,
    updated_at
   FROM public.credenciales
  ORDER BY orden, servicio, clave;


ALTER VIEW public.credenciales_activas OWNER TO dashboard_user;

--
-- Name: facturacion; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.facturacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    turno_id uuid,
    servicio_id uuid,
    tipo character varying(20) DEFAULT 'consulta'::character varying NOT NULL,
    monto numeric(10,2) NOT NULL,
    forma_pago character varying(30) DEFAULT 'efectivo'::character varying,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    pagada_at timestamp with time zone,
    observaciones text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT facturacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pagada'::character varying, 'anulada'::character varying, 'pendiente_obra_social'::character varying])::text[]))),
    CONSTRAINT facturacion_forma_pago_check CHECK (((forma_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying, 'obra_social'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT facturacion_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['consulta'::character varying, 'estudio'::character varying, 'procedimiento'::character varying, 'otro'::character varying])::text[])))
);


ALTER TABLE public.facturacion OWNER TO dashboard_user;

--
-- Name: historial_medico; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.historial_medico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    medico_id uuid,
    turno_id uuid,
    tipo character varying(30) NOT NULL,
    titulo character varying(255) NOT NULL,
    descripcion text,
    diagnostico_codigo character varying(10),
    diagnostico_descripcion text,
    archivos jsonb DEFAULT '[]'::jsonb,
    visible_para_paciente boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT historial_medico_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['consulta'::character varying, 'control'::character varying, 'estudio'::character varying, 'resultado'::character varying, 'receta'::character varying, 'internacion'::character varying, 'cirugia'::character varying, 'alergia'::character varying, 'vacuna'::character varying, 'diagnostico'::character varying, 'observacion'::character varying])::text[])))
);


ALTER TABLE public.historial_medico OWNER TO dashboard_user;

--
-- Name: ia_logs; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.ia_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo character varying(30) NOT NULL,
    prompt_hash character varying(64),
    prompt_truncado text,
    respuesta_truncada text,
    tokens_input integer,
    tokens_output integer,
    latencia_ms integer,
    modelo character varying(50) DEFAULT 'mistral'::character varying,
    temperatura numeric(3,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ia_logs_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['clasificacion'::character varying, 'respuesta'::character varying, 'extraccion'::character varying, 'sql'::character varying, 'triaje'::character varying])::text[])))
);


ALTER TABLE public.ia_logs OWNER TO dashboard_user;

--
-- Name: medicos; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.medicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    nombre character varying(255) NOT NULL,
    especialidad character varying(255) NOT NULL,
    email character varying(255),
    telefono character varying(20),
    whatsapp character varying(20),
    matricula character varying(50),
    horarios jsonb DEFAULT '{}'::jsonb,
    duracion_turno_minutos integer DEFAULT 30 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    color_evento character varying(7) DEFAULT '#3B82F6'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.medicos OWNER TO dashboard_user;

--
-- Name: mensajes; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.mensajes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversacion_id uuid NOT NULL,
    rol character varying(20) NOT NULL,
    contenido text NOT NULL,
    contenido_procesado text,
    tipo character varying(20) DEFAULT 'texto'::character varying NOT NULL,
    intencion character varying(30),
    confianza_intencion numeric(4,3),
    twilio_sid character varying(255),
    twilio_status character varying(50),
    n8n_execution_id character varying(255),
    template_name character varying(100),
    template_params jsonb,
    costo numeric(10,6),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mensajes_rol_check CHECK (((rol)::text = ANY ((ARRAY['paciente'::character varying, 'asistente_ia'::character varying, 'medico'::character varying, 'secretaria'::character varying, 'sistema'::character varying])::text[]))),
    CONSTRAINT mensajes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['texto'::character varying, 'imagen'::character varying, 'audio'::character varying, 'video'::character varying, 'documento'::character varying, 'ubicacion'::character varying, 'template'::character varying])::text[])))
);


ALTER TABLE public.mensajes OWNER TO dashboard_user;

--
-- Name: metricas_intenciones; Type: VIEW; Schema: public; Owner: dashboard_user
--

CREATE VIEW public.metricas_intenciones AS
 SELECT date(created_at) AS fecha,
    intencion,
    count(*) AS cantidad
   FROM public.mensajes m
  WHERE ((created_at >= (now() - '30 days'::interval)) AND (intencion IS NOT NULL))
  GROUP BY (date(created_at)), intencion
  ORDER BY (date(created_at)) DESC, (count(*)) DESC;


ALTER VIEW public.metricas_intenciones OWNER TO dashboard_user;

--
-- Name: paciente_eventos; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.paciente_eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    tipo character varying(30) NOT NULL,
    descripcion text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT paciente_eventos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['whatsapp_enviado'::character varying, 'whatsapp_recibido'::character varying, 'email_enviado'::character varying, 'email_recibido'::character varying, 'llamada'::character varying, 'recordatorio'::character varying, 'opt_in'::character varying, 'opt_out'::character varying, 'baja'::character varying, 'reingreso'::character varying])::text[])))
);


ALTER TABLE public.paciente_eventos OWNER TO dashboard_user;

--
-- Name: pacientes; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.pacientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telefono character varying(20) NOT NULL,
    email character varying(255),
    nombre character varying(255) NOT NULL,
    apellido character varying(255) NOT NULL,
    dni character varying(20),
    fecha_nacimiento date,
    direccion text,
    obra_social character varying(255),
    numero_afiliado character varying(100),
    alergias text,
    medicacion_cronica text,
    notas_medicas text,
    canal_preferido character varying(20) DEFAULT 'whatsapp'::character varying,
    consentimiento_whatsapp boolean DEFAULT false,
    consentimiento_email boolean DEFAULT false,
    fuente character varying(50) DEFAULT 'whatsapp'::character varying,
    tags text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pacientes_canal_preferido_check CHECK (((canal_preferido)::text = ANY ((ARRAY['whatsapp'::character varying, 'sms'::character varying, 'email'::character varying, 'telefono'::character varying])::text[])))
);


ALTER TABLE public.pacientes OWNER TO dashboard_user;

--
-- Name: pacientes_nuevos_por_mes; Type: VIEW; Schema: public; Owner: dashboard_user
--

CREATE VIEW public.pacientes_nuevos_por_mes AS
 SELECT date_trunc('month'::text, created_at) AS mes,
    count(*) AS cantidad
   FROM public.pacientes
  GROUP BY (date_trunc('month'::text, created_at))
  ORDER BY (date_trunc('month'::text, created_at)) DESC;


ALTER VIEW public.pacientes_nuevos_por_mes OWNER TO dashboard_user;

--
-- Name: plantillas_whatsapp; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.plantillas_whatsapp (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(255) NOT NULL,
    idioma character varying(10) DEFAULT 'es'::character varying NOT NULL,
    categoria character varying(30) NOT NULL,
    contenido text NOT NULL,
    variables text[],
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    twilio_template_sid character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plantillas_whatsapp_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['marketing'::character varying, 'utilidad'::character varying, 'autenticacion'::character varying])::text[]))),
    CONSTRAINT plantillas_whatsapp_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'pausado'::character varying])::text[])))
);


ALTER TABLE public.plantillas_whatsapp OWNER TO dashboard_user;

--
-- Name: turnos; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.turnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    medico_id uuid NOT NULL,
    fecha_hora timestamp with time zone NOT NULL,
    duracion_minutos integer DEFAULT 30 NOT NULL,
    motivo text,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    tipo_consulta character varying(20) DEFAULT 'presencial'::character varying NOT NULL,
    link_videollamada text,
    notas_paciente text,
    notas_medico text,
    recordatorio_24h_enviado boolean DEFAULT false NOT NULL,
    recordatorio_1h_enviado boolean DEFAULT false NOT NULL,
    recordatorio_24h_leido boolean DEFAULT false,
    recordatorio_1h_leido boolean DEFAULT false,
    confirmo_asistencia boolean DEFAULT false,
    fuente character varying(20) DEFAULT 'whatsapp'::character varying,
    creado_por uuid,
    cancelado_por character varying(20),
    motivo_cancelacion text,
    google_calendar_event_id character varying(500),
    n8n_workflow_execution_id character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT turnos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmada'::character varying, 'en_consulta'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'no_asistio'::character varying])::text[]))),
    CONSTRAINT turnos_fuente_check CHECK (((fuente)::text = ANY ((ARRAY['whatsapp'::character varying, 'web'::character varying, 'telefono'::character varying, 'presencial'::character varying, 'email'::character varying])::text[]))),
    CONSTRAINT turnos_tipo_consulta_check CHECK (((tipo_consulta)::text = ANY ((ARRAY['presencial'::character varying, 'virtual'::character varying, 'domicilio'::character varying])::text[])))
);


ALTER TABLE public.turnos OWNER TO dashboard_user;

--
-- Name: turnos_del_dia; Type: VIEW; Schema: public; Owner: dashboard_user
--

CREATE VIEW public.turnos_del_dia AS
 SELECT t.id,
    t.fecha_hora,
    t.estado,
    t.tipo_consulta,
    t.motivo,
    (((p.nombre)::text || ' '::text) || (p.apellido)::text) AS paciente_nombre,
    p.telefono AS paciente_telefono,
    p.email AS paciente_email,
    m.nombre AS medico_nombre,
    m.especialidad,
    t.duracion_minutos,
    t.confirmo_asistencia,
    t.notas_medico
   FROM ((public.turnos t
     JOIN public.pacientes p ON ((p.id = t.paciente_id)))
     JOIN public.medicos m ON ((m.id = t.medico_id)))
  WHERE (date((t.fecha_hora AT TIME ZONE 'America/Argentina/Buenos_Aires'::text)) = CURRENT_DATE)
  ORDER BY t.fecha_hora;


ALTER VIEW public.turnos_del_dia OWNER TO dashboard_user;

--
-- Name: proximos_turnos; Type: VIEW; Schema: public; Owner: dashboard_user
--

CREATE VIEW public.proximos_turnos AS
 SELECT id,
    fecha_hora,
    estado,
    tipo_consulta,
    motivo,
    paciente_nombre,
    paciente_telefono,
    paciente_email,
    medico_nombre,
    especialidad,
    duracion_minutos,
    confirmo_asistencia,
    notas_medico
   FROM public.turnos_del_dia
  WHERE (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmada'::character varying])::text[])) AND (fecha_hora >= now()))
 LIMIT 50;


ALTER VIEW public.proximos_turnos OWNER TO dashboard_user;

--
-- Name: recetas; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.recetas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    medico_id uuid NOT NULL,
    turno_id uuid,
    estado character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    medicamento character varying(255) NOT NULL,
    presentacion character varying(255),
    dosis character varying(255) NOT NULL,
    frecuencia character varying(255) NOT NULL,
    duracion character varying(255),
    cantidad_total character varying(100),
    indicaciones text,
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    fecha_fin date,
    requiere_autorizacion boolean DEFAULT false,
    autorizacion_obra_social boolean DEFAULT false,
    receta_anterior_id uuid,
    pdf_generado boolean DEFAULT false,
    pdf_url text,
    whatsapp_enviado boolean DEFAULT false,
    whatsapp_enviado_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recetas_estado_check CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'vencida'::character varying, 'cancelada'::character varying, 'renovada'::character varying])::text[])))
);


ALTER TABLE public.recetas OWNER TO dashboard_user;

--
-- Name: servicios; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.servicios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medico_id uuid NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    duracion_minutos integer DEFAULT 30 NOT NULL,
    precio numeric(10,2),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.servicios OWNER TO dashboard_user;

--
-- Name: suscripciones; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.suscripciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organizacion_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    plan character varying(50) DEFAULT 'free'::character varying NOT NULL,
    estado character varying(50) DEFAULT 'free'::character varying NOT NULL,
    mercadopago_preference_id character varying(255),
    mercadopago_payment_id character varying(255),
    mercadopago_merchant_order_id character varying(255),
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    trial_end timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suscripciones OWNER TO dashboard_user;

--
-- Name: tareas_pendientes; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.tareas_pendientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paciente_id uuid NOT NULL,
    medico_id uuid,
    tipo character varying(30) NOT NULL,
    descripcion text NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    prioridad character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    asignado_a uuid,
    fecha_limite timestamp with time zone,
    completada_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tareas_pendientes_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'completada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT tareas_pendientes_prioridad_check CHECK (((prioridad)::text = ANY ((ARRAY['baja'::character varying, 'normal'::character varying, 'alta'::character varying, 'urgente'::character varying])::text[]))),
    CONSTRAINT tareas_pendientes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['pendiente_revisar'::character varying, 'llamar_paciente'::character varying, 'receta_autorizar'::character varying, 'seguimiento'::character varying, 'derivar'::character varying, 'otro'::character varying])::text[])))
);


ALTER TABLE public.tareas_pendientes OWNER TO dashboard_user;

--
-- Name: twilio_logs; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.twilio_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mensaje_id uuid,
    twilio_sid character varying(255) NOT NULL,
    evento character varying(50) NOT NULL,
    codigo_error character varying(10),
    mensaje_error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.twilio_logs OWNER TO dashboard_user;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    rol character varying(20) DEFAULT 'medico'::character varying NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    ultimo_acceso timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    secreto_2fa character varying(255),
    activo_2fa boolean DEFAULT false,
    plan character varying(50) DEFAULT 'free'::character varying,
    reset_token character varying(255),
    reset_token_expires timestamp with time zone,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['admin'::character varying, 'medico'::character varying, 'secretaria'::character varying, 'recepcionista'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO dashboard_user;

--
-- Name: workflow_errors; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.workflow_errors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id character varying(255) NOT NULL,
    execution_id character varying(255),
    nodo character varying(255),
    codigo character varying(50),
    mensaje_error text,
    detalle jsonb,
    resuelto boolean DEFAULT false,
    resuelto_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflow_errors OWNER TO dashboard_user;

--
-- Name: workflow_logs; Type: TABLE; Schema: public; Owner: dashboard_user
--

CREATE TABLE public.workflow_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id character varying(255) NOT NULL,
    workflow_name character varying(255),
    execution_id character varying(255),
    nivel character varying(10) DEFAULT 'info'::character varying NOT NULL,
    mensaje text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflow_logs_nivel_check CHECK (((nivel)::text = ANY ((ARRAY['info'::character varying, 'warn'::character varying, 'error'::character varying, 'debug'::character varying])::text[])))
);


ALTER TABLE public.workflow_logs OWNER TO dashboard_user;

--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.audit_log (id, usuario_id, accion, entidad, entidad_id, detalle, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: auditoria_accesos; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.auditoria_accesos (id, usuario_id, usuario_email, usuario_nombre, accion, entidad, entidad_id, detalle, ip, user_agent, created_at) FROM stdin;
f6eb6927-0a63-4225-bab6-0e96c3b67b0e	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 17:54:21.766091+00
a6e8c92e-ca7e-440e-b35e-38c9fd2abca3	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 18:28:46.550798+00
041f2195-f23f-4607-b3eb-22daea758d4e	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 18:36:34.14078+00
2f7e5cff-0bd6-4ab1-92c4-8cb93f74fa4b	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 20:35:41.682815+00
f430bc46-181f-4ea6-a1d3-0810b4f2eb8d	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 20:48:23.892437+00
84f05eaa-9315-4a04-b864-2e8cfaea5c8c	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 20:51:20.821589+00
13935f8a-b170-43fa-9e8f-444b471e1c5d	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 20:54:48.129727+00
7f359c05-bd96-497e-a6f2-1b9b408e59bc	5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	Administrador	login	usuario	5ff8dd24-cba2-4283-919a-27ad02a19d05	\N	\N	\N	2026-05-19 21:06:03.253037+00
\.


--
-- Data for Name: bloqueos_agenda; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.bloqueos_agenda (id, medico_id, titulo, fecha_inicio, fecha_fin, tipo, motivo, created_at) FROM stdin;
\.


--
-- Data for Name: conversaciones; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.conversaciones (id, paciente_id, medico_id, canal, estado, opt_out, opt_out_at, ultimo_mensaje, ultimo_mensaje_rol, ultima_intencion, ultima_interaccion, contexto_ia, proximo_recordatorio, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credenciales; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.credenciales (id, servicio, clave, valor, encriptado, etiqueta, n8n_credential_id, n8n_credential_type, orden, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: facturacion; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.facturacion (id, paciente_id, turno_id, servicio_id, tipo, monto, forma_pago, estado, pagada_at, observaciones, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: historial_medico; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.historial_medico (id, paciente_id, medico_id, turno_id, tipo, titulo, descripcion, diagnostico_codigo, diagnostico_descripcion, archivos, visible_para_paciente, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ia_logs; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.ia_logs (id, tipo, prompt_hash, prompt_truncado, respuesta_truncada, tokens_input, tokens_output, latencia_ms, modelo, temperatura, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: medicos; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.medicos (id, usuario_id, nombre, especialidad, email, telefono, whatsapp, matricula, horarios, duracion_turno_minutos, activo, color_evento, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: mensajes; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.mensajes (id, conversacion_id, rol, contenido, contenido_procesado, tipo, intencion, confianza_intencion, twilio_sid, twilio_status, n8n_execution_id, template_name, template_params, costo, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: paciente_eventos; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.paciente_eventos (id, paciente_id, tipo, descripcion, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: pacientes; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.pacientes (id, telefono, email, nombre, apellido, dni, fecha_nacimiento, direccion, obra_social, numero_afiliado, alergias, medicacion_cronica, notas_medicas, canal_preferido, consentimiento_whatsapp, consentimiento_email, fuente, tags, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: plantillas_whatsapp; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.plantillas_whatsapp (id, nombre, idioma, categoria, contenido, variables, estado, twilio_template_sid, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recetas; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.recetas (id, paciente_id, medico_id, turno_id, estado, medicamento, presentacion, dosis, frecuencia, duracion, cantidad_total, indicaciones, fecha_inicio, fecha_fin, requiere_autorizacion, autorizacion_obra_social, receta_anterior_id, pdf_generado, pdf_url, whatsapp_enviado, whatsapp_enviado_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: servicios; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.servicios (id, medico_id, nombre, descripcion, duracion_minutos, precio, activo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suscripciones; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.suscripciones (id, organizacion_id, plan, estado, mercadopago_preference_id, mercadopago_payment_id, mercadopago_merchant_order_id, period_start, period_end, trial_end, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tareas_pendientes; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.tareas_pendientes (id, paciente_id, medico_id, tipo, descripcion, estado, prioridad, asignado_a, fecha_limite, completada_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: turnos; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.turnos (id, paciente_id, medico_id, fecha_hora, duracion_minutos, motivo, estado, tipo_consulta, link_videollamada, notas_paciente, notas_medico, recordatorio_24h_enviado, recordatorio_1h_enviado, recordatorio_24h_leido, recordatorio_1h_leido, confirmo_asistencia, fuente, creado_por, cancelado_por, motivo_cancelacion, google_calendar_event_id, n8n_workflow_execution_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: twilio_logs; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.twilio_logs (id, mensaje_id, twilio_sid, evento, codigo_error, mensaje_error, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.usuarios (id, email, password_hash, nombre, rol, activo, ultimo_acceso, created_at, updated_at, deleted_at, secreto_2fa, activo_2fa, plan, reset_token, reset_token_expires) FROM stdin;
5ff8dd24-cba2-4283-919a-27ad02a19d05	admin@consultorio.com	$2a$10$muaIQg.zdB9N6lDXFNZrlOvtp9Q1JWlOwoNeuqtOyCeoYsocOsuBS	Administrador	admin	t	\N	2026-05-19 14:46:06.919278+00	2026-05-19 18:11:59.296466+00	\N	\N	f	enterprise	\N	\N
0f99d9f2-2447-46aa-b2dd-07248e89e297	medico@consultorio.com	$2a$10$muaIQg.zdB9N6lDXFNZrlOvtp9Q1JWlOwoNeuqtOyCeoYsocOsuBS	Dr. Rodriguez	medico	t	\N	2026-05-19 14:46:07.077842+00	2026-05-19 18:11:59.461135+00	\N	\N	f	professional	\N	\N
b346fc69-3737-4220-bd5a-b1f27f4d081c	starter@consultorio.com	$2b$10$TQaoGtohhrCPl5Qq1y6wu.WrXJDpw9wQ4.wFk2OTkg.7v10DuUcta	Dr. Starter	medico	t	\N	2026-05-19 18:45:32.561063+00	2026-05-19 18:45:32.561063+00	\N	\N	f	starter	\N	\N
ba5df0f4-4175-4c66-9710-4a83b9ce48ec	professional@consultorio.com	$2b$10$bREPO4MFMgVKJdsk0SxQL.zsBWfrqaKJt/znZT.rlXx85zR5/SeP2	Dra. Profesional	medico	t	\N	2026-05-19 18:45:32.817044+00	2026-05-19 18:45:32.817044+00	\N	\N	f	professional	\N	\N
d3420c1c-712f-4787-98f5-133f1e703050	premium@consultorio.com	$2b$10$QIO/fVKztQyLbrRmj1hUK.hHnm/GebYO6pY.3aLIn81EYWJLoXlNy	Dr. Premium	medico	t	\N	2026-05-19 18:45:33.062404+00	2026-05-19 18:45:33.062404+00	\N	\N	f	premium	\N	\N
\.


--
-- Data for Name: workflow_errors; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.workflow_errors (id, workflow_id, execution_id, nodo, codigo, mensaje_error, detalle, resuelto, resuelto_at, created_at) FROM stdin;
\.


--
-- Data for Name: workflow_logs; Type: TABLE DATA; Schema: public; Owner: dashboard_user
--

COPY public.workflow_logs (id, workflow_id, workflow_name, execution_id, nivel, mensaje, metadata, created_at) FROM stdin;
\.


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: auditoria_accesos auditoria_accesos_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.auditoria_accesos
    ADD CONSTRAINT auditoria_accesos_pkey PRIMARY KEY (id);


--
-- Name: bloqueos_agenda bloqueos_agenda_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.bloqueos_agenda
    ADD CONSTRAINT bloqueos_agenda_pkey PRIMARY KEY (id);


--
-- Name: conversaciones conversaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_pkey PRIMARY KEY (id);


--
-- Name: credenciales credenciales_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.credenciales
    ADD CONSTRAINT credenciales_pkey PRIMARY KEY (id);


--
-- Name: credenciales credenciales_servicio_clave_key; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.credenciales
    ADD CONSTRAINT credenciales_servicio_clave_key UNIQUE (servicio, clave);


--
-- Name: facturacion facturacion_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.facturacion
    ADD CONSTRAINT facturacion_pkey PRIMARY KEY (id);


--
-- Name: historial_medico historial_medico_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.historial_medico
    ADD CONSTRAINT historial_medico_pkey PRIMARY KEY (id);


--
-- Name: ia_logs ia_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.ia_logs
    ADD CONSTRAINT ia_logs_pkey PRIMARY KEY (id);


--
-- Name: medicos medicos_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.medicos
    ADD CONSTRAINT medicos_pkey PRIMARY KEY (id);


--
-- Name: mensajes mensajes_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);


--
-- Name: paciente_eventos paciente_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.paciente_eventos
    ADD CONSTRAINT paciente_eventos_pkey PRIMARY KEY (id);


--
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id);


--
-- Name: pacientes pacientes_telefono_key; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_telefono_key UNIQUE (telefono);


--
-- Name: plantillas_whatsapp plantillas_whatsapp_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.plantillas_whatsapp
    ADD CONSTRAINT plantillas_whatsapp_pkey PRIMARY KEY (id);


--
-- Name: recetas recetas_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pkey PRIMARY KEY (id);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id);


--
-- Name: suscripciones suscripciones_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_pkey PRIMARY KEY (id);


--
-- Name: tareas_pendientes tareas_pendientes_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.tareas_pendientes
    ADD CONSTRAINT tareas_pendientes_pkey PRIMARY KEY (id);


--
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- Name: twilio_logs twilio_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.twilio_logs
    ADD CONSTRAINT twilio_logs_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: workflow_errors workflow_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.workflow_errors
    ADD CONSTRAINT workflow_errors_pkey PRIMARY KEY (id);


--
-- Name: workflow_logs workflow_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_audit_log_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_conversaciones_canal; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_conversaciones_canal ON public.conversaciones USING btree (canal);


--
-- Name: idx_conversaciones_estado; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_conversaciones_estado ON public.conversaciones USING btree (estado);


--
-- Name: idx_conversaciones_opt_out; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_conversaciones_opt_out ON public.conversaciones USING btree (opt_out) WHERE (opt_out = true);


--
-- Name: idx_conversaciones_paciente; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_conversaciones_paciente ON public.conversaciones USING btree (paciente_id);


--
-- Name: idx_conversaciones_ultima; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_conversaciones_ultima ON public.conversaciones USING btree (ultima_interaccion DESC);


--
-- Name: idx_credenciales_n8n; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_credenciales_n8n ON public.credenciales USING btree (n8n_credential_id) WHERE (n8n_credential_id IS NOT NULL);


--
-- Name: idx_credenciales_servicio; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_credenciales_servicio ON public.credenciales USING btree (servicio);


--
-- Name: idx_facturacion_estado; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_facturacion_estado ON public.facturacion USING btree (estado);


--
-- Name: idx_facturacion_fecha; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_facturacion_fecha ON public.facturacion USING btree (created_at DESC);


--
-- Name: idx_facturacion_paciente; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_facturacion_paciente ON public.facturacion USING btree (paciente_id);


--
-- Name: idx_historial_paciente; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_historial_paciente ON public.historial_medico USING btree (paciente_id, created_at DESC);


--
-- Name: idx_historial_tipo; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_historial_tipo ON public.historial_medico USING btree (tipo);


--
-- Name: idx_ia_logs_created; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_ia_logs_created ON public.ia_logs USING btree (created_at DESC);


--
-- Name: idx_ia_logs_tipo; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_ia_logs_tipo ON public.ia_logs USING btree (tipo);


--
-- Name: idx_mensajes_conversacion; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_mensajes_conversacion ON public.mensajes USING btree (conversacion_id);


--
-- Name: idx_mensajes_created; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_mensajes_created ON public.mensajes USING btree (created_at DESC);


--
-- Name: idx_mensajes_intencion; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_mensajes_intencion ON public.mensajes USING btree (intencion);


--
-- Name: idx_mensajes_twilio; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_mensajes_twilio ON public.mensajes USING btree (twilio_sid) WHERE (twilio_sid IS NOT NULL);


--
-- Name: idx_pacientes_created; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_pacientes_created ON public.pacientes USING btree (created_at DESC);


--
-- Name: idx_pacientes_deleted; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_pacientes_deleted ON public.pacientes USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_pacientes_dni; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_pacientes_dni ON public.pacientes USING btree (dni) WHERE (dni IS NOT NULL);


--
-- Name: idx_pacientes_email; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_pacientes_email ON public.pacientes USING btree (email);


--
-- Name: idx_pacientes_nombre; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_pacientes_nombre ON public.pacientes USING btree (nombre, apellido);


--
-- Name: idx_pacientes_telefono; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_pacientes_telefono ON public.pacientes USING btree (telefono);


--
-- Name: idx_recetas_activas; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_recetas_activas ON public.recetas USING btree (estado) WHERE ((estado)::text = 'activa'::text);


--
-- Name: idx_recetas_paciente; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_recetas_paciente ON public.recetas USING btree (paciente_id, estado);


--
-- Name: idx_suscripciones_estado; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_suscripciones_estado ON public.suscripciones USING btree (estado);


--
-- Name: idx_suscripciones_mp_pref; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_suscripciones_mp_pref ON public.suscripciones USING btree (mercadopago_preference_id);


--
-- Name: idx_suscripciones_org; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_suscripciones_org ON public.suscripciones USING btree (organizacion_id);


--
-- Name: idx_tareas_asignadas; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_tareas_asignadas ON public.tareas_pendientes USING btree (asignado_a, estado);


--
-- Name: idx_tareas_pendientes_estado; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_tareas_pendientes_estado ON public.tareas_pendientes USING btree (estado, prioridad);


--
-- Name: idx_turnos_estado; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_estado ON public.turnos USING btree (estado);


--
-- Name: idx_turnos_fecha; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_fecha ON public.turnos USING btree (fecha_hora);


--
-- Name: idx_turnos_fecha_medico; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_fecha_medico ON public.turnos USING btree (medico_id, fecha_hora);


--
-- Name: idx_turnos_google_calendar; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_google_calendar ON public.turnos USING btree (google_calendar_event_id) WHERE (google_calendar_event_id IS NOT NULL);


--
-- Name: idx_turnos_medico_estado; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_medico_estado ON public.turnos USING btree (medico_id, estado, fecha_hora);


--
-- Name: idx_turnos_paciente; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_paciente ON public.turnos USING btree (paciente_id, fecha_hora DESC);


--
-- Name: idx_turnos_recordatorio; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_turnos_recordatorio ON public.turnos USING btree (recordatorio_24h_enviado, recordatorio_1h_enviado) WHERE ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmada'::character varying])::text[]));


--
-- Name: idx_workflow_errors_created; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_workflow_errors_created ON public.workflow_errors USING btree (created_at DESC);


--
-- Name: idx_workflow_logs_created; Type: INDEX; Schema: public; Owner: dashboard_user
--

CREATE INDEX idx_workflow_logs_created ON public.workflow_logs USING btree (created_at DESC);


--
-- Name: conversaciones set_conversaciones_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_conversaciones_updated_at BEFORE UPDATE ON public.conversaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: credenciales set_credenciales_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_credenciales_updated_at BEFORE UPDATE ON public.credenciales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: facturacion set_facturacion_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_facturacion_updated_at BEFORE UPDATE ON public.facturacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: historial_medico set_historial_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_historial_updated_at BEFORE UPDATE ON public.historial_medico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: medicos set_medicos_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_medicos_updated_at BEFORE UPDATE ON public.medicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pacientes set_pacientes_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plantillas_whatsapp set_plantillas_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_plantillas_updated_at BEFORE UPDATE ON public.plantillas_whatsapp FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recetas set_recetas_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_recetas_updated_at BEFORE UPDATE ON public.recetas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: servicios set_servicios_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_servicios_updated_at BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tareas_pendientes set_tareas_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_tareas_updated_at BEFORE UPDATE ON public.tareas_pendientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: turnos set_turnos_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_turnos_updated_at BEFORE UPDATE ON public.turnos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usuarios set_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: dashboard_user
--

CREATE TRIGGER set_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_log audit_log_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: auditoria_accesos auditoria_accesos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.auditoria_accesos
    ADD CONSTRAINT auditoria_accesos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: bloqueos_agenda bloqueos_agenda_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.bloqueos_agenda
    ADD CONSTRAINT bloqueos_agenda_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: conversaciones conversaciones_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: conversaciones conversaciones_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.conversaciones
    ADD CONSTRAINT conversaciones_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: facturacion facturacion_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.facturacion
    ADD CONSTRAINT facturacion_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: facturacion facturacion_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.facturacion
    ADD CONSTRAINT facturacion_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id);


--
-- Name: facturacion facturacion_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.facturacion
    ADD CONSTRAINT facturacion_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: historial_medico historial_medico_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.historial_medico
    ADD CONSTRAINT historial_medico_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: historial_medico historial_medico_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.historial_medico
    ADD CONSTRAINT historial_medico_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: historial_medico historial_medico_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.historial_medico
    ADD CONSTRAINT historial_medico_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: medicos medicos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.medicos
    ADD CONSTRAINT medicos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: mensajes mensajes_conversacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.conversaciones(id);


--
-- Name: paciente_eventos paciente_eventos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.paciente_eventos
    ADD CONSTRAINT paciente_eventos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: recetas recetas_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: recetas recetas_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: recetas recetas_receta_anterior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_receta_anterior_id_fkey FOREIGN KEY (receta_anterior_id) REFERENCES public.recetas(id);


--
-- Name: recetas recetas_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: servicios servicios_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: tareas_pendientes tareas_pendientes_asignado_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.tareas_pendientes
    ADD CONSTRAINT tareas_pendientes_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.usuarios(id);


--
-- Name: tareas_pendientes tareas_pendientes_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.tareas_pendientes
    ADD CONSTRAINT tareas_pendientes_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: tareas_pendientes tareas_pendientes_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.tareas_pendientes
    ADD CONSTRAINT tareas_pendientes_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: turnos turnos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: turnos turnos_medico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_medico_id_fkey FOREIGN KEY (medico_id) REFERENCES public.medicos(id);


--
-- Name: turnos turnos_paciente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id);


--
-- Name: twilio_logs twilio_logs_mensaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dashboard_user
--

ALTER TABLE ONLY public.twilio_logs
    ADD CONSTRAINT twilio_logs_mensaje_id_fkey FOREIGN KEY (mensaje_id) REFERENCES public.mensajes(id);


--
-- Name: DATABASE consultorio_medico; Type: ACL; Schema: -; Owner: reece.schmeler67
--

GRANT ALL ON DATABASE consultorio_medico TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: reece.schmeler67
--

ALTER DEFAULT PRIVILEGES FOR ROLE "reece.schmeler67" IN SCHEMA public GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: reece.schmeler67
--

ALTER DEFAULT PRIVILEGES FOR ROLE "reece.schmeler67" IN SCHEMA public GRANT ALL ON TABLES TO dashboard_user;


--
-- PostgreSQL database dump complete
--

\unrestrict g0NrzgoYppQNE7CbzhehBEHo8hjKSLKYcnZBNY3PMlHj8jxF67bSDVhtQe5WGjS

--
-- Database "n8n" dump
--

--
-- PostgreSQL database dump
--

\restrict 1ZSAbndJGtgKGkZmCUOHxSB635oWGYvwtnpVYxwPOOJn72slZxd2B8VAtp1FWgq

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: n8n; Type: DATABASE; Schema: -; Owner: reece.schmeler67
--

CREATE DATABASE n8n WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE n8n OWNER TO "reece.schmeler67";

\unrestrict 1ZSAbndJGtgKGkZmCUOHxSB635oWGYvwtnpVYxwPOOJn72slZxd2B8VAtp1FWgq
\connect n8n
\restrict 1ZSAbndJGtgKGkZmCUOHxSB635oWGYvwtnpVYxwPOOJn72slZxd2B8VAtp1FWgq

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: increment_workflow_version(); Type: FUNCTION; Schema: public; Owner: reece.schmeler67
--

CREATE FUNCTION public.increment_workflow_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
			BEGIN
				IF NEW."versionCounter" IS NOT DISTINCT FROM OLD."versionCounter" THEN
					NEW."versionCounter" = OLD."versionCounter" + 1;
				END IF;
				RETURN NEW;
			END;
			$$;


ALTER FUNCTION public.increment_workflow_version() OWNER TO "reece.schmeler67";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_builder_temporary_workflow; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.ai_builder_temporary_workflow (
    "workflowId" character varying(36) NOT NULL,
    "threadId" uuid NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.ai_builder_temporary_workflow OWNER TO "reece.schmeler67";

--
-- Name: annotation_tag_entity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.annotation_tag_entity (
    id character varying(16) NOT NULL,
    name character varying(24) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.annotation_tag_entity OWNER TO "reece.schmeler67";

--
-- Name: auth_identity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.auth_identity (
    "userId" uuid,
    "providerId" character varying(255) NOT NULL,
    "providerType" character varying(32) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.auth_identity OWNER TO "reece.schmeler67";

--
-- Name: auth_provider_sync_history; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.auth_provider_sync_history (
    id integer NOT NULL,
    "providerType" character varying(32) NOT NULL,
    "runMode" text NOT NULL,
    status text NOT NULL,
    "startedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scanned integer NOT NULL,
    created integer NOT NULL,
    updated integer NOT NULL,
    disabled integer NOT NULL,
    error text
);


ALTER TABLE public.auth_provider_sync_history OWNER TO "reece.schmeler67";

--
-- Name: auth_provider_sync_history_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.auth_provider_sync_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_provider_sync_history_id_seq OWNER TO "reece.schmeler67";

--
-- Name: auth_provider_sync_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.auth_provider_sync_history_id_seq OWNED BY public.auth_provider_sync_history.id;


--
-- Name: binary_data; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.binary_data (
    "fileId" uuid NOT NULL,
    "sourceType" character varying(50) NOT NULL,
    "sourceId" character varying(255) NOT NULL,
    data bytea NOT NULL,
    "mimeType" character varying(255),
    "fileName" character varying(255),
    "fileSize" integer NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CHK_binary_data_sourceType" CHECK ((("sourceType")::text = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::text[])))
);


ALTER TABLE public.binary_data OWNER TO "reece.schmeler67";

--
-- Name: COLUMN binary_data."sourceType"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.binary_data."sourceType" IS 'Source the file belongs to, e.g. ''execution''';


--
-- Name: COLUMN binary_data."sourceId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.binary_data."sourceId" IS 'ID of the source, e.g. execution ID';


--
-- Name: COLUMN binary_data.data; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.binary_data.data IS 'Raw, not base64 encoded';


--
-- Name: COLUMN binary_data."fileSize"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.binary_data."fileSize" IS 'In bytes';


--
-- Name: chat_hub_agent_tools; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.chat_hub_agent_tools (
    "agentId" uuid NOT NULL,
    "toolId" uuid NOT NULL
);


ALTER TABLE public.chat_hub_agent_tools OWNER TO "reece.schmeler67";

--
-- Name: chat_hub_agents; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.chat_hub_agents (
    id uuid NOT NULL,
    name character varying(256) NOT NULL,
    description character varying(512),
    "systemPrompt" text NOT NULL,
    "ownerId" uuid NOT NULL,
    "credentialId" character varying(36),
    provider character varying(16) NOT NULL,
    model character varying(64) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    icon json,
    files json DEFAULT '[]'::json NOT NULL,
    "suggestedPrompts" json DEFAULT '[]'::json NOT NULL
);


ALTER TABLE public.chat_hub_agents OWNER TO "reece.schmeler67";

--
-- Name: COLUMN chat_hub_agents.provider; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_agents.provider IS 'ChatHubProvider enum: "openai", "anthropic", "google", "n8n"';


--
-- Name: COLUMN chat_hub_agents.model; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_agents.model IS 'Model name used at the respective Model node, ie. "gpt-4"';


--
-- Name: chat_hub_messages; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.chat_hub_messages (
    id uuid NOT NULL,
    "sessionId" uuid NOT NULL,
    "previousMessageId" uuid,
    "revisionOfMessageId" uuid,
    "retryOfMessageId" uuid,
    type character varying(16) NOT NULL,
    name character varying(128) NOT NULL,
    content text NOT NULL,
    provider character varying(16),
    model character varying(256),
    "workflowId" character varying(36),
    "executionId" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "agentId" uuid,
    status character varying(16) DEFAULT 'success'::character varying NOT NULL,
    attachments json
);


ALTER TABLE public.chat_hub_messages OWNER TO "reece.schmeler67";

--
-- Name: COLUMN chat_hub_messages.type; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_messages.type IS 'ChatHubMessageType enum: "human", "ai", "system", "tool", "generic"';


--
-- Name: COLUMN chat_hub_messages.provider; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_messages.provider IS 'ChatHubProvider enum: "openai", "anthropic", "google", "n8n"';


--
-- Name: COLUMN chat_hub_messages.model; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_messages.model IS 'Model name used at the respective Model node, ie. "gpt-4"';


--
-- Name: COLUMN chat_hub_messages."agentId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_messages."agentId" IS 'ID of the custom agent (if provider is "custom-agent")';


--
-- Name: COLUMN chat_hub_messages.status; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_messages.status IS 'ChatHubMessageStatus enum, eg. "success", "error", "running", "cancelled"';


--
-- Name: COLUMN chat_hub_messages.attachments; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_messages.attachments IS 'File attachments for the message (if any), stored as JSON. Files are stored as base64-encoded data URLs.';


--
-- Name: chat_hub_session_tools; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.chat_hub_session_tools (
    "sessionId" uuid NOT NULL,
    "toolId" uuid NOT NULL
);


ALTER TABLE public.chat_hub_session_tools OWNER TO "reece.schmeler67";

--
-- Name: chat_hub_sessions; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.chat_hub_sessions (
    id uuid NOT NULL,
    title character varying(256) NOT NULL,
    "ownerId" uuid NOT NULL,
    "lastMessageAt" timestamp(3) with time zone NOT NULL,
    "credentialId" character varying(36),
    provider character varying(16),
    model character varying(256),
    "workflowId" character varying(36),
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "agentId" uuid,
    "agentName" character varying(128),
    type character varying(16) DEFAULT 'production'::character varying NOT NULL,
    CONSTRAINT "CHK_chat_hub_sessions_type" CHECK (((type)::text = ANY ((ARRAY['production'::character varying, 'manual'::character varying])::text[])))
);


ALTER TABLE public.chat_hub_sessions OWNER TO "reece.schmeler67";

--
-- Name: COLUMN chat_hub_sessions.provider; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_sessions.provider IS 'ChatHubProvider enum: "openai", "anthropic", "google", "n8n"';


--
-- Name: COLUMN chat_hub_sessions.model; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_sessions.model IS 'Model name used at the respective Model node, ie. "gpt-4"';


--
-- Name: COLUMN chat_hub_sessions."agentId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_sessions."agentId" IS 'ID of the custom agent (if provider is "custom-agent")';


--
-- Name: COLUMN chat_hub_sessions."agentName"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.chat_hub_sessions."agentName" IS 'Cached name of the custom agent (if provider is "custom-agent")';


--
-- Name: chat_hub_tools; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.chat_hub_tools (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    "typeVersion" double precision NOT NULL,
    "ownerId" uuid NOT NULL,
    definition json NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.chat_hub_tools OWNER TO "reece.schmeler67";

--
-- Name: credential_dependency; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.credential_dependency (
    id integer NOT NULL,
    "credentialId" character varying(36) NOT NULL,
    "dependencyType" character varying(64) NOT NULL,
    "dependencyId" character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.credential_dependency OWNER TO "reece.schmeler67";

--
-- Name: credential_dependency_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.credential_dependency ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.credential_dependency_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: credentials_entity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.credentials_entity (
    name character varying(128) NOT NULL,
    data text NOT NULL,
    type character varying(128) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    id character varying(36) NOT NULL,
    "isManaged" boolean DEFAULT false NOT NULL,
    "isGlobal" boolean DEFAULT false NOT NULL,
    "isResolvable" boolean DEFAULT false NOT NULL,
    "resolvableAllowFallback" boolean DEFAULT false NOT NULL,
    "resolverId" character varying(16)
);


ALTER TABLE public.credentials_entity OWNER TO "reece.schmeler67";

--
-- Name: data_table; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.data_table (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.data_table OWNER TO "reece.schmeler67";

--
-- Name: data_table_column; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.data_table_column (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    type character varying(32) NOT NULL,
    index integer NOT NULL,
    "dataTableId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.data_table_column OWNER TO "reece.schmeler67";

--
-- Name: COLUMN data_table_column.type; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.data_table_column.type IS 'Expected: string, number, boolean, or date (not enforced as a constraint)';


--
-- Name: COLUMN data_table_column.index; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.data_table_column.index IS 'Column order, starting from 0 (0 = first column)';


--
-- Name: deployment_key; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.deployment_key (
    id character varying(36) NOT NULL,
    type character varying(64) NOT NULL,
    value text NOT NULL,
    algorithm character varying(20),
    status character varying(20) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.deployment_key OWNER TO "reece.schmeler67";

--
-- Name: dynamic_credential_entry; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.dynamic_credential_entry (
    credential_id character varying(16) NOT NULL,
    subject_id character varying(2048) NOT NULL,
    resolver_id character varying(16) NOT NULL,
    data text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.dynamic_credential_entry OWNER TO "reece.schmeler67";

--
-- Name: dynamic_credential_resolver; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.dynamic_credential_resolver (
    id character varying(16) NOT NULL,
    name character varying(128) NOT NULL,
    type character varying(128) NOT NULL,
    config text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.dynamic_credential_resolver OWNER TO "reece.schmeler67";

--
-- Name: COLUMN dynamic_credential_resolver.config; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.dynamic_credential_resolver.config IS 'Encrypted resolver configuration (JSON encrypted as string)';


--
-- Name: dynamic_credential_user_entry; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.dynamic_credential_user_entry (
    "credentialId" character varying(16) NOT NULL,
    "userId" uuid NOT NULL,
    "resolverId" character varying(16) NOT NULL,
    data text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.dynamic_credential_user_entry OWNER TO "reece.schmeler67";

--
-- Name: event_destinations; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.event_destinations (
    id uuid NOT NULL,
    destination jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.event_destinations OWNER TO "reece.schmeler67";

--
-- Name: execution_annotation_tags; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.execution_annotation_tags (
    "annotationId" integer NOT NULL,
    "tagId" character varying(24) NOT NULL
);


ALTER TABLE public.execution_annotation_tags OWNER TO "reece.schmeler67";

--
-- Name: execution_annotations; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.execution_annotations (
    id integer NOT NULL,
    "executionId" integer NOT NULL,
    vote character varying(6),
    note text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.execution_annotations OWNER TO "reece.schmeler67";

--
-- Name: execution_annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.execution_annotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.execution_annotations_id_seq OWNER TO "reece.schmeler67";

--
-- Name: execution_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.execution_annotations_id_seq OWNED BY public.execution_annotations.id;


--
-- Name: execution_data; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.execution_data (
    "executionId" integer NOT NULL,
    "workflowData" json NOT NULL,
    data text NOT NULL,
    "workflowVersionId" character varying(36)
);


ALTER TABLE public.execution_data OWNER TO "reece.schmeler67";

--
-- Name: execution_entity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.execution_entity (
    id integer NOT NULL,
    finished boolean NOT NULL,
    mode character varying NOT NULL,
    "retryOf" character varying,
    "retrySuccessId" character varying,
    "startedAt" timestamp(3) with time zone,
    "stoppedAt" timestamp(3) with time zone,
    "waitTill" timestamp(3) with time zone,
    status character varying NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "deletedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "storedAt" character varying(2) DEFAULT 'db'::character varying NOT NULL,
    "tracingContext" json,
    "deduplicationKey" character varying(255),
    CONSTRAINT "execution_entity_storedAt_check" CHECK ((("storedAt")::text = ANY ((ARRAY['db'::character varying, 'fs'::character varying, 's3'::character varying])::text[])))
);


ALTER TABLE public.execution_entity OWNER TO "reece.schmeler67";

--
-- Name: execution_entity_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.execution_entity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.execution_entity_id_seq OWNER TO "reece.schmeler67";

--
-- Name: execution_entity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.execution_entity_id_seq OWNED BY public.execution_entity.id;


--
-- Name: execution_metadata; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.execution_metadata (
    id integer NOT NULL,
    "executionId" integer NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.execution_metadata OWNER TO "reece.schmeler67";

--
-- Name: execution_metadata_temp_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.execution_metadata_temp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.execution_metadata_temp_id_seq OWNER TO "reece.schmeler67";

--
-- Name: execution_metadata_temp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.execution_metadata_temp_id_seq OWNED BY public.execution_metadata.id;


--
-- Name: folder; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.folder (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    "parentFolderId" character varying(36),
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.folder OWNER TO "reece.schmeler67";

--
-- Name: folder_tag; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.folder_tag (
    "folderId" character varying(36) NOT NULL,
    "tagId" character varying(36) NOT NULL
);


ALTER TABLE public.folder_tag OWNER TO "reece.schmeler67";

--
-- Name: insights_by_period; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.insights_by_period (
    id integer NOT NULL,
    "metaId" integer NOT NULL,
    type integer NOT NULL,
    value bigint NOT NULL,
    "periodUnit" integer NOT NULL,
    "periodStart" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.insights_by_period OWNER TO "reece.schmeler67";

--
-- Name: COLUMN insights_by_period.type; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.insights_by_period.type IS '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';


--
-- Name: COLUMN insights_by_period."periodUnit"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.insights_by_period."periodUnit" IS '0: hour, 1: day, 2: week';


--
-- Name: insights_by_period_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.insights_by_period ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.insights_by_period_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: insights_metadata; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.insights_metadata (
    "metaId" integer NOT NULL,
    "workflowId" character varying(36),
    "projectId" character varying(36),
    "workflowName" character varying(128) NOT NULL,
    "projectName" character varying(255) NOT NULL
);


ALTER TABLE public.insights_metadata OWNER TO "reece.schmeler67";

--
-- Name: insights_metadata_metaId_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.insights_metadata ALTER COLUMN "metaId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."insights_metadata_metaId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: insights_raw; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.insights_raw (
    id integer NOT NULL,
    "metaId" integer NOT NULL,
    type integer NOT NULL,
    value bigint NOT NULL,
    "timestamp" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.insights_raw OWNER TO "reece.schmeler67";

--
-- Name: COLUMN insights_raw.type; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.insights_raw.type IS '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';


--
-- Name: insights_raw_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.insights_raw ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.insights_raw_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: installed_nodes; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.installed_nodes (
    name character varying(200) NOT NULL,
    type character varying(200) NOT NULL,
    "latestVersion" integer DEFAULT 1 NOT NULL,
    package character varying(241) NOT NULL
);


ALTER TABLE public.installed_nodes OWNER TO "reece.schmeler67";

--
-- Name: installed_packages; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.installed_packages (
    "packageName" character varying(214) NOT NULL,
    "installedVersion" character varying(50) NOT NULL,
    "authorName" character varying(70),
    "authorEmail" character varying(70),
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.installed_packages OWNER TO "reece.schmeler67";

--
-- Name: instance_ai_iteration_logs; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_iteration_logs (
    id character varying(36) NOT NULL,
    "threadId" uuid NOT NULL,
    "taskKey" character varying NOT NULL,
    entry text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_ai_iteration_logs OWNER TO "reece.schmeler67";

--
-- Name: instance_ai_messages; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_messages (
    id character varying(36) NOT NULL,
    "threadId" uuid NOT NULL,
    content text NOT NULL,
    role character varying(16) NOT NULL,
    type character varying(32),
    "resourceId" character varying(255),
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_ai_messages OWNER TO "reece.schmeler67";

--
-- Name: instance_ai_observational_memory; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_observational_memory (
    id character varying(36) NOT NULL,
    "lookupKey" character varying(255) NOT NULL,
    scope character varying(16) NOT NULL,
    "threadId" uuid,
    "resourceId" character varying(255) NOT NULL,
    "activeObservations" text DEFAULT ''::text NOT NULL,
    "originType" character varying(32) NOT NULL,
    config text NOT NULL,
    "generationCount" integer DEFAULT 0 NOT NULL,
    "lastObservedAt" timestamp(3) with time zone,
    "pendingMessageTokens" integer DEFAULT 0 NOT NULL,
    "totalTokensObserved" integer DEFAULT 0 NOT NULL,
    "observationTokenCount" integer DEFAULT 0 NOT NULL,
    "isObserving" boolean DEFAULT false NOT NULL,
    "isReflecting" boolean DEFAULT false NOT NULL,
    "observedMessageIds" json,
    "observedTimezone" character varying,
    "bufferedObservations" text,
    "bufferedObservationTokens" integer,
    "bufferedMessageIds" json,
    "bufferedReflection" text,
    "bufferedReflectionTokens" integer,
    "bufferedReflectionInputTokens" integer,
    "reflectedObservationLineCount" integer,
    "bufferedObservationChunks" json,
    "isBufferingObservation" boolean DEFAULT false NOT NULL,
    "isBufferingReflection" boolean DEFAULT false NOT NULL,
    "lastBufferedAtTokens" integer DEFAULT 0 NOT NULL,
    "lastBufferedAtTime" timestamp(3) with time zone,
    metadata json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_ai_observational_memory OWNER TO "reece.schmeler67";

--
-- Name: instance_ai_resources; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_resources (
    id character varying(255) NOT NULL,
    "workingMemory" text,
    metadata json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_ai_resources OWNER TO "reece.schmeler67";

--
-- Name: instance_ai_run_snapshots; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_run_snapshots (
    "threadId" uuid NOT NULL,
    "runId" character varying(36) NOT NULL,
    "messageGroupId" character varying(36),
    "runIds" json,
    tree text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "langsmithRunId" character varying(36),
    "langsmithTraceId" character varying(36)
);


ALTER TABLE public.instance_ai_run_snapshots OWNER TO "reece.schmeler67";

--
-- Name: COLUMN instance_ai_run_snapshots."langsmithRunId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.instance_ai_run_snapshots."langsmithRunId" IS 'LangSmith run ID (UUID v4, e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479").';


--
-- Name: COLUMN instance_ai_run_snapshots."langsmithTraceId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.instance_ai_run_snapshots."langsmithTraceId" IS 'LangSmith trace ID (UUID v4, e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479").';


--
-- Name: instance_ai_threads; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_threads (
    id uuid NOT NULL,
    "resourceId" character varying(255) NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    metadata json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_ai_threads OWNER TO "reece.schmeler67";

--
-- Name: instance_ai_workflow_snapshots; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_ai_workflow_snapshots (
    "runId" character varying(36) NOT NULL,
    "workflowName" character varying(255) NOT NULL,
    "resourceId" character varying(255),
    status character varying,
    snapshot text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_ai_workflow_snapshots OWNER TO "reece.schmeler67";

--
-- Name: instance_version_history; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.instance_version_history (
    id integer NOT NULL,
    major integer NOT NULL,
    minor integer NOT NULL,
    patch integer NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.instance_version_history OWNER TO "reece.schmeler67";

--
-- Name: instance_version_history_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.instance_version_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instance_version_history_id_seq OWNER TO "reece.schmeler67";

--
-- Name: instance_version_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.instance_version_history_id_seq OWNED BY public.instance_version_history.id;


--
-- Name: invalid_auth_token; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.invalid_auth_token (
    token character varying(512) NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.invalid_auth_token OWNER TO "reece.schmeler67";

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO "reece.schmeler67";

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO "reece.schmeler67";

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: oauth_access_tokens; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.oauth_access_tokens (
    token character varying NOT NULL,
    "clientId" character varying NOT NULL,
    "userId" uuid NOT NULL
);


ALTER TABLE public.oauth_access_tokens OWNER TO "reece.schmeler67";

--
-- Name: oauth_authorization_codes; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.oauth_authorization_codes (
    code character varying(255) NOT NULL,
    "clientId" character varying NOT NULL,
    "userId" uuid NOT NULL,
    "redirectUri" character varying NOT NULL,
    "codeChallenge" character varying NOT NULL,
    "codeChallengeMethod" character varying(255) NOT NULL,
    "expiresAt" bigint NOT NULL,
    state character varying,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.oauth_authorization_codes OWNER TO "reece.schmeler67";

--
-- Name: COLUMN oauth_authorization_codes."expiresAt"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.oauth_authorization_codes."expiresAt" IS 'Unix timestamp in milliseconds';


--
-- Name: oauth_clients; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.oauth_clients (
    id character varying NOT NULL,
    name character varying(255) NOT NULL,
    "redirectUris" json NOT NULL,
    "grantTypes" json NOT NULL,
    "clientSecret" character varying(255),
    "clientSecretExpiresAt" bigint,
    "tokenEndpointAuthMethod" character varying(255) DEFAULT 'none'::character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.oauth_clients OWNER TO "reece.schmeler67";

--
-- Name: COLUMN oauth_clients."tokenEndpointAuthMethod"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.oauth_clients."tokenEndpointAuthMethod" IS 'Possible values: none, client_secret_basic or client_secret_post';


--
-- Name: oauth_refresh_tokens; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.oauth_refresh_tokens (
    token character varying(255) NOT NULL,
    "clientId" character varying NOT NULL,
    "userId" uuid NOT NULL,
    "expiresAt" bigint NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.oauth_refresh_tokens OWNER TO "reece.schmeler67";

--
-- Name: COLUMN oauth_refresh_tokens."expiresAt"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.oauth_refresh_tokens."expiresAt" IS 'Unix timestamp in milliseconds';


--
-- Name: oauth_user_consents; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.oauth_user_consents (
    id integer NOT NULL,
    "userId" uuid NOT NULL,
    "clientId" character varying NOT NULL,
    "grantedAt" bigint NOT NULL
);


ALTER TABLE public.oauth_user_consents OWNER TO "reece.schmeler67";

--
-- Name: COLUMN oauth_user_consents."grantedAt"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.oauth_user_consents."grantedAt" IS 'Unix timestamp in milliseconds';


--
-- Name: oauth_user_consents_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.oauth_user_consents ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.oauth_user_consents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: processed_data; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.processed_data (
    "workflowId" character varying(36) NOT NULL,
    context character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.processed_data OWNER TO "reece.schmeler67";

--
-- Name: project; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.project (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    icon json,
    description character varying(512),
    "creatorId" uuid
);


ALTER TABLE public.project OWNER TO "reece.schmeler67";

--
-- Name: COLUMN project."creatorId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.project."creatorId" IS 'ID of the user who created the project';


--
-- Name: project_relation; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.project_relation (
    "projectId" character varying(36) NOT NULL,
    "userId" uuid NOT NULL,
    role character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.project_relation OWNER TO "reece.schmeler67";

--
-- Name: project_secrets_provider_access; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.project_secrets_provider_access (
    "secretsProviderConnectionId" integer NOT NULL,
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    role character varying(128) DEFAULT 'secretsProviderConnection:user'::character varying NOT NULL,
    CONSTRAINT "CHK_project_secrets_provider_access_role" CHECK (((role)::text = ANY ((ARRAY['secretsProviderConnection:owner'::character varying, 'secretsProviderConnection:user'::character varying])::text[])))
);


ALTER TABLE public.project_secrets_provider_access OWNER TO "reece.schmeler67";

--
-- Name: role; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.role (
    slug character varying(128) NOT NULL,
    "displayName" text,
    description text,
    "roleType" text,
    "systemRole" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.role OWNER TO "reece.schmeler67";

--
-- Name: COLUMN role.slug; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.role.slug IS 'Unique identifier of the role for example: "global:owner"';


--
-- Name: COLUMN role."displayName"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.role."displayName" IS 'Name used to display in the UI';


--
-- Name: COLUMN role.description; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.role.description IS 'Text describing the scope in more detail of users';


--
-- Name: COLUMN role."roleType"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.role."roleType" IS 'Type of the role, e.g., global, project, or workflow';


--
-- Name: COLUMN role."systemRole"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.role."systemRole" IS 'Indicates if the role is managed by the system and cannot be edited';


--
-- Name: role_mapping_rule; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.role_mapping_rule (
    id character varying(16) NOT NULL,
    expression text NOT NULL,
    role character varying(128) NOT NULL,
    type character varying(64) NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.role_mapping_rule OWNER TO "reece.schmeler67";

--
-- Name: COLUMN role_mapping_rule.type; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.role_mapping_rule.type IS 'Expected values: ''instance'' (maps to a global role) or ''project'' (maps to a project role; projects linked via role_mapping_rule_project).';


--
-- Name: role_mapping_rule_project; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.role_mapping_rule_project (
    "roleMappingRuleId" character varying(16) NOT NULL,
    "projectId" character varying(36) NOT NULL
);


ALTER TABLE public.role_mapping_rule_project OWNER TO "reece.schmeler67";

--
-- Name: role_scope; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.role_scope (
    "roleSlug" character varying(128) NOT NULL,
    "scopeSlug" character varying(128) NOT NULL
);


ALTER TABLE public.role_scope OWNER TO "reece.schmeler67";

--
-- Name: scope; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.scope (
    slug character varying(128) NOT NULL,
    "displayName" text,
    description text
);


ALTER TABLE public.scope OWNER TO "reece.schmeler67";

--
-- Name: COLUMN scope.slug; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.scope.slug IS 'Unique identifier of the scope for example: "project:create"';


--
-- Name: COLUMN scope."displayName"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.scope."displayName" IS 'Name used to display in the UI';


--
-- Name: COLUMN scope.description; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.scope.description IS 'Text describing the scope in more detail of users';


--
-- Name: secrets_provider_connection; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.secrets_provider_connection (
    id integer NOT NULL,
    "providerKey" character varying(128) NOT NULL,
    type character varying(36) NOT NULL,
    "encryptedSettings" text NOT NULL,
    "isEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.secrets_provider_connection OWNER TO "reece.schmeler67";

--
-- Name: COLUMN secrets_provider_connection.type; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.secrets_provider_connection.type IS 'Type of secrets provider. Possible values: awsSecretsManager, gcpSecretsManager, vault, azureKeyVault, infisical';


--
-- Name: secrets_provider_connection_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.secrets_provider_connection ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.secrets_provider_connection_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.settings (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    "loadOnStartup" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.settings OWNER TO "reece.schmeler67";

--
-- Name: shared_credentials; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.shared_credentials (
    "credentialsId" character varying(36) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.shared_credentials OWNER TO "reece.schmeler67";

--
-- Name: shared_workflow; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.shared_workflow (
    "workflowId" character varying(36) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.shared_workflow OWNER TO "reece.schmeler67";

--
-- Name: tag_entity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.tag_entity (
    name character varying(24) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    id character varying(36) NOT NULL
);


ALTER TABLE public.tag_entity OWNER TO "reece.schmeler67";

--
-- Name: test_case_execution; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.test_case_execution (
    id character varying(36) NOT NULL,
    "testRunId" character varying(36) NOT NULL,
    "executionId" integer,
    status character varying NOT NULL,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "errorCode" character varying,
    "errorDetails" json,
    metrics json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    inputs json,
    outputs json
);


ALTER TABLE public.test_case_execution OWNER TO "reece.schmeler67";

--
-- Name: test_run; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.test_run (
    id character varying(36) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    status character varying NOT NULL,
    "errorCode" character varying,
    "errorDetails" json,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    metrics json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "runningInstanceId" character varying(255),
    "cancelRequested" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.test_run OWNER TO "reece.schmeler67";

--
-- Name: token_exchange_jti; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.token_exchange_jti (
    jti character varying(255) NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "createdAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.token_exchange_jti OWNER TO "reece.schmeler67";

--
-- Name: trusted_key; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.trusted_key (
    "sourceId" character varying(36) NOT NULL,
    kid character varying(255) NOT NULL,
    data text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.trusted_key OWNER TO "reece.schmeler67";

--
-- Name: trusted_key_source; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.trusted_key_source (
    id character varying(36) NOT NULL,
    type character varying(32) NOT NULL,
    config text NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    "lastError" text,
    "lastRefreshedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.trusted_key_source OWNER TO "reece.schmeler67";

--
-- Name: user; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255),
    "firstName" character varying(32),
    "lastName" character varying(32),
    password character varying(255),
    "personalizationAnswers" json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    settings json,
    disabled boolean DEFAULT false NOT NULL,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" text,
    "mfaRecoveryCodes" text,
    "lastActiveAt" date,
    "roleSlug" character varying(128) DEFAULT 'global:member'::character varying NOT NULL
);


ALTER TABLE public."user" OWNER TO "reece.schmeler67";

--
-- Name: user_api_keys; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.user_api_keys (
    id character varying(36) NOT NULL,
    "userId" uuid NOT NULL,
    label character varying(100) NOT NULL,
    "apiKey" character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    scopes json,
    audience character varying DEFAULT 'public-api'::character varying NOT NULL
);


ALTER TABLE public.user_api_keys OWNER TO "reece.schmeler67";

--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.user_favorites (
    id integer NOT NULL,
    "userId" uuid NOT NULL,
    "resourceId" character varying(255) NOT NULL,
    "resourceType" character varying(64) NOT NULL
);


ALTER TABLE public.user_favorites OWNER TO "reece.schmeler67";

--
-- Name: user_favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.user_favorites ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.user_favorites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: variables; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.variables (
    key character varying(50) NOT NULL,
    type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    value character varying(255),
    id character varying(36) NOT NULL,
    "projectId" character varying(36)
);


ALTER TABLE public.variables OWNER TO "reece.schmeler67";

--
-- Name: webhook_entity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.webhook_entity (
    "webhookPath" character varying NOT NULL,
    method character varying NOT NULL,
    node character varying NOT NULL,
    "webhookId" character varying,
    "pathLength" integer,
    "workflowId" character varying(36) NOT NULL
);


ALTER TABLE public.webhook_entity OWNER TO "reece.schmeler67";

--
-- Name: workflow_builder_session; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_builder_session (
    id uuid NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "userId" uuid NOT NULL,
    messages json DEFAULT '[]'::json NOT NULL,
    "previousSummary" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "activeVersionCardId" character varying(255),
    "resumeAfterRestoreMessageId" character varying(255)
);


ALTER TABLE public.workflow_builder_session OWNER TO "reece.schmeler67";

--
-- Name: COLUMN workflow_builder_session."previousSummary"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_builder_session."previousSummary" IS 'Summary of prior conversation from compaction (/compact or auto-compact)';


--
-- Name: workflow_dependency; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_dependency (
    id integer NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "workflowVersionId" integer NOT NULL,
    "dependencyType" character varying(32) NOT NULL,
    "dependencyKey" character varying(255) NOT NULL,
    "dependencyInfo" json,
    "indexVersionId" smallint DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "publishedVersionId" character varying(36)
);


ALTER TABLE public.workflow_dependency OWNER TO "reece.schmeler67";

--
-- Name: COLUMN workflow_dependency."workflowVersionId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_dependency."workflowVersionId" IS 'Version of the workflow';


--
-- Name: COLUMN workflow_dependency."dependencyType"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_dependency."dependencyType" IS 'Type of dependency: "credential", "nodeType", "webhookPath", or "workflowCall"';


--
-- Name: COLUMN workflow_dependency."dependencyKey"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_dependency."dependencyKey" IS 'ID or name of the dependency';


--
-- Name: COLUMN workflow_dependency."dependencyInfo"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_dependency."dependencyInfo" IS 'Additional info about the dependency, interpreted based on type';


--
-- Name: COLUMN workflow_dependency."indexVersionId"; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_dependency."indexVersionId" IS 'Version of the index structure';


--
-- Name: workflow_dependency_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.workflow_dependency ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.workflow_dependency_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workflow_entity; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_entity (
    name character varying(128) NOT NULL,
    active boolean NOT NULL,
    nodes json NOT NULL,
    connections json NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    settings json,
    "staticData" json,
    "pinData" json,
    "versionId" character(36) NOT NULL,
    "triggerCount" integer DEFAULT 0 NOT NULL,
    id character varying(36) NOT NULL,
    meta json,
    "parentFolderId" character varying(36) DEFAULT NULL::character varying,
    "isArchived" boolean DEFAULT false NOT NULL,
    "versionCounter" integer DEFAULT 1 NOT NULL,
    description text,
    "activeVersionId" character varying(36)
);


ALTER TABLE public.workflow_entity OWNER TO "reece.schmeler67";

--
-- Name: workflow_history; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_history (
    "versionId" character varying(36) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    authors character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    nodes json NOT NULL,
    connections json NOT NULL,
    name character varying(128),
    autosaved boolean DEFAULT false NOT NULL,
    description text
);


ALTER TABLE public.workflow_history OWNER TO "reece.schmeler67";

--
-- Name: workflow_publish_history; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_publish_history (
    id integer NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "versionId" character varying(36),
    event character varying(36) NOT NULL,
    "userId" uuid,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CHK_workflow_publish_history_event" CHECK (((event)::text = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::text[])))
);


ALTER TABLE public.workflow_publish_history OWNER TO "reece.schmeler67";

--
-- Name: COLUMN workflow_publish_history.event; Type: COMMENT; Schema: public; Owner: reece.schmeler67
--

COMMENT ON COLUMN public.workflow_publish_history.event IS 'Type of history record: activated (workflow is now active), deactivated (workflow is now inactive)';


--
-- Name: workflow_publish_history_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE public.workflow_publish_history ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.workflow_publish_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workflow_published_version; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_published_version (
    "workflowId" character varying(36) NOT NULL,
    "publishedVersionId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE public.workflow_published_version OWNER TO "reece.schmeler67";

--
-- Name: workflow_statistics; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflow_statistics (
    count bigint DEFAULT 0,
    "latestEvent" timestamp(3) with time zone,
    name character varying(128) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "rootCount" bigint DEFAULT 0,
    id integer NOT NULL,
    "workflowName" character varying(128)
);


ALTER TABLE public.workflow_statistics OWNER TO "reece.schmeler67";

--
-- Name: workflow_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: reece.schmeler67
--

CREATE SEQUENCE public.workflow_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_statistics_id_seq OWNER TO "reece.schmeler67";

--
-- Name: workflow_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: reece.schmeler67
--

ALTER SEQUENCE public.workflow_statistics_id_seq OWNED BY public.workflow_statistics.id;


--
-- Name: workflows_tags; Type: TABLE; Schema: public; Owner: reece.schmeler67
--

CREATE TABLE public.workflows_tags (
    "workflowId" character varying(36) NOT NULL,
    "tagId" character varying(36) NOT NULL
);


ALTER TABLE public.workflows_tags OWNER TO "reece.schmeler67";

--
-- Name: auth_provider_sync_history id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.auth_provider_sync_history ALTER COLUMN id SET DEFAULT nextval('public.auth_provider_sync_history_id_seq'::regclass);


--
-- Name: execution_annotations id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_annotations ALTER COLUMN id SET DEFAULT nextval('public.execution_annotations_id_seq'::regclass);


--
-- Name: execution_entity id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_entity ALTER COLUMN id SET DEFAULT nextval('public.execution_entity_id_seq'::regclass);


--
-- Name: execution_metadata id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_metadata ALTER COLUMN id SET DEFAULT nextval('public.execution_metadata_temp_id_seq'::regclass);


--
-- Name: instance_version_history id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_version_history ALTER COLUMN id SET DEFAULT nextval('public.instance_version_history_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: workflow_statistics id; Type: DEFAULT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_statistics ALTER COLUMN id SET DEFAULT nextval('public.workflow_statistics_id_seq'::regclass);


--
-- Data for Name: ai_builder_temporary_workflow; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.ai_builder_temporary_workflow ("workflowId", "threadId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: annotation_tag_entity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.annotation_tag_entity (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: auth_identity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.auth_identity ("userId", "providerId", "providerType", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: auth_provider_sync_history; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.auth_provider_sync_history (id, "providerType", "runMode", status, "startedAt", "endedAt", scanned, created, updated, disabled, error) FROM stdin;
\.


--
-- Data for Name: binary_data; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.binary_data ("fileId", "sourceType", "sourceId", data, "mimeType", "fileName", "fileSize", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: chat_hub_agent_tools; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.chat_hub_agent_tools ("agentId", "toolId") FROM stdin;
\.


--
-- Data for Name: chat_hub_agents; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.chat_hub_agents (id, name, description, "systemPrompt", "ownerId", "credentialId", provider, model, "createdAt", "updatedAt", icon, files, "suggestedPrompts") FROM stdin;
\.


--
-- Data for Name: chat_hub_messages; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.chat_hub_messages (id, "sessionId", "previousMessageId", "revisionOfMessageId", "retryOfMessageId", type, name, content, provider, model, "workflowId", "executionId", "createdAt", "updatedAt", "agentId", status, attachments) FROM stdin;
\.


--
-- Data for Name: chat_hub_session_tools; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.chat_hub_session_tools ("sessionId", "toolId") FROM stdin;
\.


--
-- Data for Name: chat_hub_sessions; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.chat_hub_sessions (id, title, "ownerId", "lastMessageAt", "credentialId", provider, model, "workflowId", "createdAt", "updatedAt", "agentId", "agentName", type) FROM stdin;
\.


--
-- Data for Name: chat_hub_tools; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.chat_hub_tools (id, name, type, "typeVersion", "ownerId", definition, enabled, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: credential_dependency; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.credential_dependency (id, "credentialId", "dependencyType", "dependencyId", "createdAt") FROM stdin;
\.


--
-- Data for Name: credentials_entity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.credentials_entity (name, data, type, "createdAt", "updatedAt", id, "isManaged", "isGlobal", "isResolvable", "resolvableAllowFallback", "resolverId") FROM stdin;
Ollama account	U2FsdGVkX1+JbLWpi3gpWnVQlLBlLYJJtXsqAVW2WkknCwY5FjGe9ccX6gFVsgZ3XfuW0zxd/nWjjxyyvGBnmw==	ollamaApi	2026-04-27 02:20:53.88+00	2026-04-27 02:20:53.879+00	wvOyfq9b69sMEzrF	f	f	f	f	\N
\.


--
-- Data for Name: data_table; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.data_table (id, name, "projectId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: data_table_column; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.data_table_column (id, name, type, index, "dataTableId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: deployment_key; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.deployment_key (id, type, value, algorithm, status, "createdAt", "updatedAt") FROM stdin;
bfFaYWRGRtZDpRDI	instance.id	74250d5a827725a64290328e578173c373cd64ed89e4a511a22cca3ead58bda7	\N	active	2026-05-11 15:32:51.832+00	2026-05-11 15:32:51.832+00
L3xIjmMUdtqsifmK	signing.hmac	70442b6205583ee54544cb56a5a48887f941ab5b456b6b1deab78e72fc01de60	\N	active	2026-05-11 15:32:51.851+00	2026-05-11 15:32:51.851+00
8gqBJPXOj3erUlhG	signing.jwt	f04fb272717d87ae55ce0c4060ecec9e5fd5d7faeb5c452fc866c3557ce58c86	\N	active	2026-05-11 15:32:51.862+00	2026-05-11 15:32:51.862+00
y4fXFjqpwCPjejOc	signing.binary_data	63PLgryskeYNxHTDbPcFRO72CfikzoJZbZGolrGEDhY=	\N	active	2026-05-11 15:32:51.871+00	2026-05-11 15:32:51.871+00
\.


--
-- Data for Name: dynamic_credential_entry; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.dynamic_credential_entry (credential_id, subject_id, resolver_id, data, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dynamic_credential_resolver; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.dynamic_credential_resolver (id, name, type, config, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dynamic_credential_user_entry; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.dynamic_credential_user_entry ("credentialId", "userId", "resolverId", data, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: event_destinations; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.event_destinations (id, destination, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: execution_annotation_tags; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.execution_annotation_tags ("annotationId", "tagId") FROM stdin;
\.


--
-- Data for Name: execution_annotations; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.execution_annotations (id, "executionId", vote, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: execution_data; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.execution_data ("executionId", "workflowData", data, "workflowVersionId") FROM stdin;
\.


--
-- Data for Name: execution_entity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.execution_entity (id, finished, mode, "retryOf", "retrySuccessId", "startedAt", "stoppedAt", "waitTill", status, "workflowId", "deletedAt", "createdAt", "storedAt", "tracingContext", "deduplicationKey") FROM stdin;
\.


--
-- Data for Name: execution_metadata; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.execution_metadata (id, "executionId", key, value) FROM stdin;
\.


--
-- Data for Name: folder; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.folder (id, name, "parentFolderId", "projectId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: folder_tag; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.folder_tag ("folderId", "tagId") FROM stdin;
\.


--
-- Data for Name: insights_by_period; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.insights_by_period (id, "metaId", type, value, "periodUnit", "periodStart") FROM stdin;
\.


--
-- Data for Name: insights_metadata; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.insights_metadata ("metaId", "workflowId", "projectId", "workflowName", "projectName") FROM stdin;
\.


--
-- Data for Name: insights_raw; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.insights_raw (id, "metaId", type, value, "timestamp") FROM stdin;
\.


--
-- Data for Name: installed_nodes; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.installed_nodes (name, type, "latestVersion", package) FROM stdin;
Evolution API	n8n-nodes-evolution-api.evolutionApi	1	n8n-nodes-evolution-api
\.


--
-- Data for Name: installed_packages; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.installed_packages ("packageName", "installedVersion", "authorName", "authorEmail", "createdAt", "updatedAt") FROM stdin;
n8n-nodes-evolution-api	1.0.4	OrionDesign	contato@oriondesign.art.br	2026-04-30 14:44:36.286+00	2026-04-30 14:44:36.286+00
\.


--
-- Data for Name: instance_ai_iteration_logs; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_iteration_logs (id, "threadId", "taskKey", entry, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: instance_ai_messages; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_messages (id, "threadId", content, role, type, "resourceId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: instance_ai_observational_memory; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_observational_memory (id, "lookupKey", scope, "threadId", "resourceId", "activeObservations", "originType", config, "generationCount", "lastObservedAt", "pendingMessageTokens", "totalTokensObserved", "observationTokenCount", "isObserving", "isReflecting", "observedMessageIds", "observedTimezone", "bufferedObservations", "bufferedObservationTokens", "bufferedMessageIds", "bufferedReflection", "bufferedReflectionTokens", "bufferedReflectionInputTokens", "reflectedObservationLineCount", "bufferedObservationChunks", "isBufferingObservation", "isBufferingReflection", "lastBufferedAtTokens", "lastBufferedAtTime", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: instance_ai_resources; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_resources (id, "workingMemory", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: instance_ai_run_snapshots; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_run_snapshots ("threadId", "runId", "messageGroupId", "runIds", tree, "createdAt", "updatedAt", "langsmithRunId", "langsmithTraceId") FROM stdin;
\.


--
-- Data for Name: instance_ai_threads; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_threads (id, "resourceId", title, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: instance_ai_workflow_snapshots; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_ai_workflow_snapshots ("runId", "workflowName", "resourceId", status, snapshot, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: instance_version_history; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.instance_version_history (id, major, minor, patch, "createdAt") FROM stdin;
1	2	17	7	2026-04-26 02:50:16.838+00
2	2	19	5	2026-05-11 15:32:55.088+00
\.


--
-- Data for Name: invalid_auth_token; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.invalid_auth_token (token, "expiresAt") FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1587669153312	InitialMigration1587669153312
2	1589476000887	WebhookModel1589476000887
3	1594828256133	CreateIndexStoppedAt1594828256133
4	1607431743768	MakeStoppedAtNullable1607431743768
5	1611144599516	AddWebhookId1611144599516
6	1617270242566	CreateTagEntity1617270242566
7	1620824779533	UniqueWorkflowNames1620824779533
8	1626176912946	AddwaitTill1626176912946
9	1630419189837	UpdateWorkflowCredentials1630419189837
10	1644422880309	AddExecutionEntityIndexes1644422880309
11	1646834195327	IncreaseTypeVarcharLimit1646834195327
12	1646992772331	CreateUserManagement1646992772331
13	1648740597343	LowerCaseUserEmail1648740597343
14	1652254514002	CommunityNodes1652254514002
15	1652367743993	AddUserSettings1652367743993
16	1652905585850	AddAPIKeyColumn1652905585850
17	1654090467022	IntroducePinData1654090467022
18	1658932090381	AddNodeIds1658932090381
19	1659902242948	AddJsonKeyPinData1659902242948
20	1660062385367	CreateCredentialsUserRole1660062385367
21	1663755770893	CreateWorkflowsEditorRole1663755770893
22	1664196174001	WorkflowStatistics1664196174001
23	1665484192212	CreateCredentialUsageTable1665484192212
24	1665754637025	RemoveCredentialUsageTable1665754637025
25	1669739707126	AddWorkflowVersionIdColumn1669739707126
26	1669823906995	AddTriggerCountColumn1669823906995
27	1671535397530	MessageEventBusDestinations1671535397530
28	1671726148421	RemoveWorkflowDataLoadedFlag1671726148421
29	1673268682475	DeleteExecutionsWithWorkflows1673268682475
30	1674138566000	AddStatusToExecutions1674138566000
31	1674509946020	CreateLdapEntities1674509946020
32	1675940580449	PurgeInvalidWorkflowConnections1675940580449
33	1676996103000	MigrateExecutionStatus1676996103000
34	1677236854063	UpdateRunningExecutionStatus1677236854063
35	1677501636754	CreateVariables1677501636754
36	1679416281778	CreateExecutionMetadataTable1679416281778
37	1681134145996	AddUserActivatedProperty1681134145996
38	1681134145997	RemoveSkipOwnerSetup1681134145997
39	1690000000000	MigrateIntegerKeysToString1690000000000
40	1690000000020	SeparateExecutionData1690000000020
41	1690000000030	RemoveResetPasswordColumns1690000000030
42	1690000000030	AddMfaColumns1690000000030
43	1690787606731	AddMissingPrimaryKeyOnExecutionData1690787606731
44	1691088862123	CreateWorkflowNameIndex1691088862123
45	1692967111175	CreateWorkflowHistoryTable1692967111175
46	1693491613982	ExecutionSoftDelete1693491613982
47	1693554410387	DisallowOrphanExecutions1693554410387
48	1694091729095	MigrateToTimestampTz1694091729095
49	1695128658538	AddWorkflowMetadata1695128658538
50	1695829275184	ModifyWorkflowHistoryNodesAndConnections1695829275184
51	1700571993961	AddGlobalAdminRole1700571993961
52	1705429061930	DropRoleMapping1705429061930
53	1711018413374	RemoveFailedExecutionStatus1711018413374
54	1711390882123	MoveSshKeysToDatabase1711390882123
55	1712044305787	RemoveNodesAccess1712044305787
56	1714133768519	CreateProject1714133768519
57	1714133768521	MakeExecutionStatusNonNullable1714133768521
58	1717498465931	AddActivatedAtUserSetting1717498465931
59	1720101653148	AddConstraintToExecutionMetadata1720101653148
60	1721377157740	FixExecutionMetadataSequence1721377157740
61	1723627610222	CreateInvalidAuthTokenTable1723627610222
62	1723796243146	RefactorExecutionIndices1723796243146
63	1724753530828	CreateAnnotationTables1724753530828
64	1724951148974	AddApiKeysTable1724951148974
65	1726606152711	CreateProcessedDataTable1726606152711
66	1727427440136	SeparateExecutionCreationFromStart1727427440136
67	1728659839644	AddMissingPrimaryKeyOnAnnotationTagMapping1728659839644
68	1729607673464	UpdateProcessedDataValueColumnToText1729607673464
69	1729607673469	AddProjectIcons1729607673469
70	1730386903556	CreateTestDefinitionTable1730386903556
71	1731404028106	AddDescriptionToTestDefinition1731404028106
72	1731582748663	MigrateTestDefinitionKeyToString1731582748663
73	1732271325258	CreateTestMetricTable1732271325258
74	1732549866705	CreateTestRun1732549866705
75	1733133775640	AddMockedNodesColumnToTestDefinition1733133775640
76	1734479635324	AddManagedColumnToCredentialsTable1734479635324
77	1736172058779	AddStatsColumnsToTestRun1736172058779
78	1736947513045	CreateTestCaseExecutionTable1736947513045
79	1737715421462	AddErrorColumnsToTestRuns1737715421462
80	1738709609940	CreateFolderTable1738709609940
81	1739549398681	CreateAnalyticsTables1739549398681
82	1740445074052	UpdateParentFolderIdColumn1740445074052
83	1741167584277	RenameAnalyticsToInsights1741167584277
84	1742918400000	AddScopesColumnToApiKeys1742918400000
85	1745322634000	ClearEvaluation1745322634000
86	1745587087521	AddWorkflowStatisticsRootCount1745587087521
87	1745934666076	AddWorkflowArchivedColumn1745934666076
88	1745934666077	DropRoleTable1745934666077
89	1747824239000	AddProjectDescriptionColumn1747824239000
90	1750252139166	AddLastActiveAtColumnToUser1750252139166
91	1750252139166	AddScopeTables1750252139166
92	1750252139167	AddRolesTables1750252139167
93	1750252139168	LinkRoleToUserTable1750252139168
94	1750252139170	RemoveOldRoleColumn1750252139170
95	1752669793000	AddInputsOutputsToTestCaseExecution1752669793000
96	1753953244168	LinkRoleToProjectRelationTable1753953244168
97	1754475614601	CreateDataStoreTables1754475614601
98	1754475614602	ReplaceDataStoreTablesWithDataTables1754475614602
99	1756906557570	AddTimestampsToRoleAndRoleIndexes1756906557570
100	1758731786132	AddAudienceColumnToApiKeys1758731786132
101	1758794506893	AddProjectIdToVariableTable1758794506893
102	1759399811000	ChangeValueTypesForInsights1759399811000
103	1760019379982	CreateChatHubTables1760019379982
104	1760020000000	CreateChatHubAgentTable1760020000000
105	1760020838000	UniqueRoleNames1760020838000
106	1760116750277	CreateOAuthEntities1760116750277
107	1760314000000	CreateWorkflowDependencyTable1760314000000
108	1760965142113	DropUnusedChatHubColumns1760965142113
109	1761047826451	AddWorkflowVersionColumn1761047826451
110	1761655473000	ChangeDependencyInfoToJson1761655473000
111	1761773155024	AddAttachmentsToChatHubMessages1761773155024
112	1761830340990	AddToolsColumnToChatHubTables1761830340990
113	1762177736257	AddWorkflowDescriptionColumn1762177736257
114	1762763704614	BackfillMissingWorkflowHistoryRecords1762763704614
115	1762771264000	ChangeDefaultForIdInUserTable1762771264000
116	1762771954619	AddIsGlobalColumnToCredentialsTable1762771954619
117	1762847206508	AddWorkflowHistoryAutoSaveFields1762847206508
118	1763047800000	AddActiveVersionIdColumn1763047800000
119	1763048000000	ActivateExecuteWorkflowTriggerWorkflows1763048000000
120	1763572724000	ChangeOAuthStateColumnToUnboundedVarchar1763572724000
121	1763716655000	CreateBinaryDataTable1763716655000
122	1764167920585	CreateWorkflowPublishHistoryTable1764167920585
123	1764276827837	AddCreatorIdToProjectTable1764276827837
124	1764682447000	CreateDynamicCredentialResolverTable1764682447000
125	1764689388394	AddDynamicCredentialEntryTable1764689388394
126	1765448186933	BackfillMissingWorkflowHistoryRecords1765448186933
127	1765459448000	AddResolvableFieldsToCredentials1765459448000
128	1765788427674	AddIconToAgentTable1765788427674
129	1765804780000	ConvertAgentIdToUuid1765804780000
130	1765886667897	AddAgentIdForeignKeys1765886667897
131	1765892199653	AddWorkflowVersionIdToExecutionData1765892199653
132	1766064542000	AddWorkflowPublishScopeToProjectRoles1766064542000
133	1766068346315	AddChatMessageIndices1766068346315
134	1766500000000	ExpandInsightsWorkflowIdLength1766500000000
135	1767018516000	ChangeWorkflowStatisticsFKToNoAction1767018516000
136	1768402473068	ExpandModelColumnLength1768402473068
137	1768557000000	AddStoredAtToExecutionEntity1768557000000
138	1768901721000	AddDynamicCredentialUserEntryTable1768901721000
139	1769000000000	AddPublishedVersionIdToWorkflowDependency1769000000000
140	1769433700000	CreateSecretsProviderConnectionTables1769433700000
141	1769698710000	CreateWorkflowPublishedVersionTable1769698710000
142	1769784356000	ExpandSubjectIDColumnLength1769784356000
143	1769900001000	AddWorkflowUnpublishScopeToCustomRoles1769900001000
144	1770000000000	CreateChatHubToolsTable1770000000000
145	1770000000000	ExpandProviderIdColumnLength1770000000000
146	1770220686000	CreateWorkflowBuilderSessionTable1770220686000
147	1771417407753	AddScalingFieldsToTestRun1771417407753
148	1771500000000	MigrateExternalSecretsToEntityStorage1771500000000
149	1771500000001	AddUnshareScopeToCustomRoles1771500000001
150	1771500000002	AddFilesColumnToChatHubAgents1771500000002
151	1772000000000	AddSuggestedPromptsToAgentTable1772000000000
152	1772619247761	AddRoleColumnToProjectSecretsProviderAccess1772619247761
153	1772619247762	ChangeWorkflowPublishedVersionFKsToRestrict1772619247762
154	1772700000000	AddTypeToChatHubSessions1772700000000
155	1772800000000	CreateRoleMappingRuleTable1772800000000
156	1773000000000	CreateCredentialDependencyTable1773000000000
157	1774280963551	AddRestoreFieldsToWorkflowBuilderSession1774280963551
158	1774854660000	CreateInstanceVersionHistoryTable1774854660000
159	1775000000000	CreateInstanceAiTables1775000000000
160	1775116241000	CreateTokenExchangeJtiTable1775116241000
161	1775740765000	ChangeWorkflowPublishHistoryVersionIdToSetNull1775740765000
162	1776000000000	CreateTrustedKeyTables1776000000000
163	1776150756000	CreateFavoritesTable1776150756000
164	1777000000000	CreateDeploymentKeyTable1777000000000
165	1777045000000	AddTracingContextToExecution1777045000000
166	1777100000000	AddLangsmithIdsToInstanceAiRunSnapshots1777100000000
167	1777281990043	CreateAiBuilderTemporaryWorkflowTable1777281990043
168	1778000000000	AddExecutionDeduplicationKey1778000000000
\.


--
-- Data for Name: oauth_access_tokens; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.oauth_access_tokens (token, "clientId", "userId") FROM stdin;
\.


--
-- Data for Name: oauth_authorization_codes; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.oauth_authorization_codes (code, "clientId", "userId", "redirectUri", "codeChallenge", "codeChallengeMethod", "expiresAt", state, used, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.oauth_clients (id, name, "redirectUris", "grantTypes", "clientSecret", "clientSecretExpiresAt", "tokenEndpointAuthMethod", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: oauth_refresh_tokens; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.oauth_refresh_tokens (token, "clientId", "userId", "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: oauth_user_consents; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.oauth_user_consents (id, "userId", "clientId", "grantedAt") FROM stdin;
\.


--
-- Data for Name: processed_data; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.processed_data ("workflowId", context, "createdAt", "updatedAt", value) FROM stdin;
\.


--
-- Data for Name: project; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.project (id, name, type, "createdAt", "updatedAt", icon, description, "creatorId") FROM stdin;
jiaWx4AaJK5LGZ9r	Leonardo Spedaletti <spedalettileonardo@gmail.com>	personal	2026-04-26 02:49:56.388+00	2026-04-26 02:53:48.312+00	\N	\N	8274b19f-2f1f-4df7-be3d-d02d67d238d1
\.


--
-- Data for Name: project_relation; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.project_relation ("projectId", "userId", role, "createdAt", "updatedAt") FROM stdin;
jiaWx4AaJK5LGZ9r	8274b19f-2f1f-4df7-be3d-d02d67d238d1	project:personalOwner	2026-04-26 02:49:56.388+00	2026-04-26 02:49:56.388+00
\.


--
-- Data for Name: project_secrets_provider_access; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.project_secrets_provider_access ("secretsProviderConnectionId", "projectId", "createdAt", "updatedAt", role) FROM stdin;
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.role (slug, "displayName", description, "roleType", "systemRole", "createdAt", "updatedAt") FROM stdin;
global:chatUser	Chat User	Chat User	global	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
global:owner	Owner	Owner	global	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.387+00
global:admin	Admin	Admin	global	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.387+00
global:member	Member	Member	global	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.387+00
project:admin	Project Admin	Full control of settings, members, workflows, credentials and executions	project	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.467+00
project:personalOwner	Project Owner	Project Owner	project	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.467+00
project:editor	Project Editor	Create, edit, and delete workflows, credentials, and executions	project	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.467+00
project:viewer	Project Viewer	Read-only access to workflows, credentials, and executions	project	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.467+00
project:chatUser	Project Chat User	Chat-only access to chatting with workflows that have n8n Chat enabled	project	t	2026-04-26 02:49:58.012+00	2026-04-26 02:50:14.467+00
credential:owner	Credential Owner	Credential Owner	credential	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
credential:user	Credential User	Credential User	credential	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
workflow:owner	Workflow Owner	Workflow Owner	workflow	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
workflow:editor	Workflow Editor	Workflow Editor	workflow	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
secretsProviderConnection:owner	Secrets Provider Connection Owner	Full control of secrets provider connection settings and secrets	secretsProviderConnection	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
secretsProviderConnection:user	Secrets Provider Connection User	Read-only access to use secrets from the connection	secretsProviderConnection	t	2026-04-26 02:50:14.284+00	2026-04-26 02:50:14.284+00
\.


--
-- Data for Name: role_mapping_rule; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.role_mapping_rule (id, expression, role, type, "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: role_mapping_rule_project; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.role_mapping_rule_project ("roleMappingRuleId", "projectId") FROM stdin;
\.


--
-- Data for Name: role_scope; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.role_scope ("roleSlug", "scopeSlug") FROM stdin;
global:owner	workflow:unpublish
global:owner	workflow:unshare
global:owner	credential:unshare
global:owner	aiAssistant:manage
global:owner	annotationTag:create
global:owner	annotationTag:read
global:owner	annotationTag:update
global:owner	annotationTag:delete
global:owner	annotationTag:list
global:owner	auditLogs:manage
global:owner	banner:dismiss
global:owner	community:register
global:owner	communityPackage:install
global:owner	communityPackage:uninstall
global:owner	communityPackage:update
global:owner	communityPackage:list
global:owner	credential:share
global:owner	credential:shareGlobally
global:owner	credential:move
global:owner	credential:create
global:owner	credential:read
global:owner	credential:update
global:owner	credential:delete
global:owner	credential:list
global:owner	externalSecretsProvider:sync
global:owner	externalSecretsProvider:create
global:owner	externalSecretsProvider:read
global:owner	externalSecretsProvider:update
global:owner	externalSecretsProvider:delete
global:owner	externalSecretsProvider:list
global:owner	externalSecret:list
global:owner	eventBusDestination:test
global:owner	eventBusDestination:create
global:owner	eventBusDestination:read
global:owner	eventBusDestination:update
global:owner	eventBusDestination:delete
global:owner	eventBusDestination:list
global:owner	ldap:sync
global:owner	ldap:manage
global:owner	license:manage
global:owner	logStreaming:manage
global:owner	orchestration:read
global:owner	project:create
global:owner	project:read
global:owner	project:update
global:owner	project:delete
global:owner	project:list
global:owner	saml:manage
global:owner	securityAudit:generate
global:owner	securitySettings:manage
global:owner	sourceControl:pull
global:owner	sourceControl:push
global:owner	sourceControl:manage
global:owner	tag:create
global:owner	tag:read
global:owner	tag:update
global:owner	tag:delete
global:owner	tag:list
global:owner	user:resetPassword
global:owner	user:changeRole
global:owner	user:enforceMfa
global:owner	user:generateInviteLink
global:owner	user:create
global:owner	user:read
global:owner	user:update
global:owner	user:delete
global:owner	user:list
global:owner	variable:create
global:owner	variable:read
global:owner	variable:update
global:owner	variable:delete
global:owner	variable:list
global:owner	projectVariable:create
global:owner	projectVariable:read
global:owner	projectVariable:update
global:owner	projectVariable:delete
global:owner	projectVariable:list
global:owner	workersView:manage
global:owner	workflow:share
global:owner	workflow:execute
global:owner	workflow:execute-chat
global:owner	workflow:move
global:owner	workflow:updateRedactionSetting
global:owner	workflow:create
global:owner	workflow:read
global:owner	workflow:update
global:owner	workflow:delete
global:owner	workflow:list
global:owner	folder:create
global:owner	folder:read
global:owner	folder:update
global:owner	folder:delete
global:owner	folder:list
global:owner	folder:move
global:owner	insights:list
global:owner	insights:read
global:owner	oidc:manage
global:owner	provisioning:manage
global:owner	dataTable:create
global:owner	dataTable:read
global:owner	dataTable:update
global:owner	dataTable:delete
global:owner	dataTable:list
global:owner	dataTable:readRow
global:owner	dataTable:writeRow
global:owner	dataTable:listProject
global:owner	execution:reveal
global:owner	role:manage
global:owner	mcp:manage
global:owner	mcp:oauth
global:owner	mcpApiKey:create
global:owner	mcpApiKey:rotate
global:owner	chatHub:manage
global:owner	chatHub:message
global:owner	chatHubAgent:create
global:owner	chatHubAgent:read
global:owner	chatHubAgent:update
global:owner	chatHubAgent:delete
global:owner	chatHubAgent:list
global:owner	breakingChanges:list
global:owner	apiKey:manage
global:owner	credentialResolver:create
global:owner	credentialResolver:read
global:owner	credentialResolver:update
global:owner	credentialResolver:delete
global:owner	credentialResolver:list
global:owner	instanceAi:message
global:owner	instanceAi:manage
global:owner	instanceAi:gateway
global:owner	roleMappingRule:create
global:owner	roleMappingRule:read
global:owner	roleMappingRule:update
global:owner	roleMappingRule:delete
global:owner	roleMappingRule:list
global:owner	workflow:publish
global:admin	workflow:unpublish
global:admin	workflow:unshare
global:admin	credential:unshare
global:admin	aiAssistant:manage
global:admin	annotationTag:create
global:admin	annotationTag:read
global:admin	annotationTag:update
global:admin	annotationTag:delete
global:admin	annotationTag:list
global:admin	auditLogs:manage
global:admin	banner:dismiss
global:admin	community:register
global:admin	communityPackage:install
global:admin	communityPackage:uninstall
global:admin	communityPackage:update
global:admin	communityPackage:list
global:admin	credential:share
global:admin	credential:shareGlobally
global:admin	credential:move
global:admin	credential:create
global:admin	credential:read
global:admin	credential:update
global:admin	credential:delete
global:admin	credential:list
global:admin	externalSecretsProvider:sync
global:admin	externalSecretsProvider:create
global:admin	externalSecretsProvider:read
global:admin	externalSecretsProvider:update
global:admin	externalSecretsProvider:delete
global:admin	externalSecretsProvider:list
global:admin	externalSecret:list
global:admin	eventBusDestination:test
global:admin	eventBusDestination:create
global:admin	eventBusDestination:read
global:admin	eventBusDestination:update
global:admin	eventBusDestination:delete
global:admin	eventBusDestination:list
global:admin	ldap:sync
global:admin	ldap:manage
global:admin	license:manage
global:admin	logStreaming:manage
global:admin	orchestration:read
global:admin	project:create
global:admin	project:read
global:admin	project:update
global:admin	project:delete
global:admin	project:list
global:admin	saml:manage
global:admin	securityAudit:generate
global:admin	securitySettings:manage
global:admin	sourceControl:pull
global:admin	sourceControl:push
global:admin	sourceControl:manage
global:admin	tag:create
global:admin	tag:read
global:admin	tag:update
global:admin	tag:delete
global:admin	tag:list
global:admin	user:resetPassword
global:admin	user:changeRole
global:admin	user:enforceMfa
global:admin	user:generateInviteLink
global:admin	user:create
global:admin	user:read
global:admin	user:update
global:admin	user:delete
global:admin	user:list
global:admin	variable:create
global:admin	variable:read
global:admin	variable:update
global:admin	variable:delete
global:admin	variable:list
global:admin	projectVariable:create
global:admin	projectVariable:read
global:admin	projectVariable:update
global:admin	projectVariable:delete
global:admin	projectVariable:list
global:admin	workersView:manage
global:admin	workflow:share
global:admin	workflow:execute
global:admin	workflow:execute-chat
global:admin	workflow:move
global:admin	workflow:updateRedactionSetting
global:admin	workflow:create
global:admin	workflow:read
global:admin	workflow:update
global:admin	workflow:delete
global:admin	workflow:list
global:admin	folder:create
global:admin	folder:read
global:admin	folder:update
global:admin	folder:delete
global:admin	folder:list
global:admin	folder:move
global:admin	insights:list
global:admin	insights:read
global:admin	oidc:manage
global:admin	provisioning:manage
global:admin	dataTable:create
global:admin	dataTable:read
global:admin	dataTable:update
global:admin	dataTable:delete
global:admin	dataTable:list
global:admin	dataTable:readRow
global:admin	dataTable:writeRow
global:admin	dataTable:listProject
global:admin	execution:reveal
global:admin	role:manage
global:admin	mcp:manage
global:admin	mcp:oauth
global:admin	mcpApiKey:create
global:admin	mcpApiKey:rotate
global:admin	chatHub:manage
global:admin	chatHub:message
global:admin	chatHubAgent:create
global:admin	chatHubAgent:read
global:admin	chatHubAgent:update
global:admin	chatHubAgent:delete
global:admin	chatHubAgent:list
global:admin	breakingChanges:list
global:admin	apiKey:manage
global:admin	credentialResolver:create
global:admin	credentialResolver:read
global:admin	credentialResolver:update
global:admin	credentialResolver:delete
global:admin	credentialResolver:list
global:admin	instanceAi:message
global:admin	instanceAi:manage
global:admin	instanceAi:gateway
global:admin	roleMappingRule:create
global:admin	roleMappingRule:read
global:admin	roleMappingRule:update
global:admin	roleMappingRule:delete
global:admin	roleMappingRule:list
global:admin	workflow:publish
global:member	annotationTag:create
global:member	annotationTag:read
global:member	annotationTag:update
global:member	annotationTag:delete
global:member	annotationTag:list
global:member	eventBusDestination:test
global:member	eventBusDestination:list
global:member	tag:create
global:member	tag:read
global:member	tag:update
global:member	tag:list
global:member	user:list
global:member	variable:read
global:member	variable:list
global:member	insights:read
global:member	dataTable:list
global:member	mcp:oauth
global:member	mcpApiKey:create
global:member	mcpApiKey:rotate
global:member	chatHub:message
global:member	chatHubAgent:create
global:member	chatHubAgent:read
global:member	chatHubAgent:update
global:member	chatHubAgent:delete
global:member	chatHubAgent:list
global:member	apiKey:manage
global:member	credentialResolver:list
global:member	instanceAi:message
global:member	instanceAi:gateway
global:chatUser	chatHub:message
global:chatUser	chatHubAgent:create
global:chatUser	chatHubAgent:read
global:chatUser	chatHubAgent:update
global:chatUser	chatHubAgent:delete
global:chatUser	chatHubAgent:list
project:admin	workflow:unpublish
project:admin	credential:unshare
project:admin	credential:share
project:admin	credential:move
project:admin	credential:create
project:admin	credential:read
project:admin	credential:update
project:admin	credential:delete
project:admin	credential:list
project:admin	project:read
project:admin	project:update
project:admin	project:delete
project:admin	project:list
project:admin	sourceControl:push
project:admin	projectVariable:create
project:admin	projectVariable:read
project:admin	projectVariable:update
project:admin	projectVariable:delete
project:admin	projectVariable:list
project:admin	workflow:execute
project:admin	workflow:execute-chat
project:admin	workflow:move
project:admin	workflow:updateRedactionSetting
project:admin	workflow:create
project:admin	workflow:read
project:admin	workflow:update
project:admin	workflow:delete
project:admin	workflow:list
project:admin	folder:create
project:admin	folder:read
project:admin	folder:update
project:admin	folder:delete
project:admin	folder:list
project:admin	folder:move
project:admin	dataTable:create
project:admin	dataTable:read
project:admin	dataTable:update
project:admin	dataTable:delete
project:admin	dataTable:readRow
project:admin	dataTable:writeRow
project:admin	dataTable:listProject
project:admin	execution:reveal
project:admin	workflow:publish
project:personalOwner	workflow:unpublish
project:personalOwner	workflow:unshare
project:personalOwner	credential:unshare
project:personalOwner	credential:share
project:personalOwner	credential:move
project:personalOwner	credential:create
project:personalOwner	credential:read
project:personalOwner	credential:update
project:personalOwner	credential:delete
project:personalOwner	credential:list
project:personalOwner	project:read
project:personalOwner	project:list
project:personalOwner	workflow:share
project:personalOwner	workflow:execute
project:personalOwner	workflow:execute-chat
project:personalOwner	workflow:move
project:personalOwner	workflow:updateRedactionSetting
project:personalOwner	workflow:create
project:personalOwner	workflow:read
project:personalOwner	workflow:update
project:personalOwner	workflow:delete
project:personalOwner	workflow:list
project:personalOwner	folder:create
project:personalOwner	folder:read
project:personalOwner	folder:update
project:personalOwner	folder:delete
project:personalOwner	folder:list
project:personalOwner	folder:move
project:personalOwner	dataTable:create
project:personalOwner	dataTable:read
project:personalOwner	dataTable:update
project:personalOwner	dataTable:delete
project:personalOwner	dataTable:readRow
project:personalOwner	dataTable:writeRow
project:personalOwner	dataTable:listProject
project:personalOwner	execution:reveal
project:personalOwner	workflow:publish
project:editor	workflow:unpublish
project:editor	credential:create
project:editor	credential:read
project:editor	credential:update
project:editor	credential:delete
project:editor	credential:list
project:editor	project:read
project:editor	project:list
project:editor	projectVariable:create
project:editor	projectVariable:read
project:editor	projectVariable:update
project:editor	projectVariable:delete
project:editor	projectVariable:list
project:editor	workflow:execute
project:editor	workflow:execute-chat
project:editor	workflow:create
project:editor	workflow:read
project:editor	workflow:update
project:editor	workflow:delete
project:editor	workflow:list
project:editor	folder:create
project:editor	folder:read
project:editor	folder:update
project:editor	folder:delete
project:editor	folder:list
project:editor	dataTable:create
project:editor	dataTable:read
project:editor	dataTable:update
project:editor	dataTable:delete
project:editor	dataTable:readRow
project:editor	dataTable:writeRow
project:editor	dataTable:listProject
project:editor	workflow:publish
project:viewer	credential:read
project:viewer	credential:list
project:viewer	project:read
project:viewer	project:list
project:viewer	projectVariable:read
project:viewer	projectVariable:list
project:viewer	workflow:execute-chat
project:viewer	workflow:read
project:viewer	workflow:list
project:viewer	folder:read
project:viewer	folder:list
project:viewer	dataTable:read
project:viewer	dataTable:readRow
project:viewer	dataTable:listProject
project:chatUser	workflow:execute-chat
credential:owner	credential:unshare
credential:owner	credential:share
credential:owner	credential:move
credential:owner	credential:read
credential:owner	credential:update
credential:owner	credential:delete
credential:user	credential:read
workflow:owner	workflow:unpublish
workflow:owner	workflow:unshare
workflow:owner	workflow:share
workflow:owner	workflow:execute
workflow:owner	workflow:execute-chat
workflow:owner	workflow:move
workflow:owner	workflow:read
workflow:owner	workflow:update
workflow:owner	workflow:delete
workflow:owner	workflow:publish
workflow:editor	workflow:unpublish
workflow:editor	workflow:execute
workflow:editor	workflow:execute-chat
workflow:editor	workflow:read
workflow:editor	workflow:update
workflow:editor	workflow:publish
secretsProviderConnection:owner	externalSecretsProvider:sync
secretsProviderConnection:owner	externalSecretsProvider:read
secretsProviderConnection:owner	externalSecretsProvider:update
secretsProviderConnection:owner	externalSecretsProvider:delete
secretsProviderConnection:owner	externalSecretsProvider:list
secretsProviderConnection:owner	externalSecret:list
secretsProviderConnection:user	externalSecretsProvider:read
secretsProviderConnection:user	externalSecretsProvider:list
secretsProviderConnection:user	externalSecret:list
global:owner	dataTable:readColumn
global:owner	dataTable:writeColumn
global:owner	encryptionKey:manage
global:admin	dataTable:readColumn
global:admin	dataTable:writeColumn
global:admin	encryptionKey:manage
project:admin	dataTable:readColumn
project:admin	dataTable:writeColumn
project:personalOwner	dataTable:readColumn
project:personalOwner	dataTable:writeColumn
project:editor	dataTable:readColumn
project:editor	dataTable:writeColumn
project:viewer	dataTable:readColumn
\.


--
-- Data for Name: scope; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.scope (slug, "displayName", description) FROM stdin;
workflow:unpublish	Unpublish Workflow	Allows unpublishing workflows.
workflow:unshare	Unshare Workflow	Allows removing workflow shares.
credential:unshare	Unshare Credential	Allows removing credential shares.
aiAssistant:manage	Manage AI Usage	Allows managing AI Usage settings.
aiAssistant:*	aiAssistant:*	\N
annotationTag:create	Create Annotation Tag	Allows creating new annotation tags.
annotationTag:read	annotationTag:read	\N
annotationTag:update	annotationTag:update	\N
annotationTag:delete	annotationTag:delete	\N
annotationTag:list	annotationTag:list	\N
annotationTag:*	annotationTag:*	\N
auditLogs:manage	auditLogs:manage	\N
auditLogs:*	auditLogs:*	\N
banner:dismiss	banner:dismiss	\N
banner:*	banner:*	\N
community:register	community:register	\N
community:*	community:*	\N
communityPackage:install	communityPackage:install	\N
communityPackage:uninstall	communityPackage:uninstall	\N
communityPackage:update	communityPackage:update	\N
communityPackage:list	communityPackage:list	\N
communityPackage:manage	communityPackage:manage	\N
communityPackage:*	communityPackage:*	\N
credential:share	credential:share	\N
credential:shareGlobally	credential:shareGlobally	\N
credential:move	credential:move	\N
credential:create	credential:create	\N
credential:read	credential:read	\N
credential:update	credential:update	\N
credential:delete	credential:delete	\N
credential:list	credential:list	\N
credential:*	credential:*	\N
externalSecretsProvider:sync	externalSecretsProvider:sync	\N
externalSecretsProvider:create	externalSecretsProvider:create	\N
externalSecretsProvider:read	externalSecretsProvider:read	\N
externalSecretsProvider:update	externalSecretsProvider:update	\N
externalSecretsProvider:delete	externalSecretsProvider:delete	\N
externalSecretsProvider:list	externalSecretsProvider:list	\N
externalSecretsProvider:*	externalSecretsProvider:*	\N
externalSecret:list	externalSecret:list	\N
externalSecret:*	externalSecret:*	\N
eventBusDestination:test	eventBusDestination:test	\N
eventBusDestination:create	eventBusDestination:create	\N
eventBusDestination:read	eventBusDestination:read	\N
eventBusDestination:update	eventBusDestination:update	\N
eventBusDestination:delete	eventBusDestination:delete	\N
eventBusDestination:list	eventBusDestination:list	\N
eventBusDestination:*	eventBusDestination:*	\N
ldap:sync	ldap:sync	\N
ldap:manage	ldap:manage	\N
ldap:*	ldap:*	\N
license:manage	license:manage	\N
license:*	license:*	\N
logStreaming:manage	logStreaming:manage	\N
logStreaming:*	logStreaming:*	\N
orchestration:read	orchestration:read	\N
orchestration:list	orchestration:list	\N
orchestration:*	orchestration:*	\N
project:create	project:create	\N
project:read	project:read	\N
project:update	project:update	\N
project:delete	project:delete	\N
project:list	project:list	\N
project:*	project:*	\N
saml:manage	saml:manage	\N
saml:*	saml:*	\N
securityAudit:generate	securityAudit:generate	\N
securityAudit:*	securityAudit:*	\N
securitySettings:manage	securitySettings:manage	\N
securitySettings:*	securitySettings:*	\N
sourceControl:pull	sourceControl:pull	\N
sourceControl:push	sourceControl:push	\N
sourceControl:manage	sourceControl:manage	\N
sourceControl:*	sourceControl:*	\N
tag:create	tag:create	\N
tag:read	tag:read	\N
tag:update	tag:update	\N
tag:delete	tag:delete	\N
tag:list	tag:list	\N
tag:*	tag:*	\N
user:resetPassword	user:resetPassword	\N
user:changeRole	user:changeRole	\N
user:enforceMfa	user:enforceMfa	\N
user:generateInviteLink	user:generateInviteLink	\N
user:create	user:create	\N
user:read	user:read	\N
user:update	user:update	\N
user:delete	user:delete	\N
user:list	user:list	\N
user:*	user:*	\N
variable:create	variable:create	\N
variable:read	variable:read	\N
variable:update	variable:update	\N
variable:delete	variable:delete	\N
variable:list	variable:list	\N
variable:*	variable:*	\N
projectVariable:create	projectVariable:create	\N
projectVariable:read	projectVariable:read	\N
projectVariable:update	projectVariable:update	\N
projectVariable:delete	projectVariable:delete	\N
projectVariable:list	projectVariable:list	\N
projectVariable:*	projectVariable:*	\N
workersView:manage	workersView:manage	\N
workersView:*	workersView:*	\N
workflow:share	workflow:share	\N
workflow:execute	workflow:execute	\N
workflow:execute-chat	workflow:execute-chat	\N
workflow:move	workflow:move	\N
workflow:activate	workflow:activate	\N
workflow:deactivate	workflow:deactivate	\N
workflow:updateRedactionSetting	workflow:updateRedactionSetting	\N
workflow:create	workflow:create	\N
workflow:read	workflow:read	\N
workflow:update	workflow:update	\N
workflow:delete	workflow:delete	\N
workflow:list	workflow:list	\N
workflow:*	workflow:*	\N
folder:create	folder:create	\N
folder:read	folder:read	\N
folder:update	folder:update	\N
folder:delete	folder:delete	\N
folder:list	folder:list	\N
folder:move	folder:move	\N
folder:*	folder:*	\N
insights:list	insights:list	\N
insights:read	Read Insights	Allows reading insights data.
insights:*	insights:*	\N
oidc:manage	oidc:manage	\N
oidc:*	oidc:*	\N
provisioning:manage	provisioning:manage	\N
provisioning:*	provisioning:*	\N
dataTable:create	dataTable:create	\N
dataTable:read	dataTable:read	\N
dataTable:update	dataTable:update	\N
dataTable:delete	dataTable:delete	\N
dataTable:list	dataTable:list	\N
dataTable:readRow	dataTable:readRow	\N
dataTable:writeRow	dataTable:writeRow	\N
dataTable:listProject	dataTable:listProject	\N
dataTable:*	dataTable:*	\N
execution:delete	execution:delete	\N
execution:read	execution:read	\N
execution:retry	execution:retry	\N
execution:list	execution:list	\N
execution:get	execution:get	\N
execution:reveal	execution:reveal	\N
execution:*	execution:*	\N
workflowTags:update	workflowTags:update	\N
workflowTags:list	workflowTags:list	\N
workflowTags:*	workflowTags:*	\N
role:manage	role:manage	\N
role:*	role:*	\N
mcp:manage	mcp:manage	\N
mcp:oauth	mcp:oauth	\N
mcp:*	mcp:*	\N
mcpApiKey:create	mcpApiKey:create	\N
mcpApiKey:rotate	mcpApiKey:rotate	\N
mcpApiKey:*	mcpApiKey:*	\N
chatHub:manage	chatHub:manage	\N
chatHub:message	chatHub:message	\N
chatHub:*	chatHub:*	\N
chatHubAgent:create	chatHubAgent:create	\N
chatHubAgent:read	chatHubAgent:read	\N
chatHubAgent:update	chatHubAgent:update	\N
chatHubAgent:delete	chatHubAgent:delete	\N
chatHubAgent:list	chatHubAgent:list	\N
chatHubAgent:*	chatHubAgent:*	\N
breakingChanges:list	breakingChanges:list	\N
breakingChanges:*	breakingChanges:*	\N
apiKey:manage	apiKey:manage	\N
apiKey:*	apiKey:*	\N
credentialResolver:create	credentialResolver:create	\N
credentialResolver:read	credentialResolver:read	\N
credentialResolver:update	credentialResolver:update	\N
credentialResolver:delete	credentialResolver:delete	\N
credentialResolver:list	credentialResolver:list	\N
credentialResolver:*	credentialResolver:*	\N
instanceAi:message	instanceAi:message	\N
instanceAi:manage	instanceAi:manage	\N
instanceAi:gateway	instanceAi:gateway	\N
instanceAi:*	instanceAi:*	\N
roleMappingRule:create	roleMappingRule:create	\N
roleMappingRule:read	roleMappingRule:read	\N
roleMappingRule:update	roleMappingRule:update	\N
roleMappingRule:delete	roleMappingRule:delete	\N
roleMappingRule:list	roleMappingRule:list	\N
roleMappingRule:*	roleMappingRule:*	\N
*	*	\N
workflow:publish	Publish Workflow	Allows publishing workflows.
dataTable:readColumn	dataTable:readColumn	\N
dataTable:writeColumn	dataTable:writeColumn	\N
encryptionKey:manage	Manage Encryption Keys	Allows listing and rotating instance encryption keys.
encryptionKey:*	encryptionKey:*	\N
\.


--
-- Data for Name: secrets_provider_connection; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.secrets_provider_connection (id, "providerKey", type, "encryptedSettings", "isEnabled", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.settings (key, value, "loadOnStartup") FROM stdin;
ui.banners.dismissed	["V1"]	t
features.ldap	{"loginEnabled":false,"loginLabel":"","connectionUrl":"","allowUnauthorizedCerts":false,"connectionSecurity":"none","connectionPort":389,"baseDn":"","bindingAdminDn":"","bindingAdminPassword":"","firstNameAttribute":"","lastNameAttribute":"","emailAttribute":"","loginIdAttribute":"","ldapIdAttribute":"","userFilter":"","synchronizationEnabled":false,"synchronizationInterval":60,"searchPageSize":0,"searchTimeout":60,"enforceEmailUniqueness":true}	t
userManagement.isInstanceOwnerSetUp	true	t
mcp.access.enabled	true	t
\.


--
-- Data for Name: shared_credentials; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.shared_credentials ("credentialsId", "projectId", role, "createdAt", "updatedAt") FROM stdin;
wvOyfq9b69sMEzrF	jiaWx4AaJK5LGZ9r	credential:owner	2026-04-27 02:20:53.88+00	2026-04-27 02:20:53.88+00
\.


--
-- Data for Name: shared_workflow; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.shared_workflow ("workflowId", "projectId", role, "createdAt", "updatedAt") FROM stdin;
73g6uVf9fIsNHKV9	jiaWx4AaJK5LGZ9r	workflow:owner	2026-04-26 12:28:42.028+00	2026-04-26 12:28:42.028+00
QNTIAKk6qx8pAGZE	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-06 14:48:58.802+00	2026-05-06 14:48:58.802+00
15imVcRcLvE2JxXO	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-15 06:13:17.546+00	2026-05-15 06:13:17.546+00
7gJaxias01SkCSFx	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 14:31:40.437+00	2026-05-16 14:31:40.437+00
WvOx9QFZmgSikJRz	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 14:37:10.172+00	2026-05-16 14:37:10.172+00
RBfR8UYpm79FamiQ	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 18:04:07.778+00	2026-05-16 18:04:07.778+00
ipjgKLDCFpzCbm9M	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 18:27:08.437+00	2026-05-16 18:27:08.437+00
UdQ7aw5SKAjlHolO	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 18:38:24.187+00	2026-05-16 18:38:24.187+00
eSKU0aanf9NHfmPh	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 18:54:19.394+00	2026-05-16 18:54:19.394+00
y3yvu3BjJbzA5qvp	jiaWx4AaJK5LGZ9r	workflow:owner	2026-05-16 19:50:26.222+00	2026-05-16 19:50:26.222+00
\.


--
-- Data for Name: tag_entity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.tag_entity (name, "createdAt", "updatedAt", id) FROM stdin;
\.


--
-- Data for Name: test_case_execution; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.test_case_execution (id, "testRunId", "executionId", status, "runAt", "completedAt", "errorCode", "errorDetails", metrics, "createdAt", "updatedAt", inputs, outputs) FROM stdin;
\.


--
-- Data for Name: test_run; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.test_run (id, "workflowId", status, "errorCode", "errorDetails", "runAt", "completedAt", metrics, "createdAt", "updatedAt", "runningInstanceId", "cancelRequested") FROM stdin;
\.


--
-- Data for Name: token_exchange_jti; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.token_exchange_jti (jti, "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: trusted_key; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.trusted_key ("sourceId", kid, data, "createdAt") FROM stdin;
\.


--
-- Data for Name: trusted_key_source; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.trusted_key_source (id, type, config, status, "lastError", "lastRefreshedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public."user" (id, email, "firstName", "lastName", password, "personalizationAnswers", "createdAt", "updatedAt", settings, disabled, "mfaEnabled", "mfaSecret", "mfaRecoveryCodes", "lastActiveAt", "roleSlug") FROM stdin;
8274b19f-2f1f-4df7-be3d-d02d67d238d1	spedalettileonardo@gmail.com	Leonardo	Spedaletti	$2a$10$nnYuELtnFkYJTIerkGZ0qORREd3HhdMMIc4xq02iMAGRwugnQDN52	\N	2026-04-26 02:49:55.175+00	2026-05-16 19:00:18.94+00	{"userActivated":false,"easyAIWorkflowOnboarded":true}	f	f	\N	\N	2026-05-16	global:owner
\.


--
-- Data for Name: user_api_keys; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.user_api_keys (id, "userId", label, "apiKey", "createdAt", "updatedAt", scopes, audience) FROM stdin;
MYDS2VKA202Bfdox	8274b19f-2f1f-4df7-be3d-d02d67d238d1	hermes	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Mjc0YjE5Zi0yZjFmLTRkZjctYmUzZC1kMDJkNjdkMjM4ZDEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODUyZTk1Y2ItYWEwOS00MzY4LWIyNzYtNDhlYjViZTNiODJjIiwiaWF0IjoxNzc4ODI0MDk4fQ.jEJZa_B0nSr64ABavT7ZnKipUOTIqebWNp8FwkiMP6w	2026-05-15 05:48:18.859+00	2026-05-15 05:48:18.859+00	["communityPackage:install","communityPackage:uninstall","communityPackage:update","communityPackage:list","credential:move","credential:create","credential:read","credential:update","credential:delete","credential:list","project:create","project:update","project:delete","project:list","securityAudit:generate","sourceControl:pull","tag:create","tag:read","tag:update","tag:delete","tag:list","user:changeRole","user:enforceMfa","user:create","user:read","user:delete","user:list","variable:create","variable:update","variable:delete","variable:list","workflow:move","workflow:create","workflow:read","workflow:update","workflow:delete","workflow:list","folder:create","folder:read","folder:update","folder:delete","folder:list","insights:read","dataTable:create","dataTable:read","dataTable:update","dataTable:delete","dataTable:list","workflowTags:update","workflowTags:list","executionTags:update","executionTags:list","workflow:activate","workflow:deactivate","execution:delete","execution:read","execution:retry","execution:stop","execution:list","dataTableRow:create","dataTableRow:read","dataTableRow:update","dataTableRow:delete","dataTableRow:upsert","dataTableColumn:create","dataTableColumn:read","dataTableColumn:update","dataTableColumn:delete"]	public-api
X6YmNLcLoQrMpziU	8274b19f-2f1f-4df7-be3d-d02d67d238d1	Aiden	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Mjc0YjE5Zi0yZjFmLTRkZjctYmUzZC1kMDJkNjdkMjM4ZDEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjE2NDBmZTktNmFmMy00OWY5LTliMTktYjBiY2NhOTA3NjcwIiwiaWF0IjoxNzc4OTQxMjAyfQ.cdkX55M13EGsaiFzjoeLboblmDnYtIIXhOeyl0WCUpg	2026-05-16 14:20:02.632+00	2026-05-16 14:20:02.632+00	["communityPackage:install","communityPackage:uninstall","communityPackage:update","communityPackage:list","credential:move","credential:create","credential:read","credential:update","credential:delete","credential:list","project:create","project:update","project:delete","project:list","securityAudit:generate","sourceControl:pull","tag:create","tag:read","tag:update","tag:delete","tag:list","user:changeRole","user:enforceMfa","user:create","user:read","user:delete","user:list","variable:create","variable:update","variable:delete","variable:list","workflow:move","workflow:create","workflow:read","workflow:update","workflow:delete","workflow:list","folder:create","folder:read","folder:update","folder:delete","folder:list","insights:read","dataTable:create","dataTable:read","dataTable:update","dataTable:delete","dataTable:list","workflowTags:update","workflowTags:list","executionTags:update","executionTags:list","workflow:activate","workflow:deactivate","execution:delete","execution:read","execution:retry","execution:stop","execution:list","dataTableRow:create","dataTableRow:read","dataTableRow:update","dataTableRow:delete","dataTableRow:upsert","dataTableColumn:create","dataTableColumn:read","dataTableColumn:update","dataTableColumn:delete"]	public-api
\.


--
-- Data for Name: user_favorites; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.user_favorites (id, "userId", "resourceId", "resourceType") FROM stdin;
\.


--
-- Data for Name: variables; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.variables (key, type, value, id, "projectId") FROM stdin;
\.


--
-- Data for Name: webhook_entity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.webhook_entity ("webhookPath", method, node, "webhookId", "pathLength", "workflowId") FROM stdin;
\.


--
-- Data for Name: workflow_builder_session; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_builder_session (id, "workflowId", "userId", messages, "previousSummary", "createdAt", "updatedAt", "activeVersionCardId", "resumeAfterRestoreMessageId") FROM stdin;
\.


--
-- Data for Name: workflow_dependency; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_dependency (id, "workflowId", "workflowVersionId", "dependencyType", "dependencyKey", "dependencyInfo", "indexVersionId", "createdAt", "publishedVersionId") FROM stdin;
591	y3yvu3BjJbzA5qvp	1	nodeType	n8n-nodes-base.set	{"nodeId":"b53dc985-dc97-4e77-ac22-f90a1c58035b","nodeVersion":3.4}	1	2026-05-16 19:50:26.24+00	\N
592	y3yvu3BjJbzA5qvp	1	nodeType	n8n-nodes-base.postgres	{"nodeId":"a933531e-c9ca-43a3-a6d4-467f835da537","nodeVersion":2.5}	1	2026-05-16 19:50:26.24+00	\N
694	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.webhook	{"nodeId":"912d0143-fc59-432a-ba03-3472f570a329","nodeVersion":2}	1	2026-05-16 22:11:54.391+00	\N
695	WvOx9QFZmgSikJRz	5	webhookPath	turno-solicitar	{"nodeId":"912d0143-fc59-432a-ba03-3472f570a329","nodeVersion":2}	1	2026-05-16 22:11:54.391+00	\N
696	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.if	{"nodeId":"016b1333-6da4-42af-bf42-71c47d4f3736","nodeVersion":2.3}	1	2026-05-16 22:11:54.391+00	\N
697	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.set	{"nodeId":"7354b08e-e899-4e78-b2c7-9a6e644e9521","nodeVersion":3.4}	1	2026-05-16 22:11:54.391+00	\N
698	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"2755dcaa-0a00-4799-98f0-8cb1bd006c31","nodeVersion":4.2}	1	2026-05-16 22:11:54.391+00	\N
699	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.code	{"nodeId":"92b8ce9a-a912-424a-95e9-08c550cea87e","nodeVersion":2}	1	2026-05-16 22:11:54.391+00	\N
611	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.emailReadImap	{"nodeId":"509f8bec-e5a3-4576-9f15-84e638944cb1","nodeVersion":2}	1	2026-05-16 19:57:57.518+00	\N
612	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.set	{"nodeId":"e24233d4-0306-4559-88d2-336babdcedb1","nodeVersion":3.4}	1	2026-05-16 19:57:57.518+00	\N
613	ipjgKLDCFpzCbm9M	3	nodeType	@n8n/n8n-nodes-langchain.lmChatOllama	{"nodeId":"10f73961-44dd-43a0-843d-86f1d060a0c3","nodeVersion":1}	1	2026-05-16 19:57:57.518+00	\N
614	ipjgKLDCFpzCbm9M	3	nodeType	@n8n/n8n-nodes-langchain.agent	{"nodeId":"220e1640-1c86-4f7b-badd-cafca4fb1435","nodeVersion":1}	1	2026-05-16 19:57:57.518+00	\N
615	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.set	{"nodeId":"49a9c9b5-3e32-4070-94ea-ffac08958ad2","nodeVersion":3.4}	1	2026-05-16 19:57:57.518+00	\N
616	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.code	{"nodeId":"28298ad0-ede5-49c0-becd-eb9e727646f9","nodeVersion":2}	1	2026-05-16 19:57:57.518+00	\N
617	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.switch	{"nodeId":"0f91e447-ce25-47ce-a18c-ceb10c8ef64f","nodeVersion":2.3}	1	2026-05-16 19:57:57.518+00	\N
618	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"a1531860-20b7-4887-a7ab-22ab8db80c41","nodeVersion":4.2}	1	2026-05-16 19:57:57.518+00	\N
272	73g6uVf9fIsNHKV9	57	nodeType	n8n-nodes-base.if	{"nodeId":"825b03c6-ee5a-4c30-8f04-712912aeb0fe","nodeVersion":2.3}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
273	73g6uVf9fIsNHKV9	57	nodeType	@n8n/n8n-nodes-langchain.chainLlm	{"nodeId":"8e1a9904-d737-4754-9ab0-be66a0bb4bdb","nodeVersion":1.9}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
274	73g6uVf9fIsNHKV9	57	nodeType	@n8n/n8n-nodes-langchain.lmChatOllama	{"nodeId":"a59f12e1-c4c1-4501-bd4e-0a4e0755b720","nodeVersion":1}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
275	73g6uVf9fIsNHKV9	57	credentialId	wvOyfq9b69sMEzrF	{"nodeId":"a59f12e1-c4c1-4501-bd4e-0a4e0755b720","nodeVersion":1}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
619	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.emailSend	{"nodeId":"cc543fe0-58b8-4269-aa5f-ac8b24a4f091","nodeVersion":2}	1	2026-05-16 19:57:57.518+00	\N
620	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.emailSend	{"nodeId":"cbf340e8-a000-495d-8a58-84f960e13ce1","nodeVersion":2}	1	2026-05-16 19:57:57.518+00	\N
621	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.postgres	{"nodeId":"572bc884-76b6-4bf7-ba0f-f9e830d5d1bb","nodeVersion":2.5}	1	2026-05-16 19:57:57.518+00	\N
622	ipjgKLDCFpzCbm9M	3	nodeType	n8n-nodes-base.postgres	{"nodeId":"08bbe21c-9301-4506-b87e-acae0ff5106f","nodeVersion":2.5}	1	2026-05-16 19:57:57.518+00	\N
700	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.postgres	{"nodeId":"bbc7ac64-bc64-4494-a6b9-d6528532a8ea","nodeVersion":2.5}	1	2026-05-16 22:11:54.391+00	\N
701	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.if	{"nodeId":"d5d390d7-b43a-45bb-8f83-4217aa81bcd2","nodeVersion":2.3}	1	2026-05-16 22:11:54.391+00	\N
702	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.code	{"nodeId":"7db9b028-34b4-449a-a1bb-ecbf820633a8","nodeVersion":2}	1	2026-05-16 22:11:54.391+00	\N
703	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"b98d4549-9e48-40e4-a460-a666d362f05a","nodeVersion":4.2}	1	2026-05-16 22:11:54.391+00	\N
276	73g6uVf9fIsNHKV9	57	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"17d87334-2720-45ef-9f7a-df135d29bd5b","nodeVersion":4.4}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
277	73g6uVf9fIsNHKV9	57	nodeType	n8n-nodes-base.webhook	{"nodeId":"9e2ccd58-5264-4672-86a8-8beb029f8262","nodeVersion":2.1}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
278	73g6uVf9fIsNHKV9	57	webhookPath	whatsapp	{"nodeId":"9e2ccd58-5264-4672-86a8-8beb029f8262","nodeVersion":2.1}	1	2026-04-30 14:51:49.449+00	d317c47d-910a-4974-9c32-9a3244e49ce0
641	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.webhook	{"nodeId":"6c50c483-bde2-4138-8276-80bee4fe008c","nodeVersion":2}	1	2026-05-16 20:19:41.245+00	\N
642	7gJaxias01SkCSFx	8	webhookPath	consultorio-inbound	{"nodeId":"6c50c483-bde2-4138-8276-80bee4fe008c","nodeVersion":2}	1	2026-05-16 20:19:41.245+00	\N
643	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.if	{"nodeId":"f45fc35e-2355-4097-9659-0d98453c27f0","nodeVersion":2.3}	1	2026-05-16 20:19:41.245+00	\N
644	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.set	{"nodeId":"a051e40d-7aa6-41bc-8f82-61ede9131fd4","nodeVersion":3.4}	1	2026-05-16 20:19:41.245+00	\N
645	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.postgres	{"nodeId":"16cc9f48-a489-40f6-ad46-e9c42a192374","nodeVersion":2.5}	1	2026-05-16 20:19:41.245+00	\N
646	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.postgres	{"nodeId":"90878f2a-2ecf-4301-8786-dbfb394140c8","nodeVersion":2.5}	1	2026-05-16 20:19:41.245+00	\N
647	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.postgres	{"nodeId":"a43b86f9-a3e7-4951-a6a7-aaf4b7ab402d","nodeVersion":2.5}	1	2026-05-16 20:19:41.245+00	\N
648	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.code	{"nodeId":"a5dd5658-5939-4927-aa42-0e96f2842c17","nodeVersion":2}	1	2026-05-16 20:19:41.245+00	\N
649	7gJaxias01SkCSFx	8	nodeType	@n8n/n8n-nodes-langchain.lmChatOllama	{"nodeId":"e702d643-5200-4c2d-9163-c0dd19f45370","nodeVersion":1}	1	2026-05-16 20:19:41.245+00	\N
650	7gJaxias01SkCSFx	8	credentialId	wvOyfq9b69sMEzrF	{"nodeId":"e702d643-5200-4c2d-9163-c0dd19f45370","nodeVersion":1}	1	2026-05-16 20:19:41.245+00	\N
651	7gJaxias01SkCSFx	8	nodeType	@n8n/n8n-nodes-langchain.memoryPostgres	{"nodeId":"0c5b8f73-ccef-4abd-ac23-f3df3e42d301","nodeVersion":1}	1	2026-05-16 20:19:41.245+00	\N
652	7gJaxias01SkCSFx	8	nodeType	@n8n/n8n-nodes-langchain.agent	{"nodeId":"d51f7ed9-b335-4fcb-978a-6ff4341c933f","nodeVersion":1}	1	2026-05-16 20:19:41.245+00	\N
653	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.set	{"nodeId":"73cf9f80-8381-4ff4-a251-58be074bd9a1","nodeVersion":3.4}	1	2026-05-16 20:19:41.245+00	\N
654	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.code	{"nodeId":"0fea1e78-2ad3-4d5d-806a-66620f5fda51","nodeVersion":2}	1	2026-05-16 20:19:41.245+00	\N
655	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"a1799298-422a-4e39-929b-42bad17dc9cb","nodeVersion":4.2}	1	2026-05-16 20:19:41.245+00	\N
656	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.if	{"nodeId":"b51ee8a3-5f86-4929-a360-8b6b4f1b2aed","nodeVersion":2.3}	1	2026-05-16 20:19:41.245+00	\N
657	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.postgres	{"nodeId":"25920fb0-9a17-4d7e-bc0d-89881f68109d","nodeVersion":2.5}	1	2026-05-16 20:19:41.245+00	\N
658	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.postgres	{"nodeId":"ec27e244-1431-46d1-92a2-88c0dc917dfc","nodeVersion":2.5}	1	2026-05-16 20:19:41.245+00	\N
659	7gJaxias01SkCSFx	8	nodeType	n8n-nodes-base.postgres	{"nodeId":"99bcdeeb-2244-4f4e-8c25-b382c9b12225","nodeVersion":2.5}	1	2026-05-16 20:19:41.245+00	\N
704	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.set	{"nodeId":"cf89c6f0-a042-48d9-b22e-bdda3d46a120","nodeVersion":3.4}	1	2026-05-16 22:11:54.391+00	\N
705	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.postgres	{"nodeId":"b47291b5-14e4-49c0-bb68-b7d50e3764d0","nodeVersion":2.5}	1	2026-05-16 22:11:54.391+00	\N
706	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"10241f80-35b8-46f4-89c7-b73c41d117ce","nodeVersion":4.2}	1	2026-05-16 22:11:54.391+00	\N
707	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"41de74d9-a8ef-40e4-b877-012f587b7308","nodeVersion":4.2}	1	2026-05-16 22:11:54.391+00	\N
708	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.set	{"nodeId":"89efa512-ca65-4fbd-be72-c55816dde435","nodeVersion":3.4}	1	2026-05-16 22:11:54.391+00	\N
709	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"19c4cd53-d70c-40a6-b7d3-f6a883379227","nodeVersion":4.2}	1	2026-05-16 22:11:54.391+00	\N
710	WvOx9QFZmgSikJRz	5	nodeType	n8n-nodes-base.postgres	{"nodeId":"78ef180f-a702-4148-8015-7d6496b3a70c","nodeVersion":2.5}	1	2026-05-16 22:11:54.391+00	\N
452	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.webhook	{"nodeId":"2ef1c403-c3b4-4524-9a5b-01d71102f775","nodeVersion":2}	1	2026-05-16 19:00:07.89+00	\N
453	QNTIAKk6qx8pAGZE	3	webhookPath	whatsapp-aicorebots	{"nodeId":"2ef1c403-c3b4-4524-9a5b-01d71102f775","nodeVersion":2}	1	2026-05-16 19:00:07.89+00	\N
454	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.filter	{"nodeId":"0c0b796d-1727-4072-a0da-40516360b91a","nodeVersion":2}	1	2026-05-16 19:00:07.89+00	\N
455	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.set	{"nodeId":"80e8d084-5d2b-4cda-97a5-5af65a0f3b35","nodeVersion":3.4}	1	2026-05-16 19:00:07.89+00	\N
456	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.postgres	{"nodeId":"9f501870-6a68-45ad-814d-abb11e3b4462","nodeVersion":2.5}	1	2026-05-16 19:00:07.89+00	\N
457	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.code	{"nodeId":"bc43548a-9d4f-4669-8086-d2aabcb2569a","nodeVersion":2}	1	2026-05-16 19:00:07.89+00	\N
458	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"cc00385c-f1a5-4d93-a634-07ddde054e99","nodeVersion":4.2}	1	2026-05-16 19:00:07.89+00	\N
459	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.set	{"nodeId":"6f7bec51-849e-4dbc-9a54-fcd94e89d656","nodeVersion":3.4}	1	2026-05-16 19:00:07.89+00	\N
460	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.postgres	{"nodeId":"078be783-d67f-431c-895d-348b9de358b7","nodeVersion":2.5}	1	2026-05-16 19:00:07.89+00	\N
461	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"b8b70d2e-09ae-4e6d-b48a-705da8588818","nodeVersion":4.2}	1	2026-05-16 19:00:07.89+00	\N
462	QNTIAKk6qx8pAGZE	3	nodeType	n8n-nodes-base.respondToWebhook	{"nodeId":"90ef894d-44e6-4698-9600-a5d638241879","nodeVersion":1.1}	1	2026-05-16 19:00:07.89+00	\N
463	73g6uVf9fIsNHKV9	63	nodeType	n8n-nodes-base.if	{"nodeId":"825b03c6-ee5a-4c30-8f04-712912aeb0fe","nodeVersion":2.3}	1	2026-05-16 19:00:07.902+00	\N
464	73g6uVf9fIsNHKV9	63	nodeType	@n8n/n8n-nodes-langchain.chainLlm	{"nodeId":"8e1a9904-d737-4754-9ab0-be66a0bb4bdb","nodeVersion":1.9}	1	2026-05-16 19:00:07.902+00	\N
465	73g6uVf9fIsNHKV9	63	nodeType	@n8n/n8n-nodes-langchain.lmChatOllama	{"nodeId":"a59f12e1-c4c1-4501-bd4e-0a4e0755b720","nodeVersion":1}	1	2026-05-16 19:00:07.902+00	\N
466	73g6uVf9fIsNHKV9	63	credentialId	wvOyfq9b69sMEzrF	{"nodeId":"a59f12e1-c4c1-4501-bd4e-0a4e0755b720","nodeVersion":1}	1	2026-05-16 19:00:07.902+00	\N
467	73g6uVf9fIsNHKV9	63	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"17d87334-2720-45ef-9f7a-df135d29bd5b","nodeVersion":4.4}	1	2026-05-16 19:00:07.902+00	\N
468	73g6uVf9fIsNHKV9	63	nodeType	n8n-nodes-base.webhook	{"nodeId":"9e2ccd58-5264-4672-86a8-8beb029f8262","nodeVersion":2.1}	1	2026-05-16 19:00:07.902+00	\N
469	73g6uVf9fIsNHKV9	63	webhookPath	whatsapp	{"nodeId":"9e2ccd58-5264-4672-86a8-8beb029f8262","nodeVersion":2.1}	1	2026-05-16 19:00:07.902+00	\N
470	15imVcRcLvE2JxXO	2	nodeType	n8n-nodes-base.cron	{"nodeId":"1","nodeVersion":1}	1	2026-05-16 19:00:07.906+00	\N
471	15imVcRcLvE2JxXO	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"2","nodeVersion":4.2}	1	2026-05-16 19:00:07.906+00	\N
511	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.cron	{"nodeId":"2756b9fa-e17f-4508-8768-751649e1793d","nodeVersion":2}	1	2026-05-16 19:22:59.552+00	\N
512	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"ddb5de92-011b-4e1b-84d9-9ff787547c5a","nodeVersion":2.5}	1	2026-05-16 19:22:59.552+00	\N
513	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"464f3f0f-3e79-4c18-9f04-1d3987db811c","nodeVersion":2.5}	1	2026-05-16 19:22:59.552+00	\N
514	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.merge	{"nodeId":"d7e88610-5cfd-4dfe-a596-ba79df6a8957","nodeVersion":2}	1	2026-05-16 19:22:59.552+00	\N
515	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.if	{"nodeId":"9e123e35-dc81-43c0-bec4-f0081198d331","nodeVersion":2.3}	1	2026-05-16 19:22:59.552+00	\N
516	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.switch	{"nodeId":"cf889b44-0e56-46d7-a13c-a0867cf28ff3","nodeVersion":2.3}	1	2026-05-16 19:22:59.552+00	\N
517	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.set	{"nodeId":"735a36bf-a9ba-4d85-9785-63017a38bab6","nodeVersion":3.4}	1	2026-05-16 19:22:59.552+00	\N
518	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"9e2f832b-e845-47f4-8463-5f6c85f03db5","nodeVersion":4.2}	1	2026-05-16 19:22:59.552+00	\N
519	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"e151b39e-3ff7-4d54-a3bf-b5e0c5fe6242","nodeVersion":2.5}	1	2026-05-16 19:22:59.552+00	\N
520	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.set	{"nodeId":"d7cbc407-b42c-437a-8553-9d691f8d1ff7","nodeVersion":3.4}	1	2026-05-16 19:22:59.552+00	\N
521	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"8761f950-f86f-41c2-b936-340d43a9e220","nodeVersion":4.2}	1	2026-05-16 19:22:59.552+00	\N
522	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"d11ca1b7-b530-4021-b726-ca0a28a7b3fe","nodeVersion":2.5}	1	2026-05-16 19:22:59.552+00	\N
523	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.set	{"nodeId":"c0e44ae1-d2f6-48cf-b7f9-417620633156","nodeVersion":3.4}	1	2026-05-16 19:22:59.552+00	\N
524	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"545470f5-4c2a-4856-86bf-799ae3a5f378","nodeVersion":4.2}	1	2026-05-16 19:22:59.552+00	\N
525	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"0331c653-e724-4a90-aa0b-11043049f049","nodeVersion":2.5}	1	2026-05-16 19:22:59.552+00	\N
526	RBfR8UYpm79FamiQ	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"23e42316-a39d-46c5-80c2-ca4ead4ca0f9","nodeVersion":2.5}	1	2026-05-16 19:22:59.552+00	\N
538	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.cron	{"nodeId":"f8ec4b03-007f-45d7-ad63-3423c24be568","nodeVersion":2}	1	2026-05-16 19:23:01.468+00	\N
539	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"4ec794c4-5c8d-4998-8cc0-607fc0c2f48f","nodeVersion":2.5}	1	2026-05-16 19:23:01.468+00	\N
540	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"b0f124f5-4ff0-4ab5-a1fe-715c9957717c","nodeVersion":2.5}	1	2026-05-16 19:23:01.468+00	\N
541	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"e7ea3208-1f9f-414a-a54f-e9601e733082","nodeVersion":2.5}	1	2026-05-16 19:23:01.468+00	\N
542	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"fed5b6f4-bfc2-4e0e-aac9-281c42c98913","nodeVersion":2.5}	1	2026-05-16 19:23:01.468+00	\N
543	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.merge	{"nodeId":"21208b8c-e015-4b0a-8cd5-01bad63a6363","nodeVersion":2}	1	2026-05-16 19:23:01.468+00	\N
544	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.merge	{"nodeId":"587ff113-c99d-4cbb-83cd-f245fe2c70c3","nodeVersion":2}	1	2026-05-16 19:23:01.468+00	\N
545	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.merge	{"nodeId":"91756c1b-ab20-4858-926c-fffa6d74c34f","nodeVersion":2}	1	2026-05-16 19:23:01.468+00	\N
546	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.code	{"nodeId":"88e4a4dc-4bf1-419d-95d1-ecad75c56c71","nodeVersion":2}	1	2026-05-16 19:23:01.468+00	\N
547	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"2fcaf0bd-8fee-430e-b114-a5e5d3f6c965","nodeVersion":4.2}	1	2026-05-16 19:23:01.468+00	\N
548	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.set	{"nodeId":"571f2e1c-f347-4855-8005-9004606bb6a4","nodeVersion":3.4}	1	2026-05-16 19:23:01.468+00	\N
549	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.emailSend	{"nodeId":"6af7851b-b4fa-446b-8a68-15da1d72e334","nodeVersion":2}	1	2026-05-16 19:23:01.468+00	\N
550	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"1e448fd7-bdce-4f27-b0c3-5827d08c2c89","nodeVersion":4.2}	1	2026-05-16 19:23:01.468+00	\N
551	UdQ7aw5SKAjlHolO	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"2f199c35-4a0f-4467-848e-9079625f067a","nodeVersion":2.5}	1	2026-05-16 19:23:01.468+00	\N
552	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.webhook	{"nodeId":"f2a5454f-6c63-45a6-99c1-d37e718e742d","nodeVersion":2}	1	2026-05-16 19:23:02.292+00	\N
553	eSKU0aanf9NHfmPh	2	webhookPath	receta-solicitar	{"nodeId":"f2a5454f-6c63-45a6-99c1-d37e718e742d","nodeVersion":2}	1	2026-05-16 19:23:02.292+00	\N
554	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.set	{"nodeId":"76e7c70d-9fd0-494b-93fc-77f8d2501f86","nodeVersion":3.4}	1	2026-05-16 19:23:02.292+00	\N
555	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"0c0c5547-f243-40ca-9eb4-87dde61393a6","nodeVersion":4.2}	1	2026-05-16 19:23:02.292+00	\N
556	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.code	{"nodeId":"3cab189f-6eca-4e70-bafd-b880f27b0eea","nodeVersion":2}	1	2026-05-16 19:23:02.292+00	\N
557	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.if	{"nodeId":"9ddf7f13-3915-4ec2-b5e5-576e626a7e61","nodeVersion":2.3}	1	2026-05-16 19:23:02.292+00	\N
558	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"a39c0ddf-68b3-4d05-9b41-fd9479ff1645","nodeVersion":2.5}	1	2026-05-16 19:23:02.292+00	\N
559	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"8e2f9a26-8399-4033-b2f7-b91fc89f08e3","nodeVersion":2.5}	1	2026-05-16 19:23:02.292+00	\N
560	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"f671381f-3d10-490f-a617-02dc39f8a73e","nodeVersion":4.2}	1	2026-05-16 19:23:02.292+00	\N
561	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"89042b3c-5a2a-433b-aa0b-a99fbf3735fb","nodeVersion":4.2}	1	2026-05-16 19:23:02.292+00	\N
562	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.httpRequest	{"nodeId":"f809acea-fef7-4eda-b3d6-836419b54445","nodeVersion":4.2}	1	2026-05-16 19:23:02.292+00	\N
563	eSKU0aanf9NHfmPh	2	nodeType	n8n-nodes-base.postgres	{"nodeId":"d7e2d176-847e-4cff-b527-c0b87d91efb2","nodeVersion":2.5}	1	2026-05-16 19:23:02.292+00	\N
\.


--
-- Data for Name: workflow_entity; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_entity (name, active, nodes, connections, "createdAt", "updatedAt", settings, "staticData", "pinData", "versionId", "triggerCount", id, meta, "parentFolderId", "isArchived", "versionCounter", description, "activeVersionId") FROM stdin;
05 - Resumen Diario del Medico	f	[{"name":"Cron - 7:00 AM","type":"n8n-nodes-base.cron","typeVersion":2,"position":[0,300],"parameters":{"triggerTimes":{"item":[{"mode":"everyDay","hour":7,"minute":0}]}},"id":"f8ec4b03-007f-45d7-ad63-3423c24be568"},{"name":"PG - Turnos de Hoy","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,100],"parameters":{"operation":"executeQuery","query":"SELECT t.fecha_hora, t.estado, t.motivo, t.tipo_consulta, p.nombre || ' ' || p.apellido as paciente_nombre, p.telefono as paciente_telefono, p.obra_social, 'turnos' as fuente FROM turnos t JOIN pacientes p ON p.id = t.paciente_id WHERE DATE(t.fecha_hora AT TIME ZONE 'America/Argentina/Buenos_Aires') = CURRENT_DATE AND t.medico_id = $1 ORDER BY t.fecha_hora;","additionalFields":{"queryParams":"={{ ['00000000-0000-0000-0000-000000000001'] }}"},"options":{}},"id":"4ec794c4-5c8d-4998-8cc0-607fc0c2f48f"},{"name":"PG - Pacientes Nuevos (24h)","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,300],"parameters":{"operation":"executeQuery","query":"SELECT nombre, apellido, telefono, obra_social, created_at, 'nuevos' as fuente FROM pacientes WHERE created_at >= NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;","options":{}},"id":"b0f124f5-4ff0-4ab5-a1fe-715c9957717c"},{"name":"PG - Mensajes sin Responder","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,500],"parameters":{"operation":"executeQuery","query":"SELECT c.id, p.nombre || ' ' || p.apellido as paciente, c.ultimo_mensaje, c.ultima_intencion, c.ultima_interaccion, 'mensajes' as fuente FROM conversaciones c JOIN pacientes p ON p.id = c.paciente_id WHERE c.estado = 'activa' AND c.ultima_interaccion < NOW() - INTERVAL '1 hour' ORDER BY c.ultima_interaccion DESC;","options":{}},"id":"e7ea3208-1f9f-414a-a54f-e9601e733082"},{"name":"PG - Recetas x Autorizar","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,700],"parameters":{"operation":"executeQuery","query":"SELECT r.medicamento, r.dosis, r.frecuencia, p.nombre || ' ' || p.apellido as paciente_nombre, r.created_at, 'recetas' as fuente FROM recetas r JOIN pacientes p ON p.id = r.paciente_id WHERE r.estado = 'activa' AND r.created_at >= NOW() - INTERVAL '48 hours' ORDER BY r.created_at DESC;","options":{}},"id":"fed5b6f4-bfc2-4e0e-aac9-281c42c98913"},{"name":"Merge 1 (Turnos+Nuevos)","type":"n8n-nodes-base.merge","typeVersion":2,"position":[500,200],"parameters":{"mode":"append"},"id":"21208b8c-e015-4b0a-8cd5-01bad63a6363"},{"name":"Merge 2 (+Mensajes)","type":"n8n-nodes-base.merge","typeVersion":2,"position":[750,250],"parameters":{"mode":"append"},"id":"587ff113-c99d-4cbb-83cd-f245fe2c70c3"},{"name":"Merge 3 (+Recetas)","type":"n8n-nodes-base.merge","typeVersion":2,"position":[1000,300],"parameters":{"mode":"append"},"id":"91756c1b-ab20-4858-926c-fffa6d74c34f"},{"name":"Consolidar Datos","type":"n8n-nodes-base.code","typeVersion":2,"position":[1250,300],"parameters":{"jsCode":"const allItems = $input.all();\\n\\nconst result = {\\n  turnos: [],\\n  nuevos: [],\\n  pendientes: [],\\n  recetas: []\\n};\\n\\nfor (const item of allItems) {\\n  const fuente = item.json.fuente;\\n  if (fuente === 'turnos') result.turnos.push(item.json);\\n  else if (fuente === 'nuevos') result.nuevos.push(item.json);\\n  else if (fuente === 'mensajes') result.pendientes.push(item.json);\\n  else if (fuente === 'recetas') result.recetas.push(item.json);\\n}\\n\\nreturn [{\\n  json: {\\n    turnos: result.turnos,\\n    nuevos: result.nuevos,\\n    pendientes: result.pendientes,\\n    recetas: result.recetas,\\n    totalTurnos: result.turnos.length,\\n    totalNuevos: result.nuevos.length,\\n    totalPendientes: result.pendientes.length,\\n    totalRecetas: result.recetas.length\\n  }\\n}];"},"id":"88e4a4dc-4bf1-419d-95d1-ecad75c56c71"},{"name":"Ollama - Generar Resumen","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,300],"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Sos un asistente medico que prepara el resumen diario para el doctor. Organiza la informacion de forma clara y profesional. Responde en espanol argentino.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Genera un resumen diario para el medico con esta informacion:\\\\n\\\\nTURNOS DE HOY ({{ $json.totalTurnos }}):\\\\n{{ JSON.stringify($json.turnos) }}\\\\n\\\\nPACIENTES NUEVOS ({{ $json.totalNuevos }}):\\\\n{{ JSON.stringify($json.nuevos) }}\\\\n\\\\nMENSAJES PENDIENTES ({{ $json.totalPendientes }}):\\\\n{{ JSON.stringify($json.pendientes) }}\\\\n\\\\nRECETAS RECIENTES ({{ $json.totalRecetas }}):\\\\n{{ JSON.stringify($json.recetas) }}\\\\n\\\\nFormatealo lindo para leer.\\"\\n    }\\n  ]\\n}","options":{}},"id":"2fcaf0bd-8fee-430e-b114-a5e5d3f6c965"},{"name":"Extraer Resumen","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1750,300],"parameters":{"assignments":{"assignments":[{"name":"resumenTexto","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"id":"571f2e1c-f347-4855-8005-9004606bb6a4"},{"name":"Email - Enviar Resumen","type":"n8n-nodes-base.emailSend","typeVersion":2,"position":[2000,200],"parameters":{"fromEmail":"","toEmail":"medico@consultorio.com","subject":"=Resumen Diario - {{ new Date().toLocaleDateString('es-AR') }}","text":"={{ $json.resumenTexto }}","options":{}},"id":"6af7851b-b4fa-446b-8a68-15da1d72e334","webhookId":"98dd4d31-28d5-42b3-ae6b-5f71850b129e"},{"name":"Twilio - Resumen WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2000,400],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"whatsapp:+5491155550000"},{"name":"From","value":""},{"name":"Body","value":"=Resumen del dia - Turnos hoy: {{ $('Consolidar Datos').first().json.totalTurnos }}, Pacientes nuevos: {{ $('Consolidar Datos').first().json.totalNuevos }}, Pendientes: {{ $('Consolidar Datos').first().json.totalPendientes }}, Recetas: {{ $('Consolidar Datos').first().json.totalRecetas }}. Revisa tu email para el detalle completo."}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"1e448fd7-bdce-4f27-b0c3-5827d08c2c89"},{"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2250,300],"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Resumen Diario', $2, 'info', $3);","additionalFields":{"queryParams":"={{ ['workflow-05', $json.executionId || '', 'Resumen enviado - Turnos: ' + $('Consolidar Datos').first().json.totalTurnos + ', Nuevos: ' + $('Consolidar Datos').first().json.totalNuevos + ', Pendientes: ' + $('Consolidar Datos').first().json.totalPendientes] }}"},"options":{}},"id":"2f199c35-4a0f-4467-848e-9079625f067a"}]	{"Cron - 7:00 AM":{"main":[[{"node":"PG - Turnos de Hoy","type":"main","index":0},{"node":"PG - Pacientes Nuevos (24h)","type":"main","index":0},{"node":"PG - Mensajes sin Responder","type":"main","index":0},{"node":"PG - Recetas x Autorizar","type":"main","index":0}]]},"PG - Turnos de Hoy":{"main":[[{"node":"Merge 1 (Turnos+Nuevos)","type":"main","index":0}]]},"PG - Pacientes Nuevos (24h)":{"main":[[{"node":"Merge 1 (Turnos+Nuevos)","type":"main","index":1}]]},"Merge 1 (Turnos+Nuevos)":{"main":[[{"node":"Merge 2 (+Mensajes)","type":"main","index":0}]]},"PG - Mensajes sin Responder":{"main":[[{"node":"Merge 2 (+Mensajes)","type":"main","index":1}]]},"Merge 2 (+Mensajes)":{"main":[[{"node":"Merge 3 (+Recetas)","type":"main","index":0}]]},"PG - Recetas x Autorizar":{"main":[[{"node":"Merge 3 (+Recetas)","type":"main","index":1}]]},"Merge 3 (+Recetas)":{"main":[[{"node":"Consolidar Datos","type":"main","index":0}]]},"Consolidar Datos":{"main":[[{"node":"Ollama - Generar Resumen","type":"main","index":0}]]},"Ollama - Generar Resumen":{"main":[[{"node":"Extraer Resumen","type":"main","index":0}]]},"Extraer Resumen":{"main":[[{"node":"Email - Enviar Resumen","type":"main","index":0}],[{"node":"Twilio - Resumen WhatsApp","type":"main","index":0}]]},"Email - Enviar Resumen":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Twilio - Resumen WhatsApp":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	2026-05-16 18:38:24.187+00	2026-05-16 19:23:01.455+00	{"executionOrder":"v1"}	\N	\N	70f9ad61-9106-42be-9b42-ea50c715970f	0	UdQ7aw5SKAjlHolO	\N	\N	f	2	\N	\N
04 - Correo Inteligente	f	[{"parameters":{"criteria":"UNSEEN","options":{"format":"text","downloadAttachments":false}},"name":"IMAP - Email Entrante","type":"n8n-nodes-base.emailReadImap","typeVersion":2,"position":[0,300],"id":"509f8bec-e5a3-4576-9f15-84e638944cb1"},{"parameters":{"assignments":{"assignments":[{"name":"emailFrom","value":"={{ $json.from }}","type":"string"},{"name":"emailSubject","value":"={{ $json.subject }}","type":"string"},{"name":"emailBody","value":"={{ $json.textPlain }}","type":"string"},{"name":"emailId","value":"={{ $json.id }}","type":"string"}]},"options":{}},"name":"Extraer Datos Email","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[250,300],"id":"e24233d4-0306-4559-88d2-336babdcedb1"},{"parameters":{"model":"mistral","baseUrl":"http://ollama:11434","options":{"temperature":0.3}},"name":"Ollama Chat Model","type":"@n8n/n8n-nodes-langchain.lmChatOllama","typeVersion":1,"position":[500,80],"id":"10f73961-44dd-43a0-843d-86f1d060a0c3"},{"parameters":{"agentType":"conversational","systemMessage":"={{ 'Sos el asistente de gestión de correo del Consultorio Médico.\\n\\n=== EMAIL RECIBIDO ===\\nDe: ' + $json.emailFrom + '\\nAsunto: ' + $json.emailSubject + '\\nFecha: ' + ($json.emailDate || '') + '\\nCuerpo: ' + ($json.emailBody || '').substring(0, 2000) + '\\n\\n=== INSTRUCCIONES ===\\nClasificá el email y determiná la acción. Respondé en español argentino, tono profesional.\\n\\nAl final de tu respuesta, agregá SOLAMENTE este bloque JSON:\\n###EMAIL_ACTION###\\n{\\"clasificacion\\": \\"GENERAL\\", \\"accion\\": \\"responder\\", \\"borrador\\": \\"...\\", \\"motivo\\": \\"...\\"}\\n###FIN###\\n\\nCLASIFICACION:\\n- URGENTE: emergencia, dolor fuerte, síntomas graves\\n- SPAM: publicidad, newsletter, no relacionado\\n- RECETA: solicitud de receta o renovación\\n- CONSULTA_TURNO: pregunta sobre turnos, horarios\\n- CONSULTA_GENERAL: otra consulta médica o administrativa\\n- OTRO: no aplica\\n\\nACCION:\\n- notificar_whatsapp: para URGENTE → se notifica al médico vía WhatsApp\\n- mover_spam: para SPAM → se mueve a spam\\n- redactar_borrador: para todo lo demás → se guarda borrador de respuesta\\n\\nBORRADOR: (solo si accion=redactar_borrador)\\nRedactá una respuesta profesional en español argentino. Saludá cordialmente, respondé a la consulta y despedite.\\nNo uses el borrador si acción es notificar_whatsapp o mover_spam.' }}","options":{}},"name":"AI Agent","type":"@n8n/n8n-nodes-langchain.agent","typeVersion":1,"position":[750,300],"id":"220e1640-1c86-4f7b-badd-cafca4fb1435"},{"parameters":{"assignments":{"assignments":[{"name":"agentOutput","value":"={{ $json.output }}","type":"string"}]},"options":{}},"name":"Extraer Output del Agente","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1000,300],"id":"49a9c9b5-3e32-4070-94ea-ffac08958ad2"},{"parameters":{"code":"// Obtener la respuesta del agente\\nconst rawText = $input.first().json.agentOutput || $input.first().json.output || '';\\nconst extraer = $(\\"Extraer Datos Email\\").first().json;\\n\\n// Helper para escapar SQL\\nconst esc = (s) => (s || '').replace(/'/g, \\"''\\");\\n\\n// Buscar acción estructurada\\nconst actionMatch = rawText.match(/###EMAIL_ACTION###\\\\n([\\\\s\\\\S]*?)\\\\n###FIN###/);\\nlet accion = null;\\nlet textoLimpio = rawText;\\nlet clasificacion = 'GENERAL';\\nlet accionTipo = 'redactar_borrador';\\nlet borradorTexto = '';\\n\\nif (actionMatch) {\\n  try {\\n    accion = JSON.parse(actionMatch[1].trim());\\n    clasificacion = accion.clasificacion || 'GENERAL';\\n    accionTipo = accion.accion || 'redactar_borrador';\\n    borradorTexto = accion.borrador || '';\\n    textoLimpio = rawText.replace(/###EMAIL_ACTION###[\\\\s\\\\S]*?###FIN###/, '').trim();\\n  } catch (e) {\\n    console.error('Error parseando acción:', e);\\n  }\\n}\\n\\n// Construir SQLs\\nconst sqlLog = `INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ('workflow-04', 'Correo Inteligente', '${$execution.id}', '${esc(clasificacion)}', '${esc('Email clasificado como ' + clasificacion + ': ' + (extraer.emailSubject || '').substring(0, 100))}');`;\\n\\nconst sqlAccion = `INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ('workflow-04', 'Correo Inteligente', '${$execution.id}', '${esc(accionTipo)}', '${esc('ACCION: ' + accionTipo + ' | ' + JSON.stringify({clasificacion, accionTipo, motivo: accion?.motivo || ''}))}');`;\\n\\nreturn [{\\n  clasificacion: clasificacion,\\n  accionTipo: accionTipo,\\n  borradorRespuesta: borradorTexto,\\n  textoLimpio: textoLimpio,\\n  sqlLog: sqlLog,\\n  sqlAccion: sqlAccion,\\n  // Preservar datos del email\\n  emailFrom: extraer.emailFrom,\\n  emailSubject: extraer.emailSubject,\\n  emailBody: extraer.emailBody,\\n  emailId: extraer.emailId\\n}];","options":{}},"name":"Parsear Email","type":"n8n-nodes-base.code","typeVersion":2,"position":[1250,300],"id":"28298ad0-ede5-49c0-becd-eb9e727646f9"},{"parameters":{"dataType":"string","value1":"={{ $json.accionTipo }}","rules":[{"value2":"notificar_whatsapp","output":0},{"value2":"mover_spam","output":1}],"fallbackOutput":2},"name":"Enrutar por Accion","type":"n8n-nodes-base.switch","typeVersion":2.3,"position":[1500,300],"id":"0f91e447-ce25-47ce-a18c-ceb10c8ef64f"},{"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"whatsapp:+5491155550000"},{"name":"From","value":""},{"name":"Body","value":"={{ 'URGENTE - Email de ' + $('Parsear Email').first().json.emailFrom + ': ' + $('Parsear Email').first().json.emailSubject + '. Revisá la bandeja de entrada.' }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"name":"Twilio - Notificar Urgente","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1750,60],"id":"a1531860-20b7-4887-a7ab-22ab8db80c41"},{"parameters":{"options":{"moveToSpam":true}},"name":"Mover a Spam","type":"n8n-nodes-base.emailSend","typeVersion":2,"position":[1750,300],"id":"cc543fe0-58b8-4269-aa5f-ac8b24a4f091","webhookId":"28ee586c-19d1-44ee-a7d2-0d2ce093c7a6"},{"parameters":{"options":{"saveToDrafts":true,"draftSubject":"={{ 'Re: ' + $('Extraer Datos Email').first().json.emailSubject }}","draftBody":"={{ $json.borradorRespuesta }}"}},"name":"Guardar Borrador Respuesta","type":"n8n-nodes-base.emailSend","typeVersion":2,"position":[1750,540],"id":"cbf340e8-a000-495d-8a58-84f960e13ce1","webhookId":"be1c1396-7f78-475f-9088-4ca5b2782b45"},{"parameters":{"operation":"executeQuery","query":"={{ $json.sqlLog }}","options":{}},"name":"Log Clasificacion","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,400],"id":"572bc884-76b6-4bf7-ba0f-f9e830d5d1bb"},{"parameters":{"operation":"executeQuery","query":"={{ $json.sqlAccion }}","options":{}},"name":"Log Accion","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,550],"id":"08bbe21c-9301-4506-b87e-acae0ff5106f"}]	{"IMAP - Email Entrante":{"main":[[{"node":"Extraer Datos Email","type":"main","index":0}]]},"Extraer Datos Email":{"main":[[{"node":"AI Agent","type":"main","index":0}]]},"Ollama Chat Model":{"ai_languageModel":[[{"node":"AI Agent","type":"ai_languageModel","index":0}]]},"AI Agent":{"main":[[{"node":"Extraer Output del Agente","type":"main","index":0}]]},"Extraer Output del Agente":{"main":[[{"node":"Parsear Email","type":"main","index":0}]]},"Parsear Email":{"main":[[{"node":"Enrutar por Accion","type":"main","index":0}]]},"Enrutar por Accion":{"main":[[{"node":"Twilio - Notificar Urgente","type":"main","index":0}],[{"node":"Mover a Spam","type":"main","index":0}],[{"node":"Guardar Borrador Respuesta","type":"main","index":0}]]},"Twilio - Notificar Urgente":{"main":[[{"node":"Log Clasificacion","type":"main","index":0}]]},"Mover a Spam":{"main":[[{"node":"Log Clasificacion","type":"main","index":0}]]},"Guardar Borrador Respuesta":{"main":[[{"node":"Log Clasificacion","type":"main","index":0}]]},"Log Clasificacion":{"main":[[{"node":"Log Accion","type":"main","index":0}]]}}	2026-05-16 18:27:08.437+00	2026-05-16 19:57:57.504+00	{"executionOrder":"v1"}	\N	\N	87c008c7-96af-4b05-95f9-4a665680c318	0	ipjgKLDCFpzCbm9M	\N	\N	f	3	\N	\N
WhatsApp IA - Aicorebots	f	[{"parameters":{"httpMethod":"POST","path":"whatsapp-aicorebots","responseMode":"responseNode","options":{}},"id":"2ef1c403-c3b4-4524-9a5b-01d71102f775","name":"Webhook Evolution","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,0],"webhookId":"2870d88b-5095-4c21-8a57-f6640bdd90cf"},{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict","version":1},"conditions":[{"leftValue":"={{ $json.body.data.messageType }}","rightValue":"conversation","operator":{"type":"string","operation":"equals"}}],"combinator":"and"},"options":{}},"id":"0c0b796d-1727-4072-a0da-40516360b91a","name":"Solo mensajes de texto","type":"n8n-nodes-base.filter","typeVersion":2,"position":[224,0]},{"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.data.key.remoteJid.replace('@s.whatsapp.net', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.data.message.conversation }}","type":"string"},{"name":"pushName","value":"={{ $json.body.data.pushName }}","type":"string"},{"name":"instance","value":"={{ $json.body.instance }}","type":"string"}]},"options":{}},"id":"80e8d084-5d2b-4cda-97a5-5af65a0f3b35","name":"Extraer datos","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[448,0]},{"parameters":{"operation":"executeQuery","query":"SELECT role, content FROM whatsapp_memory WHERE phone = '{{ $json.phone }}' ORDER BY created_at DESC LIMIT 10","options":{}},"id":"9f501870-6a68-45ad-814d-abb11e3b4462","name":"Leer historial","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[672,0]},{"parameters":{"jsCode":"const history = $('Leer historial').all();\\nconst phone = $('Extraer datos').first().json.phone;\\nconst name = $('Extraer datos').first().json.pushName;\\nconst userMessage = $('Extraer datos').first().json.message;\\n\\n// Construir historial en formato Ollama\\nconst messages = history.reverse().map(item => ({\\n  role: item.json.role,\\n  content: item.json.content\\n}));\\n\\n// Agregar mensaje actual\\nmessages.push({ role: 'user', content: userMessage });\\n\\nreturn [{\\n  json: {\\n    phone,\\n    name,\\n    userMessage,\\n    messages,\\n    instance: $('Extraer datos').first().json.instance\\n  }\\n}];"},"id":"bc43548a-9d4f-4669-8086-d2aabcb2569a","name":"Construir contexto","type":"n8n-nodes-base.code","typeVersion":2,"position":[880,0]},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"bodyParameters":{"parameters":[{}]},"options":{}},"id":"cc00385c-f1a5-4d93-a634-07ddde054e99","name":"Ollama LLM","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1104,0]},{"parameters":{"assignments":{"assignments":[{"name":"aiResponse","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"id":"6f7bec51-849e-4dbc-9a54-fcd94e89d656","name":"Extraer respuesta IA","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1328,0]},{"parameters":{"operation":"executeQuery","query":"INSERT INTO whatsapp_memory (phone, role, content, created_at) VALUES ('{{ $('Construir contexto').first().json.phone }}', 'user', '{{ $('Construir contexto').first().json.userMessage.replace(\\"'\\", \\"''\\") }}', NOW()); INSERT INTO whatsapp_memory (phone, role, content, created_at) VALUES ('{{ $('Construir contexto').first().json.phone }}', 'assistant', '{{ $json.aiResponse.replace(\\"'\\", \\"''\\") }}', NOW());","options":{}},"id":"078be783-d67f-431c-895d-348b9de358b7","name":"Guardar en memoria","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1552,0]},{"parameters":{"method":"POST","url":"=https://evolutionapi.aicorebots.com/message/sendText/{{ $('Construir contexto').first().json.instance }}","sendHeaders":true,"headerParameters":{"parameters":[{"name":"apikey","value":"enM31RmZWeq9FXg1UuulSB2QTw3jeLekmGWVYAPq7xWeeiOHuUPuNyMWbitbOfoyS6+zO8PmFqnLIMsQTk/wMg=="},{"name":"Content-Type","value":"application/json"}]},"sendBody":true,"bodyParameters":{"parameters":[{}]},"options":{}},"id":"b8b70d2e-09ae-4e6d-b48a-705da8588818","name":"Enviar respuesta WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1760,0]},{"parameters":{"respondWith":"json","responseBody":"={ \\"status\\": \\"ok\\" }","options":{}},"id":"90ef894d-44e6-4698-9600-a5d638241879","name":"Responder webhook","type":"n8n-nodes-base.respondToWebhook","typeVersion":1.1,"position":[1984,0]}]	{"Webhook Evolution":{"main":[[{"node":"Solo mensajes de texto","type":"main","index":0}]]},"Solo mensajes de texto":{"main":[[{"node":"Extraer datos","type":"main","index":0}]]},"Extraer datos":{"main":[[{"node":"Leer historial","type":"main","index":0}]]},"Leer historial":{"main":[[{"node":"Construir contexto","type":"main","index":0}]]},"Construir contexto":{"main":[[{"node":"Ollama LLM","type":"main","index":0}]]},"Ollama LLM":{"main":[[{"node":"Extraer respuesta IA","type":"main","index":0}]]},"Extraer respuesta IA":{"main":[[{"node":"Guardar en memoria","type":"main","index":0}]]},"Guardar en memoria":{"main":[[{"node":"Enviar respuesta WhatsApp","type":"main","index":0}]]},"Enviar respuesta WhatsApp":{"main":[[{"node":"Responder webhook","type":"main","index":0}]]}}	2026-05-06 14:48:58.802+00	2026-05-16 14:22:20.048+00	{"executionOrder":"v1","binaryMode":"separate"}	\N	{}	e5aafd39-6d16-493c-a4e8-225bd11ea9db	0	QNTIAKk6qx8pAGZE	\N	\N	t	3	\N	\N
bootwa	f	[{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"id":"3b4f78f3-3b1b-4c67-81ed-70da68c9a27e","leftValue":"={{ $json.body.event }}","rightValue":"messages.upsert","operator":{"type":"string","operation":"equals","name":"filter.operator.equals"}},{"id":"ab708dc3-a1cd-426e-ad86-9aa589b39ba7","leftValue":"={{ $json.body.data.key.fromMe }}","rightValue":"false","operator":{"type":"string","operation":"equals","name":"filter.operator.equals"}}],"combinator":"and"},"options":{"ignoreCase":false}},"type":"n8n-nodes-base.if","typeVersion":2.3,"position":[-96,16],"id":"825b03c6-ee5a-4c30-8f04-712912aeb0fe","name":"If"},{"parameters":{"promptType":"define","text":"={{ $json.body.data.message.conversation }}","messages":{"messageValues":[{"message":"Eres un asistente de atención al cliente. Responde siempre en español de forma concisa y amable."}]},"batching":{}},"type":"@n8n/n8n-nodes-langchain.chainLlm","typeVersion":1.9,"position":[112,-80],"id":"8e1a9904-d737-4754-9ab0-be66a0bb4bdb","name":"Basic LLM Chain"},{"parameters":{"model":"llama3.1:8b","options":{}},"type":"@n8n/n8n-nodes-langchain.lmChatOllama","typeVersion":1,"position":[208,128],"id":"a59f12e1-c4c1-4501-bd4e-0a4e0755b720","name":"Ollama Chat Model","credentials":{"ollamaApi":{"id":"wvOyfq9b69sMEzrF","name":"Ollama account"}}},{"parameters":{"method":"POST","url":"https://evolutionapi.aicorebots.com/message/sendText/bootwa","sendHeaders":true,"headerParameters":{"parameters":[{"name":"apikey","value":"enM31RmZWeq9FXg1UuulSB2QTw3jeLekmGWVYAPq7xWeeiOHuUPuNyMWbitbOfoyS6+zO8PmFqnLIMsQTk/wMg=="},{"name":"Content-Type","value":"application/json"}]},"sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"number\\": \\"{{ $('If').item.json.body.data.key.remoteJid }}\\",\\n  \\"text\\": \\"{{ $('Basic LLM Chain').item.json.text }}\\"\\n}","options":{}},"type":"n8n-nodes-base.httpRequest","typeVersion":4.4,"position":[464,-80],"id":"17d87334-2720-45ef-9f7a-df135d29bd5b","name":"HTTP Request"},{"parameters":{"httpMethod":"POST","path":"whatsapp","options":{}},"type":"n8n-nodes-base.webhook","typeVersion":2.1,"position":[-336,16],"id":"9e2ccd58-5264-4672-86a8-8beb029f8262","name":"Webhook","webhookId":"87d1b12e-23e3-4378-8c28-6a8ed3276f23"}]	{"If":{"main":[[{"node":"Basic LLM Chain","type":"main","index":0}]]},"Ollama Chat Model":{"ai_languageModel":[[{"node":"Basic LLM Chain","type":"ai_languageModel","index":0}]]},"Basic LLM Chain":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"Webhook":{"main":[[{"node":"If","type":"main","index":0}]]}}	2026-04-26 12:28:42.028+00	2026-05-16 14:22:06.937+00	{"executionOrder":"v1","binaryMode":"separate"}	\N	{}	b54f7170-d4a4-4f02-8a1c-4aeb176c0c06	1	73g6uVf9fIsNHKV9	{"templateCredsSetupCompleted":true}	\N	t	63	\N	\N
Buenos días diario	f	[{"parameters":{"triggerTimes":[{"mode":"everyDay","hour":8,"minute":0}]},"id":"1","name":"Cron Trigger","type":"n8n-nodes-base.cron","typeVersion":1,"position":[250,300]},{"parameters":{"method":"POST","url":"https://evolutionapi.aicorebots.com/message/sendText/bootwa","sendHeaders":true,"headerParameters":{"parameters":[{"name":"apikey","value":"enM31RmZWeq9FXg1UuulSB2QTw3jeLekmGWVYAPq7xWeeiOHuUPuNyMWbitbOfoyS6+zO8PmFqnLIMsQTk/wMg=="},{"name":"Content-Type","value":"application/json"}]},"specifyBody":"json","jsonBody":"{\\n  \\"number\\": \\"TU_NUMERO_DE_WHATSAPP_AQUI\\",\\n  \\"text\\": \\"¡Buenos días! Que tengas un excelente día.\\"\\n}"},"id":"2","name":"Enviar Buenos Días","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[500,300]}]	{"Cron Trigger":{"main":[[{"node":"Enviar Buenos Días","type":"main","index":0}]]}}	2026-05-15 06:13:17.546+00	2026-05-16 14:22:04.042+00	{"executionOrder":"v1"}	\N	\N	49075f16-591b-4d00-8309-19fd2d2df38a	0	15imVcRcLvE2JxXO	\N	\N	t	2	\N	\N
03 - Recordatorios Automaticos	f	[{"name":"Cron - Cada Hora","type":"n8n-nodes-base.cron","typeVersion":2,"position":[0,300],"parameters":{"triggerTimes":{"item":[{"mode":"everyHour","hour":0,"minute":0}]}},"id":"2756b9fa-e17f-4508-8768-751649e1793d"},{"name":"PG - Turnos Proximas 24hs","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,200],"parameters":{"operation":"executeQuery","query":"SELECT t.id, t.fecha_hora, t.estado, p.id as paciente_id, p.nombre, p.apellido, p.telefono, m.nombre as medico_nombre, '24h' as tipo FROM turnos t JOIN pacientes p ON p.id = t.paciente_id JOIN medicos m ON m.id = t.medico_id WHERE t.estado IN ('pendiente', 'confirmada') AND t.recordatorio_24h_enviado = FALSE AND t.fecha_hora BETWEEN NOW() AND NOW() + INTERVAL '24 hours' ORDER BY t.fecha_hora;","options":{}},"id":"ddb5de92-011b-4e1b-84d9-9ff787547c5a"},{"name":"PG - Turnos Proxima 1h","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,400],"parameters":{"operation":"executeQuery","query":"SELECT t.id, t.fecha_hora, t.estado, p.id as paciente_id, p.nombre, p.apellido, p.telefono, m.nombre as medico_nombre, '1h' as tipo FROM turnos t JOIN pacientes p ON p.id = t.paciente_id JOIN medicos m ON m.id = t.medico_id WHERE t.estado IN ('pendiente', 'confirmada') AND t.recordatorio_1h_enviado = FALSE AND t.fecha_hora BETWEEN NOW() AND NOW() + INTERVAL '1 hour' ORDER BY t.fecha_hora;","options":{}},"id":"464f3f0f-3e79-4c18-9f04-1d3987db811c"},{"name":"Combinar Recordatorios","type":"n8n-nodes-base.merge","typeVersion":2,"position":[500,300],"parameters":{"mode":"append"},"id":"d7e88610-5cfd-4dfe-a596-ba79df6a8957"},{"name":"Hay Turnos?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[750,300],"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $items().length }}","rightValue":"0","operator":{"type":"number","operation":"larger","name":"filter.operator.larger"}}],"combinator":"and"},"options":{}},"id":"9e123e35-dc81-43c0-bec4-f0081198d331"},{"name":"Enrutar por Tipo","type":"n8n-nodes-base.switch","typeVersion":2.3,"position":[1000,300],"parameters":{"dataType":"string","value1":"={{ $json.tipo }}","rules":[{"value2":"24h","output":0},{"value2":"1h","output":1}],"fallbackOutput":2},"id":"cf889b44-0e56-46d7-a13c-a0867cf28ff3"},{"name":"Generar Msg 24h","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1250,150],"parameters":{"assignments":{"assignments":[{"name":"recordatorioMensaje","value":"=Hola {{ $json.nombre }}! Te recordamos que tenes un turno manana {{ $json.fecha_hora }} con {{ $json.medico_nombre }}. Responde CONFIRMAR para confirmar tu asistencia. Gracias!","type":"string"}]},"options":{}},"id":"735a36bf-a9ba-4d85-9785-63017a38bab6"},{"name":"Twilio 24h","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,150],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"=whatsapp:+549{{ $json.telefono }}"},{"name":"From","value":""},{"name":"Body","value":"={{ $json.recordatorioMensaje }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"9e2f832b-e845-47f4-8463-5f6c85f03db5"},{"name":"PG Update 24h","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1750,150],"parameters":{"operation":"executeQuery","query":"UPDATE turnos SET recordatorio_24h_enviado = TRUE, updated_at = NOW() WHERE id = $1;","additionalFields":{"queryParams":"={{ [$json.id] }}"},"options":{}},"id":"e151b39e-3ff7-4d54-a3bf-b5e0c5fe6242"},{"name":"Generar Msg 1h","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1250,400],"parameters":{"assignments":{"assignments":[{"name":"recordatorioMensaje","value":"=Recordatorio: en 1 hora tenes turno con {{ $json.medico_nombre }}. Te esperamos!","type":"string"}]},"options":{}},"id":"d7cbc407-b42c-437a-8553-9d691f8d1ff7"},{"name":"Twilio 1h","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,400],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"=whatsapp:+549{{ $json.telefono }}"},{"name":"From","value":""},{"name":"Body","value":"={{ $json.recordatorioMensaje }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"8761f950-f86f-41c2-b936-340d43a9e220"},{"name":"PG Update 1h","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1750,400],"parameters":{"operation":"executeQuery","query":"UPDATE turnos SET recordatorio_1h_enviado = TRUE, updated_at = NOW() WHERE id = $1;","additionalFields":{"queryParams":"={{ [$json.id] }}"},"options":{}},"id":"d11ca1b7-b530-4021-b726-ca0a28a7b3fe"},{"name":"Generar Msg Default","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1250,550],"parameters":{"assignments":{"assignments":[{"name":"recordatorioMensaje","value":"=Recordatorio: tenes turno proximamente con {{ $json.medico_nombre }}.","type":"string"}]},"options":{}},"id":"c0e44ae1-d2f6-48cf-b7f9-417620633156"},{"name":"Twilio Default","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,550],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"=whatsapp:+549{{ $json.telefono }}"},{"name":"From","value":""},{"name":"Body","value":"={{ $json.recordatorioMensaje }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"545470f5-4c2a-4856-86bf-799ae3a5f378"},{"name":"PG Update Default","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1750,550],"parameters":{"operation":"executeQuery","query":"UPDATE turnos SET recordatorio_24h_enviado = TRUE, updated_at = NOW() WHERE id = $1;","additionalFields":{"queryParams":"={{ [$json.id] }}"},"options":{}},"id":"0331c653-e724-4a90-aa0b-11043049f049"},{"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,300],"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Recordatorios', $2, 'info', $3);","additionalFields":{"queryParams":"={{ ['workflow-03', $json.executionId || '', 'Recordatorio ' + $json.tipo + ' enviado a ' + $json.nombre] }}"},"options":{}},"id":"23e42316-a39d-46c5-80c2-ca4ead4ca0f9"}]	{"Cron - Cada Hora":{"main":[[{"node":"PG - Turnos Proximas 24hs","type":"main","index":0},{"node":"PG - Turnos Proxima 1h","type":"main","index":0}]]},"PG - Turnos Proximas 24hs":{"main":[[{"node":"Combinar Recordatorios","type":"main","index":0}]]},"PG - Turnos Proxima 1h":{"main":[[{"node":"Combinar Recordatorios","type":"main","index":1}]]},"Combinar Recordatorios":{"main":[[{"node":"Hay Turnos?","type":"main","index":0}]]},"Hay Turnos?":{"main":[[{"node":"Enrutar por Tipo","type":"main","index":0}],[]]},"Enrutar por Tipo":{"main":[[{"node":"Generar Msg 24h","type":"main","index":0}],[{"node":"Generar Msg 1h","type":"main","index":0}],[{"node":"Generar Msg Default","type":"main","index":0}]]},"Generar Msg 24h":{"main":[[{"node":"Twilio 24h","type":"main","index":0}]]},"Twilio 24h":{"main":[[{"node":"PG Update 24h","type":"main","index":0}]]},"PG Update 24h":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Generar Msg 1h":{"main":[[{"node":"Twilio 1h","type":"main","index":0}]]},"Twilio 1h":{"main":[[{"node":"PG Update 1h","type":"main","index":0}]]},"PG Update 1h":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Generar Msg Default":{"main":[[{"node":"Twilio Default","type":"main","index":0}]]},"Twilio Default":{"main":[[{"node":"PG Update Default","type":"main","index":0}]]},"PG Update Default":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	2026-05-16 18:04:07.778+00	2026-05-16 19:22:59.539+00	{"executionOrder":"v1"}	\N	\N	a2df3ffe-d5c7-477c-8ca8-f2256fb46b44	0	RBfR8UYpm79FamiQ	\N	\N	f	2	\N	\N
06 - Recetas y Renovaciones	f	[{"name":"Webhook - Solicitud Receta","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,300],"parameters":{"httpMethod":"POST","path":"receta-solicitar","responseMode":"onReceived","options":{}},"id":"f2a5454f-6c63-45a6-99c1-d37e718e742d","webhookId":"6736e0dd-840b-4297-9f72-b82fb613bb45"},{"name":"Extraer Datos Solicitud","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[250,300],"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.phone || $json.body.From.replace('whatsapp:', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.message || $json.body.Body }}","type":"string"},{"name":"profileName","value":"={{ $json.body.profileName || $json.body.ProfileName || 'Paciente' }}","type":"string"},{"name":"fromNumber","value":"={{ $json.body.fromNumber || $json.body.From }}","type":"string"},{"name":"toNumber","value":"={{ $json.body.toNumber || $json.body.To }}","type":"string"}]},"options":{}},"id":"76e7c70d-9fd0-494b-93fc-77f8d2501f86"},{"name":"Ollama - Analizar Solicitud","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[500,300],"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Analizá la solicitud de receta del paciente. Respondé SOLO con JSON válido, sin explicación:\\\\n\\\\n{\\\\n  \\\\\\"es_renovacion\\\\\\": true o false,\\\\n  \\\\\\"medicamento\\\\\\": \\\\\\"nombre del medicamento o null\\\\\\",\\\\n  \\\\\\"dosis\\\\\\": \\\\\\"dosis o null\\\\\\",\\\\n  \\\\\\"frecuencia\\\\\\": \\\\\\"frecuencia o null\\\\\\",\\\\n  \\\\\\"tipo\\\\\\": \\\\\\"renovacion\\\\\\" o \\\\\\"nueva\\\\\\" o \\\\\\"consulta\\\\\\"\\\\n}\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Mensaje del paciente: {{ $('Extraer Datos Solicitud').first().json.message }}\\"\\n    }\\n  ]\\n}","options":{}},"id":"0c0c5547-f243-40ca-9eb4-87dde61393a6"},{"name":"Extraer JSON Receta","type":"n8n-nodes-base.code","typeVersion":2,"position":[750,300],"parameters":{"jsCode":"const ollamaResponse = $input.first().json.message.content;\\n\\nlet recetaData;\\ntry {\\n  recetaData = JSON.parse(ollamaResponse);\\n} catch (e) {\\n  const match = ollamaResponse.match(/\\\\{[\\\\s\\\\S]*\\\\}/);\\n  if (match) {\\n    try {\\n      recetaData = JSON.parse(match[0]);\\n    } catch (e2) {\\n      recetaData = { es_renovacion: false, medicamento: null, dosis: null, frecuencia: null, tipo: 'consulta' };\\n    }\\n  } else {\\n    recetaData = { es_renovacion: false, medicamento: null, dosis: null, frecuencia: null, tipo: 'consulta' };\\n  }\\n}\\n\\nreturn [{\\n  json: {\\n    es_renovacion: recetaData.es_renovacion === true,\\n    medicamento: recetaData.medicamento || null,\\n    dosis: recetaData.dosis || null,\\n    frecuencia: recetaData.frecuencia || null,\\n    tipo: recetaData.tipo || 'consulta',\\n    phone: $('Extraer Datos Solicitud').first().json.phone,\\n    profileName: $('Extraer Datos Solicitud').first().json.profileName,\\n    fromNumber: $('Extraer Datos Solicitud').first().json.fromNumber,\\n    toNumber: $('Extraer Datos Solicitud').first().json.toNumber\\n  }\\n}];"},"id":"3cab189f-6eca-4e70-bafd-b880f27b0eea"},{"name":"Es Renovacion?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[1000,300],"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.es_renovacion }}","rightValue":"true","operator":{"type":"string","operation":"equal","name":"filter.operator.equal"}}],"combinator":"and"},"options":{}},"id":"9ddf7f13-3915-4ec2-b5e5-576e626a7e61"},{"name":"PG - Buscar Receta Activa","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1250,150],"parameters":{"operation":"executeQuery","query":"SELECT r.*, p.nombre, p.apellido FROM recetas r JOIN pacientes p ON p.id = r.paciente_id WHERE p.telefono = $1 AND r.estado = 'activa' AND r.medicamento ILIKE '%' || $2 || '%' ORDER BY r.created_at DESC LIMIT 1;","additionalFields":{"queryParams":"={{ [$json.phone, $json.medicamento || ''] }}"},"options":{}},"id":"a39c0ddf-68b3-4d05-9b41-fd9479ff1645"},{"name":"PG - Crear Receta Renovacion","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1500,150],"parameters":{"operation":"executeQuery","query":"INSERT INTO recetas (paciente_id, medico_id, medicamento, dosis, frecuencia, duracion, indicaciones, estado, receta_anterior_id) VALUES ((SELECT id FROM pacientes WHERE telefono = $1 LIMIT 1), '00000000-0000-0000-0000-000000000001', $2, $3, $4, '30 dias', 'Renovacion automatica. Misma indicacion que receta anterior.', 'pendiente', $5) RETURNING id;","additionalFields":{"queryParams":"={{ [$('Extraer JSON Receta').first().json.phone, $('Extraer JSON Receta').first().json.medicamento, $('Extraer JSON Receta').first().json.dosis || '', $('Extraer JSON Receta').first().json.frecuencia || 'segun indicacion medica', $json.id || ''] }}"},"options":{}},"id":"8e2f9a26-8399-4033-b2f7-b91fc89f08e3"},{"name":"Twilio - Confirmar Renovacion","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1750,150],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer JSON Receta').first().json.fromNumber || 'whatsapp:' + $('Extraer JSON Receta').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer JSON Receta').first().json.toNumber }}"},{"name":"Body","value":"=Hola {{ $('Extraer JSON Receta').first().json.profileName }}! Renovamos tu receta de {{ $('Extraer JSON Receta').first().json.medicamento }}. El medico la va a revisar y te la enviamos por WhatsApp en cuanto este lista. Saludos!"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"f671381f-3d10-490f-a617-02dc39f8a73e"},{"name":"Notificar al Medico x Receta Nueva","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1250,480],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"whatsapp:+5491155550000"},{"name":"From","value":"={{ $('Extraer JSON Receta').first().json.toNumber }}"},{"name":"Body","value":"=Solicitud de receta NUEVA de {{ $('Extraer JSON Receta').first().json.profileName }}: {{ $('Extraer JSON Receta').first().json.medicamento || 'sin especificar' }}. Revisa el dashboard para autorizar."}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"89042b3c-5a2a-433b-aa0b-a99fbf3735fb"},{"name":"Twilio - Respuesta Pendiente","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,480],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer JSON Receta').first().json.fromNumber || 'whatsapp:' + $('Extraer JSON Receta').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer JSON Receta').first().json.toNumber }}"},{"name":"Body","value":"=Hola {{ $('Extraer JSON Receta').first().json.profileName }}! Recibimos tu solicitud de receta. El medico la va a revisar y te avisamos cuando este lista."}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"f809acea-fef7-4eda-b3d6-836419b54445"},{"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,300],"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Recetas', $2, 'info', $3);","additionalFields":{"queryParams":"={{ ['workflow-06', $json.executionId || '', 'Receta procesada para ' + $('Extraer JSON Receta').first().json.phone + ': ' + ($('Extraer JSON Receta').first().json.es_renovacion ? 'renovacion' : 'nueva') + ' - ' + ($('Extraer JSON Receta').first().json.medicamento || 'sin especificar')] }}"},"options":{}},"id":"d7e2d176-847e-4cff-b527-c0b87d91efb2"}]	{"Webhook - Solicitud Receta":{"main":[[{"node":"Extraer Datos Solicitud","type":"main","index":0}]]},"Extraer Datos Solicitud":{"main":[[{"node":"Ollama - Analizar Solicitud","type":"main","index":0}]]},"Ollama - Analizar Solicitud":{"main":[[{"node":"Extraer JSON Receta","type":"main","index":0}]]},"Extraer JSON Receta":{"main":[[{"node":"Es Renovacion?","type":"main","index":0}]]},"Es Renovacion?":{"main":[[{"node":"PG - Buscar Receta Activa","type":"main","index":0}],[{"node":"Notificar al Medico x Receta Nueva","type":"main","index":0}]]},"PG - Buscar Receta Activa":{"main":[[{"node":"PG - Crear Receta Renovacion","type":"main","index":0}]]},"PG - Crear Receta Renovacion":{"main":[[{"node":"Twilio - Confirmar Renovacion","type":"main","index":0}]]},"Twilio - Confirmar Renovacion":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Notificar al Medico x Receta Nueva":{"main":[[{"node":"Twilio - Respuesta Pendiente","type":"main","index":0}]]},"Twilio - Respuesta Pendiente":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	2026-05-16 18:54:19.394+00	2026-05-16 19:23:02.279+00	{"executionOrder":"v1"}	\N	\N	ccf20995-269f-4ba5-bbf0-70753f7a793d	0	eSKU0aanf9NHfmPh	\N	\N	f	2	\N	\N
test-pg-params	f	[{"name":"Set Input","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[0,300],"parameters":{"assignments":{"assignments":[{"name":"test_id","value":123,"type":"number"},{"name":"test_name","value":"Test","type":"string"}]},"options":{}},"id":"b53dc985-dc97-4e77-ac22-f90a1c58035b"},{"name":"PG Test","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[256,300],"parameters":{"operation":"executeQuery","query":"SELECT $1 as param1, $2 as param2;","options":{}},"id":"a933531e-c9ca-43a3-a6d4-467f835da537"}]	{"Set Input":{"main":[[{"node":"PG Test","type":"main","index":0}]]}}	2026-05-16 19:50:26.222+00	2026-05-16 19:50:26.222+00	{}	\N	\N	b3578f73-a50f-402e-84e0-587f2a12e374	0	y3yvu3BjJbzA5qvp	\N	\N	f	1	\N	\N
01 - WhatsApp Inbound + Triaje IA	f	[{"parameters":{"httpMethod":"POST","path":"consultorio-inbound","options":{}},"name":"Webhook - Twilio WhatsApp","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,304],"webhookId":"b9e6ab70-db5d-4ad3-b52e-50460c2025c9","id":"6c50c483-bde2-4138-8276-80bee4fe008c"},{"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.body.Body }}","rightValue":"","operator":{"type":"string","operation":"isNotEmpty","name":"filter.operator.isNotEmpty"}}],"combinator":"and"},"options":{}},"name":"Validar Mensaje","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[256,304],"id":"f45fc35e-2355-4097-9659-0d98453c27f0"},{"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.From.replace('whatsapp:', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.Body }}","type":"string"},{"name":"profileName","value":"={{ $json.body.ProfileName || 'Paciente' }}","type":"string"},{"name":"twilioSid","value":"={{ $json.body.SmsSid }}","type":"string"},{"name":"toNumber","value":"={{ $json.body.To }}","type":"string"},{"name":"fromNumber","value":"={{ $json.body.From }}","type":"string"}]},"options":{}},"name":"Extraer Datos","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[512,304],"id":"a051e40d-7aa6-41bc-8f82-61ede9131fd4"},{"parameters":{"operation":"executeQuery","query":"INSERT INTO pacientes (telefono, nombre, apellido, fuente, consentimiento_whatsapp) VALUES ($1, $2, '', 'whatsapp', TRUE) ON CONFLICT (telefono) DO UPDATE SET updated_at = NOW() RETURNING id, telefono, nombre, apellido, email, tags, canal_preferido;","options":{}},"name":"Obtener o Crear Paciente","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[768,304],"id":"16cc9f48-a489-40f6-ad46-e9c42a192374"},{"parameters":{"operation":"executeQuery","query":"{{ 'SELECT t.id, t.fecha, t.hora_inicio, t.hora_fin, t.motivo, t.estado, m.nombre AS medico_nombre, m.especialidad FROM turnos t JOIN medicos m ON t.medico_id = m.id WHERE t.paciente_id = ' + $(\\"Obtener o Crear Paciente\\").first().json.id + ' AND t.fecha >= CURRENT_DATE ORDER BY t.fecha, t.hora_inicio LIMIT 5' }}","options":{}},"name":"Consultar Turnos del Paciente","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1024,304],"id":"90878f2a-2ecf-4301-8786-dbfb394140c8"},{"parameters":{"operation":"executeQuery","query":"{{ 'SELECT r.id, r.medicamento, r.dosis, r.indicaciones, r.fecha_emision, r.fecha_vencimiento, r.estado FROM recetas r WHERE r.paciente_id = ' + $(\\"Obtener o Crear Paciente\\").first().json.id + ' ORDER BY r.fecha_emision DESC LIMIT 10' }}","options":{}},"name":"Consultar Recetas Activas","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1280,304],"id":"a43b86f9-a3e7-4951-a6a7-aaf4b7ab402d"},{"parameters":{},"name":"Construir Contexto Paciente","type":"n8n-nodes-base.code","typeVersion":2,"position":[1536,304],"id":"a5dd5658-5939-4927-aa42-0e96f2842c17"},{"parameters":{"model":"mistral","options":{"temperature":0.3}},"name":"Ollama Chat Model","type":"@n8n/n8n-nodes-langchain.lmChatOllama","typeVersion":1,"position":[1808,80],"id":"e702d643-5200-4c2d-9163-c0dd19f45370","credentials":{"ollamaApi":{"id":"wvOyfq9b69sMEzrF","name":"Ollama account"}}},{"parameters":{"sessionKey":"={{ $('Extraer Datos').first().json.phone }}","contextWindowLength":10},"name":"Postgres Chat Memory","type":"@n8n/n8n-nodes-langchain.memoryPostgres","typeVersion":1,"position":[1808,528],"id":"0c5b8f73-ccef-4abd-ac23-f3df3e42d301"},{"parameters":{"options":{}},"name":"AI Agent","type":"@n8n/n8n-nodes-langchain.agent","typeVersion":1,"position":[1824,304],"id":"d51f7ed9-b335-4fcb-978a-6ff4341c933f"},{"parameters":{"assignments":{"assignments":[{"name":"agentOutput","value":"={{ $json.output }}","type":"string"}]},"options":{}},"name":"Extraer Output del Agente","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[2384,304],"id":"73cf9f80-8381-4ff4-a251-58be074bd9a1"},{"parameters":{},"name":"Parsear y Preparar","type":"n8n-nodes-base.code","typeVersion":2,"position":[2608,304],"id":"0fea1e78-2ad3-4d5d-806a-66620f5fda51"},{"parameters":{"method":"POST","url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","authentication":"genericCredentialType","genericAuthType":"httpBasicAuth","sendQuery":true,"queryParameters":{"parameters":[{"name":"From","value":"={{ $json.toNumber }}"},{"name":"To","value":"={{ $json.fromNumber }}"},{"name":"Body","value":"={{ $json.responseText }}"}]},"sendBody":true,"bodyParameters":{"parameters":[{}]},"options":{}},"name":"Twilio - Enviar WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2864,304],"id":"a1799298-422a-4e39-929b-42bad17dc9cb"},{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.tieneAccion }}","rightValue":true,"operator":{"type":"boolean","operation":"equals"}}],"combinator":"and"},"options":{}},"name":"Hay Accion?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[3104,304],"id":"b51ee8a3-5f86-4929-a360-8b6b4f1b2aed"},{"parameters":{"operation":"executeQuery","query":"{{ $json.sqlAccion }}","options":{}},"name":"Registrar Accion Pendiente","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[3360,112],"id":"25920fb0-9a17-4d7e-bc0d-89881f68109d"},{"parameters":{"operation":"executeQuery","query":"{{ $json.sqlGuardar }}","options":{}},"name":"Guardar Conversacion en DB","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[3360,352],"id":"ec27e244-1431-46d1-92a2-88c0dc917dfc"},{"parameters":{"operation":"executeQuery","query":"{{ $json.sqlLog }}","options":{}},"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[3360,560],"id":"99bcdeeb-2244-4f4e-8c25-b382c9b12225"}]	{"Webhook - Twilio WhatsApp":{"main":[[{"node":"Validar Mensaje","type":"main","index":0}]]},"Validar Mensaje":{"main":[[{"node":"Extraer Datos","type":"main","index":0}],[]]},"Extraer Datos":{"main":[[{"node":"Obtener o Crear Paciente","type":"main","index":0}]]},"Obtener o Crear Paciente":{"main":[[{"node":"Consultar Turnos del Paciente","type":"main","index":0}]]},"Consultar Turnos del Paciente":{"main":[[{"node":"Consultar Recetas Activas","type":"main","index":0}]]},"Consultar Recetas Activas":{"main":[[{"node":"Construir Contexto Paciente","type":"main","index":0}]]},"Construir Contexto Paciente":{"main":[[{"node":"AI Agent","type":"main","index":0}]]},"Ollama Chat Model":{"ai_languageModel":[[{"node":"AI Agent","type":"ai_languageModel","index":0}]]},"Postgres Chat Memory":{"ai_memory":[[{"node":"AI Agent","type":"ai_memory","index":0}]]},"AI Agent":{"main":[[{"node":"Extraer Output del Agente","type":"main","index":0}]]},"Extraer Output del Agente":{"main":[[{"node":"Parsear y Preparar","type":"main","index":0}]]},"Parsear y Preparar":{"main":[[{"node":"Twilio - Enviar WhatsApp","type":"main","index":0}]]},"Twilio - Enviar WhatsApp":{"main":[[{"node":"Hay Accion?","type":"main","index":0}]]},"Hay Accion?":{"main":[[{"node":"Registrar Accion Pendiente","type":"main","index":0}],[{"node":"Guardar Conversacion en DB","type":"main","index":0}]]},"Registrar Accion Pendiente":{"main":[[{"node":"Guardar Conversacion en DB","type":"main","index":0}]]},"Guardar Conversacion en DB":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	2026-05-16 14:31:40.437+00	2026-05-16 20:19:41.23+00	{"executionOrder":"v1","binaryMode":"separate"}	\N	{}	bb9b1667-0bfa-4ea3-acce-8631352b98b6	0	7gJaxias01SkCSFx	\N	\N	f	8	\N	\N
02 - Gestion de Turnos	f	[{"parameters":{"httpMethod":"POST","path":"turno-solicitar","options":{}},"name":"Webhook - Solicitud Turno","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,304],"id":"912d0143-fc59-432a-ba03-3472f570a329","webhookId":"e84aba8b-373e-4d37-ad45-293aba94e5d6"},{"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.body.phone || $json.body.From }}","rightValue":"","operator":{"type":"string","operation":"isNotEmpty","name":"filter.operator.isNotEmpty"}}],"combinator":"and"},"options":{}},"name":"Validar Datos","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[256,304],"id":"016b1333-6da4-42af-bf42-71c47d4f3736"},{"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.phone || $json.body.From.replace('whatsapp:', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.message || $json.body.Body }}","type":"string"},{"name":"profileName","value":"={{ $json.body.profileName || $json.body.ProfileName || 'Paciente' }}","type":"string"},{"name":"pacienteId","value":"={{ $json.body.pacienteId || '' }}","type":"string"},{"name":"toNumber","value":"={{ $json.body.toNumber || $json.body.To }}","type":"string"},{"name":"fromNumber","value":"={{ $json.body.fromNumber || $json.body.From }}","type":"string"}]},"options":{}},"name":"Extraer Datos Entrada","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[512,304],"id":"7354b08e-e899-4e78-b2c7-9a6e644e9521"},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Extraé la información del pedido de turno del paciente. Respondé SOLO con JSON válido, sin explicación:\\n\\n{\\n  \\"motivo\\": \\"motivo de la consulta\\",\\n  \\"fecha_preferida\\": \\"fecha que menciona o null\\",\\n  \\"horario_preferido\\": \\"horario o null\\",\\n  \\"medico_preferido\\": \\"médico o null\\",\\n  \\"tipo_consulta\\": \\"presencial o virtual o domicilio\\"\\n}\\n\\nSi no hay suficiente información, poné null en los campos que faltan.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Mensaje del paciente: {{ $('Extraer Datos Entrada').first().json.message }}\\"\\n    }\\n  ]\\n}","options":{}},"name":"Ollama - Extraer Info Turno","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[752,304],"id":"2755dcaa-0a00-4799-98f0-8cb1bd006c31"},{"parameters":{"jsCode":"const ollamaResponse = $input.first().json.message.content;\\n\\nlet turnoData;\\ntry {\\n  // Intentar parsear JSON directamente\\nturnoData = JSON.parse(ollamaResponse);\\n} catch (e) {\\n  // Buscar JSON entre llaves\\nconst match = ollamaResponse.match(/\\\\{[\\\\s\\\\S]*\\\\}/);\\nif (match) {\\n  try {\\nturnoData = JSON.parse(match[0]);\\n} catch (e2) {\\nturnoData = { motivo: ollamaResponse, fecha_preferida: null, horario_preferido: null, medico_preferido: null, tipo_consulta: 'presencial' };\\n}\\n  } else {\\nturnoData = { motivo: ollamaResponse, fecha_preferida: null, horario_preferido: null, medico_preferido: null, tipo_consulta: 'presencial' };\\n}\\n}\\n\\nreturn [{\\n  json: {\\n    motivo: turnoData.motivo || 'consulta',\\n    fecha_preferida: turnoData.fecha_preferida || null,\\n    horario_preferido: turnoData.horario_preferido || null,\\n    medico_preferido: turnoData.medico_preferido || null,\\n    tipo_consulta: turnoData.tipo_consulta || 'presencial',\\n    phone: $('Extraer Datos Entrada').first().json.phone,\\n    profileName: $('Extraer Datos Entrada').first().json.profileName,\\n    pacienteId: $('Extraer Datos Entrada').first().json.pacienteId\\n  }\\n}];"},"name":"Extraer JSON Turno","type":"n8n-nodes-base.code","typeVersion":2,"position":[1008,304],"id":"92b8ce9a-a912-424a-95e9-08c550cea87e"},{"parameters":{"operation":"executeQuery","query":"SELECT fecha_hora, duracion_minutos FROM turnos WHERE medico_id = $1 AND estado IN ('pendiente', 'confirmada') AND DATE(fecha_hora) = $2 ORDER BY fecha_hora;","options":{}},"name":"Verificar Disponibilidad","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1264,304],"id":"bbc7ac64-bc64-4494-a6b9-d6528532a8ea"},{"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $('Extraer JSON Turno').first().json.fecha_preferida }}","rightValue":"null","operator":{"type":"string","operation":"notEqual","name":"filter.operator.notEqual"}}],"combinator":"and"},"options":{}},"name":"Tiene Fecha Elegida?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[1504,304],"id":"d5d390d7-b43a-45bb-8f83-4217aa81bcd2"},{"parameters":{"jsCode":"const slotsOcupados = $input.all();\\nconst occupiedTimes = slotsOcupados.map(s => {\\n  const d = new Date(s.json.fecha_hora);\\n  return d.getHours() * 60 + d.getMinutes();\\n});\\n\\nconst slotsDisponibles = [];\\n// Franjas de 9:00 a 17:00, turnos de 30 min\\nfor (let h = 9; h < 17; h++) {\\n  for (let m = 0; m < 60; m += 30) {\\n    const minutos = h * 60 + m;\\n    if (!occupiedTimes.includes(minutos)) {\\n      slotsDisponibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);\\n    }\\n  }\\n}\\n\\nreturn [{\\n  json: {\\n    slots: slotsDisponibles.slice(0, 6),\\n    fecha: $('Extraer JSON Turno').first().json.fecha_preferida,\\n    motivo: $('Extraer JSON Turno').first().json.motivo,\\n    tipo_consulta: $('Extraer JSON Turno').first().json.tipo_consulta\\n  }\\n}];"},"name":"Generar Franjas","type":"n8n-nodes-base.code","typeVersion":2,"position":[1760,208],"id":"7db9b028-34b4-449a-a1bb-ecbf820633a8"},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Sos el asistente virtual del Consultorio Médico. Te van a pasar horarios disponibles y tenés que ofrecerlos al paciente de forma amable, pidiendo que elija uno. Sé breve y clara. Respondé en español argentino.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Horarios disponibles para el {{ $('Generar Franjas').first().json.fecha }}: {{ $('Generar Franjas').first().json.slots.join(', ') }}. Ofrecé estas opciones al paciente.\\"\\n    }\\n  ]\\n}","options":{}},"name":"Ollama - Ofrecer Horarios","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2000,208],"id":"b98d4549-9e48-40e4-a460-a666d362f05a"},{"parameters":{"assignments":{"assignments":[{"name":"responseText","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"name":"Extraer Respuesta Horarios","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[2256,208],"id":"cf89c6f0-a042-48d9-b22e-bdda3d46a120"},{"parameters":{"operation":"executeQuery","query":"INSERT INTO turnos (paciente_id, medico_id, fecha_hora, duracion_minutos, motivo, estado, tipo_consulta, fuente, notas_paciente) VALUES ($1, $2, $3, 30, $4, 'pendiente', $5, 'whatsapp', $6) RETURNING id, fecha_hora;","options":{}},"name":"Crear Turno en DB","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1760,656],"id":"b47291b5-14e4-49c0-bb68-b7d50e3764d0"},{"parameters":{"method":"POST","url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","authentication":"genericCredentialType","genericAuthType":"httpBasicAuth","sendBody":true,"bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer Datos Entrada').first().json.fromNumber || 'whatsapp:' + $('Extraer Datos Entrada').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer Datos Entrada').first().json.toNumber }}"},{"name":"Body","value":"=Confirmamos tu turno para {{ $('Extraer JSON Turno').first().json.fecha_preferida }} a las {{ $('Extraer JSON Turno').first().json.horario_preferido }}. Te enviamos un recordatorio 24hs antes. Si necesitas cancelar o modificar, responde a este mensaje."}]},"options":{}},"name":"Twilio - Confirmacion Turno","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2032,656],"id":"10241f80-35b8-46f4-89c7-b73c41d117ce"},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Sos el asistente virtual del Consultorio Médico. El paciente quiere un turno pero no dijo fecha. Preguntale amablemente qué día y horario le gustaría. Sé breve, respondé en español argentino.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"El paciente {{ $('Extraer Datos Entrada').first().json.profileName }} dijo: {{ $('Extraer Datos Entrada').first().json.message }}. Preguntale qué fecha y horario prefiere.\\"\\n    }\\n  ]\\n}","options":{}},"name":"Sin Fecha - Preguntar Disponibilidad","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1760,432],"id":"41de74d9-a8ef-40e4-b877-012f587b7308"},{"parameters":{"assignments":{"assignments":[{"name":"responseText","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"name":"Extraer Pregunta Fecha","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[2000,432],"id":"89efa512-ca65-4fbd-be72-c55816dde435"},{"parameters":{"method":"POST","url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","authentication":"genericCredentialType","genericAuthType":"httpBasicAuth","sendBody":true,"bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer Datos Entrada').first().json.fromNumber || 'whatsapp:' + $('Extraer Datos Entrada').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer Datos Entrada').first().json.toNumber }}"},{"name":"Body","value":"={{ $json.responseText }}"}]},"options":{}},"name":"Twilio - Enviar WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2560,224],"id":"19c4cd53-d70c-40a6-b7d3-f6a883379227"},{"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Gestion Turnos', $2, 'info', $3);","options":{}},"name":"Guardar Log","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2864,336],"id":"78ef180f-a702-4148-8015-7d6496b3a70c"}]	{"Webhook - Solicitud Turno":{"main":[[{"node":"Validar Datos","type":"main","index":0}]]},"Validar Datos":{"main":[[{"node":"Extraer Datos Entrada","type":"main","index":0}],[{"node":"Guardar Log","type":"main","index":0}]]},"Extraer Datos Entrada":{"main":[[{"node":"Ollama - Extraer Info Turno","type":"main","index":0}]]},"Ollama - Extraer Info Turno":{"main":[[{"node":"Extraer JSON Turno","type":"main","index":0}]]},"Extraer JSON Turno":{"main":[[{"node":"Verificar Disponibilidad","type":"main","index":0}]]},"Verificar Disponibilidad":{"main":[[{"node":"Tiene Fecha Elegida?","type":"main","index":0}]]},"Tiene Fecha Elegida?":{"main":[[{"node":"Generar Franjas","type":"main","index":0}],[{"node":"Sin Fecha - Preguntar Disponibilidad","type":"main","index":0}]]},"Generar Franjas":{"main":[[{"node":"Ollama - Ofrecer Horarios","type":"main","index":0}]]},"Ollama - Ofrecer Horarios":{"main":[[{"node":"Extraer Respuesta Horarios","type":"main","index":0}]]},"Extraer Respuesta Horarios":{"main":[[{"node":"Twilio - Enviar WhatsApp","type":"main","index":0}]]},"Sin Fecha - Preguntar Disponibilidad":{"main":[[{"node":"Extraer Pregunta Fecha","type":"main","index":0}]]},"Extraer Pregunta Fecha":{"main":[[{"node":"Twilio - Enviar WhatsApp","type":"main","index":0}]]},"Crear Turno en DB":{"main":[[{"node":"Twilio - Confirmacion Turno","type":"main","index":0}]]},"Twilio - Confirmacion Turno":{"main":[[{"node":"Guardar Log","type":"main","index":0}]]},"Twilio - Enviar WhatsApp":{"main":[[{"node":"Guardar Log","type":"main","index":0}]]}}	2026-05-16 14:37:10.172+00	2026-05-16 22:11:54.378+00	{"executionOrder":"v1","binaryMode":"separate"}	\N	{}	e8210e33-6e80-4004-94ff-4e0ae1177b92	0	WvOx9QFZmgSikJRz	\N	\N	f	5	\N	\N
\.


--
-- Data for Name: workflow_history; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_history ("versionId", "workflowId", authors, "createdAt", "updatedAt", nodes, connections, name, autosaved, description) FROM stdin;
49075f16-591b-4d00-8309-19fd2d2df38a	15imVcRcLvE2JxXO	Leonardo Spedaletti	2026-05-16 14:22:04.049+00	2026-05-16 14:22:04.049+00	[{"parameters":{"triggerTimes":[{"mode":"everyDay","hour":8,"minute":0}]},"id":"1","name":"Cron Trigger","type":"n8n-nodes-base.cron","typeVersion":1,"position":[250,300]},{"parameters":{"method":"POST","url":"https://evolutionapi.aicorebots.com/message/sendText/bootwa","sendHeaders":true,"headerParameters":{"parameters":[{"name":"apikey","value":"enM31RmZWeq9FXg1UuulSB2QTw3jeLekmGWVYAPq7xWeeiOHuUPuNyMWbitbOfoyS6+zO8PmFqnLIMsQTk/wMg=="},{"name":"Content-Type","value":"application/json"}]},"specifyBody":"json","jsonBody":"{\\n  \\"number\\": \\"TU_NUMERO_DE_WHATSAPP_AQUI\\",\\n  \\"text\\": \\"¡Buenos días! Que tengas un excelente día.\\"\\n}"},"id":"2","name":"Enviar Buenos Días","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[500,300]}]	{"Cron Trigger":{"main":[[{"node":"Enviar Buenos Días","type":"main","index":0}]]}}	\N	f	\N
b54f7170-d4a4-4f02-8a1c-4aeb176c0c06	73g6uVf9fIsNHKV9	Leonardo Spedaletti	2026-05-16 14:22:06.939+00	2026-05-16 14:22:06.939+00	[{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"id":"3b4f78f3-3b1b-4c67-81ed-70da68c9a27e","leftValue":"={{ $json.body.event }}","rightValue":"messages.upsert","operator":{"type":"string","operation":"equals","name":"filter.operator.equals"}},{"id":"ab708dc3-a1cd-426e-ad86-9aa589b39ba7","leftValue":"={{ $json.body.data.key.fromMe }}","rightValue":"false","operator":{"type":"string","operation":"equals","name":"filter.operator.equals"}}],"combinator":"and"},"options":{"ignoreCase":false}},"type":"n8n-nodes-base.if","typeVersion":2.3,"position":[-96,16],"id":"825b03c6-ee5a-4c30-8f04-712912aeb0fe","name":"If"},{"parameters":{"promptType":"define","text":"={{ $json.body.data.message.conversation }}","messages":{"messageValues":[{"message":"Eres un asistente de atención al cliente. Responde siempre en español de forma concisa y amable."}]},"batching":{}},"type":"@n8n/n8n-nodes-langchain.chainLlm","typeVersion":1.9,"position":[112,-80],"id":"8e1a9904-d737-4754-9ab0-be66a0bb4bdb","name":"Basic LLM Chain"},{"parameters":{"model":"llama3.1:8b","options":{}},"type":"@n8n/n8n-nodes-langchain.lmChatOllama","typeVersion":1,"position":[208,128],"id":"a59f12e1-c4c1-4501-bd4e-0a4e0755b720","name":"Ollama Chat Model","credentials":{"ollamaApi":{"id":"wvOyfq9b69sMEzrF","name":"Ollama account"}}},{"parameters":{"method":"POST","url":"https://evolutionapi.aicorebots.com/message/sendText/bootwa","sendHeaders":true,"headerParameters":{"parameters":[{"name":"apikey","value":"enM31RmZWeq9FXg1UuulSB2QTw3jeLekmGWVYAPq7xWeeiOHuUPuNyMWbitbOfoyS6+zO8PmFqnLIMsQTk/wMg=="},{"name":"Content-Type","value":"application/json"}]},"sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"number\\": \\"{{ $('If').item.json.body.data.key.remoteJid }}\\",\\n  \\"text\\": \\"{{ $('Basic LLM Chain').item.json.text }}\\"\\n}","options":{}},"type":"n8n-nodes-base.httpRequest","typeVersion":4.4,"position":[464,-80],"id":"17d87334-2720-45ef-9f7a-df135d29bd5b","name":"HTTP Request"},{"parameters":{"httpMethod":"POST","path":"whatsapp","options":{}},"type":"n8n-nodes-base.webhook","typeVersion":2.1,"position":[-336,16],"id":"9e2ccd58-5264-4672-86a8-8beb029f8262","name":"Webhook","webhookId":"87d1b12e-23e3-4378-8c28-6a8ed3276f23"}]	{"If":{"main":[[{"node":"Basic LLM Chain","type":"main","index":0}]]},"Ollama Chat Model":{"ai_languageModel":[[{"node":"Basic LLM Chain","type":"ai_languageModel","index":0}]]},"Basic LLM Chain":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"Webhook":{"main":[[{"node":"If","type":"main","index":0}]]}}	\N	f	\N
e5aafd39-6d16-493c-a4e8-225bd11ea9db	QNTIAKk6qx8pAGZE	Leonardo Spedaletti	2026-05-16 14:22:20.054+00	2026-05-16 14:22:20.054+00	[{"parameters":{"httpMethod":"POST","path":"whatsapp-aicorebots","responseMode":"responseNode","options":{}},"id":"2ef1c403-c3b4-4524-9a5b-01d71102f775","name":"Webhook Evolution","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,0],"webhookId":"2870d88b-5095-4c21-8a57-f6640bdd90cf"},{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict","version":1},"conditions":[{"leftValue":"={{ $json.body.data.messageType }}","rightValue":"conversation","operator":{"type":"string","operation":"equals"}}],"combinator":"and"},"options":{}},"id":"0c0b796d-1727-4072-a0da-40516360b91a","name":"Solo mensajes de texto","type":"n8n-nodes-base.filter","typeVersion":2,"position":[224,0]},{"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.data.key.remoteJid.replace('@s.whatsapp.net', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.data.message.conversation }}","type":"string"},{"name":"pushName","value":"={{ $json.body.data.pushName }}","type":"string"},{"name":"instance","value":"={{ $json.body.instance }}","type":"string"}]},"options":{}},"id":"80e8d084-5d2b-4cda-97a5-5af65a0f3b35","name":"Extraer datos","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[448,0]},{"parameters":{"operation":"executeQuery","query":"SELECT role, content FROM whatsapp_memory WHERE phone = '{{ $json.phone }}' ORDER BY created_at DESC LIMIT 10","options":{}},"id":"9f501870-6a68-45ad-814d-abb11e3b4462","name":"Leer historial","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[672,0]},{"parameters":{"jsCode":"const history = $('Leer historial').all();\\nconst phone = $('Extraer datos').first().json.phone;\\nconst name = $('Extraer datos').first().json.pushName;\\nconst userMessage = $('Extraer datos').first().json.message;\\n\\n// Construir historial en formato Ollama\\nconst messages = history.reverse().map(item => ({\\n  role: item.json.role,\\n  content: item.json.content\\n}));\\n\\n// Agregar mensaje actual\\nmessages.push({ role: 'user', content: userMessage });\\n\\nreturn [{\\n  json: {\\n    phone,\\n    name,\\n    userMessage,\\n    messages,\\n    instance: $('Extraer datos').first().json.instance\\n  }\\n}];"},"id":"bc43548a-9d4f-4669-8086-d2aabcb2569a","name":"Construir contexto","type":"n8n-nodes-base.code","typeVersion":2,"position":[880,0]},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"bodyParameters":{"parameters":[{}]},"options":{}},"id":"cc00385c-f1a5-4d93-a634-07ddde054e99","name":"Ollama LLM","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1104,0]},{"parameters":{"assignments":{"assignments":[{"name":"aiResponse","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"id":"6f7bec51-849e-4dbc-9a54-fcd94e89d656","name":"Extraer respuesta IA","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1328,0]},{"parameters":{"operation":"executeQuery","query":"INSERT INTO whatsapp_memory (phone, role, content, created_at) VALUES ('{{ $('Construir contexto').first().json.phone }}', 'user', '{{ $('Construir contexto').first().json.userMessage.replace(\\"'\\", \\"''\\") }}', NOW()); INSERT INTO whatsapp_memory (phone, role, content, created_at) VALUES ('{{ $('Construir contexto').first().json.phone }}', 'assistant', '{{ $json.aiResponse.replace(\\"'\\", \\"''\\") }}', NOW());","options":{}},"id":"078be783-d67f-431c-895d-348b9de358b7","name":"Guardar en memoria","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1552,0]},{"parameters":{"method":"POST","url":"=https://evolutionapi.aicorebots.com/message/sendText/{{ $('Construir contexto').first().json.instance }}","sendHeaders":true,"headerParameters":{"parameters":[{"name":"apikey","value":"enM31RmZWeq9FXg1UuulSB2QTw3jeLekmGWVYAPq7xWeeiOHuUPuNyMWbitbOfoyS6+zO8PmFqnLIMsQTk/wMg=="},{"name":"Content-Type","value":"application/json"}]},"sendBody":true,"bodyParameters":{"parameters":[{}]},"options":{}},"id":"b8b70d2e-09ae-4e6d-b48a-705da8588818","name":"Enviar respuesta WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1760,0]},{"parameters":{"respondWith":"json","responseBody":"={ \\"status\\": \\"ok\\" }","options":{}},"id":"90ef894d-44e6-4698-9600-a5d638241879","name":"Responder webhook","type":"n8n-nodes-base.respondToWebhook","typeVersion":1.1,"position":[1984,0]}]	{"Webhook Evolution":{"main":[[{"node":"Solo mensajes de texto","type":"main","index":0}]]},"Solo mensajes de texto":{"main":[[{"node":"Extraer datos","type":"main","index":0}]]},"Extraer datos":{"main":[[{"node":"Leer historial","type":"main","index":0}]]},"Leer historial":{"main":[[{"node":"Construir contexto","type":"main","index":0}]]},"Construir contexto":{"main":[[{"node":"Ollama LLM","type":"main","index":0}]]},"Ollama LLM":{"main":[[{"node":"Extraer respuesta IA","type":"main","index":0}]]},"Extraer respuesta IA":{"main":[[{"node":"Guardar en memoria","type":"main","index":0}]]},"Guardar en memoria":{"main":[[{"node":"Enviar respuesta WhatsApp","type":"main","index":0}]]},"Enviar respuesta WhatsApp":{"main":[[{"node":"Responder webhook","type":"main","index":0}]]}}	\N	f	\N
a2df3ffe-d5c7-477c-8ca8-f2256fb46b44	RBfR8UYpm79FamiQ	Leonardo Spedaletti	2026-05-16 19:22:59.541+00	2026-05-16 19:22:59.541+00	[{"name":"Cron - Cada Hora","type":"n8n-nodes-base.cron","typeVersion":2,"position":[0,300],"parameters":{"triggerTimes":{"item":[{"mode":"everyHour","hour":0,"minute":0}]}},"id":"2756b9fa-e17f-4508-8768-751649e1793d"},{"name":"PG - Turnos Proximas 24hs","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,200],"parameters":{"operation":"executeQuery","query":"SELECT t.id, t.fecha_hora, t.estado, p.id as paciente_id, p.nombre, p.apellido, p.telefono, m.nombre as medico_nombre, '24h' as tipo FROM turnos t JOIN pacientes p ON p.id = t.paciente_id JOIN medicos m ON m.id = t.medico_id WHERE t.estado IN ('pendiente', 'confirmada') AND t.recordatorio_24h_enviado = FALSE AND t.fecha_hora BETWEEN NOW() AND NOW() + INTERVAL '24 hours' ORDER BY t.fecha_hora;","options":{}},"id":"ddb5de92-011b-4e1b-84d9-9ff787547c5a"},{"name":"PG - Turnos Proxima 1h","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,400],"parameters":{"operation":"executeQuery","query":"SELECT t.id, t.fecha_hora, t.estado, p.id as paciente_id, p.nombre, p.apellido, p.telefono, m.nombre as medico_nombre, '1h' as tipo FROM turnos t JOIN pacientes p ON p.id = t.paciente_id JOIN medicos m ON m.id = t.medico_id WHERE t.estado IN ('pendiente', 'confirmada') AND t.recordatorio_1h_enviado = FALSE AND t.fecha_hora BETWEEN NOW() AND NOW() + INTERVAL '1 hour' ORDER BY t.fecha_hora;","options":{}},"id":"464f3f0f-3e79-4c18-9f04-1d3987db811c"},{"name":"Combinar Recordatorios","type":"n8n-nodes-base.merge","typeVersion":2,"position":[500,300],"parameters":{"mode":"append"},"id":"d7e88610-5cfd-4dfe-a596-ba79df6a8957"},{"name":"Hay Turnos?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[750,300],"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $items().length }}","rightValue":"0","operator":{"type":"number","operation":"larger","name":"filter.operator.larger"}}],"combinator":"and"},"options":{}},"id":"9e123e35-dc81-43c0-bec4-f0081198d331"},{"name":"Enrutar por Tipo","type":"n8n-nodes-base.switch","typeVersion":2.3,"position":[1000,300],"parameters":{"dataType":"string","value1":"={{ $json.tipo }}","rules":[{"value2":"24h","output":0},{"value2":"1h","output":1}],"fallbackOutput":2},"id":"cf889b44-0e56-46d7-a13c-a0867cf28ff3"},{"name":"Generar Msg 24h","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1250,150],"parameters":{"assignments":{"assignments":[{"name":"recordatorioMensaje","value":"=Hola {{ $json.nombre }}! Te recordamos que tenes un turno manana {{ $json.fecha_hora }} con {{ $json.medico_nombre }}. Responde CONFIRMAR para confirmar tu asistencia. Gracias!","type":"string"}]},"options":{}},"id":"735a36bf-a9ba-4d85-9785-63017a38bab6"},{"name":"Twilio 24h","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,150],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"=whatsapp:+549{{ $json.telefono }}"},{"name":"From","value":""},{"name":"Body","value":"={{ $json.recordatorioMensaje }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"9e2f832b-e845-47f4-8463-5f6c85f03db5"},{"name":"PG Update 24h","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1750,150],"parameters":{"operation":"executeQuery","query":"UPDATE turnos SET recordatorio_24h_enviado = TRUE, updated_at = NOW() WHERE id = $1;","additionalFields":{"queryParams":"={{ [$json.id] }}"},"options":{}},"id":"e151b39e-3ff7-4d54-a3bf-b5e0c5fe6242"},{"name":"Generar Msg 1h","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1250,400],"parameters":{"assignments":{"assignments":[{"name":"recordatorioMensaje","value":"=Recordatorio: en 1 hora tenes turno con {{ $json.medico_nombre }}. Te esperamos!","type":"string"}]},"options":{}},"id":"d7cbc407-b42c-437a-8553-9d691f8d1ff7"},{"name":"Twilio 1h","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,400],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"=whatsapp:+549{{ $json.telefono }}"},{"name":"From","value":""},{"name":"Body","value":"={{ $json.recordatorioMensaje }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"8761f950-f86f-41c2-b936-340d43a9e220"},{"name":"PG Update 1h","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1750,400],"parameters":{"operation":"executeQuery","query":"UPDATE turnos SET recordatorio_1h_enviado = TRUE, updated_at = NOW() WHERE id = $1;","additionalFields":{"queryParams":"={{ [$json.id] }}"},"options":{}},"id":"d11ca1b7-b530-4021-b726-ca0a28a7b3fe"},{"name":"Generar Msg Default","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1250,550],"parameters":{"assignments":{"assignments":[{"name":"recordatorioMensaje","value":"=Recordatorio: tenes turno proximamente con {{ $json.medico_nombre }}.","type":"string"}]},"options":{}},"id":"c0e44ae1-d2f6-48cf-b7f9-417620633156"},{"name":"Twilio Default","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,550],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"=whatsapp:+549{{ $json.telefono }}"},{"name":"From","value":""},{"name":"Body","value":"={{ $json.recordatorioMensaje }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"545470f5-4c2a-4856-86bf-799ae3a5f378"},{"name":"PG Update Default","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1750,550],"parameters":{"operation":"executeQuery","query":"UPDATE turnos SET recordatorio_24h_enviado = TRUE, updated_at = NOW() WHERE id = $1;","additionalFields":{"queryParams":"={{ [$json.id] }}"},"options":{}},"id":"0331c653-e724-4a90-aa0b-11043049f049"},{"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,300],"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Recordatorios', $2, 'info', $3);","additionalFields":{"queryParams":"={{ ['workflow-03', $json.executionId || '', 'Recordatorio ' + $json.tipo + ' enviado a ' + $json.nombre] }}"},"options":{}},"id":"23e42316-a39d-46c5-80c2-ca4ead4ca0f9"}]	{"Cron - Cada Hora":{"main":[[{"node":"PG - Turnos Proximas 24hs","type":"main","index":0},{"node":"PG - Turnos Proxima 1h","type":"main","index":0}]]},"PG - Turnos Proximas 24hs":{"main":[[{"node":"Combinar Recordatorios","type":"main","index":0}]]},"PG - Turnos Proxima 1h":{"main":[[{"node":"Combinar Recordatorios","type":"main","index":1}]]},"Combinar Recordatorios":{"main":[[{"node":"Hay Turnos?","type":"main","index":0}]]},"Hay Turnos?":{"main":[[{"node":"Enrutar por Tipo","type":"main","index":0}],[]]},"Enrutar por Tipo":{"main":[[{"node":"Generar Msg 24h","type":"main","index":0}],[{"node":"Generar Msg 1h","type":"main","index":0}],[{"node":"Generar Msg Default","type":"main","index":0}]]},"Generar Msg 24h":{"main":[[{"node":"Twilio 24h","type":"main","index":0}]]},"Twilio 24h":{"main":[[{"node":"PG Update 24h","type":"main","index":0}]]},"PG Update 24h":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Generar Msg 1h":{"main":[[{"node":"Twilio 1h","type":"main","index":0}]]},"Twilio 1h":{"main":[[{"node":"PG Update 1h","type":"main","index":0}]]},"PG Update 1h":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Generar Msg Default":{"main":[[{"node":"Twilio Default","type":"main","index":0}]]},"Twilio Default":{"main":[[{"node":"PG Update Default","type":"main","index":0}]]},"PG Update Default":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	\N	f	\N
70f9ad61-9106-42be-9b42-ea50c715970f	UdQ7aw5SKAjlHolO	Leonardo Spedaletti	2026-05-16 19:23:01.457+00	2026-05-16 19:23:01.457+00	[{"name":"Cron - 7:00 AM","type":"n8n-nodes-base.cron","typeVersion":2,"position":[0,300],"parameters":{"triggerTimes":{"item":[{"mode":"everyDay","hour":7,"minute":0}]}},"id":"f8ec4b03-007f-45d7-ad63-3423c24be568"},{"name":"PG - Turnos de Hoy","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,100],"parameters":{"operation":"executeQuery","query":"SELECT t.fecha_hora, t.estado, t.motivo, t.tipo_consulta, p.nombre || ' ' || p.apellido as paciente_nombre, p.telefono as paciente_telefono, p.obra_social, 'turnos' as fuente FROM turnos t JOIN pacientes p ON p.id = t.paciente_id WHERE DATE(t.fecha_hora AT TIME ZONE 'America/Argentina/Buenos_Aires') = CURRENT_DATE AND t.medico_id = $1 ORDER BY t.fecha_hora;","additionalFields":{"queryParams":"={{ ['00000000-0000-0000-0000-000000000001'] }}"},"options":{}},"id":"4ec794c4-5c8d-4998-8cc0-607fc0c2f48f"},{"name":"PG - Pacientes Nuevos (24h)","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,300],"parameters":{"operation":"executeQuery","query":"SELECT nombre, apellido, telefono, obra_social, created_at, 'nuevos' as fuente FROM pacientes WHERE created_at >= NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;","options":{}},"id":"b0f124f5-4ff0-4ab5-a1fe-715c9957717c"},{"name":"PG - Mensajes sin Responder","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,500],"parameters":{"operation":"executeQuery","query":"SELECT c.id, p.nombre || ' ' || p.apellido as paciente, c.ultimo_mensaje, c.ultima_intencion, c.ultima_interaccion, 'mensajes' as fuente FROM conversaciones c JOIN pacientes p ON p.id = c.paciente_id WHERE c.estado = 'activa' AND c.ultima_interaccion < NOW() - INTERVAL '1 hour' ORDER BY c.ultima_interaccion DESC;","options":{}},"id":"e7ea3208-1f9f-414a-a54f-e9601e733082"},{"name":"PG - Recetas x Autorizar","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[250,700],"parameters":{"operation":"executeQuery","query":"SELECT r.medicamento, r.dosis, r.frecuencia, p.nombre || ' ' || p.apellido as paciente_nombre, r.created_at, 'recetas' as fuente FROM recetas r JOIN pacientes p ON p.id = r.paciente_id WHERE r.estado = 'activa' AND r.created_at >= NOW() - INTERVAL '48 hours' ORDER BY r.created_at DESC;","options":{}},"id":"fed5b6f4-bfc2-4e0e-aac9-281c42c98913"},{"name":"Merge 1 (Turnos+Nuevos)","type":"n8n-nodes-base.merge","typeVersion":2,"position":[500,200],"parameters":{"mode":"append"},"id":"21208b8c-e015-4b0a-8cd5-01bad63a6363"},{"name":"Merge 2 (+Mensajes)","type":"n8n-nodes-base.merge","typeVersion":2,"position":[750,250],"parameters":{"mode":"append"},"id":"587ff113-c99d-4cbb-83cd-f245fe2c70c3"},{"name":"Merge 3 (+Recetas)","type":"n8n-nodes-base.merge","typeVersion":2,"position":[1000,300],"parameters":{"mode":"append"},"id":"91756c1b-ab20-4858-926c-fffa6d74c34f"},{"name":"Consolidar Datos","type":"n8n-nodes-base.code","typeVersion":2,"position":[1250,300],"parameters":{"jsCode":"const allItems = $input.all();\\n\\nconst result = {\\n  turnos: [],\\n  nuevos: [],\\n  pendientes: [],\\n  recetas: []\\n};\\n\\nfor (const item of allItems) {\\n  const fuente = item.json.fuente;\\n  if (fuente === 'turnos') result.turnos.push(item.json);\\n  else if (fuente === 'nuevos') result.nuevos.push(item.json);\\n  else if (fuente === 'mensajes') result.pendientes.push(item.json);\\n  else if (fuente === 'recetas') result.recetas.push(item.json);\\n}\\n\\nreturn [{\\n  json: {\\n    turnos: result.turnos,\\n    nuevos: result.nuevos,\\n    pendientes: result.pendientes,\\n    recetas: result.recetas,\\n    totalTurnos: result.turnos.length,\\n    totalNuevos: result.nuevos.length,\\n    totalPendientes: result.pendientes.length,\\n    totalRecetas: result.recetas.length\\n  }\\n}];"},"id":"88e4a4dc-4bf1-419d-95d1-ecad75c56c71"},{"name":"Ollama - Generar Resumen","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,300],"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Sos un asistente medico que prepara el resumen diario para el doctor. Organiza la informacion de forma clara y profesional. Responde en espanol argentino.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Genera un resumen diario para el medico con esta informacion:\\\\n\\\\nTURNOS DE HOY ({{ $json.totalTurnos }}):\\\\n{{ JSON.stringify($json.turnos) }}\\\\n\\\\nPACIENTES NUEVOS ({{ $json.totalNuevos }}):\\\\n{{ JSON.stringify($json.nuevos) }}\\\\n\\\\nMENSAJES PENDIENTES ({{ $json.totalPendientes }}):\\\\n{{ JSON.stringify($json.pendientes) }}\\\\n\\\\nRECETAS RECIENTES ({{ $json.totalRecetas }}):\\\\n{{ JSON.stringify($json.recetas) }}\\\\n\\\\nFormatealo lindo para leer.\\"\\n    }\\n  ]\\n}","options":{}},"id":"2fcaf0bd-8fee-430e-b114-a5e5d3f6c965"},{"name":"Extraer Resumen","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1750,300],"parameters":{"assignments":{"assignments":[{"name":"resumenTexto","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"id":"571f2e1c-f347-4855-8005-9004606bb6a4"},{"name":"Email - Enviar Resumen","type":"n8n-nodes-base.emailSend","typeVersion":2,"position":[2000,200],"parameters":{"fromEmail":"","toEmail":"medico@consultorio.com","subject":"=Resumen Diario - {{ new Date().toLocaleDateString('es-AR') }}","text":"={{ $json.resumenTexto }}","options":{}},"id":"6af7851b-b4fa-446b-8a68-15da1d72e334","webhookId":"98dd4d31-28d5-42b3-ae6b-5f71850b129e"},{"name":"Twilio - Resumen WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2000,400],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"whatsapp:+5491155550000"},{"name":"From","value":""},{"name":"Body","value":"=Resumen del dia - Turnos hoy: {{ $('Consolidar Datos').first().json.totalTurnos }}, Pacientes nuevos: {{ $('Consolidar Datos').first().json.totalNuevos }}, Pendientes: {{ $('Consolidar Datos').first().json.totalPendientes }}, Recetas: {{ $('Consolidar Datos').first().json.totalRecetas }}. Revisa tu email para el detalle completo."}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"1e448fd7-bdce-4f27-b0c3-5827d08c2c89"},{"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2250,300],"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Resumen Diario', $2, 'info', $3);","additionalFields":{"queryParams":"={{ ['workflow-05', $json.executionId || '', 'Resumen enviado - Turnos: ' + $('Consolidar Datos').first().json.totalTurnos + ', Nuevos: ' + $('Consolidar Datos').first().json.totalNuevos + ', Pendientes: ' + $('Consolidar Datos').first().json.totalPendientes] }}"},"options":{}},"id":"2f199c35-4a0f-4467-848e-9079625f067a"}]	{"Cron - 7:00 AM":{"main":[[{"node":"PG - Turnos de Hoy","type":"main","index":0},{"node":"PG - Pacientes Nuevos (24h)","type":"main","index":0},{"node":"PG - Mensajes sin Responder","type":"main","index":0},{"node":"PG - Recetas x Autorizar","type":"main","index":0}]]},"PG - Turnos de Hoy":{"main":[[{"node":"Merge 1 (Turnos+Nuevos)","type":"main","index":0}]]},"PG - Pacientes Nuevos (24h)":{"main":[[{"node":"Merge 1 (Turnos+Nuevos)","type":"main","index":1}]]},"Merge 1 (Turnos+Nuevos)":{"main":[[{"node":"Merge 2 (+Mensajes)","type":"main","index":0}]]},"PG - Mensajes sin Responder":{"main":[[{"node":"Merge 2 (+Mensajes)","type":"main","index":1}]]},"Merge 2 (+Mensajes)":{"main":[[{"node":"Merge 3 (+Recetas)","type":"main","index":0}]]},"PG - Recetas x Autorizar":{"main":[[{"node":"Merge 3 (+Recetas)","type":"main","index":1}]]},"Merge 3 (+Recetas)":{"main":[[{"node":"Consolidar Datos","type":"main","index":0}]]},"Consolidar Datos":{"main":[[{"node":"Ollama - Generar Resumen","type":"main","index":0}]]},"Ollama - Generar Resumen":{"main":[[{"node":"Extraer Resumen","type":"main","index":0}]]},"Extraer Resumen":{"main":[[{"node":"Email - Enviar Resumen","type":"main","index":0}],[{"node":"Twilio - Resumen WhatsApp","type":"main","index":0}]]},"Email - Enviar Resumen":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Twilio - Resumen WhatsApp":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	\N	f	\N
ccf20995-269f-4ba5-bbf0-70753f7a793d	eSKU0aanf9NHfmPh	Leonardo Spedaletti	2026-05-16 19:23:02.281+00	2026-05-16 19:23:02.281+00	[{"name":"Webhook - Solicitud Receta","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,300],"parameters":{"httpMethod":"POST","path":"receta-solicitar","responseMode":"onReceived","options":{}},"id":"f2a5454f-6c63-45a6-99c1-d37e718e742d","webhookId":"6736e0dd-840b-4297-9f72-b82fb613bb45"},{"name":"Extraer Datos Solicitud","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[250,300],"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.phone || $json.body.From.replace('whatsapp:', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.message || $json.body.Body }}","type":"string"},{"name":"profileName","value":"={{ $json.body.profileName || $json.body.ProfileName || 'Paciente' }}","type":"string"},{"name":"fromNumber","value":"={{ $json.body.fromNumber || $json.body.From }}","type":"string"},{"name":"toNumber","value":"={{ $json.body.toNumber || $json.body.To }}","type":"string"}]},"options":{}},"id":"76e7c70d-9fd0-494b-93fc-77f8d2501f86"},{"name":"Ollama - Analizar Solicitud","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[500,300],"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Analizá la solicitud de receta del paciente. Respondé SOLO con JSON válido, sin explicación:\\\\n\\\\n{\\\\n  \\\\\\"es_renovacion\\\\\\": true o false,\\\\n  \\\\\\"medicamento\\\\\\": \\\\\\"nombre del medicamento o null\\\\\\",\\\\n  \\\\\\"dosis\\\\\\": \\\\\\"dosis o null\\\\\\",\\\\n  \\\\\\"frecuencia\\\\\\": \\\\\\"frecuencia o null\\\\\\",\\\\n  \\\\\\"tipo\\\\\\": \\\\\\"renovacion\\\\\\" o \\\\\\"nueva\\\\\\" o \\\\\\"consulta\\\\\\"\\\\n}\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Mensaje del paciente: {{ $('Extraer Datos Solicitud').first().json.message }}\\"\\n    }\\n  ]\\n}","options":{}},"id":"0c0c5547-f243-40ca-9eb4-87dde61393a6"},{"name":"Extraer JSON Receta","type":"n8n-nodes-base.code","typeVersion":2,"position":[750,300],"parameters":{"jsCode":"const ollamaResponse = $input.first().json.message.content;\\n\\nlet recetaData;\\ntry {\\n  recetaData = JSON.parse(ollamaResponse);\\n} catch (e) {\\n  const match = ollamaResponse.match(/\\\\{[\\\\s\\\\S]*\\\\}/);\\n  if (match) {\\n    try {\\n      recetaData = JSON.parse(match[0]);\\n    } catch (e2) {\\n      recetaData = { es_renovacion: false, medicamento: null, dosis: null, frecuencia: null, tipo: 'consulta' };\\n    }\\n  } else {\\n    recetaData = { es_renovacion: false, medicamento: null, dosis: null, frecuencia: null, tipo: 'consulta' };\\n  }\\n}\\n\\nreturn [{\\n  json: {\\n    es_renovacion: recetaData.es_renovacion === true,\\n    medicamento: recetaData.medicamento || null,\\n    dosis: recetaData.dosis || null,\\n    frecuencia: recetaData.frecuencia || null,\\n    tipo: recetaData.tipo || 'consulta',\\n    phone: $('Extraer Datos Solicitud').first().json.phone,\\n    profileName: $('Extraer Datos Solicitud').first().json.profileName,\\n    fromNumber: $('Extraer Datos Solicitud').first().json.fromNumber,\\n    toNumber: $('Extraer Datos Solicitud').first().json.toNumber\\n  }\\n}];"},"id":"3cab189f-6eca-4e70-bafd-b880f27b0eea"},{"name":"Es Renovacion?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[1000,300],"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.es_renovacion }}","rightValue":"true","operator":{"type":"string","operation":"equal","name":"filter.operator.equal"}}],"combinator":"and"},"options":{}},"id":"9ddf7f13-3915-4ec2-b5e5-576e626a7e61"},{"name":"PG - Buscar Receta Activa","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1250,150],"parameters":{"operation":"executeQuery","query":"SELECT r.*, p.nombre, p.apellido FROM recetas r JOIN pacientes p ON p.id = r.paciente_id WHERE p.telefono = $1 AND r.estado = 'activa' AND r.medicamento ILIKE '%' || $2 || '%' ORDER BY r.created_at DESC LIMIT 1;","additionalFields":{"queryParams":"={{ [$json.phone, $json.medicamento || ''] }}"},"options":{}},"id":"a39c0ddf-68b3-4d05-9b41-fd9479ff1645"},{"name":"PG - Crear Receta Renovacion","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1500,150],"parameters":{"operation":"executeQuery","query":"INSERT INTO recetas (paciente_id, medico_id, medicamento, dosis, frecuencia, duracion, indicaciones, estado, receta_anterior_id) VALUES ((SELECT id FROM pacientes WHERE telefono = $1 LIMIT 1), '00000000-0000-0000-0000-000000000001', $2, $3, $4, '30 dias', 'Renovacion automatica. Misma indicacion que receta anterior.', 'pendiente', $5) RETURNING id;","additionalFields":{"queryParams":"={{ [$('Extraer JSON Receta').first().json.phone, $('Extraer JSON Receta').first().json.medicamento, $('Extraer JSON Receta').first().json.dosis || '', $('Extraer JSON Receta').first().json.frecuencia || 'segun indicacion medica', $json.id || ''] }}"},"options":{}},"id":"8e2f9a26-8399-4033-b2f7-b91fc89f08e3"},{"name":"Twilio - Confirmar Renovacion","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1750,150],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer JSON Receta').first().json.fromNumber || 'whatsapp:' + $('Extraer JSON Receta').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer JSON Receta').first().json.toNumber }}"},{"name":"Body","value":"=Hola {{ $('Extraer JSON Receta').first().json.profileName }}! Renovamos tu receta de {{ $('Extraer JSON Receta').first().json.medicamento }}. El medico la va a revisar y te la enviamos por WhatsApp en cuanto este lista. Saludos!"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"f671381f-3d10-490f-a617-02dc39f8a73e"},{"name":"Notificar al Medico x Receta Nueva","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1250,480],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"whatsapp:+5491155550000"},{"name":"From","value":"={{ $('Extraer JSON Receta').first().json.toNumber }}"},{"name":"Body","value":"=Solicitud de receta NUEVA de {{ $('Extraer JSON Receta').first().json.profileName }}: {{ $('Extraer JSON Receta').first().json.medicamento || 'sin especificar' }}. Revisa el dashboard para autorizar."}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"89042b3c-5a2a-433b-aa0b-a99fbf3735fb"},{"name":"Twilio - Respuesta Pendiente","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1500,480],"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer JSON Receta').first().json.fromNumber || 'whatsapp:' + $('Extraer JSON Receta').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer JSON Receta').first().json.toNumber }}"},{"name":"Body","value":"=Hola {{ $('Extraer JSON Receta').first().json.profileName }}! Recibimos tu solicitud de receta. El medico la va a revisar y te avisamos cuando este lista."}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"id":"f809acea-fef7-4eda-b3d6-836419b54445"},{"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,300],"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Recetas', $2, 'info', $3);","additionalFields":{"queryParams":"={{ ['workflow-06', $json.executionId || '', 'Receta procesada para ' + $('Extraer JSON Receta').first().json.phone + ': ' + ($('Extraer JSON Receta').first().json.es_renovacion ? 'renovacion' : 'nueva') + ' - ' + ($('Extraer JSON Receta').first().json.medicamento || 'sin especificar')] }}"},"options":{}},"id":"d7e2d176-847e-4cff-b527-c0b87d91efb2"}]	{"Webhook - Solicitud Receta":{"main":[[{"node":"Extraer Datos Solicitud","type":"main","index":0}]]},"Extraer Datos Solicitud":{"main":[[{"node":"Ollama - Analizar Solicitud","type":"main","index":0}]]},"Ollama - Analizar Solicitud":{"main":[[{"node":"Extraer JSON Receta","type":"main","index":0}]]},"Extraer JSON Receta":{"main":[[{"node":"Es Renovacion?","type":"main","index":0}]]},"Es Renovacion?":{"main":[[{"node":"PG - Buscar Receta Activa","type":"main","index":0}],[{"node":"Notificar al Medico x Receta Nueva","type":"main","index":0}]]},"PG - Buscar Receta Activa":{"main":[[{"node":"PG - Crear Receta Renovacion","type":"main","index":0}]]},"PG - Crear Receta Renovacion":{"main":[[{"node":"Twilio - Confirmar Renovacion","type":"main","index":0}]]},"Twilio - Confirmar Renovacion":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]},"Notificar al Medico x Receta Nueva":{"main":[[{"node":"Twilio - Respuesta Pendiente","type":"main","index":0}]]},"Twilio - Respuesta Pendiente":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	\N	f	\N
b3578f73-a50f-402e-84e0-587f2a12e374	y3yvu3BjJbzA5qvp	Leonardo Spedaletti	2026-05-16 19:50:26.222+00	2026-05-16 19:50:26.222+00	[{"name":"Set Input","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[0,300],"parameters":{"assignments":{"assignments":[{"name":"test_id","value":123,"type":"number"},{"name":"test_name","value":"Test","type":"string"}]},"options":{}},"id":"b53dc985-dc97-4e77-ac22-f90a1c58035b"},{"name":"PG Test","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[256,300],"parameters":{"operation":"executeQuery","query":"SELECT $1 as param1, $2 as param2;","options":{}},"id":"a933531e-c9ca-43a3-a6d4-467f835da537"}]	{"Set Input":{"main":[[{"node":"PG Test","type":"main","index":0}]]}}	\N	f	\N
87c008c7-96af-4b05-95f9-4a665680c318	ipjgKLDCFpzCbm9M	Leonardo Spedaletti	2026-05-16 19:57:57.506+00	2026-05-16 19:57:57.506+00	[{"parameters":{"criteria":"UNSEEN","options":{"format":"text","downloadAttachments":false}},"name":"IMAP - Email Entrante","type":"n8n-nodes-base.emailReadImap","typeVersion":2,"position":[0,300],"id":"509f8bec-e5a3-4576-9f15-84e638944cb1"},{"parameters":{"assignments":{"assignments":[{"name":"emailFrom","value":"={{ $json.from }}","type":"string"},{"name":"emailSubject","value":"={{ $json.subject }}","type":"string"},{"name":"emailBody","value":"={{ $json.textPlain }}","type":"string"},{"name":"emailId","value":"={{ $json.id }}","type":"string"}]},"options":{}},"name":"Extraer Datos Email","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[250,300],"id":"e24233d4-0306-4559-88d2-336babdcedb1"},{"parameters":{"model":"mistral","baseUrl":"http://ollama:11434","options":{"temperature":0.3}},"name":"Ollama Chat Model","type":"@n8n/n8n-nodes-langchain.lmChatOllama","typeVersion":1,"position":[500,80],"id":"10f73961-44dd-43a0-843d-86f1d060a0c3"},{"parameters":{"agentType":"conversational","systemMessage":"={{ 'Sos el asistente de gestión de correo del Consultorio Médico.\\n\\n=== EMAIL RECIBIDO ===\\nDe: ' + $json.emailFrom + '\\nAsunto: ' + $json.emailSubject + '\\nFecha: ' + ($json.emailDate || '') + '\\nCuerpo: ' + ($json.emailBody || '').substring(0, 2000) + '\\n\\n=== INSTRUCCIONES ===\\nClasificá el email y determiná la acción. Respondé en español argentino, tono profesional.\\n\\nAl final de tu respuesta, agregá SOLAMENTE este bloque JSON:\\n###EMAIL_ACTION###\\n{\\"clasificacion\\": \\"GENERAL\\", \\"accion\\": \\"responder\\", \\"borrador\\": \\"...\\", \\"motivo\\": \\"...\\"}\\n###FIN###\\n\\nCLASIFICACION:\\n- URGENTE: emergencia, dolor fuerte, síntomas graves\\n- SPAM: publicidad, newsletter, no relacionado\\n- RECETA: solicitud de receta o renovación\\n- CONSULTA_TURNO: pregunta sobre turnos, horarios\\n- CONSULTA_GENERAL: otra consulta médica o administrativa\\n- OTRO: no aplica\\n\\nACCION:\\n- notificar_whatsapp: para URGENTE → se notifica al médico vía WhatsApp\\n- mover_spam: para SPAM → se mueve a spam\\n- redactar_borrador: para todo lo demás → se guarda borrador de respuesta\\n\\nBORRADOR: (solo si accion=redactar_borrador)\\nRedactá una respuesta profesional en español argentino. Saludá cordialmente, respondé a la consulta y despedite.\\nNo uses el borrador si acción es notificar_whatsapp o mover_spam.' }}","options":{}},"name":"AI Agent","type":"@n8n/n8n-nodes-langchain.agent","typeVersion":1,"position":[750,300],"id":"220e1640-1c86-4f7b-badd-cafca4fb1435"},{"parameters":{"assignments":{"assignments":[{"name":"agentOutput","value":"={{ $json.output }}","type":"string"}]},"options":{}},"name":"Extraer Output del Agente","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[1000,300],"id":"49a9c9b5-3e32-4070-94ea-ffac08958ad2"},{"parameters":{"code":"// Obtener la respuesta del agente\\nconst rawText = $input.first().json.agentOutput || $input.first().json.output || '';\\nconst extraer = $(\\"Extraer Datos Email\\").first().json;\\n\\n// Helper para escapar SQL\\nconst esc = (s) => (s || '').replace(/'/g, \\"''\\");\\n\\n// Buscar acción estructurada\\nconst actionMatch = rawText.match(/###EMAIL_ACTION###\\\\n([\\\\s\\\\S]*?)\\\\n###FIN###/);\\nlet accion = null;\\nlet textoLimpio = rawText;\\nlet clasificacion = 'GENERAL';\\nlet accionTipo = 'redactar_borrador';\\nlet borradorTexto = '';\\n\\nif (actionMatch) {\\n  try {\\n    accion = JSON.parse(actionMatch[1].trim());\\n    clasificacion = accion.clasificacion || 'GENERAL';\\n    accionTipo = accion.accion || 'redactar_borrador';\\n    borradorTexto = accion.borrador || '';\\n    textoLimpio = rawText.replace(/###EMAIL_ACTION###[\\\\s\\\\S]*?###FIN###/, '').trim();\\n  } catch (e) {\\n    console.error('Error parseando acción:', e);\\n  }\\n}\\n\\n// Construir SQLs\\nconst sqlLog = `INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ('workflow-04', 'Correo Inteligente', '${$execution.id}', '${esc(clasificacion)}', '${esc('Email clasificado como ' + clasificacion + ': ' + (extraer.emailSubject || '').substring(0, 100))}');`;\\n\\nconst sqlAccion = `INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ('workflow-04', 'Correo Inteligente', '${$execution.id}', '${esc(accionTipo)}', '${esc('ACCION: ' + accionTipo + ' | ' + JSON.stringify({clasificacion, accionTipo, motivo: accion?.motivo || ''}))}');`;\\n\\nreturn [{\\n  clasificacion: clasificacion,\\n  accionTipo: accionTipo,\\n  borradorRespuesta: borradorTexto,\\n  textoLimpio: textoLimpio,\\n  sqlLog: sqlLog,\\n  sqlAccion: sqlAccion,\\n  // Preservar datos del email\\n  emailFrom: extraer.emailFrom,\\n  emailSubject: extraer.emailSubject,\\n  emailBody: extraer.emailBody,\\n  emailId: extraer.emailId\\n}];","options":{}},"name":"Parsear Email","type":"n8n-nodes-base.code","typeVersion":2,"position":[1250,300],"id":"28298ad0-ede5-49c0-becd-eb9e727646f9"},{"parameters":{"dataType":"string","value1":"={{ $json.accionTipo }}","rules":[{"value2":"notificar_whatsapp","output":0},{"value2":"mover_spam","output":1}],"fallbackOutput":2},"name":"Enrutar por Accion","type":"n8n-nodes-base.switch","typeVersion":2.3,"position":[1500,300],"id":"0f91e447-ce25-47ce-a18c-ceb10c8ef64f"},{"parameters":{"options":{},"url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","bodyParameters":{"parameters":[{"name":"To","value":"whatsapp:+5491155550000"},{"name":"From","value":""},{"name":"Body","value":"={{ 'URGENTE - Email de ' + $('Parsear Email').first().json.emailFrom + ': ' + $('Parsear Email').first().json.emailSubject + '. Revisá la bandeja de entrada.' }}"}]},"method":"POST","authentication":"genericCredentialType","sendBody":true,"genericAuthType":"httpBasicAuth"},"name":"Twilio - Notificar Urgente","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1750,60],"id":"a1531860-20b7-4887-a7ab-22ab8db80c41"},{"parameters":{"options":{"moveToSpam":true}},"name":"Mover a Spam","type":"n8n-nodes-base.emailSend","typeVersion":2,"position":[1750,300],"id":"cc543fe0-58b8-4269-aa5f-ac8b24a4f091","webhookId":"28ee586c-19d1-44ee-a7d2-0d2ce093c7a6"},{"parameters":{"options":{"saveToDrafts":true,"draftSubject":"={{ 'Re: ' + $('Extraer Datos Email').first().json.emailSubject }}","draftBody":"={{ $json.borradorRespuesta }}"}},"name":"Guardar Borrador Respuesta","type":"n8n-nodes-base.emailSend","typeVersion":2,"position":[1750,540],"id":"cbf340e8-a000-495d-8a58-84f960e13ce1","webhookId":"be1c1396-7f78-475f-9088-4ca5b2782b45"},{"parameters":{"operation":"executeQuery","query":"={{ $json.sqlLog }}","options":{}},"name":"Log Clasificacion","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,400],"id":"572bc884-76b6-4bf7-ba0f-f9e830d5d1bb"},{"parameters":{"operation":"executeQuery","query":"={{ $json.sqlAccion }}","options":{}},"name":"Log Accion","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2000,550],"id":"08bbe21c-9301-4506-b87e-acae0ff5106f"}]	{"IMAP - Email Entrante":{"main":[[{"node":"Extraer Datos Email","type":"main","index":0}]]},"Extraer Datos Email":{"main":[[{"node":"AI Agent","type":"main","index":0}]]},"Ollama Chat Model":{"ai_languageModel":[[{"node":"AI Agent","type":"ai_languageModel","index":0}]]},"AI Agent":{"main":[[{"node":"Extraer Output del Agente","type":"main","index":0}]]},"Extraer Output del Agente":{"main":[[{"node":"Parsear Email","type":"main","index":0}]]},"Parsear Email":{"main":[[{"node":"Enrutar por Accion","type":"main","index":0}]]},"Enrutar por Accion":{"main":[[{"node":"Twilio - Notificar Urgente","type":"main","index":0}],[{"node":"Mover a Spam","type":"main","index":0}],[{"node":"Guardar Borrador Respuesta","type":"main","index":0}]]},"Twilio - Notificar Urgente":{"main":[[{"node":"Log Clasificacion","type":"main","index":0}]]},"Mover a Spam":{"main":[[{"node":"Log Clasificacion","type":"main","index":0}]]},"Guardar Borrador Respuesta":{"main":[[{"node":"Log Clasificacion","type":"main","index":0}]]},"Log Clasificacion":{"main":[[{"node":"Log Accion","type":"main","index":0}]]}}	\N	f	\N
bb9b1667-0bfa-4ea3-acce-8631352b98b6	7gJaxias01SkCSFx	Leonardo Spedaletti	2026-05-16 20:19:41.232+00	2026-05-16 20:19:41.232+00	[{"parameters":{"httpMethod":"POST","path":"consultorio-inbound","options":{}},"name":"Webhook - Twilio WhatsApp","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,304],"webhookId":"b9e6ab70-db5d-4ad3-b52e-50460c2025c9","id":"6c50c483-bde2-4138-8276-80bee4fe008c"},{"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.body.Body }}","rightValue":"","operator":{"type":"string","operation":"isNotEmpty","name":"filter.operator.isNotEmpty"}}],"combinator":"and"},"options":{}},"name":"Validar Mensaje","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[256,304],"id":"f45fc35e-2355-4097-9659-0d98453c27f0"},{"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.From.replace('whatsapp:', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.Body }}","type":"string"},{"name":"profileName","value":"={{ $json.body.ProfileName || 'Paciente' }}","type":"string"},{"name":"twilioSid","value":"={{ $json.body.SmsSid }}","type":"string"},{"name":"toNumber","value":"={{ $json.body.To }}","type":"string"},{"name":"fromNumber","value":"={{ $json.body.From }}","type":"string"}]},"options":{}},"name":"Extraer Datos","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[512,304],"id":"a051e40d-7aa6-41bc-8f82-61ede9131fd4"},{"parameters":{"operation":"executeQuery","query":"INSERT INTO pacientes (telefono, nombre, apellido, fuente, consentimiento_whatsapp) VALUES ($1, $2, '', 'whatsapp', TRUE) ON CONFLICT (telefono) DO UPDATE SET updated_at = NOW() RETURNING id, telefono, nombre, apellido, email, tags, canal_preferido;","options":{}},"name":"Obtener o Crear Paciente","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[768,304],"id":"16cc9f48-a489-40f6-ad46-e9c42a192374"},{"parameters":{"operation":"executeQuery","query":"{{ 'SELECT t.id, t.fecha, t.hora_inicio, t.hora_fin, t.motivo, t.estado, m.nombre AS medico_nombre, m.especialidad FROM turnos t JOIN medicos m ON t.medico_id = m.id WHERE t.paciente_id = ' + $(\\"Obtener o Crear Paciente\\").first().json.id + ' AND t.fecha >= CURRENT_DATE ORDER BY t.fecha, t.hora_inicio LIMIT 5' }}","options":{}},"name":"Consultar Turnos del Paciente","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1024,304],"id":"90878f2a-2ecf-4301-8786-dbfb394140c8"},{"parameters":{"operation":"executeQuery","query":"{{ 'SELECT r.id, r.medicamento, r.dosis, r.indicaciones, r.fecha_emision, r.fecha_vencimiento, r.estado FROM recetas r WHERE r.paciente_id = ' + $(\\"Obtener o Crear Paciente\\").first().json.id + ' ORDER BY r.fecha_emision DESC LIMIT 10' }}","options":{}},"name":"Consultar Recetas Activas","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1280,304],"id":"a43b86f9-a3e7-4951-a6a7-aaf4b7ab402d"},{"parameters":{},"name":"Construir Contexto Paciente","type":"n8n-nodes-base.code","typeVersion":2,"position":[1536,304],"id":"a5dd5658-5939-4927-aa42-0e96f2842c17"},{"parameters":{"model":"mistral","options":{"temperature":0.3}},"name":"Ollama Chat Model","type":"@n8n/n8n-nodes-langchain.lmChatOllama","typeVersion":1,"position":[1808,80],"id":"e702d643-5200-4c2d-9163-c0dd19f45370","credentials":{"ollamaApi":{"id":"wvOyfq9b69sMEzrF","name":"Ollama account"}}},{"parameters":{"sessionKey":"={{ $('Extraer Datos').first().json.phone }}","contextWindowLength":10},"name":"Postgres Chat Memory","type":"@n8n/n8n-nodes-langchain.memoryPostgres","typeVersion":1,"position":[1808,528],"id":"0c5b8f73-ccef-4abd-ac23-f3df3e42d301"},{"parameters":{"options":{}},"name":"AI Agent","type":"@n8n/n8n-nodes-langchain.agent","typeVersion":1,"position":[1824,304],"id":"d51f7ed9-b335-4fcb-978a-6ff4341c933f"},{"parameters":{"assignments":{"assignments":[{"name":"agentOutput","value":"={{ $json.output }}","type":"string"}]},"options":{}},"name":"Extraer Output del Agente","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[2384,304],"id":"73cf9f80-8381-4ff4-a251-58be074bd9a1"},{"parameters":{},"name":"Parsear y Preparar","type":"n8n-nodes-base.code","typeVersion":2,"position":[2608,304],"id":"0fea1e78-2ad3-4d5d-806a-66620f5fda51"},{"parameters":{"method":"POST","url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","authentication":"genericCredentialType","genericAuthType":"httpBasicAuth","sendQuery":true,"queryParameters":{"parameters":[{"name":"From","value":"={{ $json.toNumber }}"},{"name":"To","value":"={{ $json.fromNumber }}"},{"name":"Body","value":"={{ $json.responseText }}"}]},"sendBody":true,"bodyParameters":{"parameters":[{}]},"options":{}},"name":"Twilio - Enviar WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2864,304],"id":"a1799298-422a-4e39-929b-42bad17dc9cb"},{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.tieneAccion }}","rightValue":true,"operator":{"type":"boolean","operation":"equals"}}],"combinator":"and"},"options":{}},"name":"Hay Accion?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[3104,304],"id":"b51ee8a3-5f86-4929-a360-8b6b4f1b2aed"},{"parameters":{"operation":"executeQuery","query":"{{ $json.sqlAccion }}","options":{}},"name":"Registrar Accion Pendiente","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[3360,112],"id":"25920fb0-9a17-4d7e-bc0d-89881f68109d"},{"parameters":{"operation":"executeQuery","query":"{{ $json.sqlGuardar }}","options":{}},"name":"Guardar Conversacion en DB","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[3360,352],"id":"ec27e244-1431-46d1-92a2-88c0dc917dfc"},{"parameters":{"operation":"executeQuery","query":"{{ $json.sqlLog }}","options":{}},"name":"Log a PostgreSQL","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[3360,560],"id":"99bcdeeb-2244-4f4e-8c25-b382c9b12225"}]	{"Webhook - Twilio WhatsApp":{"main":[[{"node":"Validar Mensaje","type":"main","index":0}]]},"Validar Mensaje":{"main":[[{"node":"Extraer Datos","type":"main","index":0}],[]]},"Extraer Datos":{"main":[[{"node":"Obtener o Crear Paciente","type":"main","index":0}]]},"Obtener o Crear Paciente":{"main":[[{"node":"Consultar Turnos del Paciente","type":"main","index":0}]]},"Consultar Turnos del Paciente":{"main":[[{"node":"Consultar Recetas Activas","type":"main","index":0}]]},"Consultar Recetas Activas":{"main":[[{"node":"Construir Contexto Paciente","type":"main","index":0}]]},"Construir Contexto Paciente":{"main":[[{"node":"AI Agent","type":"main","index":0}]]},"Ollama Chat Model":{"ai_languageModel":[[{"node":"AI Agent","type":"ai_languageModel","index":0}]]},"Postgres Chat Memory":{"ai_memory":[[{"node":"AI Agent","type":"ai_memory","index":0}]]},"AI Agent":{"main":[[{"node":"Extraer Output del Agente","type":"main","index":0}]]},"Extraer Output del Agente":{"main":[[{"node":"Parsear y Preparar","type":"main","index":0}]]},"Parsear y Preparar":{"main":[[{"node":"Twilio - Enviar WhatsApp","type":"main","index":0}]]},"Twilio - Enviar WhatsApp":{"main":[[{"node":"Hay Accion?","type":"main","index":0}]]},"Hay Accion?":{"main":[[{"node":"Registrar Accion Pendiente","type":"main","index":0}],[{"node":"Guardar Conversacion en DB","type":"main","index":0}]]},"Registrar Accion Pendiente":{"main":[[{"node":"Guardar Conversacion en DB","type":"main","index":0}]]},"Guardar Conversacion en DB":{"main":[[{"node":"Log a PostgreSQL","type":"main","index":0}]]}}	\N	t	\N
e8210e33-6e80-4004-94ff-4e0ae1177b92	WvOx9QFZmgSikJRz	Leonardo Spedaletti	2026-05-16 22:11:54.38+00	2026-05-16 22:11:54.38+00	[{"parameters":{"httpMethod":"POST","path":"turno-solicitar","options":{}},"name":"Webhook - Solicitud Turno","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[0,304],"id":"912d0143-fc59-432a-ba03-3472f570a329","webhookId":"e84aba8b-373e-4d37-ad45-293aba94e5d6"},{"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $json.body.phone || $json.body.From }}","rightValue":"","operator":{"type":"string","operation":"isNotEmpty","name":"filter.operator.isNotEmpty"}}],"combinator":"and"},"options":{}},"name":"Validar Datos","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[256,304],"id":"016b1333-6da4-42af-bf42-71c47d4f3736"},{"parameters":{"assignments":{"assignments":[{"name":"phone","value":"={{ $json.body.phone || $json.body.From.replace('whatsapp:', '') }}","type":"string"},{"name":"message","value":"={{ $json.body.message || $json.body.Body }}","type":"string"},{"name":"profileName","value":"={{ $json.body.profileName || $json.body.ProfileName || 'Paciente' }}","type":"string"},{"name":"pacienteId","value":"={{ $json.body.pacienteId || '' }}","type":"string"},{"name":"toNumber","value":"={{ $json.body.toNumber || $json.body.To }}","type":"string"},{"name":"fromNumber","value":"={{ $json.body.fromNumber || $json.body.From }}","type":"string"}]},"options":{}},"name":"Extraer Datos Entrada","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[512,304],"id":"7354b08e-e899-4e78-b2c7-9a6e644e9521"},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Extraé la información del pedido de turno del paciente. Respondé SOLO con JSON válido, sin explicación:\\n\\n{\\n  \\"motivo\\": \\"motivo de la consulta\\",\\n  \\"fecha_preferida\\": \\"fecha que menciona o null\\",\\n  \\"horario_preferido\\": \\"horario o null\\",\\n  \\"medico_preferido\\": \\"médico o null\\",\\n  \\"tipo_consulta\\": \\"presencial o virtual o domicilio\\"\\n}\\n\\nSi no hay suficiente información, poné null en los campos que faltan.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Mensaje del paciente: {{ $('Extraer Datos Entrada').first().json.message }}\\"\\n    }\\n  ]\\n}","options":{}},"name":"Ollama - Extraer Info Turno","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[752,304],"id":"2755dcaa-0a00-4799-98f0-8cb1bd006c31"},{"parameters":{"jsCode":"const ollamaResponse = $input.first().json.message.content;\\n\\nlet turnoData;\\ntry {\\n  // Intentar parsear JSON directamente\\nturnoData = JSON.parse(ollamaResponse);\\n} catch (e) {\\n  // Buscar JSON entre llaves\\nconst match = ollamaResponse.match(/\\\\{[\\\\s\\\\S]*\\\\}/);\\nif (match) {\\n  try {\\nturnoData = JSON.parse(match[0]);\\n} catch (e2) {\\nturnoData = { motivo: ollamaResponse, fecha_preferida: null, horario_preferido: null, medico_preferido: null, tipo_consulta: 'presencial' };\\n}\\n  } else {\\nturnoData = { motivo: ollamaResponse, fecha_preferida: null, horario_preferido: null, medico_preferido: null, tipo_consulta: 'presencial' };\\n}\\n}\\n\\nreturn [{\\n  json: {\\n    motivo: turnoData.motivo || 'consulta',\\n    fecha_preferida: turnoData.fecha_preferida || null,\\n    horario_preferido: turnoData.horario_preferido || null,\\n    medico_preferido: turnoData.medico_preferido || null,\\n    tipo_consulta: turnoData.tipo_consulta || 'presencial',\\n    phone: $('Extraer Datos Entrada').first().json.phone,\\n    profileName: $('Extraer Datos Entrada').first().json.profileName,\\n    pacienteId: $('Extraer Datos Entrada').first().json.pacienteId\\n  }\\n}];"},"name":"Extraer JSON Turno","type":"n8n-nodes-base.code","typeVersion":2,"position":[1008,304],"id":"92b8ce9a-a912-424a-95e9-08c550cea87e"},{"parameters":{"operation":"executeQuery","query":"SELECT fecha_hora, duracion_minutos FROM turnos WHERE medico_id = $1 AND estado IN ('pendiente', 'confirmada') AND DATE(fecha_hora) = $2 ORDER BY fecha_hora;","options":{}},"name":"Verificar Disponibilidad","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1264,304],"id":"bbc7ac64-bc64-4494-a6b9-d6528532a8ea"},{"parameters":{"conditions":{"options":{"caseSensitive":false,"leftValue":"","typeValidation":"strict","version":3},"conditions":[{"leftValue":"={{ $('Extraer JSON Turno').first().json.fecha_preferida }}","rightValue":"null","operator":{"type":"string","operation":"notEqual","name":"filter.operator.notEqual"}}],"combinator":"and"},"options":{}},"name":"Tiene Fecha Elegida?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[1504,304],"id":"d5d390d7-b43a-45bb-8f83-4217aa81bcd2"},{"parameters":{"jsCode":"const slotsOcupados = $input.all();\\nconst occupiedTimes = slotsOcupados.map(s => {\\n  const d = new Date(s.json.fecha_hora);\\n  return d.getHours() * 60 + d.getMinutes();\\n});\\n\\nconst slotsDisponibles = [];\\n// Franjas de 9:00 a 17:00, turnos de 30 min\\nfor (let h = 9; h < 17; h++) {\\n  for (let m = 0; m < 60; m += 30) {\\n    const minutos = h * 60 + m;\\n    if (!occupiedTimes.includes(minutos)) {\\n      slotsDisponibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);\\n    }\\n  }\\n}\\n\\nreturn [{\\n  json: {\\n    slots: slotsDisponibles.slice(0, 6),\\n    fecha: $('Extraer JSON Turno').first().json.fecha_preferida,\\n    motivo: $('Extraer JSON Turno').first().json.motivo,\\n    tipo_consulta: $('Extraer JSON Turno').first().json.tipo_consulta\\n  }\\n}];"},"name":"Generar Franjas","type":"n8n-nodes-base.code","typeVersion":2,"position":[1760,208],"id":"7db9b028-34b4-449a-a1bb-ecbf820633a8"},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Sos el asistente virtual del Consultorio Médico. Te van a pasar horarios disponibles y tenés que ofrecerlos al paciente de forma amable, pidiendo que elija uno. Sé breve y clara. Respondé en español argentino.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"Horarios disponibles para el {{ $('Generar Franjas').first().json.fecha }}: {{ $('Generar Franjas').first().json.slots.join(', ') }}. Ofrecé estas opciones al paciente.\\"\\n    }\\n  ]\\n}","options":{}},"name":"Ollama - Ofrecer Horarios","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2000,208],"id":"b98d4549-9e48-40e4-a460-a666d362f05a"},{"parameters":{"assignments":{"assignments":[{"name":"responseText","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"name":"Extraer Respuesta Horarios","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[2256,208],"id":"cf89c6f0-a042-48d9-b22e-bdda3d46a120"},{"parameters":{"operation":"executeQuery","query":"INSERT INTO turnos (paciente_id, medico_id, fecha_hora, duracion_minutos, motivo, estado, tipo_consulta, fuente, notas_paciente) VALUES ($1, $2, $3, 30, $4, 'pendiente', $5, 'whatsapp', $6) RETURNING id, fecha_hora;","options":{}},"name":"Crear Turno en DB","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[1760,656],"id":"b47291b5-14e4-49c0-bb68-b7d50e3764d0"},{"parameters":{"method":"POST","url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","authentication":"genericCredentialType","genericAuthType":"httpBasicAuth","sendBody":true,"bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer Datos Entrada').first().json.fromNumber || 'whatsapp:' + $('Extraer Datos Entrada').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer Datos Entrada').first().json.toNumber }}"},{"name":"Body","value":"=Confirmamos tu turno para {{ $('Extraer JSON Turno').first().json.fecha_preferida }} a las {{ $('Extraer JSON Turno').first().json.horario_preferido }}. Te enviamos un recordatorio 24hs antes. Si necesitas cancelar o modificar, responde a este mensaje."}]},"options":{}},"name":"Twilio - Confirmacion Turno","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2032,656],"id":"10241f80-35b8-46f4-89c7-b73c41d117ce"},{"parameters":{"method":"POST","url":"http://ollama:11434/api/chat","sendBody":true,"specifyBody":"json","jsonBody":"={\\n  \\"model\\": \\"mistral\\",\\n  \\"stream\\": false,\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Sos el asistente virtual del Consultorio Médico. El paciente quiere un turno pero no dijo fecha. Preguntale amablemente qué día y horario le gustaría. Sé breve, respondé en español argentino.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": \\"El paciente {{ $('Extraer Datos Entrada').first().json.profileName }} dijo: {{ $('Extraer Datos Entrada').first().json.message }}. Preguntale qué fecha y horario prefiere.\\"\\n    }\\n  ]\\n}","options":{}},"name":"Sin Fecha - Preguntar Disponibilidad","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[1760,432],"id":"41de74d9-a8ef-40e4-b877-012f587b7308"},{"parameters":{"assignments":{"assignments":[{"name":"responseText","value":"={{ $json.message.content }}","type":"string"}]},"options":{}},"name":"Extraer Pregunta Fecha","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[2000,432],"id":"89efa512-ca65-4fbd-be72-c55816dde435"},{"parameters":{"method":"POST","url":"https://api.twilio.com/2010-04-01/Accounts/TWILIO_ACCOUNT_SID_PLACEHOLDER/Messages.json","authentication":"genericCredentialType","genericAuthType":"httpBasicAuth","sendBody":true,"bodyParameters":{"parameters":[{"name":"To","value":"={{ $('Extraer Datos Entrada').first().json.fromNumber || 'whatsapp:' + $('Extraer Datos Entrada').first().json.phone }}"},{"name":"From","value":"={{ $('Extraer Datos Entrada').first().json.toNumber }}"},{"name":"Body","value":"={{ $json.responseText }}"}]},"options":{}},"name":"Twilio - Enviar WhatsApp","type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":[2560,224],"id":"19c4cd53-d70c-40a6-b7d3-f6a883379227"},{"parameters":{"operation":"executeQuery","query":"INSERT INTO workflow_logs (workflow_id, workflow_name, execution_id, nivel, mensaje) VALUES ($1, 'Gestion Turnos', $2, 'info', $3);","options":{}},"name":"Guardar Log","type":"n8n-nodes-base.postgres","typeVersion":2.5,"position":[2864,336],"id":"78ef180f-a702-4148-8015-7d6496b3a70c"}]	{"Webhook - Solicitud Turno":{"main":[[{"node":"Validar Datos","type":"main","index":0}]]},"Validar Datos":{"main":[[{"node":"Extraer Datos Entrada","type":"main","index":0}],[{"node":"Guardar Log","type":"main","index":0}]]},"Extraer Datos Entrada":{"main":[[{"node":"Ollama - Extraer Info Turno","type":"main","index":0}]]},"Ollama - Extraer Info Turno":{"main":[[{"node":"Extraer JSON Turno","type":"main","index":0}]]},"Extraer JSON Turno":{"main":[[{"node":"Verificar Disponibilidad","type":"main","index":0}]]},"Verificar Disponibilidad":{"main":[[{"node":"Tiene Fecha Elegida?","type":"main","index":0}]]},"Tiene Fecha Elegida?":{"main":[[{"node":"Generar Franjas","type":"main","index":0}],[{"node":"Sin Fecha - Preguntar Disponibilidad","type":"main","index":0}]]},"Generar Franjas":{"main":[[{"node":"Ollama - Ofrecer Horarios","type":"main","index":0}]]},"Ollama - Ofrecer Horarios":{"main":[[{"node":"Extraer Respuesta Horarios","type":"main","index":0}]]},"Extraer Respuesta Horarios":{"main":[[{"node":"Twilio - Enviar WhatsApp","type":"main","index":0}]]},"Sin Fecha - Preguntar Disponibilidad":{"main":[[{"node":"Extraer Pregunta Fecha","type":"main","index":0}]]},"Extraer Pregunta Fecha":{"main":[[{"node":"Twilio - Enviar WhatsApp","type":"main","index":0}]]},"Crear Turno en DB":{"main":[[{"node":"Twilio - Confirmacion Turno","type":"main","index":0}]]},"Twilio - Confirmacion Turno":{"main":[[{"node":"Guardar Log","type":"main","index":0}]]},"Twilio - Enviar WhatsApp":{"main":[[{"node":"Guardar Log","type":"main","index":0}]]}}	\N	t	\N
\.


--
-- Data for Name: workflow_publish_history; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_publish_history (id, "workflowId", "versionId", event, "userId", "createdAt") FROM stdin;
1	73g6uVf9fIsNHKV9	\N	activated	8274b19f-2f1f-4df7-be3d-d02d67d238d1	2026-04-30 14:51:49.445+00
2	73g6uVf9fIsNHKV9	\N	deactivated	8274b19f-2f1f-4df7-be3d-d02d67d238d1	2026-05-12 01:57:26.912+00
\.


--
-- Data for Name: workflow_published_version; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_published_version ("workflowId", "publishedVersionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: workflow_statistics; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflow_statistics (count, "latestEvent", name, "workflowId", "rootCount", id, "workflowName") FROM stdin;
1	2026-05-15 06:15:23.176+00	manual_error	15imVcRcLvE2JxXO	0	1	Buenos días diario
\.


--
-- Data for Name: workflows_tags; Type: TABLE DATA; Schema: public; Owner: reece.schmeler67
--

COPY public.workflows_tags ("workflowId", "tagId") FROM stdin;
\.


--
-- Name: auth_provider_sync_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.auth_provider_sync_history_id_seq', 1, false);


--
-- Name: credential_dependency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.credential_dependency_id_seq', 1, false);


--
-- Name: execution_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.execution_annotations_id_seq', 1, false);


--
-- Name: execution_entity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.execution_entity_id_seq', 1, true);


--
-- Name: execution_metadata_temp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.execution_metadata_temp_id_seq', 1, false);


--
-- Name: insights_by_period_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.insights_by_period_id_seq', 1, false);


--
-- Name: insights_metadata_metaId_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public."insights_metadata_metaId_seq"', 1, false);


--
-- Name: insights_raw_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.insights_raw_id_seq', 1, false);


--
-- Name: instance_version_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.instance_version_history_id_seq', 2, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.migrations_id_seq', 168, true);


--
-- Name: oauth_user_consents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.oauth_user_consents_id_seq', 1, false);


--
-- Name: secrets_provider_connection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.secrets_provider_connection_id_seq', 1, false);


--
-- Name: user_favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.user_favorites_id_seq', 1, false);


--
-- Name: workflow_dependency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.workflow_dependency_id_seq', 710, true);


--
-- Name: workflow_publish_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.workflow_publish_history_id_seq', 2, true);


--
-- Name: workflow_statistics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: reece.schmeler67
--

SELECT pg_catalog.setval('public.workflow_statistics_id_seq', 1, true);


--
-- Name: test_run PK_011c050f566e9db509a0fadb9b9; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.test_run
    ADD CONSTRAINT "PK_011c050f566e9db509a0fadb9b9" PRIMARY KEY (id);


--
-- Name: project_secrets_provider_access PK_0402b7fcec5415246656f102f83; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_secrets_provider_access
    ADD CONSTRAINT "PK_0402b7fcec5415246656f102f83" PRIMARY KEY ("secretsProviderConnectionId", "projectId");


--
-- Name: installed_packages PK_08cc9197c39b028c1e9beca225940576fd1a5804; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.installed_packages
    ADD CONSTRAINT "PK_08cc9197c39b028c1e9beca225940576fd1a5804" PRIMARY KEY ("packageName");


--
-- Name: instance_ai_run_snapshots PK_0a5fc9690a84950ebf1416fb146; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_run_snapshots
    ADD CONSTRAINT "PK_0a5fc9690a84950ebf1416fb146" PRIMARY KEY ("threadId", "runId");


--
-- Name: instance_ai_messages PK_156c6f287225e9befe0181bb02b; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_messages
    ADD CONSTRAINT "PK_156c6f287225e9befe0181bb02b" PRIMARY KEY (id);


--
-- Name: execution_metadata PK_17a0b6284f8d626aae88e1c16e4; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_metadata
    ADD CONSTRAINT "PK_17a0b6284f8d626aae88e1c16e4" PRIMARY KEY (id);


--
-- Name: role_mapping_rule_project PK_198c5b5aea509d139274efcaf9a; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_mapping_rule_project
    ADD CONSTRAINT "PK_198c5b5aea509d139274efcaf9a" PRIMARY KEY ("roleMappingRuleId", "projectId");


--
-- Name: project_relation PK_1caaa312a5d7184a003be0f0cb6; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_relation
    ADD CONSTRAINT "PK_1caaa312a5d7184a003be0f0cb6" PRIMARY KEY ("projectId", "userId");


--
-- Name: chat_hub_sessions PK_1eafef1273c70e4464fec703412; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_sessions
    ADD CONSTRAINT "PK_1eafef1273c70e4464fec703412" PRIMARY KEY (id);


--
-- Name: instance_ai_iteration_logs PK_21c2b214b44bc6c34a6d3551c90; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_iteration_logs
    ADD CONSTRAINT "PK_21c2b214b44bc6c34a6d3551c90" PRIMARY KEY (id);


--
-- Name: folder_tag PK_27e4e00852f6b06a925a4d83a3e; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.folder_tag
    ADD CONSTRAINT "PK_27e4e00852f6b06a925a4d83a3e" PRIMARY KEY ("folderId", "tagId");


--
-- Name: instance_ai_threads PK_35575100e45cdedeb89ae0643e9; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_threads
    ADD CONSTRAINT "PK_35575100e45cdedeb89ae0643e9" PRIMARY KEY (id);


--
-- Name: role PK_35c9b140caaf6da09cfabb0d675; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT "PK_35c9b140caaf6da09cfabb0d675" PRIMARY KEY (slug);


--
-- Name: secrets_provider_connection PK_4350ae85e76f9ba7df1370acb5d; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.secrets_provider_connection
    ADD CONSTRAINT "PK_4350ae85e76f9ba7df1370acb5d" PRIMARY KEY (id);


--
-- Name: instance_ai_resources PK_45b5b0b6f715dae4292b86603d8; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_resources
    ADD CONSTRAINT "PK_45b5b0b6f715dae4292b86603d8" PRIMARY KEY (id);


--
-- Name: project PK_4d68b1358bb5b766d3e78f32f57; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY (id);


--
-- Name: dynamic_credential_entry PK_5135ffcabecad4727ff6b9b803d; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_entry
    ADD CONSTRAINT "PK_5135ffcabecad4727ff6b9b803d" PRIMARY KEY (credential_id, subject_id, resolver_id);


--
-- Name: workflow_dependency PK_52325e34cd7a2f0f67b0f3cad65; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_dependency
    ADD CONSTRAINT "PK_52325e34cd7a2f0f67b0f3cad65" PRIMARY KEY (id);


--
-- Name: invalid_auth_token PK_5779069b7235b256d91f7af1a15; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.invalid_auth_token
    ADD CONSTRAINT "PK_5779069b7235b256d91f7af1a15" PRIMARY KEY (token);


--
-- Name: shared_workflow PK_5ba87620386b847201c9531c58f; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.shared_workflow
    ADD CONSTRAINT "PK_5ba87620386b847201c9531c58f" PRIMARY KEY ("workflowId", "projectId");


--
-- Name: workflow_published_version PK_5c76fb7ee939fe2530374d3f75a; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_published_version
    ADD CONSTRAINT "PK_5c76fb7ee939fe2530374d3f75a" PRIMARY KEY ("workflowId");


--
-- Name: folder PK_6278a41a706740c94c02e288df8; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT "PK_6278a41a706740c94c02e288df8" PRIMARY KEY (id);


--
-- Name: data_table_column PK_673cb121ee4a8a5e27850c72c51; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.data_table_column
    ADD CONSTRAINT "PK_673cb121ee4a8a5e27850c72c51" PRIMARY KEY (id);


--
-- Name: chat_hub_tools PK_696d26426c704fba79b2c195ef5; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_tools
    ADD CONSTRAINT "PK_696d26426c704fba79b2c195ef5" PRIMARY KEY (id);


--
-- Name: annotation_tag_entity PK_69dfa041592c30bbc0d4b84aa00; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.annotation_tag_entity
    ADD CONSTRAINT "PK_69dfa041592c30bbc0d4b84aa00" PRIMARY KEY (id);


--
-- Name: user_favorites PK_6c472a19a7423cfbbf6b7c75939; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT "PK_6c472a19a7423cfbbf6b7c75939" PRIMARY KEY (id);


--
-- Name: instance_ai_observational_memory PK_7192dd00cddba039bf1d3e6a098; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_observational_memory
    ADD CONSTRAINT "PK_7192dd00cddba039bf1d3e6a098" PRIMARY KEY (id);


--
-- Name: oauth_refresh_tokens PK_74abaed0b30711b6532598b0392; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT "PK_74abaed0b30711b6532598b0392" PRIMARY KEY (token);


--
-- Name: dynamic_credential_user_entry PK_74f548e633abc66dc27c8f0ca77; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_user_entry
    ADD CONSTRAINT "PK_74f548e633abc66dc27c8f0ca77" PRIMARY KEY ("credentialId", "userId", "resolverId");


--
-- Name: chat_hub_messages PK_7704a5add6baed43eef835f0bfb; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "PK_7704a5add6baed43eef835f0bfb" PRIMARY KEY (id);


--
-- Name: execution_annotations PK_7afcf93ffa20c4252869a7c6a23; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_annotations
    ADD CONSTRAINT "PK_7afcf93ffa20c4252869a7c6a23" PRIMARY KEY (id);


--
-- Name: credential_dependency PK_80212729ed0ffa0709417ab28f4; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.credential_dependency
    ADD CONSTRAINT "PK_80212729ed0ffa0709417ab28f4" PRIMARY KEY (id);


--
-- Name: ai_builder_temporary_workflow PK_85a87a1ba0f61999fe11dc56325; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.ai_builder_temporary_workflow
    ADD CONSTRAINT "PK_85a87a1ba0f61999fe11dc56325" PRIMARY KEY ("workflowId");


--
-- Name: oauth_user_consents PK_85b9ada746802c8993103470f05; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_user_consents
    ADD CONSTRAINT "PK_85b9ada746802c8993103470f05" PRIMARY KEY (id);


--
-- Name: instance_version_history PK_874f58cb616935bf49d9dbd67e9; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_version_history
    ADD CONSTRAINT "PK_874f58cb616935bf49d9dbd67e9" PRIMARY KEY (id);


--
-- Name: chat_hub_session_tools PK_87aea76ff4c274c4a5ac838ebe3; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_session_tools
    ADD CONSTRAINT "PK_87aea76ff4c274c4a5ac838ebe3" PRIMARY KEY ("sessionId", "toolId");


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: installed_nodes PK_8ebd28194e4f792f96b5933423fc439df97d9689; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.installed_nodes
    ADD CONSTRAINT "PK_8ebd28194e4f792f96b5933423fc439df97d9689" PRIMARY KEY (name);


--
-- Name: shared_credentials PK_8ef3a59796a228913f251779cff; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.shared_credentials
    ADD CONSTRAINT "PK_8ef3a59796a228913f251779cff" PRIMARY KEY ("credentialsId", "projectId");


--
-- Name: test_case_execution PK_90c121f77a78a6580e94b794bce; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.test_case_execution
    ADD CONSTRAINT "PK_90c121f77a78a6580e94b794bce" PRIMARY KEY (id);


--
-- Name: instance_ai_workflow_snapshots PK_93f2696eb321dfe1d7defe7073f; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_workflow_snapshots
    ADD CONSTRAINT "PK_93f2696eb321dfe1d7defe7073f" PRIMARY KEY ("runId", "workflowName");


--
-- Name: deployment_key PK_94bb7aeb5def5a0284a5fe9f9a0; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.deployment_key
    ADD CONSTRAINT "PK_94bb7aeb5def5a0284a5fe9f9a0" PRIMARY KEY (id);


--
-- Name: user_api_keys PK_978fa5caa3468f463dac9d92e69; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT "PK_978fa5caa3468f463dac9d92e69" PRIMARY KEY (id);


--
-- Name: execution_annotation_tags PK_979ec03d31294cca484be65d11f; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_annotation_tags
    ADD CONSTRAINT "PK_979ec03d31294cca484be65d11f" PRIMARY KEY ("annotationId", "tagId");


--
-- Name: trusted_key_source PK_99e8908ce2c2cdccce487db7fc6; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.trusted_key_source
    ADD CONSTRAINT "PK_99e8908ce2c2cdccce487db7fc6" PRIMARY KEY (id);


--
-- Name: webhook_entity PK_b21ace2e13596ccd87dc9bf4ea6; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.webhook_entity
    ADD CONSTRAINT "PK_b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", method);


--
-- Name: insights_by_period PK_b606942249b90cc39b0265f0575; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_by_period
    ADD CONSTRAINT "PK_b606942249b90cc39b0265f0575" PRIMARY KEY (id);


--
-- Name: workflow_history PK_b6572dd6173e4cd06fe79937b58; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT "PK_b6572dd6173e4cd06fe79937b58" PRIMARY KEY ("versionId");


--
-- Name: dynamic_credential_resolver PK_b76cfb088dcdaf5275e9980bb64; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_resolver
    ADD CONSTRAINT "PK_b76cfb088dcdaf5275e9980bb64" PRIMARY KEY (id);


--
-- Name: scope PK_bfc45df0481abd7f355d6187da1; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.scope
    ADD CONSTRAINT "PK_bfc45df0481abd7f355d6187da1" PRIMARY KEY (slug);


--
-- Name: oauth_clients PK_c4759172d3431bae6f04e678e0d; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_clients
    ADD CONSTRAINT "PK_c4759172d3431bae6f04e678e0d" PRIMARY KEY (id);


--
-- Name: workflow_publish_history PK_c788f7caf88e91e365c97d6d04a; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_publish_history
    ADD CONSTRAINT "PK_c788f7caf88e91e365c97d6d04a" PRIMARY KEY (id);


--
-- Name: processed_data PK_ca04b9d8dc72de268fe07a65773; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.processed_data
    ADD CONSTRAINT "PK_ca04b9d8dc72de268fe07a65773" PRIMARY KEY ("workflowId", context);


--
-- Name: chat_hub_agent_tools PK_cc8806fdea48297a7d497035d72; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_agent_tools
    ADD CONSTRAINT "PK_cc8806fdea48297a7d497035d72" PRIMARY KEY ("agentId", "toolId");


--
-- Name: role_mapping_rule PK_d772c8ec1a89b52d31c882bc560; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_mapping_rule
    ADD CONSTRAINT "PK_d772c8ec1a89b52d31c882bc560" PRIMARY KEY (id);


--
-- Name: token_exchange_jti PK_d8e8a6f737d530fdd2dd716e89c; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.token_exchange_jti
    ADD CONSTRAINT "PK_d8e8a6f737d530fdd2dd716e89c" PRIMARY KEY (jti);


--
-- Name: settings PK_dc0fe14e6d9943f268e7b119f69ab8bd; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT "PK_dc0fe14e6d9943f268e7b119f69ab8bd" PRIMARY KEY (key);


--
-- Name: trusted_key PK_dc7d93798f3dbb6959f974c97e1; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.trusted_key
    ADD CONSTRAINT "PK_dc7d93798f3dbb6959f974c97e1" PRIMARY KEY ("sourceId", kid);


--
-- Name: oauth_access_tokens PK_dcd71f96a5d5f4bf79e67d322bf; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT "PK_dcd71f96a5d5f4bf79e67d322bf" PRIMARY KEY (token);


--
-- Name: data_table PK_e226d0001b9e6097cbfe70617cb; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.data_table
    ADD CONSTRAINT "PK_e226d0001b9e6097cbfe70617cb" PRIMARY KEY (id);


--
-- Name: workflow_builder_session PK_e69ef0d385986e273423b0e8695; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_builder_session
    ADD CONSTRAINT "PK_e69ef0d385986e273423b0e8695" PRIMARY KEY (id);


--
-- Name: user PK_ea8f538c94b6e352418254ed6474a81f; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_ea8f538c94b6e352418254ed6474a81f" PRIMARY KEY (id);


--
-- Name: insights_raw PK_ec15125755151e3a7e00e00014f; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_raw
    ADD CONSTRAINT "PK_ec15125755151e3a7e00e00014f" PRIMARY KEY (id);


--
-- Name: chat_hub_agents PK_f39a3b36bbdf0e2979ddb21cf78; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_agents
    ADD CONSTRAINT "PK_f39a3b36bbdf0e2979ddb21cf78" PRIMARY KEY (id);


--
-- Name: insights_metadata PK_f448a94c35218b6208ce20cf5a1; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_metadata
    ADD CONSTRAINT "PK_f448a94c35218b6208ce20cf5a1" PRIMARY KEY ("metaId");


--
-- Name: oauth_authorization_codes PK_fb91ab932cfbd694061501cc20f; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT "PK_fb91ab932cfbd694061501cc20f" PRIMARY KEY (code);


--
-- Name: binary_data PK_fc3691585b39408bb0551122af6; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.binary_data
    ADD CONSTRAINT "PK_fc3691585b39408bb0551122af6" PRIMARY KEY ("fileId");


--
-- Name: role_scope PK_role_scope; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_scope
    ADD CONSTRAINT "PK_role_scope" PRIMARY KEY ("roleSlug", "scopeSlug");


--
-- Name: oauth_user_consents UQ_083721d99ce8db4033e2958ebb4; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_user_consents
    ADD CONSTRAINT "UQ_083721d99ce8db4033e2958ebb4" UNIQUE ("userId", "clientId");


--
-- Name: data_table_column UQ_8082ec4890f892f0bc77473a123; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.data_table_column
    ADD CONSTRAINT "UQ_8082ec4890f892f0bc77473a123" UNIQUE ("dataTableId", name);


--
-- Name: data_table UQ_b23096ef747281ac944d28e8b0d; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.data_table
    ADD CONSTRAINT "UQ_b23096ef747281ac944d28e8b0d" UNIQUE ("projectId", name);


--
-- Name: role_mapping_rule UQ_b33ac896ad3099fc8de36fdc1c4; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_mapping_rule
    ADD CONSTRAINT "UQ_b33ac896ad3099fc8de36fdc1c4" UNIQUE (type, "order");


--
-- Name: user_favorites UQ_cf6ae658ead9ffc124723413c65; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT "UQ_cf6ae658ead9ffc124723413c65" UNIQUE ("userId", "resourceId", "resourceType");


--
-- Name: user UQ_e12875dfb3b1d92d7d7c5377e2; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e2" UNIQUE (email);


--
-- Name: workflow_builder_session UQ_ec2aa73632932d485a1d5192ce1; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_builder_session
    ADD CONSTRAINT "UQ_ec2aa73632932d485a1d5192ce1" UNIQUE ("workflowId", "userId");


--
-- Name: auth_identity auth_identity_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.auth_identity
    ADD CONSTRAINT auth_identity_pkey PRIMARY KEY ("providerId", "providerType");


--
-- Name: auth_provider_sync_history auth_provider_sync_history_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.auth_provider_sync_history
    ADD CONSTRAINT auth_provider_sync_history_pkey PRIMARY KEY (id);


--
-- Name: credentials_entity credentials_entity_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.credentials_entity
    ADD CONSTRAINT credentials_entity_pkey PRIMARY KEY (id);


--
-- Name: event_destinations event_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.event_destinations
    ADD CONSTRAINT event_destinations_pkey PRIMARY KEY (id);


--
-- Name: execution_data execution_data_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_data
    ADD CONSTRAINT execution_data_pkey PRIMARY KEY ("executionId");


--
-- Name: execution_entity pk_e3e63bbf986767844bbe1166d4e; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_entity
    ADD CONSTRAINT pk_e3e63bbf986767844bbe1166d4e PRIMARY KEY (id);


--
-- Name: workflows_tags pk_workflows_tags; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflows_tags
    ADD CONSTRAINT pk_workflows_tags PRIMARY KEY ("workflowId", "tagId");


--
-- Name: tag_entity tag_entity_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.tag_entity
    ADD CONSTRAINT tag_entity_pkey PRIMARY KEY (id);


--
-- Name: variables variables_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.variables
    ADD CONSTRAINT variables_pkey PRIMARY KEY (id);


--
-- Name: workflow_entity workflow_entity_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_entity
    ADD CONSTRAINT workflow_entity_pkey PRIMARY KEY (id);


--
-- Name: workflow_statistics workflow_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_statistics
    ADD CONSTRAINT workflow_statistics_pkey PRIMARY KEY (id);


--
-- Name: IDX_02751202c9a2ad75f2d8e14f5e; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_02751202c9a2ad75f2d8e14f5e" ON public.instance_ai_iteration_logs USING btree ("threadId", "taskKey", "createdAt");


--
-- Name: IDX_070b5de842ece9ccdda0d9738b; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_070b5de842ece9ccdda0d9738b" ON public.workflow_publish_history USING btree ("workflowId", "versionId");


--
-- Name: IDX_14f68deffaf858465715995508; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_14f68deffaf858465715995508" ON public.folder USING btree ("projectId", id);


--
-- Name: IDX_1d11050a381548c42c32cc25c4; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_1d11050a381548c42c32cc25c4" ON public.user_favorites USING btree ("resourceType", "resourceId");


--
-- Name: IDX_1d8ab99d5861c9388d2dc1cf73; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_1d8ab99d5861c9388d2dc1cf73" ON public.insights_metadata USING btree ("workflowId");


--
-- Name: IDX_1dd5c393ad0517be3c31a7af83; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_1dd5c393ad0517be3c31a7af83" ON public.user_favorites USING btree ("userId");


--
-- Name: IDX_1e31657f5fe46816c34be7c1b4; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_1e31657f5fe46816c34be7c1b4" ON public.workflow_history USING btree ("workflowId");


--
-- Name: IDX_1eeb64cb9d66a927988de759e6; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_1eeb64cb9d66a927988de759e6" ON public.instance_ai_messages USING btree ("threadId");


--
-- Name: IDX_1ef35bac35d20bdae979d917a3; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_1ef35bac35d20bdae979d917a3" ON public.user_api_keys USING btree ("apiKey");


--
-- Name: IDX_35a78869286c65d9330d02b88f; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_35a78869286c65d9330d02b88f" ON public.role_mapping_rule_project USING btree ("projectId");


--
-- Name: IDX_39b07732e819fb561d74c38763; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_39b07732e819fb561d74c38763" ON public.ai_builder_temporary_workflow USING btree ("threadId");


--
-- Name: IDX_4c72ebdb265d1775bf61147af0; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_4c72ebdb265d1775bf61147af0" ON public.chat_hub_tools USING btree ("ownerId", name);


--
-- Name: IDX_56900edc3cfd16612e2ef2c6a8; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_56900edc3cfd16612e2ef2c6a8" ON public.binary_data USING btree ("sourceType", "sourceId");


--
-- Name: IDX_5ec8e8c8d3539f3696cf73b43b; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_5ec8e8c8d3539f3696cf73b43b" ON public.credential_dependency USING btree ("credentialId");


--
-- Name: IDX_5f0643f6717905a05164090dde; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_5f0643f6717905a05164090dde" ON public.project_relation USING btree ("userId");


--
-- Name: IDX_60b6a84299eeb3f671dfec7693; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_60b6a84299eeb3f671dfec7693" ON public.insights_by_period USING btree ("periodStart", type, "periodUnit", "metaId");


--
-- Name: IDX_61448d56d61802b5dfde5cdb00; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_61448d56d61802b5dfde5cdb00" ON public.project_relation USING btree ("projectId");


--
-- Name: IDX_62476b94b56d9dc7ed9ed75d3d; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_62476b94b56d9dc7ed9ed75d3d" ON public.dynamic_credential_entry USING btree (subject_id);


--
-- Name: IDX_63d7bbae72c767cf162d459fcc; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_63d7bbae72c767cf162d459fcc" ON public.user_api_keys USING btree ("userId", label);


--
-- Name: IDX_6edec973a6450990977bb854c3; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_6edec973a6450990977bb854c3" ON public.dynamic_credential_user_entry USING btree ("resolverId");


--
-- Name: IDX_76e212c6867fbaa06bf0decd6f; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_76e212c6867fbaa06bf0decd6f" ON public.instance_ai_messages USING btree ("resourceId");


--
-- Name: IDX_8e4b4774db42f1e6dda3452b2a; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_8e4b4774db42f1e6dda3452b2a" ON public.test_case_execution USING btree ("testRunId");


--
-- Name: IDX_91ee85fa9619dd6776725e117b; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_91ee85fa9619dd6776725e117b" ON public.credential_dependency USING btree ("dependencyType", "dependencyId");


--
-- Name: IDX_92f13cb6bc694227e069447f7b; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_92f13cb6bc694227e069447f7b" ON public.instance_ai_observational_memory USING btree ("lookupKey");


--
-- Name: IDX_97f863fa83c4786f1956508496; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_97f863fa83c4786f1956508496" ON public.execution_annotations USING btree ("executionId");


--
-- Name: IDX_9c9ee9df586e60bb723234e499; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_9c9ee9df586e60bb723234e499" ON public.dynamic_credential_resolver USING btree (type);


--
-- Name: IDX_UniqueRoleDisplayName; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_UniqueRoleDisplayName" ON public.role USING btree ("displayName");


--
-- Name: IDX_a3697779b366e131b2bbdae297; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_a3697779b366e131b2bbdae297" ON public.execution_annotation_tags USING btree ("tagId");


--
-- Name: IDX_a36dc616fabc3f736bb82410a2; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_a36dc616fabc3f736bb82410a2" ON public.dynamic_credential_user_entry USING btree ("userId");


--
-- Name: IDX_a371ee6b8e0ebb5635f8baa46d; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_a371ee6b8e0ebb5635f8baa46d" ON public.instance_ai_workflow_snapshots USING btree ("workflowName", status);


--
-- Name: IDX_a4ff2d9b9628ea988fa9e7d0bf; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_a4ff2d9b9628ea988fa9e7d0bf" ON public.workflow_dependency USING btree ("workflowId");


--
-- Name: IDX_a680ac96aae02dc887bbaac512; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_a680ac96aae02dc887bbaac512" ON public.instance_ai_observational_memory USING btree (scope, "threadId", "resourceId");


--
-- Name: IDX_ae51b54c4bb430cf92f48b623f; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_ae51b54c4bb430cf92f48b623f" ON public.annotation_tag_entity USING btree (name);


--
-- Name: IDX_bb66e404c35996b0d694617750; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_bb66e404c35996b0d694617750" ON public.role_mapping_rule USING btree (role);


--
-- Name: IDX_c1519757391996eb06064f0e7c; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_c1519757391996eb06064f0e7c" ON public.execution_annotation_tags USING btree ("annotationId");


--
-- Name: IDX_cec8eea3bf49551482ccb4933e; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_cec8eea3bf49551482ccb4933e" ON public.execution_metadata USING btree ("executionId", key);


--
-- Name: IDX_chat_hub_messages_sessionId; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_chat_hub_messages_sessionId" ON public.chat_hub_messages USING btree ("sessionId");


--
-- Name: IDX_chat_hub_sessions_owner_lastmsg_id; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_chat_hub_sessions_owner_lastmsg_id" ON public.chat_hub_sessions USING btree ("ownerId", "lastMessageAt" DESC, id);


--
-- Name: IDX_credential_dependency_credentialId_dependencyType_dependenc; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_credential_dependency_credentialId_dependencyType_dependenc" ON public.credential_dependency USING btree ("credentialId", "dependencyType", "dependencyId");


--
-- Name: IDX_d3a2bc880e7a8626802e5474ad; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_d3a2bc880e7a8626802e5474ad" ON public.instance_ai_run_snapshots USING btree ("threadId", "createdAt");


--
-- Name: IDX_d61a12235d268a49af6a3c09c1; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_d61a12235d268a49af6a3c09c1" ON public.dynamic_credential_entry USING btree (resolver_id);


--
-- Name: IDX_d6870d3b6e4c185d33926f423c; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON public.test_run USING btree ("workflowId");


--
-- Name: IDX_d926c16c2ad9728cb9a81790c0; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_d926c16c2ad9728cb9a81790c0" ON public.instance_ai_run_snapshots USING btree ("threadId", "messageGroupId");


--
-- Name: IDX_deployment_key_data_encryption_active; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_deployment_key_data_encryption_active" ON public.deployment_key USING btree (type) WHERE (((status)::text = 'active'::text) AND ((type)::text = 'data_encryption'::text));


--
-- Name: IDX_deployment_key_instance_id_active; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_deployment_key_instance_id_active" ON public.deployment_key USING btree (type) WHERE (((status)::text = 'active'::text) AND ((type)::text = 'instance.id'::text));


--
-- Name: IDX_deployment_key_signing_binary_data_active; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_deployment_key_signing_binary_data_active" ON public.deployment_key USING btree (type) WHERE (((status)::text = 'active'::text) AND ((type)::text = 'signing.binary_data'::text));


--
-- Name: IDX_deployment_key_signing_hmac_active; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_deployment_key_signing_hmac_active" ON public.deployment_key USING btree (type) WHERE (((status)::text = 'active'::text) AND ((type)::text = 'signing.hmac'::text));


--
-- Name: IDX_deployment_key_signing_jwt_active; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_deployment_key_signing_jwt_active" ON public.deployment_key USING btree (type) WHERE (((status)::text = 'active'::text) AND ((type)::text = 'signing.jwt'::text));


--
-- Name: IDX_e48a201071ab85d9d09119d640; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_e48a201071ab85d9d09119d640" ON public.workflow_dependency USING btree ("dependencyKey");


--
-- Name: IDX_e7fe1cfda990c14a445937d0b9; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_e7fe1cfda990c14a445937d0b9" ON public.workflow_dependency USING btree ("dependencyType");


--
-- Name: IDX_execution_entity_deduplicationKey; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_execution_entity_deduplicationKey" ON public.execution_entity USING btree ("deduplicationKey") WHERE ("deduplicationKey" IS NOT NULL);


--
-- Name: IDX_execution_entity_deletedAt; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_execution_entity_deletedAt" ON public.execution_entity USING btree ("deletedAt");


--
-- Name: IDX_f36dea4d38fe92e0e8f44d5a56; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_f36dea4d38fe92e0e8f44d5a56" ON public.instance_ai_threads USING btree ("resourceId");


--
-- Name: IDX_role_scope_scopeSlug; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_role_scope_scopeSlug" ON public.role_scope USING btree ("scopeSlug");


--
-- Name: IDX_secrets_provider_connection_providerKey; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_secrets_provider_connection_providerKey" ON public.secrets_provider_connection USING btree ("providerKey");


--
-- Name: IDX_workflow_dependency_publishedVersionId; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_workflow_dependency_publishedVersionId" ON public.workflow_dependency USING btree ("publishedVersionId");


--
-- Name: IDX_workflow_entity_name; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX "IDX_workflow_entity_name" ON public.workflow_entity USING btree (name);


--
-- Name: IDX_workflow_statistics_workflow_name; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX "IDX_workflow_statistics_workflow_name" ON public.workflow_statistics USING btree ("workflowId", name);


--
-- Name: idx_07fde106c0b471d8cc80a64fc8; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX idx_07fde106c0b471d8cc80a64fc8 ON public.credentials_entity USING btree (type);


--
-- Name: idx_16f4436789e804e3e1c9eeb240; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX idx_16f4436789e804e3e1c9eeb240 ON public.webhook_entity USING btree ("webhookId", method, "pathLength");


--
-- Name: idx_812eb05f7451ca757fb98444ce; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX idx_812eb05f7451ca757fb98444ce ON public.tag_entity USING btree (name);


--
-- Name: idx_execution_entity_stopped_at_status_deleted_at; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX idx_execution_entity_stopped_at_status_deleted_at ON public.execution_entity USING btree ("stoppedAt", status, "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_execution_entity_wait_till_status_deleted_at; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX idx_execution_entity_wait_till_status_deleted_at ON public.execution_entity USING btree ("waitTill", status, "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_execution_entity_workflow_id_started_at; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX idx_execution_entity_workflow_id_started_at ON public.execution_entity USING btree ("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_workflows_tags_workflow_id; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX idx_workflows_tags_workflow_id ON public.workflows_tags USING btree ("workflowId");


--
-- Name: pk_credentials_entity_id; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX pk_credentials_entity_id ON public.credentials_entity USING btree (id);


--
-- Name: pk_tag_entity_id; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX pk_tag_entity_id ON public.tag_entity USING btree (id);


--
-- Name: pk_workflow_entity_id; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX pk_workflow_entity_id ON public.workflow_entity USING btree (id);


--
-- Name: project_relation_role_idx; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX project_relation_role_idx ON public.project_relation USING btree (role);


--
-- Name: project_relation_role_project_idx; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX project_relation_role_project_idx ON public.project_relation USING btree ("projectId", role);


--
-- Name: user_role_idx; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE INDEX user_role_idx ON public."user" USING btree ("roleSlug");


--
-- Name: variables_global_key_unique; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX variables_global_key_unique ON public.variables USING btree (key) WHERE ("projectId" IS NULL);


--
-- Name: variables_project_key_unique; Type: INDEX; Schema: public; Owner: reece.schmeler67
--

CREATE UNIQUE INDEX variables_project_key_unique ON public.variables USING btree ("projectId", key) WHERE ("projectId" IS NOT NULL);


--
-- Name: workflow_entity workflow_version_increment; Type: TRIGGER; Schema: public; Owner: reece.schmeler67
--

CREATE TRIGGER workflow_version_increment BEFORE UPDATE ON public.workflow_entity FOR EACH ROW EXECUTE FUNCTION public.increment_workflow_version();


--
-- Name: workflow_builder_session FK_00290cdeee4d4d7db84709be936; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_builder_session
    ADD CONSTRAINT "FK_00290cdeee4d4d7db84709be936" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: processed_data FK_06a69a7032c97a763c2c7599464; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.processed_data
    ADD CONSTRAINT "FK_06a69a7032c97a763c2c7599464" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: workflow_entity FK_08d6c67b7f722b0039d9d5ed620; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_entity
    ADD CONSTRAINT "FK_08d6c67b7f722b0039d9d5ed620" FOREIGN KEY ("activeVersionId") REFERENCES public.workflow_history("versionId") ON DELETE RESTRICT;


--
-- Name: project_secrets_provider_access FK_18e5c27d2524b1638b292904e48; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_secrets_provider_access
    ADD CONSTRAINT "FK_18e5c27d2524b1638b292904e48" FOREIGN KEY ("secretsProviderConnectionId") REFERENCES public.secrets_provider_connection(id) ON DELETE CASCADE;


--
-- Name: insights_metadata FK_1d8ab99d5861c9388d2dc1cf733; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_metadata
    ADD CONSTRAINT "FK_1d8ab99d5861c9388d2dc1cf733" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE SET NULL;


--
-- Name: user_favorites FK_1dd5c393ad0517be3c31a7af836; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT "FK_1dd5c393ad0517be3c31a7af836" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: workflow_history FK_1e31657f5fe46816c34be7c1b4b; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_history
    ADD CONSTRAINT "FK_1e31657f5fe46816c34be7c1b4b" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: instance_ai_messages FK_1eeb64cb9d66a927988de759e6e; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_messages
    ADD CONSTRAINT "FK_1eeb64cb9d66a927988de759e6e" FOREIGN KEY ("threadId") REFERENCES public.instance_ai_threads(id) ON DELETE CASCADE;


--
-- Name: chat_hub_messages FK_1f4998c8a7dec9e00a9ab15550e; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_1f4998c8a7dec9e00a9ab15550e" FOREIGN KEY ("revisionOfMessageId") REFERENCES public.chat_hub_messages(id) ON DELETE CASCADE;


--
-- Name: oauth_user_consents FK_21e6c3c2d78a097478fae6aaefa; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_user_consents
    ADD CONSTRAINT "FK_21e6c3c2d78a097478fae6aaefa" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: insights_metadata FK_2375a1eda085adb16b24615b69c; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_metadata
    ADD CONSTRAINT "FK_2375a1eda085adb16b24615b69c" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE SET NULL;


--
-- Name: chat_hub_messages FK_25c9736e7f769f3a005eef4b372; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_25c9736e7f769f3a005eef4b372" FOREIGN KEY ("retryOfMessageId") REFERENCES public.chat_hub_messages(id) ON DELETE CASCADE;


--
-- Name: chat_hub_agent_tools FK_2b53d796b3dbae91b1a9553c048; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_agent_tools
    ADD CONSTRAINT "FK_2b53d796b3dbae91b1a9553c048" FOREIGN KEY ("agentId") REFERENCES public.chat_hub_agents(id) ON DELETE CASCADE;


--
-- Name: instance_ai_run_snapshots FK_2f63fa21d09d7918f347ddbdf70; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_run_snapshots
    ADD CONSTRAINT "FK_2f63fa21d09d7918f347ddbdf70" FOREIGN KEY ("threadId") REFERENCES public.instance_ai_threads(id) ON DELETE CASCADE;


--
-- Name: execution_metadata FK_31d0b4c93fb85ced26f6005cda3; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_metadata
    ADD CONSTRAINT "FK_31d0b4c93fb85ced26f6005cda3" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE CASCADE;


--
-- Name: instance_ai_observational_memory FK_34018c303885cd37093458e6409; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_observational_memory
    ADD CONSTRAINT "FK_34018c303885cd37093458e6409" FOREIGN KEY ("threadId") REFERENCES public.instance_ai_threads(id) ON DELETE SET NULL;


--
-- Name: role_mapping_rule_project FK_35a78869286c65d9330d02b88f5; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_mapping_rule_project
    ADD CONSTRAINT "FK_35a78869286c65d9330d02b88f5" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: ai_builder_temporary_workflow FK_39b07732e819fb561d74c38763f; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.ai_builder_temporary_workflow
    ADD CONSTRAINT "FK_39b07732e819fb561d74c38763f" FOREIGN KEY ("threadId") REFERENCES public.instance_ai_threads(id) ON DELETE CASCADE;


--
-- Name: shared_credentials FK_416f66fc846c7c442970c094ccf; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.shared_credentials
    ADD CONSTRAINT "FK_416f66fc846c7c442970c094ccf" FOREIGN KEY ("credentialsId") REFERENCES public.credentials_entity(id) ON DELETE CASCADE;


--
-- Name: variables FK_42f6c766f9f9d2edcc15bdd6e9b; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.variables
    ADD CONSTRAINT "FK_42f6c766f9f9d2edcc15bdd6e9b" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: chat_hub_agent_tools FK_43e70f04c53344f82483d0570f6; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_agent_tools
    ADD CONSTRAINT "FK_43e70f04c53344f82483d0570f6" FOREIGN KEY ("toolId") REFERENCES public.chat_hub_tools(id) ON DELETE CASCADE;


--
-- Name: chat_hub_agents FK_441ba2caba11e077ce3fbfa2cd8; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_agents
    ADD CONSTRAINT "FK_441ba2caba11e077ce3fbfa2cd8" FOREIGN KEY ("ownerId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: workflow_published_version FK_5c76fb7ee939fe2530374d3f75a; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_published_version
    ADD CONSTRAINT "FK_5c76fb7ee939fe2530374d3f75a" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE RESTRICT;


--
-- Name: credential_dependency FK_5ec8e8c8d3539f3696cf73b43bf; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.credential_dependency
    ADD CONSTRAINT "FK_5ec8e8c8d3539f3696cf73b43bf" FOREIGN KEY ("credentialId") REFERENCES public.credentials_entity(id) ON DELETE CASCADE;


--
-- Name: project_relation FK_5f0643f6717905a05164090dde7; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_relation
    ADD CONSTRAINT "FK_5f0643f6717905a05164090dde7" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: project_relation FK_61448d56d61802b5dfde5cdb002; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_relation
    ADD CONSTRAINT "FK_61448d56d61802b5dfde5cdb002" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: insights_by_period FK_6414cfed98daabbfdd61a1cfbc0; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_by_period
    ADD CONSTRAINT "FK_6414cfed98daabbfdd61a1cfbc0" FOREIGN KEY ("metaId") REFERENCES public.insights_metadata("metaId") ON DELETE CASCADE;


--
-- Name: oauth_authorization_codes FK_64d965bd072ea24fb6da55468cd; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT "FK_64d965bd072ea24fb6da55468cd" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: chat_hub_session_tools FK_6596a328affd8d4967ffb303eee; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_session_tools
    ADD CONSTRAINT "FK_6596a328affd8d4967ffb303eee" FOREIGN KEY ("toolId") REFERENCES public.chat_hub_tools(id) ON DELETE CASCADE;


--
-- Name: chat_hub_messages FK_6afb260449dd7a9b85355d4e0c9; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_6afb260449dd7a9b85355d4e0c9" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE SET NULL;


--
-- Name: insights_raw FK_6e2e33741adef2a7c5d66befa4e; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.insights_raw
    ADD CONSTRAINT "FK_6e2e33741adef2a7c5d66befa4e" FOREIGN KEY ("metaId") REFERENCES public.insights_metadata("metaId") ON DELETE CASCADE;


--
-- Name: workflow_publish_history FK_6eab5bd9eedabe9c54bd879fc40; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_publish_history
    ADD CONSTRAINT "FK_6eab5bd9eedabe9c54bd879fc40" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: dynamic_credential_user_entry FK_6edec973a6450990977bb854c38; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_user_entry
    ADD CONSTRAINT "FK_6edec973a6450990977bb854c38" FOREIGN KEY ("resolverId") REFERENCES public.dynamic_credential_resolver(id) ON DELETE CASCADE;


--
-- Name: oauth_access_tokens FK_7234a36d8e49a1fa85095328845; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT "FK_7234a36d8e49a1fa85095328845" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: installed_nodes FK_73f857fc5dce682cef8a99c11dbddbc969618951; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.installed_nodes
    ADD CONSTRAINT "FK_73f857fc5dce682cef8a99c11dbddbc969618951" FOREIGN KEY (package) REFERENCES public.installed_packages("packageName") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: oauth_access_tokens FK_78b26968132b7e5e45b75876481; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT "FK_78b26968132b7e5e45b75876481" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: workflow_builder_session FK_7983c618db48f47bf5a4cc1e1e4; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_builder_session
    ADD CONSTRAINT "FK_7983c618db48f47bf5a4cc1e1e4" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: chat_hub_sessions FK_7bc13b4c7e6afbfaf9be326c189; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_sessions
    ADD CONSTRAINT "FK_7bc13b4c7e6afbfaf9be326c189" FOREIGN KEY ("credentialId") REFERENCES public.credentials_entity(id) ON DELETE SET NULL;


--
-- Name: folder FK_804ea52f6729e3940498bd54d78; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT "FK_804ea52f6729e3940498bd54d78" FOREIGN KEY ("parentFolderId") REFERENCES public.folder(id) ON DELETE CASCADE;


--
-- Name: shared_credentials FK_812c2852270da1247756e77f5a4; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.shared_credentials
    ADD CONSTRAINT "FK_812c2852270da1247756e77f5a4" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: ai_builder_temporary_workflow FK_85a87a1ba0f61999fe11dc56325; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.ai_builder_temporary_workflow
    ADD CONSTRAINT "FK_85a87a1ba0f61999fe11dc56325" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: instance_ai_iteration_logs FK_8bfcc6c51fd3d69b1eae8aebd49; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.instance_ai_iteration_logs
    ADD CONSTRAINT "FK_8bfcc6c51fd3d69b1eae8aebd49" FOREIGN KEY ("threadId") REFERENCES public.instance_ai_threads(id) ON DELETE CASCADE;


--
-- Name: trusted_key FK_8c2938d746943dd8f608d23c891; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.trusted_key
    ADD CONSTRAINT "FK_8c2938d746943dd8f608d23c891" FOREIGN KEY ("sourceId") REFERENCES public.trusted_key_source(id) ON DELETE CASCADE;


--
-- Name: test_case_execution FK_8e4b4774db42f1e6dda3452b2af; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.test_case_execution
    ADD CONSTRAINT "FK_8e4b4774db42f1e6dda3452b2af" FOREIGN KEY ("testRunId") REFERENCES public.test_run(id) ON DELETE CASCADE;


--
-- Name: data_table_column FK_930b6e8faaf88294cef23484160; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.data_table_column
    ADD CONSTRAINT "FK_930b6e8faaf88294cef23484160" FOREIGN KEY ("dataTableId") REFERENCES public.data_table(id) ON DELETE CASCADE;


--
-- Name: dynamic_credential_user_entry FK_945ba70b342a066d1306b12ccd2; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_user_entry
    ADD CONSTRAINT "FK_945ba70b342a066d1306b12ccd2" FOREIGN KEY ("credentialId") REFERENCES public.credentials_entity(id) ON DELETE CASCADE;


--
-- Name: folder_tag FK_94a60854e06f2897b2e0d39edba; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.folder_tag
    ADD CONSTRAINT "FK_94a60854e06f2897b2e0d39edba" FOREIGN KEY ("folderId") REFERENCES public.folder(id) ON DELETE CASCADE;


--
-- Name: execution_annotations FK_97f863fa83c4786f19565084960; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_annotations
    ADD CONSTRAINT "FK_97f863fa83c4786f19565084960" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE CASCADE;


--
-- Name: chat_hub_agents FK_9c61ad497dcbae499c96a6a78ba; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_agents
    ADD CONSTRAINT "FK_9c61ad497dcbae499c96a6a78ba" FOREIGN KEY ("credentialId") REFERENCES public.credentials_entity(id) ON DELETE SET NULL;


--
-- Name: chat_hub_sessions FK_9f9293d9f552496c40e0d1a8f80; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_sessions
    ADD CONSTRAINT "FK_9f9293d9f552496c40e0d1a8f80" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE SET NULL;


--
-- Name: execution_annotation_tags FK_a3697779b366e131b2bbdae2976; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_annotation_tags
    ADD CONSTRAINT "FK_a3697779b366e131b2bbdae2976" FOREIGN KEY ("tagId") REFERENCES public.annotation_tag_entity(id) ON DELETE CASCADE;


--
-- Name: dynamic_credential_user_entry FK_a36dc616fabc3f736bb82410a22; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_user_entry
    ADD CONSTRAINT "FK_a36dc616fabc3f736bb82410a22" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: shared_workflow FK_a45ea5f27bcfdc21af9b4188560; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.shared_workflow
    ADD CONSTRAINT "FK_a45ea5f27bcfdc21af9b4188560" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: workflow_dependency FK_a4ff2d9b9628ea988fa9e7d0bf8; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_dependency
    ADD CONSTRAINT "FK_a4ff2d9b9628ea988fa9e7d0bf8" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: oauth_user_consents FK_a651acea2f6c97f8c4514935486; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_user_consents
    ADD CONSTRAINT "FK_a651acea2f6c97f8c4514935486" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_refresh_tokens FK_a699f3ed9fd0c1b19bc2608ac53; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT "FK_a699f3ed9fd0c1b19bc2608ac53" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: dynamic_credential_entry FK_a6d1dd080958304a47a02952aab; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_entry
    ADD CONSTRAINT "FK_a6d1dd080958304a47a02952aab" FOREIGN KEY (credential_id) REFERENCES public.credentials_entity(id) ON DELETE CASCADE;


--
-- Name: folder FK_a8260b0b36939c6247f385b8221; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.folder
    ADD CONSTRAINT "FK_a8260b0b36939c6247f385b8221" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: oauth_authorization_codes FK_aa8d3560484944c19bdf79ffa16; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT "FK_aa8d3560484944c19bdf79ffa16" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: chat_hub_messages FK_acf8926098f063cdbbad8497fd1; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_acf8926098f063cdbbad8497fd1" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE SET NULL;


--
-- Name: oauth_refresh_tokens FK_b388696ce4d8be7ffbe8d3e4b69; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT "FK_b388696ce4d8be7ffbe8d3e4b69" FOREIGN KEY ("clientId") REFERENCES public.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: workflow_publish_history FK_b4cfbc7556d07f36ca177f5e473; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_publish_history
    ADD CONSTRAINT "FK_b4cfbc7556d07f36ca177f5e473" FOREIGN KEY ("versionId") REFERENCES public.workflow_history("versionId") ON DELETE SET NULL;


--
-- Name: chat_hub_tools FK_b8030b47af9213f1fd15450fb7f; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_tools
    ADD CONSTRAINT "FK_b8030b47af9213f1fd15450fb7f" FOREIGN KEY ("ownerId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: role_mapping_rule FK_bb66e404c35996b0d6946177501; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_mapping_rule
    ADD CONSTRAINT "FK_bb66e404c35996b0d6946177501" FOREIGN KEY (role) REFERENCES public.role(slug) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_secrets_provider_access FK_bd264b81209355b543878deedb1; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_secrets_provider_access
    ADD CONSTRAINT "FK_bd264b81209355b543878deedb1" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: workflow_publish_history FK_c01316f8c2d7101ec4fa9809267; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_publish_history
    ADD CONSTRAINT "FK_c01316f8c2d7101ec4fa9809267" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: execution_annotation_tags FK_c1519757391996eb06064f0e7c8; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_annotation_tags
    ADD CONSTRAINT "FK_c1519757391996eb06064f0e7c8" FOREIGN KEY ("annotationId") REFERENCES public.execution_annotations(id) ON DELETE CASCADE;


--
-- Name: data_table FK_c2a794257dee48af7c9abf681de; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.data_table
    ADD CONSTRAINT "FK_c2a794257dee48af7c9abf681de" FOREIGN KEY ("projectId") REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: project_relation FK_c6b99592dc96b0d836d7a21db91; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project_relation
    ADD CONSTRAINT "FK_c6b99592dc96b0d836d7a21db91" FOREIGN KEY (role) REFERENCES public.role(slug);


--
-- Name: chat_hub_messages FK_chat_hub_messages_agentId; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_chat_hub_messages_agentId" FOREIGN KEY ("agentId") REFERENCES public.chat_hub_agents(id) ON DELETE SET NULL;


--
-- Name: chat_hub_sessions FK_chat_hub_sessions_agentId; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_sessions
    ADD CONSTRAINT "FK_chat_hub_sessions_agentId" FOREIGN KEY ("agentId") REFERENCES public.chat_hub_agents(id) ON DELETE SET NULL;


--
-- Name: dynamic_credential_entry FK_d61a12235d268a49af6a3c09c13; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.dynamic_credential_entry
    ADD CONSTRAINT "FK_d61a12235d268a49af6a3c09c13" FOREIGN KEY (resolver_id) REFERENCES public.dynamic_credential_resolver(id) ON DELETE CASCADE;


--
-- Name: test_run FK_d6870d3b6e4c185d33926f423c8; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.test_run
    ADD CONSTRAINT "FK_d6870d3b6e4c185d33926f423c8" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: shared_workflow FK_daa206a04983d47d0a9c34649ce; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.shared_workflow
    ADD CONSTRAINT "FK_daa206a04983d47d0a9c34649ce" FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: folder_tag FK_dc88164176283de80af47621746; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.folder_tag
    ADD CONSTRAINT "FK_dc88164176283de80af47621746" FOREIGN KEY ("tagId") REFERENCES public.tag_entity(id) ON DELETE CASCADE;


--
-- Name: role_mapping_rule_project FK_dd7ce4dfa09e95b36a626bd9de3; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_mapping_rule_project
    ADD CONSTRAINT "FK_dd7ce4dfa09e95b36a626bd9de3" FOREIGN KEY ("roleMappingRuleId") REFERENCES public.role_mapping_rule(id) ON DELETE CASCADE;


--
-- Name: workflow_published_version FK_df3428a541b802d6a63ac56e330; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_published_version
    ADD CONSTRAINT "FK_df3428a541b802d6a63ac56e330" FOREIGN KEY ("publishedVersionId") REFERENCES public.workflow_history("versionId") ON DELETE RESTRICT;


--
-- Name: user_api_keys FK_e131705cbbc8fb589889b02d457; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT "FK_e131705cbbc8fb589889b02d457" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: chat_hub_messages FK_e22538eb50a71a17954cd7e076c; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_e22538eb50a71a17954cd7e076c" FOREIGN KEY ("sessionId") REFERENCES public.chat_hub_sessions(id) ON DELETE CASCADE;


--
-- Name: test_case_execution FK_e48965fac35d0f5b9e7f51d8c44; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.test_case_execution
    ADD CONSTRAINT "FK_e48965fac35d0f5b9e7f51d8c44" FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE SET NULL;


--
-- Name: chat_hub_messages FK_e5d1fa722c5a8d38ac204746662; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_messages
    ADD CONSTRAINT "FK_e5d1fa722c5a8d38ac204746662" FOREIGN KEY ("previousMessageId") REFERENCES public.chat_hub_messages(id) ON DELETE CASCADE;


--
-- Name: chat_hub_session_tools FK_e649bf1295f4ed8d4299ed290f9; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_session_tools
    ADD CONSTRAINT "FK_e649bf1295f4ed8d4299ed290f9" FOREIGN KEY ("sessionId") REFERENCES public.chat_hub_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_hub_sessions FK_e9ecf8ede7d989fcd18790fe36a; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.chat_hub_sessions
    ADD CONSTRAINT "FK_e9ecf8ede7d989fcd18790fe36a" FOREIGN KEY ("ownerId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user FK_eaea92ee7bfb9c1b6cd01505d56; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "FK_eaea92ee7bfb9c1b6cd01505d56" FOREIGN KEY ("roleSlug") REFERENCES public.role(slug);


--
-- Name: role_scope FK_role; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_scope
    ADD CONSTRAINT "FK_role" FOREIGN KEY ("roleSlug") REFERENCES public.role(slug) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_scope FK_scope; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.role_scope
    ADD CONSTRAINT "FK_scope" FOREIGN KEY ("scopeSlug") REFERENCES public.scope(slug) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auth_identity auth_identity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.auth_identity
    ADD CONSTRAINT "auth_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: credentials_entity credentials_entity_resolverId_foreign; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.credentials_entity
    ADD CONSTRAINT "credentials_entity_resolverId_foreign" FOREIGN KEY ("resolverId") REFERENCES public.dynamic_credential_resolver(id) ON DELETE SET NULL;


--
-- Name: execution_data execution_data_fk; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_data
    ADD CONSTRAINT execution_data_fk FOREIGN KEY ("executionId") REFERENCES public.execution_entity(id) ON DELETE CASCADE;


--
-- Name: execution_entity fk_execution_entity_workflow_id; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.execution_entity
    ADD CONSTRAINT fk_execution_entity_workflow_id FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: webhook_entity fk_webhook_entity_workflow_id; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.webhook_entity
    ADD CONSTRAINT fk_webhook_entity_workflow_id FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: workflow_entity fk_workflow_parent_folder; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflow_entity
    ADD CONSTRAINT fk_workflow_parent_folder FOREIGN KEY ("parentFolderId") REFERENCES public.folder(id) ON DELETE CASCADE;


--
-- Name: workflows_tags fk_workflows_tags_tag_id; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflows_tags
    ADD CONSTRAINT fk_workflows_tags_tag_id FOREIGN KEY ("tagId") REFERENCES public.tag_entity(id) ON DELETE CASCADE;


--
-- Name: workflows_tags fk_workflows_tags_workflow_id; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.workflows_tags
    ADD CONSTRAINT fk_workflows_tags_workflow_id FOREIGN KEY ("workflowId") REFERENCES public.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: project projects_creatorId_foreign; Type: FK CONSTRAINT; Schema: public; Owner: reece.schmeler67
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT "projects_creatorId_foreign" FOREIGN KEY ("creatorId") REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 1ZSAbndJGtgKGkZmCUOHxSB635oWGYvwtnpVYxwPOOJn72slZxd2B8VAtp1FWgq

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict w3fBVNaEDnsQb24ORP6d6VX4JA3gnHEz4CrTsczaQkfiix61tYUD1zGrGgeyv2G

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO dashboard_user;


--
-- PostgreSQL database dump complete
--

\unrestrict w3fBVNaEDnsQb24ORP6d6VX4JA3gnHEz4CrTsczaQkfiix61tYUD1zGrGgeyv2G

--
-- PostgreSQL database cluster dump complete
--

