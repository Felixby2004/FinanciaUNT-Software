-- ========================================
-- Esquema de Base de Datos para FinanciaUNT
-- ========================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE,
    nombre TEXT,
    plan_suscripcion TEXT DEFAULT 'basico',
    access_token_plaid TEXT,
    rol TEXT DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
    configuracion JSONB DEFAULT '{}'::jsonb,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Recomendaciones IA
CREATE TABLE IF NOT EXISTS recomendaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_modelo TEXT NOT NULL,
    categoria TEXT,
    recomendacion TEXT NOT NULL,
    monto_recomendado NUMERIC,
    prioridad INTEGER DEFAULT 1,
    implementada BOOLEAN DEFAULT FALSE,
    fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabla de Historial de Recomendaciones Aceptadas
CREATE TABLE IF NOT EXISTS historial_recomendaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recomendacion_id UUID REFERENCES recomendaciones(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_aceptacion TIMESTAMPTZ DEFAULT NOW(),
    resultado TEXT
);

-- Tabla de Metas Financieras
CREATE TABLE IF NOT EXISTS metas_financieras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL,
    monto_objetivo NUMERIC NOT NULL,
    monto_actual NUMERIC DEFAULT 0,
    fecha_limite DATE,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Transacciones
CREATE TABLE IF NOT EXISTS transacciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    monto NUMERIC,
    categoria TEXT,
    descripcion TEXT,
    fecha DATE,
    tipo TEXT, -- 'ingreso' o 'gasto'
    cuenta TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria TEXT,
    monto_maximo NUMERIC,
    periodo TEXT DEFAULT 'mensual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Alertas
CREATE TABLE IF NOT EXISTS alertas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT,
    mensaje TEXT,
    severidad TEXT, -- 'alta', 'media', 'baja'
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Inversiones (opcional)
CREATE TABLE IF NOT EXISTS inversiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT,
    tipo TEXT,
    monto NUMERIC,
    fecha_inversion DATE,
    rendimiento NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Suscripciones (opcional)
CREATE TABLE IF NOT EXISTS suscripciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    plan TEXT,
    fecha_inicio TIMESTAMPTZ,
    fecha_expiracion TIMESTAMPTZ,
    estado TEXT DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Análisis Financiero (opcional)
CREATE TABLE IF NOT EXISTS analisis_financiero (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    periodo TEXT,
    analisis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Índices para mejorar el rendimiento
-- ========================================

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha);
CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_id ON presupuestos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_alertas_usuario_id ON alertas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_inversiones_usuario_id ON inversiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_usuario_id ON suscripciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_analisis_financiero_usuario_id ON analisis_financiero(usuario_id);
