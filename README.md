# The Lantern Stay (Airbnb Prototype)

A full-stack vacation-rental booking prototype. The repository contains two separate applications: a Next.js website and an Express API backed by PostgreSQL.

## Contents

```text
Airbnb-Prototype.zip/
├── Airbnb-Prototype-Frontend-main/   Next.js website
├── Airbnb-Prototype-Backend-main/    Express API and database integration
└── README.md                         This guide
```

## Requirements

- macOS, Windows, or Linux
- Node.js 20.9 or newer and npm
- PostgreSQL running locally, or access to a PostgreSQL database
- Visual Studio Code (recommended)

Check Node and npm from a terminal:

```bash
node --version
npm --version
```

## Open the project

1. Extract `Airbnb-Prototype.zip` if it is still a compressed archive.
2. In VS Code, choose **File > Open Folder...** and open the extracted `Airbnb-Prototype.zip` folder containing this README and both application folders.
3. Open a VS Code terminal with **Terminal > New Terminal**.

You can also open the folder from Terminal on macOS:

```bash
code "/path/to/Airbnb-Prototype.zip"
```

Replace the example path with the location of the extracted folder. If the `code` command is unavailable, open VS Code and use **File > Open Folder...** instead.

## Configure PostgreSQL and the API

The API needs a PostgreSQL database before it can start. Start PostgreSQL using your local installation or database provider, then create a database named `lantern_stay` (or choose another name and set `DB_NAME` accordingly).

For a typical local PostgreSQL installation, you can create the default database from Terminal:

```bash
createdb lantern_stay
```

If that command is unavailable, create the database using your PostgreSQL management tool. Make sure the configured host, port, username, password, and database name are valid.

In the VS Code terminal, configure the backend environment:

```bash
cd Airbnb-Prototype-Backend-main
cp .env.example .env
```

Open `Airbnb-Prototype-Backend-main/.env` and set these values for your PostgreSQL installation:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-local-postgres-password
DB_NAME=lantern_stay
```

The example JWT secrets meet the API's minimum length requirement for local development, but replace them with private, randomly generated values for any shared or deployed environment. For example, generate a value with `openssl rand -base64 64` and use separate values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Keep `.env` private; it is ignored by Git.

Install and start the API:

```bash
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default. On first startup it creates/synchronizes the database schema and, in development mode, adds demo data if the database is empty. Confirm it is responding by opening:

```text
http://localhost:4000/api/health
```

A successful response contains `"success":true` and `"message":"OK"`.

Keep this terminal open while using the website. Stop the API with `Ctrl+C`.

## Configure and start the website

Open a second VS Code terminal so the API can keep running:

```bash
cd Airbnb-Prototype-Frontend-main
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. By default, the website calls the API at `http://localhost:4000/api`. If your API runs at a different URL, create `Airbnb-Prototype-Frontend-main/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Restart the Next.js development server after changing environment variables. Stop it with `Ctrl+C`.

## Demo accounts

The development seed includes these accounts:

| Role       | Email                      | Password           |
| ---------- | -------------------------- | ------------------ |
| Admin/host | `thelanternstay@gmail.com` | `LanternStay@2026` |
| Guest      | `guest@example.com`        | `GuestUser@2026`   |

Use the admin login page at `/auth/admin-login` for the admin account. These are public development credentials, not production credentials. Do not deploy the app with these passwords or sample JWT secrets.

Development seeding runs when the API starts with `NODE_ENV=development`, but it skips if property data already exists. For a clean local demo, use a fresh empty database. The `npm run seed:force` command clears and reseeds application data; it is destructive and should only be used against disposable development data.

## What is included

### Website & Pages

- **Home (`/`)**: Rotating hero content (manageable by admin), featured properties.
- **Stays (`/stays`, `/stays/[id]`)**: Full property search, filters, details, and booking requests.
- **Auth (`/auth/login`, `/auth/register`, `/auth/admin-login`)**: User registration and dual role login (Guest/Admin).
- **Dashboard (`/dashboard`)**: Guest panel to view bookings, wishlists, and profile settings.
- **Admin Panel (`/admin/*`)**: 
  - Overview of properties (`/admin/stays`)
  - Booking Management (`/admin/bookings`)
  - User/Customer CRM (`/admin/customers`)
  - Hero Slide Manager (`/admin/hero`)
  - Live Notifications & WhatsApp Dashboard (`/admin/whatsapp`)

### API, Data & WhatsApp

- Express API with TypeScript and TypeORM connected to PostgreSQL (Supabase).
- Authentication, role checks, input validation, and security middleware.
- **WhatsApp Integration (Baileys)**: The backend pairs to WhatsApp via a QR Code on the Admin Dashboard. The auth session is stored locally in `WHATSAPP_AUTH_DIR` (default `./whatsapp-auth`).
  - *Note on Auth Persistence:* The session stays logged in indefinitely until you log out from your phone's "Linked Devices" or delete the `whatsapp-auth` folder.

