# Local Development to Production

This guide keeps the website running locally during development while using Supabase for PostgreSQL, then explains how to deploy the frontend and API later. The local backend uses the individual `DB_*` environment variables; it does not read a `DB_CONNECTION_STRING` value.

## 1. Keep Development and Production Separate

Use two Supabase projects if your free plan permits it: one for development and one for production. The backend synchronizes the TypeORM schema at startup and automatically attempts development seeding when `NODE_ENV=development`. Connecting local development to production could alter production tables or seed demo data into the live database.

In Supabase, create a development project and save its database password. Under **Connect**, select **Session pooler** and copy the provided host, port, username, and database. Use the values exactly as shown; do not construct the pooler host or username yourself.

## 2. Configure the Local Backend

The backend environment file is `Airbnb-Prototype-Backend-main/.env`. Its non-secret connection settings have been changed to the Supabase session pooler and TLS, while retaining local development mode. Review it locally; do not paste its contents into chat or commit it.

Set the password field in that file to the current Supabase development project's database password:

```dotenv
NODE_ENV=development
PORT=4000
DB_HOST=<session-pooler-host-from-supabase>
DB_PORT=5432
DB_USER=<session-pooler-username-from-supabase>
DB_PASSWORD=<development-project-database-password>
DB_NAME=postgres
DB_SSL=true
SUPABASE_URL=https://<development-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<development-project-service-role-key>
SUPABASE_STORAGE_BUCKET=property-images
WHATSAPP_AUTH_ENCRYPTION_KEY=<unique-random-secret-at-least-32-characters>
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
CORS_ORIGINS=http://localhost:3000
```

The `.env` currently contains an unused pasted connection-string block in addition to the supported `DB_*` settings. Remove that block and its extra standalone fields (`DB_CONNECTION_STRING`, `host`, `port`, `database`, and `user`) after safely rotating the Supabase database password. Do not put credentials in `.env.example`, source code, GitHub, or any `NEXT_PUBLIC_*` variable.

Generate separate backend JWT secrets locally, each at least 32 characters. For example, run `openssl rand -base64 48` twice and put each result in the corresponding secret field in `.env`. Never publish or reuse the example secrets.

## 3. Run the Local Development Servers

From the backend folder, install dependencies and start the API:

```bash
cd Airbnb-Prototype-Backend-main
npm ci
npm run dev
```

The API should connect to Supabase, create/update its schema, and listen at `http://localhost:4000`. Test `http://localhost:4000/api/health`.

Open a second terminal and run the website:

```bash
cd Airbnb-Prototype-Frontend-main
npm ci
npm run dev
```

