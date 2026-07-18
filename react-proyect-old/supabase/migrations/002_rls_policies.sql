
-- =============================================
-- Habilitar Row Level Security (RLS) y crear políticas (App maneja su propia auth)
-- =============================================

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financieras ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_center ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_privacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_adoption ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para permitir acceso completo (App maneja su propia auth)
-- La app maneja la autenticación con bcrypt, así que damos acceso completo a todas las tablas
-- Nota: En producción, deberías ajustar esto para mayor seguridad
CREATE POLICY "Permitir acceso completo a todas las tablas"
  ON usuarios
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a transacciones"
  ON transacciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a presupuestos"
  ON presupuestos
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a metas_financieras"
  ON metas_financieras
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a planes"
  ON planes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a currency_rates"
  ON currency_rates
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a categories"
  ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a recurring_transactions"
  ON recurring_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a notifications"
  ON notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a glossary"
  ON glossary
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a help_center"
  ON help_center
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a terms_privacy"
  ON terms_privacy
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a invoices"
  ON invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a mrr_logs"
  ON mrr_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a ai_models"
  ON ai_models
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a ai_recommendations"
  ON ai_recommendations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a statistical_tests"
  ON statistical_tests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a chatbot_conversations"
  ON chatbot_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a chatbot_limits"
  ON chatbot_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a invites"
  ON invites
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a reports"
  ON reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir acceso completo a feature_adoption"
  ON feature_adoption
  FOR ALL
  USING (true)
  WITH CHECK (true);
