-- ========================================================
-- Agregar campos de facturación/datos bancarios a usuarios
-- ========================================================

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS cardholder_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS card_number_preview VARCHAR(19),
ADD COLUMN IF NOT EXISTS card_expiry VARCHAR(5),
ADD COLUMN IF NOT EXISTS card_cvv_hash VARCHAR(255);
