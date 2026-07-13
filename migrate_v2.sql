
-- Migración para actualizar la base de datos a la versión 2
-- Agrega: roles de usuario, metas financieras, recomendaciones

-- 1. Agregar columna 'rol' a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'cliente' 
CHECK (rol IN ('cliente', 'admin'));

-- 2. Crear tabla de metas financieras si no existe
CREATE TABLE IF NOT EXISTS metas_financieras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL,
    monto_objetivo NUMERIC NOT NULL,
    monto_actual NUMERIC DEFAULT 0,
    fecha_limite DATE,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla de recomendaciones si no existe
CREATE TABLE IF NOT EXISTS recomendaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_modelo VARCHAR(100) NOT NULL,
    categoria VARCHAR(100),
    recomendacion TEXT NOT NULL,
    monto_recomendado NUMERIC,
    prioridad INTEGER DEFAULT 1,
    implementada BOOLEAN DEFAULT FALSE,
    fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas_financieras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_usuario ON recomendaciones(usuario_id);

-- 5. Comprobación de la migración
SELECT
    'usuarios' AS tabla,
    column_name,
    data_type
FROM
    information_schema.columns
WHERE
    table_name = 'usuarios'
ORDER BY ordinal_position;

SELECT
    'metas_financieras' AS tabla,
    column_name,
    data_type
FROM
    information_schema.columns
WHERE
    table_name = 'metas_financieras'
ORDER BY ordinal_position;

SELECT
    'recomendaciones' AS tabla,
    column_name,
    data_type
FROM
    information_schema.columns
WHERE
    table_name = 'recomendaciones'
ORDER BY ordinal_position;
