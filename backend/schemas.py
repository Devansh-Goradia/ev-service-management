"""
schemas.py — Pydantic v2 request / response schemas.

Each ORM model has a corresponding family of schemas:
  - <Model>Create  : data accepted when creating a resource
  - <Model>Update  : data accepted for partial updates (all fields optional)
  - <Model>Response: data returned to the client (never includes secrets)

Additional schemas
------------------
  Token, TokenData  — JWT auth
  LoginRequest      — email + password login body
  DashboardStats    — aggregated counts for the dashboard endpoint
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.models import ServiceStatus


# ---------------------------------------------------------------------------
# Shared config mixin — enables ORM mode for all response schemas
# ---------------------------------------------------------------------------
class _OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# Auth
# ===========================================================================

class LoginRequest(BaseModel):
    """Body for POST /auth/login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Returned after successful authentication."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data encoded inside the JWT payload."""
    user_id: Optional[str] = None


# ===========================================================================
# User
# ===========================================================================

class UserCreate(BaseModel):
    """Fields required to register a new user."""
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=20)
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """Fields the user may update on their own profile."""
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=20)


class UserResponse(_OrmBase):
    """Safe user representation returned to the client."""
    user_id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: Optional[str]
    is_admin: bool
    created_at: datetime


# ===========================================================================
# Vehicle
# ===========================================================================

class VehicleCreate(BaseModel):
    """Fields required to register a new vehicle."""
    manufacturer: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    registration_number: str = Field(..., min_length=2, max_length=50)
    purchase_year: int = Field(..., ge=1990, le=2100)


class VehicleUpdate(BaseModel):
    """Fields the owner may update on a vehicle."""
    manufacturer: Optional[str] = Field(default=None, max_length=100)
    model: Optional[str] = Field(default=None, max_length=100)
    registration_number: Optional[str] = Field(default=None, max_length=50)
    purchase_year: Optional[int] = Field(default=None, ge=1990, le=2100)


class VehicleResponse(_OrmBase):
    """Vehicle representation returned to the client."""
    vehicle_id: uuid.UUID
    user_id: uuid.UUID
    manufacturer: str
    model: str
    registration_number: str
    purchase_year: int


# ===========================================================================
# ServiceType
# ===========================================================================

class ServiceTypeResponse(_OrmBase):
    """Read-only service catalogue entry."""
    service_type_id: uuid.UUID
    service_name: str
    description: Optional[str]


# ===========================================================================
# ServiceRequest
# ===========================================================================

class ServiceRequestCreate(BaseModel):
    """Fields required to create a new service booking."""
    vehicle_id: uuid.UUID
    service_type_id: uuid.UUID
    requested_date: datetime
    issue_description: Optional[str] = Field(default=None, max_length=2000)


class ServiceStatusUpdate(BaseModel):
    """Body for PATCH /services/{service_id}/status (admin only)."""
    status: ServiceStatus


class ServiceRequestResponse(_OrmBase):
    """
    Full service request response enriched with vehicle info and service name.
    Nested objects are populated via SQLAlchemy relationships.
    """
    service_id: uuid.UUID
    vehicle_id: uuid.UUID
    service_type_id: uuid.UUID
    requested_date: datetime
    issue_description: Optional[str]
    status: ServiceStatus
    created_at: datetime

    # Denormalized fields from joined tables — populated in the route layer
    vehicle_manufacturer: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_registration_number: Optional[str] = None
    service_type_name: Optional[str] = None

    @classmethod
    def from_orm_with_joins(cls, sr) -> "ServiceRequestResponse":
        """
        Build a response object from an ORM ServiceRequest that has
        .vehicle and .service_type relationships loaded.
        """
        data = {
            "service_id": sr.service_id,
            "vehicle_id": sr.vehicle_id,
            "service_type_id": sr.service_type_id,
            "requested_date": sr.requested_date,
            "issue_description": sr.issue_description,
            "status": sr.status,
            "created_at": sr.created_at,
            "vehicle_manufacturer": sr.vehicle.manufacturer if sr.vehicle else None,
            "vehicle_model": sr.vehicle.model if sr.vehicle else None,
            "vehicle_registration_number": (
                sr.vehicle.registration_number if sr.vehicle else None
            ),
            "service_type_name": (
                sr.service_type.service_name if sr.service_type else None
            ),
        }
        return cls(**data)


# ===========================================================================
# Dashboard
# ===========================================================================

class DashboardStats(BaseModel):
    """Aggregated statistics returned by GET /dashboard/stats."""
    total_vehicles: int
    total_services: int
    pending_services: int
    completed_services: int
    recent_services: List[ServiceRequestResponse]


# ===========================================================================
# Indian EV Catalog
# ===========================================================================

class IndianEVResponse(_OrmBase):
    """Indian EV model catalog entry."""
    model_id: uuid.UUID
    manufacturer: str
    model_name: str
    battery_capacity_kwh: float
    claimed_range_km: int
    body_type: str
    price_range_inr_lakh: Optional[str] = None
    fast_charging_support: bool


class ManufacturerModelsGroup(BaseModel):
    """Grouped models under an Indian EV manufacturer."""
    manufacturer: str
    models: List[str]
