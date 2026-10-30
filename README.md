# User Analytics Dashboard

A dashboard app with user registration, login, logout and a protected stats dashboard.

## Technical Stack

- **Frontend:** Next.js (App Router, TypeScript) with Tailwind CSS v4 and a glassmorphism
  theme; register, login and protected dashboard pages
- **Backend:** FastAPI (Python) with SQLModel
- **Database:** PostgreSQL (Neon)
- **Authentication:** JWT stored in an HTTP-only cookie; passwords hashed with argon2

## Project Structure

```text
api/
├── __init__.py
├── index.py            # FastAPI app and router registration
├── config.py           # Settings loaded from env / .env (pydantic-settings)
├── database.py         # Lazy database engine, URL normalization, get_session dependency
├── seed_test_user.py   # `python -m api.seed_test_user`: create the demo account
├── models.py           # User table ("users") and Gender enum
├── schemas.py          # Request/response models (RegisterIn, LoginIn, UserOut, StatsOut)
├── security.py         # argon2 password hashing and JWT helpers
├── deps.py             # get_current_user dependency and cookie name
├── routes/             # Thin HTTP layer: validate, call a service, return a response
│   ├── __init__.py
│   ├── auth.py         # register, login, logout, me
│   └── dashboard.py    # stats
└── services/           # Business logic and database queries
    ├── __init__.py
    ├── users.py        # create, authenticate and look up users
    └── stats.py        # grouped user counts
migrations/             # Alembic: env.py, script template, versions/
alembic.ini             # Alembic config (DB URL comes from api.config, not this file)
src/                    # Next.js frontend
├── app/
│   ├── layout.tsx      # Root layout: black background with the WaveMesh ribbons
│   ├── page.tsx        # / : fallback redirect to /login (the proxy handles signed-in users)
│   ├── globals.css     # Tailwind import, @theme design tokens, base and component classes
│   ├── error.tsx       # Error boundary with "Try again"
│   ├── not-found.tsx   # 404 page with a link to the dashboard
│   ├── register/
│   │   └── page.tsx    # /register: page title and RegisterForm
│   ├── login/
│   │   └── page.tsx    # /login: reads ?registered=1 and renders LoginForm
│   └── dashboard/
│       ├── page.tsx    # /dashboard: renders DashboardView
│       └── loading.tsx # Route-level skeleton while the page loads
├── proxy.ts            # Route guard: redirects based on session cookie presence
├── components/
│   ├── GlassCard.tsx            # Frosted glass surface used by every card
│   ├── AuthCard.tsx             # /login and /register card: title, welcome line, entrance animation
│   ├── Button.tsx               # The only button: variants, sizes, loading spinner
│   ├── ButtonLink.tsx           # Link styled as a Button
│   ├── button-styles.ts         # Shared variant/size classes for Button and ButtonLink
│   ├── Spinner.tsx              # Decorative loading ring
│   ├── Skeleton.tsx             # Decorative loading placeholder
│   ├── DashboardSkeleton.tsx    # Dashboard-shaped skeleton (view and loading.tsx)
│   ├── WaveMesh.tsx             # Decorative neon ribbon background (inline SVG)
│   ├── FormField.tsx   # Label + control + accessible error message (shared by forms)
│   ├── RegisterForm.tsx         # Register form: validation, submit, server errors
│   ├── RegisterForm.test.tsx    # Form tests (jsdom, API and router mocked)
│   ├── LoginForm.tsx            # Login form: validation, submit, server errors
│   ├── LoginForm.test.tsx
│   ├── DashboardView.tsx        # Loads user and stats, gender breakdown, logout
│   └── DashboardView.test.tsx
└── lib/
    ├── types.ts        # Gender, User, Stats and request types (mirror the backend)
    ├── api.ts          # The only place that calls fetch; typed API functions, ApiError
    ├── api.test.ts     # API client tests (fetch mocked)
    ├── types.test.ts   # Guards GENDERS against drifting from the backend enum
    ├── validation.ts   # Client-side register and login validation
    ├── validation.test.ts
    ├── constants.ts    # Session cookie name (matches the backend)
    ├── auth-guard.ts   # Pure redirect rules used by the proxy
    └── auth-guard.test.ts
e2e/                    # Playwright end-to-end tests (see End-to-end tests)
├── start-backend.mjs   # Starts FastAPI on a fresh throwaway SQLite database
├── helpers.ts          # Unique usernames, sign-up/login and dashboard readers
└── auth-dashboard.e2e.ts
playwright.config.ts    # Playwright config: Chromium, backend :8100, frontend :3100
.husky/                 # Git hooks: pre-commit, pre-push
package.json            # Frontend dependencies and npm scripts
next.config.ts          # Dev-only /api proxy to the FastAPI server
postcss.config.mjs      # Tailwind CSS v4 PostCSS plugin
eslint.config.mjs       # ESLint flat config (Next.js core-web-vitals + TypeScript)
.prettierrc             # Prettier options
vitest.config.ts        # Vitest config (node by default, jsdom per component test, @ alias)
tsconfig.json           # TypeScript strict mode, @/* -> src/*
tests/
├── __init__.py
├── conftest.py              # Test env vars, per-test SQLite engine, session and client fixtures
├── alembic_helpers.py       # Run Alembic commands against a test engine
├── test_app.py              # Docs and OpenAPI availability
├── test_config.py           # Settings validation (JWT secret length)
├── test_models.py           # User persistence and constraints
├── test_schemas.py          # Input validation and normalization
├── test_security.py         # Password hashing and token handling
├── test_auth_register.py    # POST /api/auth/register
├── test_auth_login.py       # POST /api/auth/login
├── test_auth_session.py     # logout, me and current-user behavior
├── test_dashboard_stats.py  # GET /api/dashboard/stats
├── test_database_url.py     # DATABASE_URL scheme normalization
├── test_migrations.py       # Alembic upgrade/downgrade, legacy rename, model drift
├── test_seed_test_user.py   # Demo-account seeding
└── test_integration_postgres.py  # Real PostgreSQL check (opt-in, see below)
```

