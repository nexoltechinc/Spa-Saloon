# Spa Saloon

Luxury spa website built with React and Vite.

## Features

- Marketing website with homepage, services, booking, and contact pages
- Dedicated CRM login screen at `/crm-login`
- Persistent sidebar shortcut: `Login to my CRM`
- Postgres-backed CRM REST API under `/api/crm`
- CRM auth integration via `VITE_CRM_AUTH_ENDPOINT`
- CRM REST data integration via `VITE_CRM_API_BASE_URL` and `VITE_CRM_API_PREFIX`
- Generic CRUD storage for leads, customers, appointments, services, staff, payments, branches, and receipts

## Run Locally

Start Postgres first if you want the API to boot against the bundled database:

```bash
docker compose up -d db
```

Then install dependencies and start the app:

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite frontend. Use `npm run dev:api` for the CRM API, or `npm run dev:full` to run both together once Postgres is up.

## Build

```bash
npm run build
```

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

The login endpoint uses `CRM_ADMIN_EMAIL` and `CRM_ADMIN_PASSWORD`. With the defaults above, the first sign-in is `admin@spa.local` / `ChangeMe123!`.

## API

- `GET /api/crm/health`
- `POST /api/crm/auth/login`
- `GET /api/crm/:resource`
- `GET /api/crm/:resource/:id`
- `POST /api/crm/:resource`
- `PATCH /api/crm/:resource/:id`
- `DELETE /api/crm/:resource/:id`

The API stores records in Postgres and keeps each row as JSON so the CRM screens can evolve without constant schema changes.

## Database

The included compose file runs a local Postgres instance with these defaults:

- database: `spa_saloon`
- user: `spa_saloon`
- password: `spa_saloon`

Point `DATABASE_URL` at that database, or swap in your own Postgres connection string.

## Project Structure

- `src/components` shared UI and layout pieces
- `src/config` integration and app configuration
- `src/pages` route-level pages
- `src/assets` local assets
