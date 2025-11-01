-- PostgreSQL SQL script to create tables for PRF project
-- Tables: admins, clients, projects, payments, tokens, logs
-- Includes constraints, useful indexes and a trigger to update project balance when payments are inserted

-- Use extension for UUIDs if desired (optional)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ADMINS: optional table for admin authentication
CREATE TABLE IF NOT EXISTS admins (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
    id integer PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id integer PRIMARY KEY,
    client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status integer NOT NULL DEFAULT 1, -- 1 - 'Activo' | 0 - 'Cerrado'
    budget NUMERIC(14,2) NOT NULL CHECK (budget >= 0),
    balance NUMERIC(14,2) NOT NULL CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure status only takes expected values
ALTER TABLE projects
    ADD CONSTRAINT projects_status_check CHECK (status IN (1, 0));

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id integer PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TOKENS (temporal client access links)
CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- LOGS
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    action TEXT NOT NULL,
    detail TEXT
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_tokens_client_id ON tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- TRIGGER: After inserting a payment, deduct payment.amount from project's balance
-- and set status to 'Cerrado' when balance reaches 0

CREATE OR REPLACE FUNCTION fn_payments_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Update project's balance safely, ensuring it doesn't go negative
    UPDATE projects
    SET balance = GREATEST(0, balance - NEW.amount),
        status = CASE WHEN GREATEST(0, balance - NEW.amount) = 0 THEN 'Cerrado' ELSE status END
    WHERE id = NEW.project_id;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_payments_after_insert ON payments;
CREATE TRIGGER trg_payments_after_insert
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION fn_payments_after_insert();

-- Optional: prevent inserting payments for projects that are already closed
CREATE OR REPLACE FUNCTION fn_prevent_payment_on_closed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    p_status TEXT;
BEGIN
    SELECT status INTO p_status FROM projects WHERE id = NEW.project_id FOR UPDATE;
    IF p_status IS NULL THEN
        RAISE EXCEPTION 'Project % not found', NEW.project_id;
    END IF;
    IF p_status = 'Cerrado' THEN
        RAISE EXCEPTION 'Cannot add payment to a closed project (ID: %)', NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_payment_on_closed ON payments;
CREATE TRIGGER trg_prevent_payment_on_closed
BEFORE INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_payment_on_closed();

-- Notes:
-- - IDs are TEXT to match the front-end mock IDs (e.g. cli_001, proj_001, pay_001, TKN-...)
-- - If you'd rather use UUIDs, change id columns to UUID and use gen_random_uuid() or uuid_generate_v4().
-- - The triggers keep project.balance consistent on insert and prevent adding payments to already-closed projects.

-- End of create_tables.sql
