# User Analytics Dashboard

A dashboard app with user registration, login, logout and a protected stats dashboard.

## Technical Stack

- **Frontend:** Next.js (App Router, TypeScript), in progress (register and login pages done; dashboard pending)
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
│   ├── layout.tsx      # Root layout and page title
│   ├── page.tsx        # Placeholder home page with a link to /register
│   ├── globals.css     # Minimal CSS reset
│   └── register/
│       ├── page.tsx    # /register: page title and RegisterForm
│       └── page.module.css
├── components/
│   ├── FormField.tsx   # Label + control + accessible error message (shared by forms)
│   ├── FormField.module.css
│   ├── RegisterForm.tsx         # Register form: validation, submit, server errors
│   ├── RegisterForm.module.css
│   ├── RegisterForm.test.tsx    # Form tests (jsdom, API and router mocked)
│   ├── LoginForm.tsx            # Login form: validation, submit, server errors
│   ├── LoginForm.module.css     # Reuses RegisterForm styles via composes
│   └── LoginForm.test.tsx
└── lib/
    ├── types.ts        # Gender, User, Stats and request types (mirror the backend)
    ├── api.ts          # The only place that calls fetch; typed API functions, ApiError
    ├── api.test.ts     # API client tests (fetch mocked)
    ├── types.test.ts   # Guards GENDERS against drifting from the backend enum
    ├── validation.ts   # Client-side register and login validation
    └── validation.test.ts
.husky/                 # Git hooks: pre-commit, pre-push
package.json            # Frontend dependencies and npm scripts
next.config.ts          # Dev-only /api proxy to the FastAPI server
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

### Git hooks

Installed automatically by `npm install` (Husky):

- **pre-commit:** runs lint-staged (ESLint and Prettier on staged files).
- **pre-push:** runs lint, type-check, test and build in order and stops the push at the first
  failure.

### Pages

| Path        | Status      | Notes                                                                          |
| :---------- | :---------- | :----------------------------------------------------------------------------- |
| `/register` | Implemented | Validates input, then redirects to `/login?registered=1` on success            |
| `/login`    | Implemented | Redirects to `/dashboard` on success (added in a later branch; 404 until then) |

## Git Workflow

One feature per branch, merged into `main` via pull request.

## Coming Soon

Dashboard page, Vercel deployment, live link, test account.
