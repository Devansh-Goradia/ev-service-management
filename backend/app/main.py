"""
main.py — FastAPI application entry point for the EV Service Management API.

Startup behaviour
-----------------
1. All SQLAlchemy ORM tables are created (CREATE TABLE IF NOT EXISTS).
2. The service_types catalogue is seeded with 5 default entries if it is empty.

Middleware
----------
- CORSMiddleware: allows the Vite dev server, Vercel deployments, and any
  other origin during development.

Routers
-------
- users    → /auth/*, /users/*
- vehicles → /vehicles/*
- services → /service-types, /services/*

Extra endpoints
---------------
GET /          — healthcheck / welcome message
GET /health/db — verifies the database connection
GET /dashboard/stats — aggregated statistics for the current user's dashboard
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import Base, SessionLocal, engine, get_db
from app.models import IndianEVCatalog, ServiceRequest, ServiceStatus, ServiceType, User, Vehicle
from app.routes import indian_evs as indian_evs_router
from app.routes import services as services_router
from app.routes import users as users_router
from app.routes import vehicles as vehicles_router
from app.schemas import DashboardStats, ServiceRequestResponse


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
_DEFAULT_SERVICE_TYPES = [
    {
        "service_name": "Battery Checkup",
        "description": (
            "Comprehensive inspection of the EV battery pack including state-of-health "
            "analysis, cell balancing check, and thermal management review."
        ),
    },
    {
        "service_name": "General Maintenance",
        "description": (
            "Routine service covering fluid top-ups, filter replacements, visual "
            "inspections, and safety checks."
        ),
    },
    {
        "service_name": "Brake Inspection",
        "description": (
            "Full inspection of the regenerative and mechanical brake systems, "
            "pad wear assessment, and hydraulic fluid condition check."
        ),
    },
    {
        "service_name": "Tire Inspection",
        "description": (
            "Tire pressure calibration, tread depth measurement, wheel alignment "
            "verification, and rotation service."
        ),
    },
    {
        "service_name": "Software Diagnostics",
        "description": (
            "On-board computer diagnostics, firmware version audit, OTA update "
            "verification, and error-code scanning across all ECU modules."
        ),
    },
]


_DEFAULT_INDIAN_EVS = [
    # Tata Motors
    {"manufacturer": "Tata Motors", "model_name": "Nexon EV (Long Range)", "battery_capacity_kwh": 40.5, "claimed_range_km": 465, "body_type": "Compact SUV", "price_range_inr_lakh": "14.49 - 19.49", "fast_charging_support": True},
    {"manufacturer": "Tata Motors", "model_name": "Punch EV", "battery_capacity_kwh": 35.0, "claimed_range_km": 421, "body_type": "Micro SUV", "price_range_inr_lakh": "9.99 - 14.29", "fast_charging_support": True},
    {"manufacturer": "Tata Motors", "model_name": "Tiago EV", "battery_capacity_kwh": 24.0, "claimed_range_km": 315, "body_type": "Hatchback", "price_range_inr_lakh": "7.99 - 11.49", "fast_charging_support": True},
    {"manufacturer": "Tata Motors", "model_name": "Tigor EV", "battery_capacity_kwh": 26.0, "claimed_range_km": 315, "body_type": "Sedan", "price_range_inr_lakh": "12.49 - 13.75", "fast_charging_support": True},
    {"manufacturer": "Tata Motors", "model_name": "Curvv EV", "battery_capacity_kwh": 55.0, "claimed_range_km": 585, "body_type": "Coupe SUV", "price_range_inr_lakh": "17.49 - 21.99", "fast_charging_support": True},
    {"manufacturer": "Tata Motors", "model_name": "Harrier EV", "battery_capacity_kwh": 60.0, "claimed_range_km": 500, "body_type": "Mid-size SUV", "price_range_inr_lakh": "21.00 - 26.00", "fast_charging_support": True},

    # Mahindra
    {"manufacturer": "Mahindra", "model_name": "XUV400 EV", "battery_capacity_kwh": 39.4, "claimed_range_km": 456, "body_type": "Compact SUV", "price_range_inr_lakh": "15.49 - 19.39", "fast_charging_support": True},
    {"manufacturer": "Mahindra", "model_name": "BE 6e", "battery_capacity_kwh": 59.0, "claimed_range_km": 550, "body_type": "Coupe SUV", "price_range_inr_lakh": "18.90 - 24.50", "fast_charging_support": True},
    {"manufacturer": "Mahindra", "model_name": "XEV 9e", "battery_capacity_kwh": 79.0, "claimed_range_km": 656, "body_type": "Luxury SUV", "price_range_inr_lakh": "21.90 - 28.50", "fast_charging_support": True},

    # MG Motor India
    {"manufacturer": "MG Motor", "model_name": "Windsor EV", "battery_capacity_kwh": 38.0, "claimed_range_km": 331, "body_type": "CUV", "price_range_inr_lakh": "13.50 - 15.50", "fast_charging_support": True},
    {"manufacturer": "MG Motor", "model_name": "ZS EV", "battery_capacity_kwh": 50.3, "claimed_range_km": 461, "body_type": "Compact SUV", "price_range_inr_lakh": "18.98 - 25.44", "fast_charging_support": True},
    {"manufacturer": "MG Motor", "model_name": "Comet EV", "battery_capacity_kwh": 17.3, "claimed_range_km": 230, "body_type": "City Hatchback", "price_range_inr_lakh": "6.99 - 9.24", "fast_charging_support": False},

    # Hyundai Motor India
    {"manufacturer": "Hyundai", "model_name": "Ioniq 5", "battery_capacity_kwh": 72.6, "claimed_range_km": 631, "body_type": "Crossover SUV", "price_range_inr_lakh": "46.05 - 47.50", "fast_charging_support": True},
    {"manufacturer": "Hyundai", "model_name": "Kona Electric", "battery_capacity_kwh": 39.2, "claimed_range_km": 452, "body_type": "Compact SUV", "price_range_inr_lakh": "23.84 - 24.03", "fast_charging_support": True},
    {"manufacturer": "Hyundai", "model_name": "Creta EV", "battery_capacity_kwh": 45.0, "claimed_range_km": 450, "body_type": "Compact SUV", "price_range_inr_lakh": "17.00 - 22.00", "fast_charging_support": True},

    # Kia India
    {"manufacturer": "Kia", "model_name": "EV6", "battery_capacity_kwh": 77.4, "claimed_range_km": 708, "body_type": "Crossover", "price_range_inr_lakh": "60.95 - 65.95", "fast_charging_support": True},
    {"manufacturer": "Kia", "model_name": "EV9", "battery_capacity_kwh": 99.8, "claimed_range_km": 561, "body_type": "Full-size SUV", "price_range_inr_lakh": "129.90", "fast_charging_support": True},

    # BYD India
    {"manufacturer": "BYD", "model_name": "Atto 3", "battery_capacity_kwh": 60.48, "claimed_range_km": 521, "body_type": "SUV", "price_range_inr_lakh": "24.99 - 33.99", "fast_charging_support": True},
    {"manufacturer": "BYD", "model_name": "Seal", "battery_capacity_kwh": 82.56, "claimed_range_km": 650, "body_type": "Sedan", "price_range_inr_lakh": "41.00 - 53.00", "fast_charging_support": True},
    {"manufacturer": "BYD", "model_name": "eMAX 7", "battery_capacity_kwh": 71.8, "claimed_range_km": 530, "body_type": "MPV", "price_range_inr_lakh": "26.90 - 29.90", "fast_charging_support": True},

    # Citroen India
    {"manufacturer": "Citroen", "model_name": "eC3", "battery_capacity_kwh": 29.2, "claimed_range_km": 320, "body_type": "Hatchback", "price_range_inr_lakh": "11.61 - 13.50", "fast_charging_support": True},

    # Premium / Luxury Segment in India
    {"manufacturer": "Volvo", "model_name": "EX40 / XC40 Recharge", "battery_capacity_kwh": 78.0, "claimed_range_km": 535, "body_type": "Luxury SUV", "price_range_inr_lakh": "56.10 - 57.90", "fast_charging_support": True},
    {"manufacturer": "Volvo", "model_name": "C40 Recharge", "battery_capacity_kwh": 78.0, "claimed_range_km": 530, "body_type": "Coupe SUV", "price_range_inr_lakh": "62.95", "fast_charging_support": True},
    {"manufacturer": "BMW", "model_name": "i4 eDrive40", "battery_capacity_kwh": 83.9, "claimed_range_km": 590, "body_type": "Luxury Sedan", "price_range_inr_lakh": "72.50 - 77.50", "fast_charging_support": True},
    {"manufacturer": "BMW", "model_name": "iX1", "battery_capacity_kwh": 66.5, "claimed_range_km": 440, "body_type": "Luxury SUV", "price_range_inr_lakh": "66.90", "fast_charging_support": True},
    {"manufacturer": "Mercedes-Benz", "model_name": "EQB 350", "battery_capacity_kwh": 70.5, "claimed_range_km": 423, "body_type": "Luxury 7-seater SUV", "price_range_inr_lakh": "74.50 - 77.50", "fast_charging_support": True},
    {"manufacturer": "Mercedes-Benz", "model_name": "EQE 500 4MATIC", "battery_capacity_kwh": 90.6, "claimed_range_km": 550, "body_type": "Luxury SUV", "price_range_inr_lakh": "139.00", "fast_charging_support": True},
    {"manufacturer": "Audi", "model_name": "e-tron 55", "battery_capacity_kwh": 95.0, "claimed_range_km": 484, "body_type": "Luxury SUV", "price_range_inr_lakh": "102.00 - 126.00", "fast_charging_support": True},
]


def _seed_service_types(db: Session) -> None:
    """Insert default service types if the table is empty."""
    if db.query(ServiceType).count() == 0:
        for entry in _DEFAULT_SERVICE_TYPES:
            db.add(ServiceType(**entry))
        db.commit()


def _seed_indian_evs(db: Session) -> None:
    """Insert comprehensive Indian EV models if the table is empty."""
    if db.query(IndianEVCatalog).count() == 0:
        for entry in _DEFAULT_INDIAN_EVS:
            db.add(IndianEVCatalog(**entry))
        db.commit()


# ---------------------------------------------------------------------------
# Lifespan handler — runs once at startup and once at shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Create tables and seed catalogue data before the server starts accepting requests."""
    # Create all tables defined in the ORM models
    Base.metadata.create_all(bind=engine)

    # Seed default service types and Indian EV database
    db = SessionLocal()
    try:
        _seed_service_types(db)
        _seed_indian_evs(db)
    finally:
        db.close()

    yield  # server is running

    # (optional shutdown logic goes here)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EV Service Management API",
    description=(
        "REST API for managing electric-vehicle service appointments, "
        "vehicle registration, and customer accounts."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "https://*.vercel.app",    # Vercel preview / production deployments
        "*",                       # open for development — restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(users_router.router)
app.include_router(vehicles_router.router)
app.include_router(services_router.router)
app.include_router(indian_evs_router.router)


# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"], summary="API welcome message")
def root() -> dict:
    """Simple liveness probe — always returns 200 OK."""
    return {"message": "EV Service Management API"}


# ---------------------------------------------------------------------------
# Database health check
# ---------------------------------------------------------------------------
@app.get("/health/db", tags=["Health"], summary="Test database connectivity")
def health_db(db: Session = Depends(get_db)) -> dict:
    """
    Execute a trivial SQL statement to confirm the database is reachable.

    Returns
    -------
    200  ``{"status": "ok", "database": "connected"}``
    503  If the database connection fails.
    """
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {exc}",
        )


