# ArchPlan MVP

ArchPlan connects room dimensions and openings to an auditable materials estimate. Users can work locally in the browser or sign in to save projects and estimate snapshots on the API.

## Start locally

Requires Node.js 24 or later.

```powershell
cd backend
npm start
```

In another terminal:

```powershell
cd frontend
npm run dev
```

Open the URL printed by Vite. It proxies `/api` requests to the API on port 3000. The development database is created at `backend/storage/archplan.sqlite`; set `ARCHPLAN_DB_PATH` to move it.

## Run checks

```powershell
npm test --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend
```

The API tests exercise the geometry and package calculations and run account, project, version, estimate-snapshot, and ownership checks against an isolated temporary SQLite database.

## Run with containers

```powershell
docker compose up --build
```

The site is served at `http://localhost:8080`. The API uses a persistent Docker volume for SQLite data. Put the service behind HTTPS before accepting real account passwords. Back up the `archplan-data` volume regularly.

## Data and estimate assumptions

- Geometry is stored as decimal metres; all inputs and outputs display metric units.
- Money is integer KZT. The estimate service rejects fractional prices and rounds package costs to whole tenge.
- Material prices are planning defaults, not store quotes. Every estimate snapshots the selected material, price, source, and observed timestamp; users can replace prices before saving.
- Wall openings are deducted from rectangular room wall area. Complex polygons, explicit wall-segment editing, tile and wallpaper layout, and overlap coordinates remain outside this MVP.
- Sessions use random bearer tokens stored as hashes. Passwords are derived with Node's scrypt implementation.

## Architecture notes

The project uses a small modular Node HTTP API and the built-in SQLite driver so it can run and be verified without third-party packages. The attached plan recommends NestJS, PostgreSQL, and Prisma for a larger deployment; this MVP has not migrated to that stack. Its routes and relational entities are isolated so a database migration can follow without changing the estimate formulas. React, 3D, billing, team editing, live supplier integrations, and payments are not part of this release.
