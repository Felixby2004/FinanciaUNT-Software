
  -- =============================================
  -- Migración 001: Añadir planes y características avanzadas (segura para BD existente)
  -- =============================================

  -- 1. Tabla de planes (si no existe)
  CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'basic', 'premium', 'enterprise', 'admin'
    description TEXT,
    price_monthly NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Insertar los planes solo si no existen
  INSERT INTO plans (name, description, price_monthly)
  VALUES 
  ('basic', 'Cliente Básico (Gratis)', 0),
  ('premium', 'Cliente Premium (Pago)', 29.99),
  ('enterprise', 'Cliente Enterprise (Pago)', 99.99),
  ('admin', 'Admin (Supervisor)', 0)
  ON CONFLICT (name) DO NOTHING;

  -- 2. Modificar la tabla usuarios para añadir plan y campos adicionales
  DO $$
  BEGIN
    -- Añadir columna plan_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'plan_id') THEN
      ALTER TABLE usuarios ADD COLUMN plan_id INTEGER REFERENCES plans(id);
      -- Establecer plan por defecto (basic) para usuarios existentes
      UPDATE usuarios SET plan_id = (SELECT id FROM plans WHERE name = 'basic') WHERE plan_id IS NULL;
    END IF;
    
    -- Añadir columna empresa_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'empresa_id') THEN
      ALTER TABLE usuarios ADD COLUMN empresa_id INTEGER;
    END IF;
    
    -- Añadir columna departamento si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'departamento') THEN
      ALTER TABLE usuarios ADD COLUMN departamento VARCHAR(100);
    END IF;
    
    -- Añadir columna moneda_base si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'moneda_base') THEN
      ALTER TABLE usuarios ADD COLUMN moneda_base VARCHAR(10) DEFAULT 'PEN';
    END IF;
    
    -- Añadir columna tema si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'tema') THEN
      ALTER TABLE usuarios ADD COLUMN tema VARCHAR(20) DEFAULT 'light';
    END IF;
    
    -- Añadir columna idioma si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'idioma') THEN
      ALTER TABLE usuarios ADD COLUMN idioma VARCHAR(10) DEFAULT 'es';
    END IF;
  END $$;

  -- 3. Tabla de divisas y tipos de cambio
  CREATE TABLE IF NOT EXISTS currency_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10) NOT NULL,
    rate NUMERIC(15, 6) NOT NULL,
    source VARCHAR(50), -- Nombre del proveedor de la API
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (base_currency, target_currency)
  );

  -- 4. Tabla de categorías globales y privadas
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'income', 'expense'
    is_global BOOLEAN DEFAULT FALSE, -- Si es categoría global (creada por admin)
    empresa_id INTEGER, -- Para categorías globales por empresa
    user_id INTEGER REFERENCES usuarios(id), -- Para categorías privadas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, user_id, empresa_id)
  );

  -- 5. Tabla de transacciones recurrentes
  CREATE TABLE IF NOT EXISTS recurring_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    next_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'failed'
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 6. Tabla de notificaciones
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    type VARCHAR(50) NOT NULL, -- 'in_app', 'push', 'email', 'slack', 'teams'
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 7. Tabla de glosario (para Enterprise)
  CREATE TABLE IF NOT EXISTS glossary (
    id SERIAL PRIMARY KEY,
    term VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,
    empresa_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 8. Tabla de manual de usuario y centro de ayuda
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

  -- 9. Tabla de términos y privacidad con versiones
  CREATE TABLE IF NOT EXISTS terms_privacy (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'terms', 'privacy', 'nda'
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 10. Tabla de facturas y recibos
  CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- 'paid', 'pending', 'failed'
    invoice_number VARCHAR(50) UNIQUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
  );

  -- 11. Tabla de registros de MRR (para Admin)
  CREATE TABLE IF NOT EXISTS mrr_logs (
    id SERIAL PRIMARY KEY,
    month DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 12. Tabla de modelos de IA de recomendación
  CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    weight NUMERIC(5, 2) DEFAULT 1.0, -- Peso global (para Admin)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Insertar los 3 modelos de IA solo si no existen
  INSERT INTO ai_models (name, description, weight)
  VALUES
  ('Collaborative Filtering', 'Filtro colaborativo: Recomienda basado en patrones de usuarios similares. Ideal para encontrar categorías que usuarios parecidos usan.', 1.0),
  ('Time Series Forecasting', 'Forecasting de series temporales: Predice gastos futuros basado en el historial del usuario. Usa ARIMA y exponencial smoothing.', 1.0),
  ('Content-Based Filtering', 'Filtro basado en contenido: Recomienda categorías basadas en las características de las transacciones pasadas del usuario.', 1.0)
  ON CONFLICT (name) DO NOTHING;

  -- 13. Tabla de resultados de recomendaciones de IA
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

  -- 14. Tabla de registros de pruebas estadísticas (para Admin)
  CREATE TABLE IF NOT EXISTS statistical_tests (
    id SERIAL PRIMARY KEY,
    test_type VARCHAR(50) NOT NULL, -- 'friedman', 'wilcoxon', 'bootstrap'
    parameters JSONB,
    results JSONB,
    interpretation TEXT,
    executed_by INTEGER REFERENCES usuarios(id),
    executed_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 15. Tabla de chatbot y registros de conversación
  CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    message TEXT NOT NULL,
    response TEXT,
    is_voice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 16. Tabla de límites diarios del chatbot
  CREATE TABLE IF NOT EXISTS chatbot_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    date DATE NOT NULL,
    messages_used INTEGER DEFAULT 0,
    max_messages INTEGER NOT NULL,
    UNIQUE (user_id, date)
  );

  -- 17. Tabla de invites (para Enterprise)
  CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES usuarios(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 18. Tabla de reportes generados
  CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    type VARCHAR(50) NOT NULL, -- 'monthly_summary', 'ia_impact', 'forecast', 'benchmark', 'audit', 'executive'
    content JSONB,
    is_white_label BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 19. Tabla de adopción de features (para Admin)
  CREATE TABLE IF NOT EXISTS feature_adoption (
    id SERIAL PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL,
    user_count INTEGER NOT NULL,
    date DATE NOT NULL,
    UNIQUE (feature_name, date)
  );

  -- Crear índices para optimizar consultas (si no existen)
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recurring_transactions_user_id') THEN
      CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_recommendations_user_id') THEN
      CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chatbot_conversations_user_id') THEN
      CREATE INDEX idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
    END IF;
  END $$;
