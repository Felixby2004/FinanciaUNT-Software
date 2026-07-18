
-- =============================================
-- FinanciaUNT - Initial Database Schema (Fresh Setup)
-- =============================================

-- Enable UUID extension (optional, but useful)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Tabla: planes
-- =============================================
CREATE TABLE IF NOT EXISTS planes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    precio NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar planes iniciales
INSERT INTO planes (nombre, descripcion, precio)
VALUES 
('basico', 'Plan Básico - Gratis', 0),
('premium', 'Plan Premium - $9.99/mes', 9.99),
('enterprise', 'Plan Enterprise - $29.99/mes', 29.99)
ON CONFLICT (nombre) DO NOTHING;

-- =============================================
-- 2. Tabla: usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    access_token_plaid TEXT NOT NULL, -- Almacena la contraseña hasheada
    rol VARCHAR(50) DEFAULT 'cliente',
    plan_suscripcion VARCHAR(50) DEFAULT 'basico',
    configuracion JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar usuarios de ejemplo (contraseña: "password123" hasheada con bcrypt)
INSERT INTO usuarios (nombre, email, access_token_plaid, rol, plan_suscripcion, configuracion)
VALUES 
('Juan Pérez', 'juan@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cliente', 'basico', '{"monthlyIncome": 3000, "riskProfile": "moderado", "advisorTone": "amable", "currency": "USD"}'),
('María García', 'maria@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cliente', 'premium', '{"monthlyIncome": 5000, "riskProfile": "agresivo", "advisorTone": "directo", "currency": "EUR"}'),
('Admin User', 'admin@financiaunt.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'basico', '{}')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 3. Tabla: transacciones
-- =============================================
CREATE TABLE IF NOT EXISTS transacciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    monto NUMERIC(15, 2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    cuenta VARCHAR(255) DEFAULT 'Cuenta Principal',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. Tabla: presupuestos
-- =============================================
CREATE TABLE IF NOT EXISTS presupuestos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    monto_maximo NUMERIC(15, 2) NOT NULL,
    periodo VARCHAR(50) DEFAULT 'mensual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. Tabla: metas_financieras
-- =============================================
CREATE TABLE IF NOT EXISTS metas_financieras (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'ahorro',
    monto_objetivo NUMERIC(15, 2) NOT NULL,
    monto_actual NUMERIC(15, 2) DEFAULT 0,
    fecha_limite DATE,
    estado VARCHAR(50) DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. Tablas Adicionales (Planes y Features Avanzadas)
-- =============================================

-- Tabla: currency_rates
CREATE TABLE IF NOT EXISTS currency_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10) NOT NULL,
    rate NUMERIC(15, 6) NOT NULL,
    source VARCHAR(50),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (base_currency, target_currency)
);

-- Tabla: categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    empresa_id INTEGER,
    user_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, user_id, empresa_id)
);

-- Tabla: recurring_transactions
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    frequency VARCHAR(20) NOT NULL,
    next_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: glossary
CREATE TABLE IF NOT EXISTS glossary (
    id SERIAL PRIMARY KEY,
    term VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,
    empresa_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: help_center
CREATE TABLE IF NOT EXISTS help_center (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_pdf BOOLEAN DEFAULT FALSE,
    is_white_label BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: terms_privacy
CREATE TABLE IF NOT EXISTS terms_privacy (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    invoice_number VARCHAR(50) UNIQUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Tabla: mrr_logs
CREATE TABLE IF NOT EXISTS mrr_logs (
    id SERIAL PRIMARY KEY,
    month DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: ai_models
CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    weight NUMERIC(5, 2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar modelos de IA iniciales
INSERT INTO ai_models (name, description, weight)
VALUES 
('Collaborative Filtering', 'Filtro colaborativo: Recomienda basado en patrones de usuarios similares.', 1.0),
('Time Series Forecasting', 'Forecasting de series temporales: Predice gastos futuros.', 1.0),
('Content-Based Filtering', 'Filtro basado en contenido: Recomienda categorías por transacciones.', 1.0)
ON CONFLICT (name) DO NOTHING;

-- Tabla: ai_recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    model_id INTEGER NOT NULL REFERENCES ai_models(id),
    recommendation TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    predicted_amount NUMERIC(15, 2),
    confidence NUMERIC(5, 4),
    is_accepted BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: statistical_tests
CREATE TABLE IF NOT EXISTS statistical_tests (
    id SERIAL PRIMARY KEY,
    test_type VARCHAR(50) NOT NULL,
    parameters JSONB,
    results JSONB,
    interpretation TEXT,
    executed_by INTEGER REFERENCES usuarios(id),
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: chatbot_conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    message TEXT NOT NULL,
    response TEXT,
    is_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: chatbot_limits
CREATE TABLE IF NOT EXISTS chatbot_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    date DATE NOT NULL,
    messages_used INTEGER DEFAULT 0,
    max_messages INTEGER NOT NULL,
    UNIQUE (user_id, date)
);

-- Tabla: invites
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES usuarios(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: reports
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    type VARCHAR(50) NOT NULL,
    content JSONB,
    is_white_label BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: feature_adoption
CREATE TABLE IF NOT EXISTS feature_adoption (
    id SERIAL PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL,
    user_count INTEGER NOT NULL,
    date DATE NOT NULL,
    UNIQUE (feature_name, date)
);

-- =============================================
-- Crear índices para optimizar consultas
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_id ON presupuestos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metas_financieras_usuario_id ON metas_financieras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
