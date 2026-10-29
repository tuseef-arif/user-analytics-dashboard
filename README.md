# User Analytics Dashboard

A dashboard app with user registration, login, logout and a protected stats dashboard.

## Technical Stack

- **Frontend:** Next.js (App Router, TypeScript), planned and in progress
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
├── init_db.py          # `python -m api.init_db`: create missing tables
├── seed_test_user.py   # `python -m api.seed_test_user`: create the demo account
├── models.py           # User table and Gender enum
├── schemas.py          # Request/response models (RegisterIn, LoginIn, UserOut, StatsOut)
├── security.py         # argon2 password hashing and JWT helpers
├── deps.py             # get_current_user dependency and cookie name
└── routes/
    ├── __init__.py
    ├── auth.py         # register, login, logout, me
    └── dashboard.py    # stats
tests/
├── __init__.py
├── conftest.py              # Test env vars, in-memory SQLite session and client fixtures
├── test_app.py              # Docs and OpenAPI availability
├── test_models.py           # User persistence and constraints
├── test_schemas.py          # Input validation and normalization
├── test_security.py         # Password hashing and token handling
├── test_auth_register.py    # POST /api/auth/register
├── test_auth_login.py       # POST /api/auth/login
├── test_auth_session.py     # logout, me and current-user behavior
├── test_dashboard_stats.py  # GET /api/dashboard/stats
├── test_database_url.py     # DATABASE_URL scheme normalization
├── test_init_db.py          # Table creation and demo-account seeding
└── test_integration_postgres.py  # Real PostgreSQL check (opt-in, see below)
```

## API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Register a user (username, password, gender) | No |
| POST | `/api/auth/login` | Verify credentials and set the session cookie | No |
| POST | `/api/auth/logout` | Clear the session cookie | No |
| GET | `/api/auth/me` | Return the current user | Yes |
| GET | `/api/dashboard/stats` | Total users and counts grouped by gender | Yes |

Interactive docs: `/api/docs`

### Examples

**Register:** `POST /api/auth/register` returns `201 Created`

```json
{ "username": "testuser@email.com", "password": "Password123@", "gender": "male" }
```

```json
{ "id": 1, "username": "testuser@email.com", "gender": "male", "created_at": "2026-10-29T12:00:00Z" }
```

**Login:** `POST /api/auth/login` returns `200 OK` and sets an `access_token` HTTP-only cookie

```json
{ "username": "testuser@email.com", "password": "Password123@" }
```

```json
{ "id": 1, "username": "testuser@email.com", "gender": "male", "created_at": "2026-10-29T12:00:00Z" }
```

Wrong username or password returns `401` with `{"detail": "Invalid username or password"}`.

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

`COOKIE_SECURE="false"` is needed for local `http://`; keep it `true` in production. Generate a
secret with:

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

3. Create the tables (safe to rerun; existing tables and rows are left untouched):

   ```bash
   python -m api.init_db
   ```

4. Optionally create the demo account `testuser@email.com` / `Password123@` (safe to rerun):

   ```bash
   python -m api.seed_test_user
   ```

Run these commands from the project root with the virtual environment active.

### Integration tests (optional)

`tests/test_integration_postgres.py` runs against a real database and is skipped unless
`TEST_DATABASE_URL` is set. Use a separate Neon branch, not your main database. The test
creates the table if missing, inserts one uniquely named user and deletes only that row.

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

Tests use an in-memory SQLite database, so no PostgreSQL is needed. The integration test is
reported as skipped.

## Git Workflow

One feature per branch, merged into `main` via pull request.

## Coming Soon

Frontend, Vercel deployment, live link, test account.
