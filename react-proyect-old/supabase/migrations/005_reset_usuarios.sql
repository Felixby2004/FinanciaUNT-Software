
-- =============================================
-- Resetear la tabla usuarios completamente
-- =============================================

-- Borrar la tabla si existe (CUIDADO: borra todos los datos)
DROP TABLE IF EXISTS usuarios CASCADE;

-- Crear la tabla de nuevo
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  access_token_plaid TEXT NOT NULL,
  rol VARCHAR(50) DEFAULT 'cliente',
  plan_suscripcion VARCHAR(50) DEFAULT 'basico',
  configuracion JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (nombre, email, access_token_plaid, rol, plan_suscripcion, configuracion)
VALUES 
('Juan Pérez', 'juan@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cliente', 'basico', '{"monthlyIncome": 3000, "riskProfile": "moderado", "advisorTone": "amable", "currency": "USD"}'),
('María García', 'maria@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cliente', 'premium', '{"monthlyIncome": 5000, "riskProfile": "agresivo", "advisorTone": "directo", "currency": "EUR"}'),
('Admin User', 'admin@financiaunt.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'basico', '{}');
