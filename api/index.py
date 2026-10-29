from fastapi import FastAPI

from api.routes import auth, dashboard

# Docs live under /api because Vercel routes only /api/* to this function.
app = FastAPI(
    title="Dashboard API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(dashboard.router, prefix="/api/dashboard")
