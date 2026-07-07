-- ========================================
-- Script para configurar políticas RLS en Supabase
-- Permite operaciones completas para desarrollo
-- ========================================

-- Habilitar RLS en todas las tablas (si no está habilitado)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis_financiero ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir todas las operaciones (para desarrollo)
-- Política para usuarios
CREATE POLICY "Permitir todo en usuarios" 
ON usuarios
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para transacciones
CREATE POLICY "Permitir todo en transacciones" 
ON transacciones
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para presupuestos
CREATE POLICY "Permitir todo en presupuestos" 
ON presupuestos
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para alertas
CREATE POLICY "Permitir todo en alertas" 
ON alertas
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para inversiones
CREATE POLICY "Permitir todo en inversiones" 
ON inversiones
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para suscripciones
CREATE POLICY "Permitir todo en suscripciones" 
ON suscripciones
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para analisis_financiero
CREATE POLICY "Permitir todo en analisis_financiero" 
ON analisis_financiero
FOR ALL
USING (true)
WITH CHECK (true);
