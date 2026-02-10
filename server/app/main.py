from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import auth, services, availability, blocks, slots, appointments, clients, webhooks
from app.core import config
from app.core.config import settings
import app.models # Register all models

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Roma Cabello API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "roma-cabello.com", "*.roma-cabello.com", "render.com", "*.render.com"]
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://roma-cabello-frontend.onrender.com",
    "https://roma-cabello.com",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"ok": False, "message": "Validation Error", "errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log the exception here in a real production environment
    return JSONResponse(
        status_code=500,
        content={"ok": False, "message": "Internal Server Error"},
    )

@app.get("/")
@limiter.limit("5/minute")
def read_root(request: Request):
    return {"ok": True, "message": "Roma Cabello API is running"}

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(availability.router, prefix="/api/availability", tags=["Availability"])
app.include_router(blocks.router, prefix="/api/blocks", tags=["Blocks"])
app.include_router(slots.router, prefix="/api/slots", tags=["Slots"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
