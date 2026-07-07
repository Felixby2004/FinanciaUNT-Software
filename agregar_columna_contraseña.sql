-- ========================================
-- Script para agregar la columna de contraseña a la tabla usuarios
-- ========================================

-- Agregar la columna access_token_plaid (se usa como contraseña)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS access_token_plaid TEXT;

-- Verificar que la columna se creó
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name = 'access_token_plaid';
