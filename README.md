# User Analytics Dashboard

A dashboard app with user registration, login, logout and protected user statistics.

**Live demo:** `https://<PROJECT_NAME>.vercel.app`

**Repository:** `<GITHUB_REPO_URL>`

## Features

- Register with a username, password and gender
- Log in and log out with a session stored in an HTTP-only cookie
- Protected dashboard showing total users and users grouped by gender

## Test account

This public demo account exists in the deployed database and is safe to publish. You can also register a new user.

- **Username:** `testuser@email.com`
- **Password:** `Password123@`

## Tech stack

- **Frontend:** Next.js (App Router, TypeScript) with a Tailwind CSS v4 glassmorphism UI
- **Backend:** FastAPI with SQLModel, deployed as a Vercel serverless function
- **Database:** PostgreSQL on Neon, with Alembic migrations
- **Authentication:** JWT in an HTTP-only cookie, passwords hashed with argon2

## Architecture

- One Vercel project serves the frontend and the API from the same origin, so there is no CORS.
- `vercel.json` rewrites `/api/*` to the single FastAPI function in `api/index.py`, which does its own routing.
- In local development, Next.js proxies `/api/*` to `http://127.0.0.1:8000` (set `API_PROXY_TARGET` to change it).
- The frontend route guard (`src/proxy.ts`) only checks that the session cookie exists, for redirects. The backend verifies the JWT on every API call, so a forged cookie never shows any data.

## Project structure

```text
api/
├── index.py            # FastAPI app and router registration
├── config.py           # Settings loaded from env / .env
├── database.py         # Lazy database engine, URL normalization, session dependency
├── models.py           # User table and Gender enum
├── schemas.py          # Request and response models, input validation
├── security.py         # argon2 password hashing and JWT helpers
├── deps.py             # Current-user dependency and cookie name
├── seed_test_user.py   # Creates the demo account
├── routes/             # HTTP layer: auth.py, dashboard.py
└── services/           # Business logic and queries: users.py, stats.py
migrations/             # Alembic environment and versions
src/
├── app/                # Pages: login, register, dashboard; layout, error and 404 pages
├── components/         # Forms, DashboardView and shared UI (Button, GlassCard, Spinner, ...)
├── lib/                # API client, types, validation, route guard rules
└── proxy.ts            # Route guard
tests/                  # Backend tests (pytest)
e2e/                    # End-to-end tests (Playwright)
.husky/                 # Git hooks
alembic.ini             # Alembic config (the database URL comes from api/config.py)
next.config.ts          # Dev-only /api proxy
playwright.config.ts    # Playwright config
vercel.json             # Rewrites /api/* to the FastAPI function
.vercelignore           # Files left out of the Vercel deployment
requirements.txt        # Backend runtime dependencies
requirements-dev.txt    # Adds test and migration tools
```

## API endpoints

| Method | Endpoint               | Description                                   | Auth |
| :----- | :--------------------- | :-------------------------------------------- | :--- |
| POST   | `/api/auth/register`   | Register a user (username, password, gender)  | No   |
| POST   | `/api/auth/login`      | Verify credentials and set the session cookie | No   |
| POST   | `/api/auth/logout`     | Clear the session cookie                      | No   |
| GET    | `/api/auth/me`         | Return the current user                       | Yes  |
| GET    | `/api/dashboard/stats` | Total users and counts grouped by gender      | Yes  |

Interactive docs: `/api/docs`

### Register

`POST /api/auth/register` returns `201 Created`.

```json
{
  "username": "testuser@email.com",
  "password": "Password123@",
  "gender": "male"
}
```

```json
{
  "id": 1,
  "username": "testuser@email.com",
  "gender": "male",
  "created_at": "2026-10-29T12:00:00Z"
}
```

Validation failures return `422`, and a taken username returns `409`.

