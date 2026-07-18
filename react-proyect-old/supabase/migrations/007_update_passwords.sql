
-- =============================================
-- Update test users with fresh password hash
-- =============================================

UPDATE usuarios 
SET access_token_plaid = '$2a$10$Bz5K2CCohvMfXtD7lO49ZuUgU2HSqec3B2ehDTWjABKpGus7lxYve'
WHERE email IN ('juan@example.com', 'maria@example.com', 'admin@financiaunt.com');