## API Endpoints

| Method | Endpoint               | Description                                   | Auth |
| :----- | :--------------------- | :-------------------------------------------- | :--- |
| POST   | `/api/auth/register`   | Register a user (username, password, gender)  | No   |
| POST   | `/api/auth/login`      | Verify credentials and set the session cookie | No   |
| POST   | `/api/auth/logout`     | Clear the session cookie                      | No   |
| GET    | `/api/auth/me`         | Return the current user                       | Yes  |
| GET    | `/api/dashboard/stats` | Total users and counts grouped by gender      | Yes  |

Interactive docs: `/api/docs`

### Examples

**Register:** `POST /api/auth/register` returns `201 Created`

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

**Login:** `POST /api/auth/login` returns `200 OK` and sets an `access_token` HTTP-only cookie

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

Wrong username or password returns `401` with `{"detail": "Invalid username or password"}`.

**Validation rules (register):** username is trimmed and lowercased, 3–64 characters, using only
letters, digits and `. _ + @ -`; password is 8–128 characters; gender is `male`, `female` or
`other`. Invalid input returns `422`. Login only requires non-empty fields (password at most
128 characters), so its errors don't reveal the registration policy.

**Stats:** `GET /api/dashboard/stats` (requires the cookie) returns `200 OK`

```json
{ "total": 3, "by_gender": { "male": 1, "female": 1, "other": 1 } }
```

Without a valid cookie it returns `401` with `{"detail": "Not authenticated"}`.

## Local Backend Setup

### 1. Prerequisites

- Python 3.11+
- A PostgreSQL database

### 2. Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require"
JWT_SECRET="generate-a-long-random-string"
COOKIE_SECURE="false"
```

`COOKIE_SECURE="false"` is needed for local `http://`; keep it `true` in production.
`JWT_SECRET` must be at least 32 characters or the app refuses to start. Generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. Install and run

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn api.index:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

