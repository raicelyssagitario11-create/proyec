-- Sample seed data for PRF project
-- Run this after executing create_tables.sql in Supabase SQL editor

-- CLIENTS
INSERT INTO clients (id, name, email) VALUES
(1, 'Innovatech Solutions', 'innovatech@example.com') ON CONFLICT DO NOTHING,
(2, 'Global Dynamics Corp', 'global@example.com') ON CONFLICT DO NOTHING;

-- PROJECTS
INSERT INTO projects (id, client_id, name, status, budget, balance) VALUES
(1, 1, 'System Migration Phase 1', 1, 15000.00, 3000.00) ON CONFLICT DO NOTHING,
(2, 1, 'Mobile App Development', 0, 10000.00, 0.00) ON CONFLICT DO NOTHING,
(3, 2, 'Q3 Marketing Campaign', 1, 8000.00, 4000.00) ON CONFLICT DO NOTHING;

-- PAYMENTS
INSERT INTO payments (id, project_id, date, amount, type) VALUES
(1, 1, '2025-01-15', 5000.00, 'Inicial') ON CONFLICT DO NOTHING,
(2, 1, '2025-02-28', 7000.00, 'Hito 1') ON CONFLICT DO NOTHING,
(3, 2, '2025-05-01', 10000.00, 'Total') ON CONFLICT DO NOTHING,
(4, 3, '2025-07-20', 4000.00, 'Inicial') ON CONFLICT DO NOTHING;

-- TOKENS (example temporary access tokens)
INSERT INTO tokens (token, client_id, expires_at) VALUES
('TKN-ABC-123', 1, extract(epoch from now())::bigint + 86400000) ON CONFLICT DO NOTHING,
('TKN-XYZ-456', 2, extract(epoch from now())::bigint - 3600000) ON CONFLICT DO NOTHING;

-- LOGS
INSERT INTO logs (action, detail) VALUES
('ADMIN_INIT', 'Sistema de reportes iniciado'),
('LINK_GENERATED', 'Enlace temporal de prueba creado') ;

-- Note: If your tables use sequences for ids, adjust inserts accordingly or use DEFAULT for id.
-- Run in Supabase SQL Editor and verify in Table Editor afterwards.