Open `http://localhost:3000`. The frontend defaults to `http://localhost:4000/api`. If needed, set this in `Airbnb-Prototype-Frontend-main/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Development seeding only runs when `NODE_ENV=development` and skips if property records already exist. Only use the development Supabase project for this mode. A forced seed truncates application data; never run `npm run seed:force` against production.

## 4. Before Deploying

The backend now stores newly uploaded property and hero images in Supabase Storage. Create a bucket named `property-images` in Supabase Storage and set it to **Public** so the website can display image URLs. Only the backend should upload or delete objects, using the Supabase service-role key. Never add that key to the frontend or a `NEXT_PUBLIC_*` variable.

WhatsApp credentials and Signal keys are now stored encrypted in the `whatsapp_auth_state` PostgreSQL table. The table is created by backend schema synchronization. After the API has started once, restrict access through the Data API in Supabase SQL Editor:

```sql
ALTER TABLE public.whatsapp_auth_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_auth_state FROM anon, authenticated;
```

Set `WHATSAPP_AUTH_ENCRYPTION_KEY` to a unique, stable secret of at least 32 characters. Generate one with `openssl rand -base64 48`; keep it in Render's secret environment settings and a secure backup. Changing or losing this key makes the stored WhatsApp session unreadable and requires pairing again. Existing files in `uploads/` and `whatsapp-auth/` are not imported automatically: re-upload those images and scan the WhatsApp QR code once after deploying this version.

Do not deploy this prototype publicly without first addressing these items:

- Rotate the Supabase database password if it has been shared or exposed, then update `.env` and the hosting secret configuration.
- Remove the hardcoded account-role promotion in `Airbnb-Prototype-Backend-main/src/config/database.ts` and establish a secure production admin provisioning process.
- Review authentication/session storage and browser cookie behavior for production.
- Replace automatic `synchronize()` schema changes with reviewed database migrations before treating the database as production data. Back up data before schema changes.
- Do not seed production with the demo accounts or sample data.

## 5. Deploy the API Later

Push the project to a private GitHub repository. Create a Render Web Service connected to that repository and configure:

- Root directory: `Airbnb-Prototype-Backend-main`
- Build command: `npm ci && npm run build`
- Start command: `npm start`

Set the following in the Render service's environment settings. Use your **production** Supabase project's session pooler values and newly generated secrets. Keep the production Supabase project separate from the development one.

```dotenv
NODE_ENV=production
DB_HOST=<production-session-pooler-host>
DB_PORT=5432
DB_USER=<production-session-pooler-username>
DB_PASSWORD=<production-project-database-password>
DB_NAME=postgres
DB_SSL=true
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
SUPABASE_STORAGE_BUCKET=property-images
WHATSAPP_AUTH_ENCRYPTION_KEY=<stable-random-secret-at-least-32-characters>
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
CORS_ORIGINS=https://<your-vercel-site>.vercel.app
SEED_ON_START=false
JWT_ACCESS_SECRET=<new-production-secret-at-least-32-characters>
JWT_REFRESH_SECRET=<different-new-production-secret-at-least-32-characters>
```

Render sets `PORT` for the service. Do not copy your development database password, JWT secrets, or local `.env` file to GitHub. Free Render web services sleep when idle and have an ephemeral filesystem; their first request after sleep can take a while.

After deployment, test `https://<your-render-service>.onrender.com/api/health`. The deployed API URL must be HTTPS.

## 6. Deploy the Frontend Later

Import the same repository into Vercel and set the project root directory to `Airbnb-Prototype-Frontend-main`. Set this environment variable in the Vercel project's production environment:

```dotenv
NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api
```

Deploy the website and copy its final HTTPS URL. Update Render's `CORS_ORIGINS` to that exact origin (no trailing slash), then redeploy or restart the API. The frontend derives its Socket.IO URL from `NEXT_PUBLIC_API_URL` unless `NEXT_PUBLIC_SOCKET_URL` is explicitly set.

For separate Vercel and Render hostnames, the backend's production cookies need HTTPS and `SameSite=None`, hence `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`. Browser third-party-cookie restrictions can still affect cross-site cookies; test registration, login, page reload, token refresh, and logout in the deployed browser. A same-site custom domain/proxy arrangement may be preferable if cross-site cookies are unreliable.

## 7. Free-Tier Expectations

Free plans and quotas change. At the time this guide was written, Supabase Free provides a small PostgreSQL project but may pause projects after inactivity. Render Free services sleep after idle periods, may take time to wake, and do not preserve local filesystem changes. Vercel Hobby is intended for personal, non-commercial use. These tiers are useful for learning and demos, not a guarantee of an always-available production service. Review provider terms and current limits before deploying.

## Switching Checklist

**Local development:** `NODE_ENV=development`, development Supabase project, `DB_SSL=true`, `COOKIE_SECURE=false`, `COOKIE_SAME_SITE=lax`, CORS set to `http://localhost:3000`, frontend API URL set to localhost.

**Production:** separate production Supabase project, `NODE_ENV=production`, production-only credentials, `DB_SSL=true`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, CORS set to the deployed frontend origin, frontend API URL set to the deployed HTTPS API, and `SEED_ON_START=false`.