- **Username:** trimmed and lowercased, 3–64 characters, using only letters, digits and `. _ + @ -`.
- **Password:** 8–128 characters, with a letter, a number and a special character (anything other than a letter, digit or space).
- **Gender:** `male`, `female` or `other`.

### Login

`POST /api/auth/login` returns `200 OK` and sets an `access_token` HTTP-only cookie.

```json
{ "username": "testuser@email.com", "password": "Password123@" }
```

```json
{
  "id": 1,
  "username": "testuser@email.com",
  "gender": "male",
  "created_at": "2026-10-29T12:00:00Z"
}
```

A wrong username or password returns `401` with `{"detail": "Invalid username or password"}`.

### Stats

`GET /api/dashboard/stats` requires the cookie and returns `200 OK`.

```json
{ "total": 3, "by_gender": { "male": 1, "female": 1, "other": 1 } }
```

Without a valid cookie it returns `401` with `{"detail": "Not authenticated"}`.

## Local development

### Prerequisites

- Python 3.11+
- Node.js 20.9+ to run the app; 22.12+ for the test and commit tooling (Vitest, lint-staged)
- A PostgreSQL database

### Environment variables

| Variable        | Local (`.env` in the project root)      | Production (Vercel environment variables) |
| :-------------- | :-------------------------------------- | :---------------------------------------- |
| `DATABASE_URL`  | Your PostgreSQL connection string       | Neon pooled connection string             |
| `JWT_SECRET`    | Any random string of 32+ characters     | A new random value of 32+ characters      |
| `COOKIE_SECURE` | `false`, because local runs over `http` | `true`                                    |

Generate a secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Backend

Copy `.env.example` to `.env` and fill in the values, then:

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head           # create the tables (safe to rerun)
python -m api.seed_test_user   # optional: create the demo account (safe to rerun)
uvicorn api.index:app --reload --port 8000
```

### Frontend

In a second terminal:

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- API docs: http://localhost:8000/api/docs

## Tests

```bash
pytest -q          # Backend, using a temporary SQLite database per test
npm run test       # Frontend unit tests (Vitest)
```

**Integration test (optional):** runs against a real PostgreSQL database and is skipped unless `TEST_DATABASE_URL` is set. Use a separate database, such as a Neon branch.

```bash
TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" pytest -m integration
```

**End-to-end tests (Playwright):** use a throwaway SQLite database and never touch your real one. Stop any running dev servers first, because Next.js allows only one dev server per project folder.

```bash
npx playwright install chromium   # once
npm run test:e2e
npx playwright show-report        # open the latest report
```

**Git hooks** (installed by `npm install`):

- **pre-commit:** lint-staged (ESLint and Prettier on staged files)
- **pre-push:** lint, type-check, test and build; end-to-end tests are intentionally not included

## Deployment (Vercel)

1. Import the repository into Vercel, with the Next.js framework preset.
2. In Project Settings -> Environment Variables, add:
   - `DATABASE_URL`: the Neon pooled connection string
   - `JWT_SECRET`: a new random value
   - `COOKIE_SECURE`: `true`
3. Deploy.
4. Once, from your machine with the backend dependencies installed, create the tables and the demo account with `DATABASE_URL` pointing at production, then clear the variable.

   macOS/Linux:

   ```bash
   export DATABASE_URL="<production connection string>"
   export JWT_SECRET="<any value of 32+ characters>"
   alembic upgrade head
   python -m api.seed_test_user
   unset DATABASE_URL JWT_SECRET
   ```

   PowerShell:

   ```powershell
   $env:DATABASE_URL="<production connection string>"
   $env:JWT_SECRET="<any value of 32+ characters>"
   alembic upgrade head
   python -m api.seed_test_user
   Remove-Item Env:DATABASE_URL, Env:JWT_SECRET
   ```

Alembic is only in `requirements-dev.txt`, so migrations run from your machine and not on Vercel.

## Git workflow

One feature per branch, merged into `main`.