# ---------------------------------------------------------------------------
# Dashboard statistics
# ---------------------------------------------------------------------------
@app.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    tags=["Dashboard"],
    summary="Aggregated stats for the current user's dashboard",
)
def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardStats:
    """
    Return aggregated counts and the 5 most recent service requests for the
    authenticated user.

    Response
    --------
    - **total_vehicles** — number of vehicles registered by this user
    - **total_services** — total service requests across all their vehicles
    - **pending_services** — requests with status *Pending* or *In Progress*
    - **completed_services** — requests with status *Completed*
    - **recent_services** — up to 5 most recent requests (newest first)
    """
    # Collect this user's vehicle IDs
    user_vehicle_ids: list = [
        row.vehicle_id
        for row in db.query(Vehicle.vehicle_id)
        .filter(Vehicle.user_id == current_user.user_id)
        .all()
    ]

    total_vehicles = len(user_vehicle_ids)

    if not user_vehicle_ids:
        return DashboardStats(
            total_vehicles=0,
            total_services=0,
            pending_services=0,
            completed_services=0,
            recent_services=[],
        )

    # Base query scoped to this user's vehicles
    base_q = db.query(ServiceRequest).filter(
        ServiceRequest.vehicle_id.in_(user_vehicle_ids)
    )

    total_services = base_q.count()

    pending_services = base_q.filter(
        ServiceRequest.status.in_([ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS])
    ).count()

    completed_services = base_q.filter(
        ServiceRequest.status == ServiceStatus.COMPLETED
    ).count()

    # 5 most recent service requests with joins
    recent_orm = (
        db.query(ServiceRequest)
        .options(
            joinedload(ServiceRequest.vehicle),
            joinedload(ServiceRequest.service_type),
        )
        .filter(ServiceRequest.vehicle_id.in_(user_vehicle_ids))
        .order_by(ServiceRequest.created_at.desc())
        .limit(5)
        .all()
    )

    recent_services = [
        ServiceRequestResponse.from_orm_with_joins(sr) for sr in recent_orm
    ]

    return DashboardStats(
        total_vehicles=total_vehicles,
        total_services=total_services,
        pending_services=pending_services,
        completed_services=completed_services,
        recent_services=recent_services,
    )
