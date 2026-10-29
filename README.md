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
├── database.py         # Lazy database engine and get_session dependency
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
└── test_dashboard_stats.py  # GET /api/dashboard/stats
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

There is no migration or setup script yet, so create the table once against your database:

```bash
python -c "from sqlmodel import SQLModel; from api import models; from api.database import get_engine; SQLModel.metadata.create_all(get_engine())"
```

## Running Tests

```bash
pytest -q
```

Tests use an in-memory SQLite database, so no PostgreSQL is needed.

## Git Workflow

One feature per branch, merged into `main` via pull request.

## Coming Soon

Frontend, Neon setup script, Vercel deployment, live link, test account.
