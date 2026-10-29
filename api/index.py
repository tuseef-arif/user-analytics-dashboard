from fastapi import FastAPI

# Docs live under /api because Vercel routes only /api/* to this function.
app = FastAPI(
    title="Dashboard API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
