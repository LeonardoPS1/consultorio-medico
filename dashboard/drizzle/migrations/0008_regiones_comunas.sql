-- Migration 0008: Regiones y Comunas de Chile
-- Crea tablas normalizadas con FK desde pacientes

-- ============================================================
-- 1. Crear tabla regiones
-- ============================================================
CREATE TABLE IF NOT EXISTS regiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  numero_romano VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 2. Crear tabla comunas
-- ============================================================
CREATE TABLE IF NOT EXISTS comunas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  region_id UUID NOT NULL REFERENCES regiones(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comunas_region_id ON comunas(region_id);

-- ============================================================
-- 3. Agregar FK a pacientes (columnas ya existen)
-- ============================================================
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regiones(id);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS comuna_id UUID REFERENCES comunas(id);

-- ============================================================
-- 4. Insertar regiones de Chile (16)
-- ============================================================
INSERT INTO regiones (nombre, numero_romano) VALUES
  ('Arica y Parinacota', 'XV'),
  ('Tarapacá', 'I'),
  ('Antofagasta', 'II'),
  ('Atacama', 'III'),
  ('Coquimbo', 'IV'),
  ('Valparaíso', 'V'),
  ('Metropolitana de Santiago', 'RM'),
  ('Libertador General Bernardo O''Higgins', 'VI'),
  ('Maule', 'VII'),
  ('Ñuble', 'XVI'),
  ('Biobío', 'VIII'),
  ('La Araucanía', 'IX'),
  ('Los Ríos', 'XIV'),
  ('Los Lagos', 'X'),
  ('Aysén del General Carlos Ibáñez del Campo', 'XI'),
  ('Magallanes y de la Antártica Chilena', 'XII')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 5. Insertar comunas (agrupadas por región)
-- ============================================================

-- XV: Arica y Parinacota
INSERT INTO comunas (nombre, region_id) SELECT 'Arica', id FROM regiones WHERE nombre = 'Arica y Parinacota';
INSERT INTO comunas (nombre, region_id) SELECT 'Camarones', id FROM regiones WHERE nombre = 'Arica y Parinacota';
INSERT INTO comunas (nombre, region_id) SELECT 'Putre', id FROM regiones WHERE nombre = 'Arica y Parinacota';
INSERT INTO comunas (nombre, region_id) SELECT 'General Lagos', id FROM regiones WHERE nombre = 'Arica y Parinacota';

-- I: Tarapacá
INSERT INTO comunas (nombre, region_id) SELECT 'Iquique', id FROM regiones WHERE nombre = 'Tarapacá';
INSERT INTO comunas (nombre, region_id) SELECT 'Alto Hospicio', id FROM regiones WHERE nombre = 'Tarapacá';
INSERT INTO comunas (nombre, region_id) SELECT 'Pozo Almonte', id FROM regiones WHERE nombre = 'Tarapacá';
INSERT INTO comunas (nombre, region_id) SELECT 'Camiña', id FROM regiones WHERE nombre = 'Tarapacá';
INSERT INTO comunas (nombre, region_id) SELECT 'Colchane', id FROM regiones WHERE nombre = 'Tarapacá';
INSERT INTO comunas (nombre, region_id) SELECT 'Huara', id FROM regiones WHERE nombre = 'Tarapacá';
INSERT INTO comunas (nombre, region_id) SELECT 'Pica', id FROM regiones WHERE nombre = 'Tarapacá';

-- II: Antofagasta
INSERT INTO comunas (nombre, region_id) SELECT 'Antofagasta', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'Mejillones', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'Sierra Gorda', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'Taltal', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'Calama', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'Ollagüe', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'San Pedro de Atacama', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'Tocopilla', id FROM regiones WHERE nombre = 'Antofagasta';
INSERT INTO comunas (nombre, region_id) SELECT 'María Elena', id FROM regiones WHERE nombre = 'Antofagasta';

-- III: Atacama
INSERT INTO comunas (nombre, region_id) SELECT 'Copiapó', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Caldera', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Tierra Amarilla', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Chañaral', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Diego de Almagro', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Vallenar', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Alto del Carmen', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Freirina', id FROM regiones WHERE nombre = 'Atacama';
INSERT INTO comunas (nombre, region_id) SELECT 'Huasco', id FROM regiones WHERE nombre = 'Atacama';

-- IV: Coquimbo
INSERT INTO comunas (nombre, region_id) SELECT 'La Serena', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Coquimbo', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Andacollo', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'La Higuera', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Paiguano', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Vicuña', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Illapel', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Canela', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Vilos', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Salamanca', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Ovalle', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Combarbalá', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Monte Patria', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Punitaqui', id FROM regiones WHERE nombre = 'Coquimbo';
INSERT INTO comunas (nombre, region_id) SELECT 'Río Hurtado', id FROM regiones WHERE nombre = 'Coquimbo';

-- V: Valparaíso
INSERT INTO comunas (nombre, region_id) SELECT 'Valparaíso', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Casablanca', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Concón', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Juan Fernández', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Puchuncaví', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Quintero', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Viña del Mar', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Isla de Pascua', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Andes', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Calle Larga', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Rinconada', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'San Esteban', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'La Ligua', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Cabildo', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Papudo', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Petorca', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Zapallar', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Quillota', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Calera', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Hijuelas', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'La Cruz', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Nogales', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'San Antonio', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Algarrobo', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Cartagena', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'El Quisco', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'El Tabo', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Santo Domingo', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'San Felipe', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Catemu', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Llaillay', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Panquehue', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Putaendo', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Santa María', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Villa Alemana', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Limache', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Olmué', id FROM regiones WHERE nombre = 'Valparaíso';
INSERT INTO comunas (nombre, region_id) SELECT 'Quilpué', id FROM regiones WHERE nombre = 'Valparaíso';

-- RM: Metropolitana de Santiago
INSERT INTO comunas (nombre, region_id) SELECT 'Santiago', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Cerrillos', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Cerro Navia', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Conchalí', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'El Bosque', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Estación Central', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Huechuraba', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Independencia', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'La Cisterna', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'La Florida', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'La Granja', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'La Pintana', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'La Reina', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Las Condes', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Lo Barnechea', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Lo Espejo', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Lo Prado', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Macul', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Maipú', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Ñuñoa', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Pedro Aguirre Cerda', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Peñalolén', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Providencia', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Pudahuel', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Quilicura', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Quinta Normal', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Recoleta', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Renca', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'San Joaquín', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'San Miguel', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'San Ramón', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Vitacura', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Colina', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Lampa', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Til Til', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Pirque', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Puente Alto', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'San José de Maipo', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Buin', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Calera de Tango', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Paine', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'San Bernardo', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Alhué', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Curacaví', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'María Pinto', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Melipilla', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'San Pedro', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'El Monte', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Isla de Maipo', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Padre Hurtado', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Peñaflor', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';
INSERT INTO comunas (nombre, region_id) SELECT 'Talagante', id FROM regiones WHERE nombre = 'Metropolitana de Santiago';

-- VI: O'Higgins
INSERT INTO comunas (nombre, region_id) SELECT 'Rancagua', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Codegua', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Coinco', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Coltauco', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Doñihue', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Graneros', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Las Cabras', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Machalí', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Malloa', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Mostazal', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Olivar', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Peumo', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Pichidegua', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Quinta de Tilcoco', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Rengo', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Requínoa', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'San Vicente', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Pichilemu', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'La Estrella', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Litueche', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Marchihue', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Navidad', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Paredones', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'San Fernando', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Chépica', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Chimbarongo', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Lolol', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Nancagua', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Palmilla', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Peralillo', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Placilla', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Pumanque', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';
INSERT INTO comunas (nombre, region_id) SELECT 'Santa Cruz', id FROM regiones WHERE nombre = 'Libertador General Bernardo O''Higgins';

-- VII: Maule
INSERT INTO comunas (nombre, region_id) SELECT 'Talca', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Constitución', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Curepto', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Empedrado', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Maule', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Pelarco', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Pencahue', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Río Claro', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'San Clemente', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'San Rafael', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Cauquenes', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Chanco', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Pelluhue', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Curicó', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Hualañé', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Licantén', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Molina', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Rauco', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Romeral', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Sagrada Familia', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Teno', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Vichuquén', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Linares', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Colbún', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Longaví', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Parral', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Retiro', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'San Javier', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Villa Alegre', id FROM regiones WHERE nombre = 'Maule';
INSERT INTO comunas (nombre, region_id) SELECT 'Yerbas Buenas', id FROM regiones WHERE nombre = 'Maule';

-- XVI: Ñuble
INSERT INTO comunas (nombre, region_id) SELECT 'Chillán', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Bulnes', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Chillán Viejo', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'El Carmen', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Pemuco', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Pinto', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Quillón', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'San Ignacio', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Yungay', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Cobquecura', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Coelemu', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Ninhue', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Portezuelo', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Quirihue', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Ránquil', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Treguaco', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'San Carlos', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Coihueco', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'Ñiquén', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'San Fabián', id FROM regiones WHERE nombre = 'Ñuble';
INSERT INTO comunas (nombre, region_id) SELECT 'San Nicolás', id FROM regiones WHERE nombre = 'Ñuble';

-- VIII: Biobío
INSERT INTO comunas (nombre, region_id) SELECT 'Concepción', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Coronel', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Chiguayante', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Florida', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Hualpén', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Hualqui', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Lota', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Penco', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'San Pedro de la Paz', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Santa Juana', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Talcahuano', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Tomé', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Arauco', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Cañete', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Contulmo', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Curanilahue', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Lebu', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Álamos', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Tirúa', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Ángeles', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Antuco', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Cabrero', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Laja', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Mulchén', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Nacimiento', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Negrete', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Quilaco', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Quilleco', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'San Rosendo', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Santa Bárbara', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Tucapel', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Yumbel', id FROM regiones WHERE nombre = 'Biobío';
INSERT INTO comunas (nombre, region_id) SELECT 'Alto Biobío', id FROM regiones WHERE nombre = 'Biobío';

-- IX: La Araucanía
INSERT INTO comunas (nombre, region_id) SELECT 'Temuco', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Carahue', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Cunco', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Freire', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Galvarino', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Gorbea', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Lautaro', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Loncoche', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Melipeuco', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Nueva Imperial', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Padre Las Casas', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Perquenco', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Pitrufquén', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Pucón', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Saavedra', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Teodoro Schmidt', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Toltén', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Vilcún', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Villarrica', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Angol', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Collipulli', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Curacautín', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Ercilla', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Lonquimay', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Sauces', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Lumaco', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Purén', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Renaico', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Traiguén', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Victoria', id FROM regiones WHERE nombre = 'La Araucanía';
INSERT INTO comunas (nombre, region_id) SELECT 'Cholchol', id FROM regiones WHERE nombre = 'La Araucanía';

-- XIV: Los Ríos
INSERT INTO comunas (nombre, region_id) SELECT 'Valdivia', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Corral', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Lanco', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Lagos', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Máfil', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Mariquina', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Paillaco', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Panguipulli', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'La Unión', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Futrono', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Lago Ranco', id FROM regiones WHERE nombre = 'Los Ríos';
INSERT INTO comunas (nombre, region_id) SELECT 'Río Bueno', id FROM regiones WHERE nombre = 'Los Ríos';

-- X: Los Lagos
INSERT INTO comunas (nombre, region_id) SELECT 'Puerto Montt', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Calbuco', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Cochamó', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Fresia', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Frutillar', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Llanquihue', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Los Muermos', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Maullín', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Puerto Varas', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Castro', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Ancud', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Chonchi', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Curaco de Vélez', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Dalcahue', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Puqueldón', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Queilén', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Quellón', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Quemchi', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Quinchao', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Osorno', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Puerto Octay', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Purranque', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Puyehue', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Río Negro', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'San Juan de la Costa', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'San Pablo', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Chaitén', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Futaleufú', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Hualaihué', id FROM regiones WHERE nombre = 'Los Lagos';
INSERT INTO comunas (nombre, region_id) SELECT 'Palena', id FROM regiones WHERE nombre = 'Los Lagos';

-- XI: Aysén
INSERT INTO comunas (nombre, region_id) SELECT 'Coihaique', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Lago Verde', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Aysén', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Cisnes', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Guaitecas', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Cochrane', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'O''Higgins', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Tortel', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Chile Chico', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';
INSERT INTO comunas (nombre, region_id) SELECT 'Río Ibáñez', id FROM regiones WHERE nombre = 'Aysén del General Carlos Ibáñez del Campo';

-- XII: Magallanes
INSERT INTO comunas (nombre, region_id) SELECT 'Punta Arenas', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Laguna Blanca', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Río Verde', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'San Gregorio', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Cabo de Hornos', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Antártica', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Porvenir', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Primavera', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Timaukel', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Natales', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
INSERT INTO comunas (nombre, region_id) SELECT 'Torres del Paine', id FROM regiones WHERE nombre = 'Magallanes y de la Antártica Chilena';
