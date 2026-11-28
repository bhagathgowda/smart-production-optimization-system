from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from .database import engine, SessionLocal
from .models import Base
from .routes.api import router
from .utils.import_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(title="Smart Production Optimization System", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
def root():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Smart Production Optimization API</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1d32; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #182c49; border: 1px solid #2a4369; border-radius: 14px; padding: 32px; max-width: 540px; width: 100%; box-shadow: 0 16px 36px rgba(0,0,0,0.3); }
            h1 { color: #60a5fa; margin-top: 0; font-size: 22px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: #166534; color: #86efac; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
            .links { display: flex; flex-direction: column; gap: 10px; margin-top: 24px; }
            .link { display: block; background: #233e66; color: #93c5fd; text-decoration: none; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid #3b5f92; transition: all 0.15s; }
            .link:hover { background: #2f5286; border-color: #60a5fa; color: #fff; transform: translateY(-1px); }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">● FastAPI Backend Running</span>
            <h1>Smart Production Optimization API</h1>
            <p>The backend service is fully operational with SQLite database and the SciPy HiGHS Linear Programming optimization engine.</p>
            <div class="links">
                <a class="link" href="http://localhost:5173" target="_blank">🌐 Open Frontend Web Application (http://localhost:5173)</a>
                <a class="link" href="/docs">📖 Interactive Swagger API Documentation (/docs)</a>
                <a class="link" href="/api/health">🩺 Health Check Endpoint (/api/health)</a>
                <a class="link" href="/api/dashboard">📊 Dashboard Metrics & Optimization (/api/dashboard)</a>
            </div>
        </div>
    </body>
    </html>
    """

@app.api_route("/health", methods=["GET", "HEAD"])
def root_health():
    return {"status": "healthy", "service": "Smart Production Optimization API"}