Before the first run, create the tables as described in [Database Setup (Neon)](#database-setup-neon).

## Database Setup (Neon)

1. Create a project at [neon.tech](https://neon.tech) and copy the **pooled** connection string
   from the dashboard.
2. Put it in `.env` as `DATABASE_URL`. Either form works; a plain `postgres://` or
   `postgresql://` URL is rewritten to `postgresql+psycopg://` automatically. Keep
   `sslmode=require` in the query string.

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
   JWT_SECRET="generate-a-long-random-string"
   COOKIE_SECURE="false"
   ```

3. Apply the database migrations (safe to rerun; only pending migrations run):

   ```bash
   alembic upgrade head
   ```

   A database created before migrations existed has a table named `user`; the first migration
   renames it to `users` and keeps its rows.

4. Optionally create the demo account `testuser@email.com` / `Password123@` (safe to rerun):

   ```bash
   python -m api.seed_test_user
   ```

Run these commands from the project root with the virtual environment active.

### Schema changes

Change the model in `api/models.py`, then generate, review and apply a migration:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

`tests/test_migrations.py` fails if a model changes without a matching migration.

### Integration tests (optional)

`tests/test_integration_postgres.py` runs against a real database and is skipped unless
`TEST_DATABASE_URL` is set. Use a separate Neon branch, not your main database. The test
applies migrations, inserts one uniquely named user and deletes only that row.

```bash
TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" pytest -m integration
```

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"; pytest -m integration
```

## Running Tests

```bash
pytest -q
```

Tests use a temporary SQLite database per test, so no PostgreSQL is needed. The integration
test is reported as skipped.

## Frontend Setup

### Prerequisites

- Node.js 22.12+ for development. The app itself needs only Node 20.9+, but the test and
  commit tooling (Vitest, lint-staged) requires 22.12+.

### Install and run

```bash
npm install
```

Run the backend and the frontend in two terminals:

```bash
uvicorn api.index:app --reload --port 8000
npm run dev
```

App: http://localhost:3000. In development, requests to `/api/*` are proxied to
`http://127.0.0.1:8000`; set `API_PROXY_TARGET` to proxy somewhere else. Production has no
proxy, because `/api` is served by the Python function.

Next.js also loads the root `.env`. Only variables prefixed with `NEXT_PUBLIC_` reach the
browser, so never give backend secrets that prefix.

### Scripts

| Script                 | What it does                                 |
| :--------------------- | :------------------------------------------- |
| `npm run dev`          | Start the Next.js dev server                 |
| `npm run build`        | Production build                             |
| `npm run lint`         | ESLint                                       |
| `npm run type-check`   | TypeScript check (`tsc --noEmit`)            |
| `npm run format`       | Format files with Prettier                   |
| `npm run format:check` | Check formatting without changing files      |
| `npm test`             | Run frontend unit tests (Vitest, no network) |
| `npm run test:e2e`     | Run Playwright end-to-end tests (see below)  |

### Git hooks

Installed automatically by `npm install` (Husky):

- **pre-commit:** runs lint-staged (ESLint and Prettier on staged files).
- **pre-push:** runs lint, type-check, test and build in order and stops the push at the first
  failure. End-to-end tests are intentionally not part of it: they need a browser and take
  much longer.

### Pages

| Path         | Status                 | Notes                                                               |
| :----------- | :--------------------- | :------------------------------------------------------------------ |
| `/register`  | Implemented            | Validates input, then redirects to `/login?registered=1` on success |
| `/login`     | Implemented            | Redirects to `/dashboard` on success                                |
| `/dashboard` | Implemented, protected | Signed-in user, total users, users by gender, logout                |

Redirects (done by `src/proxy.ts`):

| Path                       | With session cookie | Without  |
| :------------------------- | :------------------ | :------- |
| `/`                        | `/dashboard`        | `/login` |
| `/dashboard` and sub-paths | stays               | `/login` |
| `/login`, `/register`      | `/dashboard`        | stays    |

The frontend guard only checks that the session cookie exists; the backend verifies the JWT
on every API call, so a forged cookie never shows any data.

## End-to-end tests

Playwright drives Chromium through register, login, the dashboard, logout and the route guard.

1. Install the browser once:

   ```bash
   npx playwright install chromium
   ```

2. Stop any running dev servers first. The tests start their own backend on port 8100 and
   frontend on port 3100, and Next.js allows only one dev server per project folder.
3. Run:

   ```bash
   npm run test:e2e
   ```

The backend runs on a throwaway SQLite database (`e2e/.tmp/e2e.db`, recreated on every run)
with its own test JWT secret, so it never touches Neon or your `.env` values. Reports are
written to `playwright-report/`; open the latest with `npx playwright show-report`. The
tests use `.venv`'s Python by default; set `E2E_PYTHON` to use a different one.

## Styling

Styling uses Tailwind CSS v4 (no CSS Modules). Design tokens (colors, radii, shadow, motion)
live in the `@theme` block in `src/app/globals.css`, next to a few shared classes
(`.glass`, `.glass-input`, `.link`, `.banner-error`, `.banner-success`). Use `Button`,
`ButtonLink`, `Spinner`, `Skeleton` and `GlassCard` instead of one-off styles.

## Git Workflow

One feature per branch, merged into `main` via pull request.

## Coming Soon

Vercel deployment, live link, test account.
