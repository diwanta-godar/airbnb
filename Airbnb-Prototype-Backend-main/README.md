# The Lantern Stay API

Node.js + Express + TypeORM + PostgreSQL backend for The Lantern Stay vacation rental platform.

## Security features

- Helmet (CSP, HSTS in production)
- CORS allowlist with credentials
- Global + auth rate limiting
- HTTP Parameter Pollution (HPP) protection
- Zod request validation
- bcrypt password hashing (12 rounds)
- JWT access + rotating refresh tokens (hashed at rest)
- HttpOnly secure cookies
- Role-based access control (guest / host / admin)
- Input sanitization (HTML strip)
- No `x-powered-by` header
- Request body size limits

## Setup

```bash
cp .env.example .env
# edit DB credentials and JWT secrets

createdb lantern_stay
npm install
npm run dev
```

API: `http://localhost:4000/api/health`

## Production

```bash
npm install
npm run build          # SWC — usually under 1s (prints progress)
# set NODE_ENV=production in .env
npm run seed
npm start
```

`npm run typecheck` runs full TypeScript checking (optional; heavier on small VPS).

Optional: set `SEED_ON_START=true` to seed automatically when the server boots.

## Seed accounts

| Role  | Email                     | Password           |
|-------|---------------------------|--------------------|
| Host  | thelanternstay@gmail.com  | LanternStay@2026   |
| Guest | guest@example.com         | GuestUser@2026     |
| Admin | admin@thelanternstay.com  | AdminLantern@2026  |

## Main endpoints

- `POST /api/auth/register|login|refresh|logout`
- `GET /api/auth/me`
- `GET|POST|PATCH|DELETE /api/properties`
- `GET /api/properties/:id/availability`
- `POST|GET /api/bookings`
- `POST /api/reviews`
- `GET|POST|DELETE /api/users/wishlist/:propertyId`
# Airbnb-Prototype-Backend
