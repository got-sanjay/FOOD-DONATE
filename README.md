# FoodRescue

FoodRescue helps people and organizations share surplus food with nearby NGOs. Donors can post food for pickup, NGOs can find and manage requests, and donors can follow a donation using its tracking ID.

## Features

- Create food donations with pickup location, region, food items, quantities, and expiry times.
- Find nearby NGOs and broadcast pickup requests.
- View NGOs on a map with a green search-radius animation.
- Track a donation's status with its tracking ID.
- Manage NGO availability, accept requests, verify pickup OTPs, and complete pickups.
- Review NGO registrations and monitor donations from the admin dashboard.
- Optional Gemini-powered assistance when a Gemini API key is configured.

## Tech stack

- Next.js 16 with the App Router, React 19, and TypeScript
- Prisma ORM with SQLite
- Tailwind CSS 4
- Leaflet maps
- Google Gemini API (optional)

## Requirements

- Node.js 20.9 or later
- npm

## Run locally

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Update `.env` before starting the app:

   - Keep `DATABASE_URL="file:./dev.db"` for the local SQLite database. Prisma resolves this to `prisma/dev.db`.
   - Set a unique `NGO_SESSION_SECRET` for signed login sessions.
   - Change `ADMIN_USERNAME` and `ADMIN_PASSWORD`; the admin password must be at least 12 characters.
   - Set `GEMINI_API_KEY` if you want to enable Gemini-powered features.

   Do not use development credentials or the local SQLite database for a public or production deployment.

4. Create or update the SQLite schema:

   ```bash
   npx prisma db push
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Local sample data

The destructive development-only seed script is [`prisma/sample-data.sql`](./prisma/sample-data.sql). It deletes existing NGO accounts, donations, donation items, and request declines, then creates:

- Five approved NGO accounts in each of the seven regions currently used by this project: Erode, Manapparai Taluk, Mothaiyanoor, Perundurai, Salem, Test Region, and Tiruchirappalli.
- Randomized NGO availability, coordinates, ratings, and completed-pickup counts.
- Four synthetic donation examples per region in broadcasting, accepted, in-progress, and completed states.

Back up any local data you need before running it. Run the script from the project root only after confirming `.env` points to your local development database:

```powershell
npx prisma db execute --schema .\prisma\schema.prisma --file .\prisma\sample-data.sql
```

All seeded NGO accounts use the development password `FoodRescueDemo!2026`. Log in with an NGO's exact displayed name (the account name is also its login name). The shared demo password and synthetic records are for local development only; never use this seed data in production.

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run db:migrate` | Create/apply a Prisma development migration |
| `npm run db:studio` | Open Prisma Studio |
| `npx prisma db push` | Synchronize the local database schema |

## Main pages

- `/` — donor landing page and donation flow
- `/track` — find a donation by tracking ID
- `/ngo/login` — NGO login and registration
- `/ngo` — NGO dashboard
- `/admin` — admin dashboard

## Project layout

```text
app/          Next.js routes and API endpoints
backend/      Controllers, data models, and response views
frontend/     React views, hooks, and client-side types
lib/          Shared Prisma, authentication, and application helpers
prisma/       Prisma schema, local SQLite database, and sample SQL
public/       Static assets
```
