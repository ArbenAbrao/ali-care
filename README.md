# ALI-CARE — Complaint Assessment, Resolution, and Evaluation

Secure employee grievance system for Arrowgo-Logistics Inc. Monorepo: React/Vite frontend + Express/MySQL backend.

> Security note: This is a complete runnable baseline, not a substitute for a security review, penetration test, HR/legal review, or deployment hardening. Before production, configure HTTPS, SMTP, CAPTCHA provider, backup/restore, monitoring, and validate local labor/privacy obligations. Employee reporting is anonymous-style, not absolute anonymity.

## Structure
- `backend/` Express REST API, migrations, seed script
- `frontend/` React/Vite responsive application
- `backend/schema.sql` canonical schema

## Requirements
Node.js 20+, MySQL 8.0+. Run commands in separate terminals.

## Backend
1. `cd backend && cp .env.example .env`
2. Set all secrets in `.env`. Generate secrets with `openssl rand -hex 32`.
3. Create the configured database and run `mysql -u root -p ali_care < schema.sql`.
4. `npm install`
5. `npm run migrate && npm run seed`
6. `npm run dev`

API defaults to `http://localhost:5000`. The seed script creates sample hubs/departments/employees and a superadmin only when `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_PASSWORD` are set. It prints no password.

## Frontend
1. `cd frontend && cp .env.example .env`
2. Set `VITE_API_URL=http://localhost:5000/api`
3. `npm install && npm run dev`

## Security/configuration
- AES key and HMAC key must be independent 32-byte hex values (64 hex characters).
- Session cookie is HttpOnly, SameSite=Lax, Secure in production. Use HTTPS in production.
- Admin/superadmin login uses username/email blind indexes. Passwords are Argon2id hashes.
- Superadmin login requires a server-verified Cloudflare Turnstile token and email OTP. Configure `TURNSTILE_SECRET_KEY` and frontend site key. In local development, a configured CAPTCHA bypass is not provided; use Turnstile test keys.
- OTP is single-use, 5-minute expiry. OTP is not returned by the API.
- Login/logout/failure events only are written to access logs. Never log complaint text, Employee IDs, credentials, or OTPs.
- Employee submission limit is 2 per Manila calendar date. Set MySQL/session/app hosts to reliable time sources. The API uses `Asia/Manila` day boundaries.
- QR links contain random opaque tokens, not hub/department names. Treat QR tokens as public routing context, not authentication.
- Reports and every complaint aggregate use the same exclusion rule for any admin whose linked employee is among the reported people.

## Seed login
Set `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_PASSWORD` before seeding. This creates one superadmin account, but login still requires working SMTP and Turnstile.

## Checklist
See `TEST-CHECKLIST.md`.
