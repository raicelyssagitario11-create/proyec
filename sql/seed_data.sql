-- Seed data for PRF project (matches the MOCK_DATA in app.js)

-- Insert admin user (password stored in plain text here only for mock/demo purposes)
INSERT INTO admins (email, password_hash, created_at)
VALUES ('admin@mock.com', 'password', now())
ON CONFLICT (email) DO NOTHING;

-- Clients
INSERT INTO clients (id, name, email, created_at) VALUES
('cli_001', 'Innovatech Solutions', 'innovatech@example.com', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, email, created_at) VALUES
('cli_002', 'Global Dynamics Corp', 'global@example.com', now())
ON CONFLICT (id) DO NOTHING;

-- Projects
INSERT INTO projects (id, client_id, name, status, budget, balance, created_at) VALUES
('proj_001', 'cli_001', 'System Migration Phase 1', 'Activo', 15000.00, 3000.00, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, client_id, name, status, budget, balance, created_at) VALUES
('proj_002', 'cli_001', 'Mobile App Development', 'Cerrado', 10000.00, 0.00, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, client_id, name, status, budget, balance, created_at) VALUES
('proj_003', 'cli_002', 'Q3 Marketing Campaign', 'Activo', 8000.00, 4000.00, now())
ON CONFLICT (id) DO NOTHING;

-- Payments (we insert them in chronological order)
INSERT INTO payments (id, project_id, date, amount, type, created_at) VALUES
('pay_001', 'proj_001', '2025-01-15', 5000.00, 'Inicial', now()),
('pay_002', 'proj_001', '2025-02-28', 7000.00, 'Hito 1', now()),
('pay_003', 'proj_002', '2025-05-01', 10000.00, 'Total', now()),
('pay_004', 'proj_003', '2025-07-20', 4000.00, 'Inicial', now())
ON CONFLICT (id) DO NOTHING;

-- Tokens
INSERT INTO tokens (token, client_id, expires_at, created_at) VALUES
('TKN-ABC-123', 'cli_001', now() + INTERVAL '24 hours', now()),
('TKN-XYZ-456', 'cli_002', now() - INTERVAL '1 hour', now())
ON CONFLICT (token) DO NOTHING;

-- Logs (initial log entry)
INSERT INTO logs (timestamp, action, detail) VALUES
(now(), 'ADMIN_INIT', 'Sistema de reportes iniciado');

-- After seeding payments, you may want to recalc balances if your trigger prevented insertion.
-- However, this seed assumes the payments were accepted and then the project balances were set accordingly.
-- If you need to refresh balances to match explicit budgets/payments, run the following (optional):
--
-- UPDATE projects p
-- SET balance = GREATEST(0, p.budget - COALESCE(sum_pay.total_paid, 0))
-- FROM (
--   SELECT project_id, SUM(amount) AS total_paid
--   FROM payments
--   GROUP BY project_id
-- ) AS sum_pay
-- WHERE p.id = sum_pay.project_id;

-- End of seed_data.sql
