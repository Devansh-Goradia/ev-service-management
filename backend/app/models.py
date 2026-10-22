"""
models.py — SQLAlchemy ORM models for the EV Service Management application.

Tables
------
users           — registered customers / admins
vehicles        — EVs owned by users
service_types   — catalogue of services offered
service_requests — individual service bookings
"""

import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enum definition
# ---------------------------------------------------------------------------
class ServiceStatus(str, enum.Enum):
    """Lifecycle states of a service request."""
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    """A registered user/customer.  is_admin=True grants elevated access."""

    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    vehicles: Mapped[list["Vehicle"]] = relationship(
        "Vehicle", back_populates="owner", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email}>"


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------
class Vehicle(Base):
    """An EV owned by a user."""

    __tablename__ = "vehicles"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    manufacturer: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    registration_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    purchase_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # relationships
    owner: Mapped["User"] = relationship("User", back_populates="vehicles")
    service_requests: Mapped[list["ServiceRequest"]] = relationship(
        "ServiceRequest", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Vehicle {self.registration_number}>"


# ---------------------------------------------------------------------------
# ServiceType
# ---------------------------------------------------------------------------
class ServiceType(Base):
    """Master catalogue of services the workshop offers."""

    __tablename__ = "service_types"

    service_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    service_name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # relationships
    service_requests: Mapped[list["ServiceRequest"]] = relationship(
        "ServiceRequest", back_populates="service_type"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ServiceType {self.service_name}>"


# ---------------------------------------------------------------------------
# ServiceRequest
# ---------------------------------------------------------------------------
class ServiceRequest(Base):
    """A customer's booking for a specific service on one of their vehicles."""

    __tablename__ = "service_requests"

    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.vehicle_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_types.service_type_id", ondelete="RESTRICT"),
        nullable=False,
    )
    requested_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    issue_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ServiceStatus] = mapped_column(
        SAEnum(ServiceStatus, name="service_status_enum"),
        default=ServiceStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle", back_populates="service_requests"
    )
    service_type: Mapped["ServiceType"] = relationship(
        "ServiceType", back_populates="service_requests"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ServiceRequest {self.service_id} status={self.status}>"


# ---------------------------------------------------------------------------
# Indian EV Catalog
# ---------------------------------------------------------------------------
class IndianEVCatalog(Base):
    """Database catalogue of electric vehicles available in the Indian market."""

    __tablename__ = "indian_ev_catalog"

    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    manufacturer: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    battery_capacity_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    claimed_range_km: Mapped[int] = mapped_column(Integer, nullable=False)
    body_type: Mapped[str] = mapped_column(String(50), nullable=False)
    price_range_inr_lakh: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fast_charging_support: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<IndianEVCatalog {self.manufacturer} {self.model_name}>"
