# USM PRF — Registro del proyecto

Ubicación: C:\Users\OmarAdrian\Documents\development\workspace\Morna\usm\prf
Inicio: 2025-10-31

Este archivo centraliza cambios, bugs críticos y tareas por hacer del proyecto.

## Registro de Cambios

Sigue el formato: Added, Changed, Fixed, Removed, Security.

### [Unreleased] - 2025-10-31
- Added:
  - Archivo app.js con la lógica de la aplicación.
  - Archivo styles.css con estilos y reglas de impresión.
- Changed:
  - index.html ahora enlaza assets externos y elimina CSS/JS embebido.
- Fixed:
- Removed:
- Security:

## Bugs críticos

Plantilla para cada bug crítico:
- ID: BUG-YYYY-001
  - Fecha: 2025-10-31
  - Estado: Abierto | Mitigado | Resuelto
  - Descripción: 
  - Impacto: 
  - Reproducción: 
  - Propietario: 
  - Notas: 

## Tareas por hacer

Prioriza con P1 (alto), P2 (medio), P3 (bajo).
- P1
  - [ ] 
- P2
  - [ ] 
- P3
  - [ ] 

## Flujo recomendado
- Crea rama por feature/bugfix.
- Documenta cambios en "Unreleased" al commitear.
- Mueve items a versión cuando se libere (e.g., 0.1.0 - YYYY-MM-DD).
- Registra bugs críticos con la plantilla y vínculo al issue.

## Configuración: Supabase (Autenticación)

Para usar la autenticación con Supabase (registro/login de usuarios) en este proyecto:

- Crea un proyecto en https://supabase.com y copia tu Project URL y anon/public API key.
- En `index.html` se incluye un ejemplo que inicializa el cliente Supabase vía CDN. Puedes reemplazar las constantes por tus valores o preferir usar bundler y variables de entorno.
- No expongas la service_role key en cliente. Úsala solo en servicios backend.

Prueba rápida local (sin bundler): abre `index.html` en un navegador; el script ya cargará el cliente desde CDN. En la pantalla de inicio verás formularios para registro y login de usuario (lado derecho). Para pruebas completas con un bundler, instala `@supabase/supabase-js`:

```powershell
npm install @supabase/supabase-js
```


## Convención de commits (sugerida)
feat:, fix:, docs:, refactor:, perf:, test:, build:, ci:, chore:, style:, revert:


### SQL


```sql
CREATE TABLE IF NOT EXISTS clients (
    id integer PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS projects (
    id integer PRIMARY KEY,
    client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status integer NOT NULL DEFAULT 1, -- 1 - 'Activo' | 0 - 'Cerrado'
    budget NUMERIC(14,2) NOT NULL CHECK (budget >= 0),
    balance NUMERIC(14,2) NOT NULL CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id integer PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
alter table clients add column
   if not exists created_by uuid not null default auth.uid(); alter table projects
   add column if not exists created_by uuid not null default auth.uid(); alter
   table payments add column if not exists created_by uuid not null default
   auth.uid(); create index if not exists clients_created_by_idx on
   clients(created_by); create index if not exists projects_created_by_idx on
   projects(created_by); create index if not exists payments_created_by_idx on
   payments(created_by); alter table clients enable row level security; alter table
   projects enable row level security; alter table payments enable row level
   security; create policy "own_clients" on clients for all using (created_by =
   auth.uid()) with check (created_by = auth.uid()); create policy "own_projects"
   on projects for all using (created_by = auth.uid()) with check (created_by =
   auth.uid()); create policy "own_payments" on payments for all using (created_by
   = auth.uid()) with check (created_by = auth.uid());
```

## Crear tablas y datos de ejemplo (rápido)

Si al cargar la app obtienes errores del tipo "Could not find the table 'public.payments'" es porque faltan tablas en la base. Sigue estos pasos:

1. Abre tu proyecto en Supabase → SQL Editor → New query.
2. Copia y pega el contenido de `sql/create_tables.sql` y ejecútalo (Run). Esto creará las tablas necesarias: `clients`, `projects`, `payments`, `tokens`, `logs`.
3. Opcional: para rellenar datos de ejemplo pega y ejecuta `sql/seed_sample_data.sql`.
4. Verifica en Table Editor que las tablas existen. Luego recarga tu app en el navegador.

Si la ejecución da errores, copia aquí la salida y te ayudo a resolverla.

## Configurar entrega de correos (SMTP)

Para mejorar la entregabilidad de correos de verificación:

- Registra un proveedor SMTP (SendGrid, Mailgun, Amazon SES).
- En el Dashboard de Supabase: Project → Settings → SMTP, llena los datos (host, puerto, usuario, contraseña, from email).
- Configura SPF/DKIM en tu DNS para el dominio remitente.

Después de configurar SMTP, intenta registrar un usuario y revisa los logs en Supabase → Auth → Logs para ver eventos de envío o errores.

## Depuración rápida del signup desde el navegador

1. Abre la app (index.html) en el navegador y abre DevTools (F12).
2. Pestaña Network: filtra por `auth` o busca la petición POST a `/auth/v1/signup`.
3. Envía un registro desde la UI y revisa la respuesta (Response) y el código de estado.
4. Consola (Console): verás ahora un `console.log` con la respuesta de `supabase.auth.signUp` que ayudará a identificar fallos.

Si quieres, pega aquí la respuesta JSON o los logs y yo te diré exactamente qué cambiar.
