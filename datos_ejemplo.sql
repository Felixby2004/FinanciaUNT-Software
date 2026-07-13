-- ========================================
-- Datos de ejemplo para FinanciaUNT
-- ========================================

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (id, email, nombre, plan_suscripcion, access_token_plaid, rol, configuracion) VALUES
    ('550e8400-e29b-41d4-a716-446655440003', 'admin@financiaunt.com', 'Administrador', 'enterprise', 'admin123', 'admin', '{"moneda": "USD", "idioma": "es", "notificaciones": true}'),
    ('550e8400-e29b-41d4-a716-446655440000', 'juan.perez@email.com', 'Juan Pérez', 'premium', '123456', 'cliente', '{"moneda": "USD", "idioma": "es", "notificaciones": true}'),
    ('550e8400-e29b-41d4-a716-446655440001', 'maria.garcia@email.com', 'María García', 'basico', '123456', 'cliente', '{"moneda": "USD", "idioma": "es", "notificaciones": true}'),
    ('550e8400-e29b-41d4-a716-446655440002', 'carlos.rodriguez@email.com', 'Carlos Rodríguez', 'enterprise', '123456', 'cliente', '{"moneda": "USD", "idioma": "es", "notificaciones": true}');

-- Insertar transacciones de ejemplo para Juan Pérez
INSERT INTO transacciones (usuario_id, monto, categoria, descripcion, fecha, tipo, cuenta, metadata) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 3500.00, 'Ingresos', 'Salario mensual', '2026-07-01', 'ingreso', 'Cuenta Principal', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 125.50, 'Alimentación', 'Supermercado', '2026-07-02', 'gasto', 'Cuenta Principal', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 45.00, 'Transporte', 'Gasolina', '2026-07-03', 'gasto', 'Cuenta Principal', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 89.99, 'Entretenimiento', 'Cine y snacks', '2026-07-04', 'gasto', 'Tarjeta Crédito', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 150.00, 'Servicios', 'Luz', '2026-07-05', 'gasto', 'Cuenta Principal', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 35.50, 'Salud', 'Farmacia', '2026-07-06', 'gasto', 'Efectivo', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 250.00, 'Ingresos', 'Freelance', '2026-07-07', 'ingreso', 'Cuenta Principal', '{"generado": "ejemplo"}');

-- Insertar presupuestos de ejemplo para Juan Pérez
INSERT INTO presupuestos (usuario_id, categoria, monto_maximo, periodo) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Alimentación', 500.00, 'mensual'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Transporte', 300.00, 'mensual'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Entretenimiento', 200.00, 'mensual'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Servicios', 150.00, 'mensual');

-- Insertar alertas de ejemplo para Juan Pérez
INSERT INTO alertas (usuario_id, tipo, mensaje, severidad, leida) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'presupuesto_excedido', 'Has excedido tu presupuesto en Entretenimiento en un 15%', 'alta', false),
    ('550e8400-e29b-41d4-a716-446655440000', 'gasto_inusual', 'Gasto inusual detectado: $450 en Compras', 'media', false),
    ('550e8400-e29b-41d4-a716-446655440000', 'recordatorio', 'Recuerda revisar tus suscripciones mensuales', 'baja', false);

-- Insertar transacciones de ejemplo para María García
INSERT INTO transacciones (usuario_id, monto, categoria, descripcion, fecha, tipo, cuenta, metadata) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 2800.00, 'Ingresos', 'Salario', '2026-07-01', 'ingreso', 'Cuenta Principal', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440001', 89.00, 'Alimentación', 'Restaurante', '2026-07-02', 'gasto', 'Tarjeta Crédito', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440001', 25.00, 'Transporte', 'Uber', '2026-07-03', 'gasto', 'Tarjeta Crédito', '{"generado": "ejemplo"}'),
    ('550e8400-e29b-41d4-a716-446655440001', 65.00, 'Educación', 'Curso online', '2026-07-05', 'gasto', 'Cuenta Principal', '{"generado": "ejemplo"}');

-- Insertar presupuestos de ejemplo para María García
INSERT INTO presupuestos (usuario_id, categoria, monto_maximo, periodo) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Alimentación', 400.00, 'mensual'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Educación', 200.00, 'mensual');

-- Insertar inversiones de ejemplo
INSERT INTO inversiones (usuario_id, nombre, tipo, monto, fecha_inversion, rendimiento) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Acciones Tech', 'acciones', 5000.00, '2026-01-15', 8.5),
    ('550e8400-e29b-41d4-a716-446655440002', 'Fondo Indexado', 'fondo', 10000.00, '2026-03-01', 6.2);
