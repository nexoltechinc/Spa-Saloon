# Spa Saloon

Luxury spa website built with React and Vite.

## Features

- Marketing website with homepage, services, booking, and contact pages
- Dedicated CRM login screen at `/crm-login`
- Persistent sidebar shortcut: `Login to my CRM`
- CRM auth integration via `VITE_CRM_AUTH_ENDPOINT`
- CRM REST data integration via `VITE_CRM_API_BASE_URL` and `VITE_CRM_API_PREFIX`

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
VITE_CRM_AUTH_ENDPOINT=https://your-crm-domain.com/auth/login
VITE_CRM_API_BASE_URL=https://your-crm-domain.com
VITE_CRM_API_PREFIX=/api/crm
```

## Project Structure

- `src/components` shared UI and layout pieces
- `src/config` integration and app configuration
- `src/pages` route-level pages
- `src/assets` local assets