## How to Host Completely for Free

To run this prototype in production with $0 cost, you can combine these services:

1. **Database: Supabase (Free Tier)**
   - Provides a managed PostgreSQL database.
   - Use the Session Pooler connection string in your backend `.env`.
2. **Backend API: Render.com (Free Web Service)**
   - Connect your GitHub repo to a Render Web Service.
   - **Important Note on WhatsApp:** Render's free tier uses an *ephemeral disk*. This means every time Render restarts or sleeps (which happens after 15 mins of inactivity), the `./whatsapp-auth` folder is wiped. You would need to rescan the QR code. To avoid this for free, you would need to modify the WhatsApp service to save credentials to Supabase/PostgreSQL instead of the local filesystem.
3. **Frontend Website: Vercel or Netlify (Free Hobby Tier)**
   - Connect your GitHub repo.
   - Set `NEXT_PUBLIC_API_URL` to your Render API URL (e.g., `https://your-api.onrender.com/api`).

The main API route groups are `/api/auth`, `/api/properties`, `/api/bookings`, `/api/reviews`, `/api/users`, `/api/hero-slides`, and `/api/admin`. Health check: `GET /api/health`.

## Useful commands

Run these from the appropriate application directory:

| App      | Command              | Purpose                                    |
| -------- | -------------------- | ------------------------------------------ |
| Backend  | `npm run dev`        | Start API in development mode              |
| Backend  | `npm run typecheck`  | Check TypeScript types                     |
| Backend  | `npm run build`      | Build production JavaScript into `dist/`   |
| Backend  | `npm start`          | Start the production build                 |
| Backend  | `npm run seed`       | Add demo data to an initialized database   |
| Backend  | `npm run seed:force` | Clear and recreate demo data (destructive) |
| Frontend | `npm run dev`        | Start Next.js development server           |
| Frontend | `npm run lint`       | Run ESLint                                 |
| Frontend | `npm run build`      | Build the production website               |
| Frontend | `npm start`          | Serve a production build                   |

To run production builds locally, first build each app. The backend seed command uses compiled output, so build the backend before running `npm run seed`:

```bash
# In Airbnb-Prototype-Backend-main
npm run build
npm run seed
npm start
```

```bash
# In Airbnb-Prototype-Frontend-main
npm run build
npm start
```

## Configuration reference

The backend `.env.example` lists all supported settings. The most commonly changed values are:

| Setting                                                   | Purpose                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `PORT`                                                    | API port; defaults to `4000`                                                      |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection                                                             |
| `DB_SSL`                                                  | Enable TLS when required by a hosted PostgreSQL provider                          |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                 | Separate signing secrets, each at least 32 characters                             |
| `CORS_ORIGINS`                                            | Comma-separated allowed website origins; local default is `http://localhost:3000` |
| `COOKIE_SECURE`                                           | Set to `true` when serving over HTTPS in production                               |
| `SEED_ON_START`                                           | Run seeding on server startup when explicitly enabled                             |
| `ADMIN_NOTIFY_PHONE`                                      | Optional admin phone number for WhatsApp notifications                            |
| `WHATSAPP_AUTH_DIR`                                       | Directory used to store WhatsApp session credentials                              |

The frontend's optional `NEXT_PUBLIC_API_URL` setting should include the `/api` suffix.

## Troubleshooting

- **API exits during startup:** Check that PostgreSQL is running and that all `DB_*` values in the backend `.env` match your database. Required variables, including both JWT secrets and `CORS_ORIGINS`, must be present.
- **Website loads but data requests fail:** Confirm `http://localhost:4000/api/health` works, then check `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS`. Restart the relevant development server after changing `.env` files.
- **Port already in use:** Stop the process using port `3000` or `4000`, or configure another port. If you change the API port, update the frontend API URL and backend CORS origin if the website port also changes.
- **No stays appear:** Development seeding skips when property data already exists. Check the API terminal for seed output and confirm the site is using the expected API/database.
- **`npm install` fails:** Confirm Node.js is at least version 20.9, then retry from the relevant app directory.
- **WhatsApp setup errors:** The core website and API do not require WhatsApp pairing for ordinary browsing and booking flows. Treat WhatsApp session files as private credentials.

## Security and data notes

This is a prototype intended for local development. Do not expose it publicly with the sample credentials, example JWT secrets, permissive development settings, or an unreviewed database configuration. Back up any database before using force-seeding; it truncates application tables. Keep `.env`, `.env.local`, uploaded files, and WhatsApp authentication data private.
