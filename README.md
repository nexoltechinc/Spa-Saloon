# Spa Saloon

Spa Saloon is a luxury spa marketing site plus CRM built with React, Vite, Node.js, and PostgreSQL.

## What Is Included

- Public marketing pages for home, services, booking, and contact
- Auth-protected CRM area with a premium admin workspace
- Standalone CRM modules for:
  - dashboard
  - leads
  - appointments
  - customers
  - services
  - staff
  - branches
  - payments
  - receipts
  - reports
  - settings
- REST API under `/api/crm`
- Postgres-backed persistence
- Seeded admin login
- DB-backed business and receipt settings

## CRM Pages

- `/crm/dashboard`
- `/crm/leads`
- `/crm/appointments`
- `/crm/customers`
- `/crm/services`
- `/crm/staff`
- `/crm/branches`
- `/crm/payments`
- `/crm/receipts`
- `/crm/reports`
- `/crm/settings`

## Local Development

Start Postgres first if you want the API to boot against the bundled database:

```bash
docker compose up -d db
```

Then install dependencies and start the app:

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run dev` starts the Vite frontend
- `npm run dev:api` starts the CRM API
- `npm run dev:full` runs both together after Postgres is up
- `npm run build` creates a production frontend build

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
PORT=3001
DATABASE_URL=postgres://spa_saloon:spa_saloon@localhost:5432/spa_saloon
CRM_ADMIN_EMAIL=admin@spa.local
CRM_ADMIN_PASSWORD=ChangeMe123!
CRM_AUTH_SECRET=spa-saloon-dev-secret
CRM_REQUIRE_AUTH=false
VITE_CRM_AUTH_ENDPOINT=/api/crm/auth/login
VITE_CRM_API_BASE_URL=
VITE_CRM_API_PREFIX=/api/crm
```

The admin seed account uses `CRM_ADMIN_EMAIL` and `CRM_ADMIN_PASSWORD`. With the defaults above, the first sign-in is `admin@spa.local` / `ChangeMe123!`.

## API

### Health and Auth

- `GET /api/crm/health`
- `POST /api/crm/auth/login`
- `GET /api/crm/settings`
- `PUT /api/crm/settings`
- `PATCH /api/crm/settings`

### CRM Resources

- `GET /api/crm/:resource`
- `GET /api/crm/:resource/:id`
- `POST /api/crm/:resource`
- `PATCH /api/crm/:resource/:id`
- `DELETE /api/crm/:resource/:id`

Supported resources:

- leads
- appointments
- customers
- services
- staff
- branches
- payments
- receipts
- reports

## Database

The API boots a Postgres schema automatically and runs migrations on startup.

Core structured tables:

- `crm_users`
- `crm_branches`
- `crm_leads`
- `crm_appointments`
- `crm_settings`

Legacy/general resources continue to use the `crm_records` table for flexible JSONB storage:

- customers
- services
- staff
- payments
- receipts
- reports

The settings document is persisted in Postgres, so branding, business profile, and receipt configuration are shared across sessions and devices instead of living in browser storage.

## Project Structure

- `src/components` shared UI and layout pieces
- `src/config` CRM/API integration and app config
- `src/pages` route-level pages
- `server` API, auth, and database layer

## Notes

- `CRM_REQUIRE_AUTH=true` forces bearer-token auth for CRM routes.
- The CRM modules use live API persistence and should not be treated as demo-only screens.
- If Postgres is unavailable, the API will fail fast instead of silently running with stale data.
