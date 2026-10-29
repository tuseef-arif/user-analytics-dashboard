# Project Rules

## Project
Dashboard app: user registration (username, password, gender), login, logout,
and a protected dashboard showing total users and users grouped by gender.
Backend: Python + FastAPI. REST only.

## Stack
- Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.x (async or sync, be consistent), Alembic
- PostgreSQL (hosted, e.g. Neon). Never SQLite in production.
- Auth: JWT via httpOnly cookie, password hashing with argon2 or bcrypt (passlib / argon2-cffi)
- Tests: pytest + httpx (TestClient)
- Lint/format: ruff (lint + format). Types: mypy or pyright.

## Structure
```
backend/
  app/
    main.py            # app creation, router registration only
    core/              # config.py (pydantic-settings), security.py, deps.py
    db/                # session.py, base.py
    models/            # SQLAlchemy models
    schemas/           # Pydantic request/response models
    routers/           # auth.py, dashboard.py (thin, no business logic)
    services/          # business logic, DB queries
  tests/
  alembic/
  requirements.txt (or pyproject.toml)
  .env.example
```

## Python rules
- Type-hint every function signature and return type. No untyped public functions.
- Follow PEP 8; let ruff format. Max line length 88.
- Use `pathlib`, f-strings, and `enum.Enum` for fixed values (e.g. Gender).
- No bare `except:`. Catch specific exceptions; never swallow errors silently.
- No mutable default arguments. No wildcard imports. No global mutable state.
- Keep functions small and single-purpose. Prefer early returns over deep nesting.
- Use `logging`, never `print`, for runtime output.
- Docstrings only where intent isn't obvious; comments explain why, not what.

## FastAPI rules
- Routers are thin: validate input, call a service, return a response model.
- Business logic and DB queries live in `services/`, not in route functions.
- Every endpoint declares `response_model`, explicit `status_code`, and `tags`.
- Separate schemas: `UserCreate` (input), `UserPublic` (output). Never return `password_hash`.
- Use dependency injection (`Depends`) for DB session and current user.
- Use `async def` only when the code is actually async end to end; don't mix blocking calls into async routes.
- Raise `HTTPException` with correct codes: 201 created, 400 bad input, 401 unauthenticated, 403 forbidden, 409 duplicate username, 422 validation (automatic).
- Routes are versioned and plural/noun-based: `/api/auth/register`, `/api/auth/login`,
  `/api/auth/logout`, `/api/auth/me`, `/api/dashboard/stats`.
- Configure CORS explicitly from env; never `allow_origins=["*"]` with credentials.

## Security rules
- Hash passwords (argon2/bcrypt). Never store or log plaintext passwords or tokens.
- JWT in httpOnly, `secure`, `samesite` cookie. Short expiry. Secret from env.
- Validate everything with Pydantic (username length/charset, password min length, gender enum).
- Use SQLAlchemy ORM or parameterized queries only. No string-built SQL.
- Secrets only in env vars. Commit `.env.example`, never `.env`.
- Generic login error ("Invalid credentials"); don't reveal whether the username exists.
- Dashboard and `/me` require auth via a shared dependency.

## Database rules
- Schema changes go through Alembic migrations, never manual edits.
- `username` unique + indexed. Enforce uniqueness at DB level and handle the conflict.
- Dashboard counts use SQL aggregation (`COUNT`, `GROUP BY gender`), not loading all rows into Python.

## Testing rules
- Every endpoint gets tests: success path + at least one failure path.
- Use a separate test database/fixtures; tests must not depend on each other.
- Cover: register (duplicate username), login (wrong password), protected route without cookie, stats correctness.

## Workflow rules for the AI
- Make the smallest change that solves the task. Don't refactor unrelated code.
- Don't add new dependencies without saying why.
- Follow existing patterns and structure before inventing new ones.
- After changes, run `ruff check`, `ruff format`, and `pytest`, and report results.
- If requirements are ambiguous, ask before building.
- Keep the README updated: live URL, setup steps, env vars, endpoint table with curl examples.

## Git
- Small commits with clear messages (`feat: add login endpoint`, `fix: handle duplicate username`).
- Never commit secrets, `.venv`, `__pycache__`, or `.env`.