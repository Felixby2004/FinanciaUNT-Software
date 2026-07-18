-- ========================================================
-- Actualizar pesos de modelos de IA a la especificación
-- ========================================================

UPDATE ai_models 
SET weight = 1.5 
WHERE name = 'Collaborative Filtering';

UPDATE ai_models 
SET weight = 2.5 
WHERE name = 'Time Series Forecasting';

UPDATE ai_models 
SET weight = 2.0 
WHERE name = 'Content-Based Filtering';
