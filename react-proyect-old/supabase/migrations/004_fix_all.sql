
-- =============================================
-- Fix final: Borrar todas las políticas RLS y desactivar RLS por completo
-- =============================================

-- 1. Eliminar todas las políticas de todas las tablas
DROP POLICY IF EXISTS "Permitir acceso completo a todas las tablas" ON usuarios;
DROP POLICY IF EXISTS "Permitir acceso completo a transacciones" ON transacciones;
DROP POLICY IF EXISTS "Permitir acceso completo a presupuestos" ON presupuestos;
DROP POLICY IF EXISTS "Permitir acceso completo a metas_financieras" ON metas_financieras;
DROP POLICY IF EXISTS "Permitir acceso completo a planes" ON planes;
DROP POLICY IF EXISTS "Permitir acceso completo a currency_rates" ON currency_rates;
DROP POLICY IF EXISTS "Permitir acceso completo a categories" ON categories;
DROP POLICY IF EXISTS "Permitir acceso completo a recurring_transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Permitir acceso completo a notifications" ON notifications;
DROP POLICY IF EXISTS "Permitir acceso completo a glossary" ON glossary;
DROP POLICY IF EXISTS "Permitir acceso completo a help_center" ON help_center;
DROP POLICY IF EXISTS "Permitir acceso completo a terms_privacy" ON terms_privacy;
DROP POLICY IF EXISTS "Permitir acceso completo a invoices" ON invoices;
DROP POLICY IF EXISTS "Permitir acceso completo a mrr_logs" ON mrr_logs;
DROP POLICY IF EXISTS "Permitir acceso completo a ai_models" ON ai_models;
DROP POLICY IF EXISTS "Permitir acceso completo a ai_recommendations" ON ai_recommendations;
DROP POLICY IF EXISTS "Permitir acceso completo a statistical_tests" ON statistical_tests;
DROP POLICY IF EXISTS "Permitir acceso completo a chatbot_conversations" ON chatbot_conversations;
DROP POLICY IF EXISTS "Permitir acceso completo a chatbot_limits" ON chatbot_limits;
DROP POLICY IF EXISTS "Permitir acceso completo a invites" ON invites;
DROP POLICY IF EXISTS "Permitir acceso completo a reports" ON reports;
DROP POLICY IF EXISTS "Permitir acceso completo a feature_adoption" ON feature_adoption;

-- 2. Desactivar RLS en todas las tablas
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos DISABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financieras DISABLE ROW LEVEL SECURITY;
ALTER TABLE planes DISABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE glossary DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_center DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms_privacy DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_adoption DISABLE ROW LEVEL SECURITY;

-- 3. Asegurar que los usuarios de ejemplo existen
INSERT INTO usuarios (nombre, email, access_token_plaid, rol, plan_suscripcion, configuracion)
VALUES 
('Juan Pérez', 'juan@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cliente', 'basico', '{"monthlyIncome": 3000, "riskProfile": "moderado", "advisorTone": "amable", "currency": "USD"}'),
('María García', 'maria@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'cliente', 'premium', '{"monthlyIncome": 5000, "riskProfile": "agresivo", "advisorTone": "directo", "currency": "EUR"}'),
('Admin User', 'admin@financiaunt.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'basico', '{}')
ON CONFLICT (email) DO NOTHING;
