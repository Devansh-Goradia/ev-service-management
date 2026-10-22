"""
routes/services.py — Service-type catalogue and service-request endpoints.

Routes
------
GET    /service-types                      — public catalogue
POST   /services                           — create booking (auth required)
GET    /services                           — list current user's bookings
GET    /services/{service_id}              — single booking (owner only)
PATCH  /services/{service_id}/status       — update status (admin only)
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_admin, get_current_user
from app.database import get_db
from app.models import ServiceRequest, ServiceStatus, ServiceType, User, Vehicle
from app.schemas import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceStatusUpdate,
    ServiceTypeResponse,
)

router = APIRouter(tags=["Services"])


# ---------------------------------------------------------------------------
# Helper: load a ServiceRequest with relationships and verify ownership
# ---------------------------------------------------------------------------
def _get_owned_service_request(
    service_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> ServiceRequest:
    """
    Fetch a ServiceRequest (with vehicle + service_type eagerly loaded)
    and verify the requesting user owns the associated vehicle.

    Raises
    ------
    404  Service request not found.
    403  The vehicle belongs to a different user.
    """
    sr: ServiceRequest | None = (
        db.query(ServiceRequest)
        .options(
            joinedload(ServiceRequest.vehicle),
            joinedload(ServiceRequest.service_type),
        )
        .filter(ServiceRequest.service_id == service_id)
        .first()
    )

    if sr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )
    if sr.vehicle.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this service request.",
        )
    return sr


# ---------------------------------------------------------------------------
# GET /service-types  (public)
# ---------------------------------------------------------------------------
@router.get(
    "/service-types",
    response_model=list[ServiceTypeResponse],
    summary="List all available service types (public)",
)
def list_service_types(db: Session = Depends(get_db)) -> list[ServiceType]:
    """Return the full service catalogue — no authentication required."""
    return db.query(ServiceType).order_by(ServiceType.service_name).all()


# ---------------------------------------------------------------------------
# POST /services
# ---------------------------------------------------------------------------
@router.post(
    "/services",
    response_model=ServiceRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service request",
)
def create_service_request(
    payload: ServiceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ServiceRequestResponse:
    """
    Book a service for one of the current user's vehicles.

    Validates
    ---------
    - The vehicle exists and belongs to the current user (403 otherwise).
    - The requested service type exists in the catalogue (404 otherwise).
    """
    # Ownership check on the vehicle
    vehicle: Vehicle | None = db.query(Vehicle).filter(
        Vehicle.vehicle_id == payload.vehicle_id
    ).first()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )
    if vehicle.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this vehicle.",
        )

    # Service type existence check
    service_type: ServiceType | None = db.query(ServiceType).filter(
        ServiceType.service_type_id == payload.service_type_id
    ).first()

    if service_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service type not found.",
        )

    sr = ServiceRequest(
        vehicle_id=payload.vehicle_id,
        service_type_id=payload.service_type_id,
        requested_date=payload.requested_date,
        issue_description=payload.issue_description,
        status=ServiceStatus.PENDING,
    )
    db.add(sr)
    db.commit()
    db.refresh(sr)

    # Re-query with relationships for the enriched response
    sr = (
        db.query(ServiceRequest)
        .options(
            joinedload(ServiceRequest.vehicle),
            joinedload(ServiceRequest.service_type),
        )
        .filter(ServiceRequest.service_id == sr.service_id)
        .one()
    )
    return ServiceRequestResponse.from_orm_with_joins(sr)


# ---------------------------------------------------------------------------
# GET /services
# ---------------------------------------------------------------------------
@router.get(
    "/services",
    response_model=list[ServiceRequestResponse],
    summary="List all service requests for the current user",
)
def list_service_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ServiceRequestResponse]:
    """
    Return every service request associated with vehicles owned by the
    current user, enriched with vehicle info and service type name.
    """
    # Get all vehicle IDs for this user
    vehicle_ids = [
        v.vehicle_id
        for v in db.query(Vehicle)
        .filter(Vehicle.user_id == current_user.user_id)
        .all()
    ]

    if not vehicle_ids:
        return []

    service_requests = (
        db.query(ServiceRequest)
        .options(
            joinedload(ServiceRequest.vehicle),
            joinedload(ServiceRequest.service_type),
        )
        .filter(ServiceRequest.vehicle_id.in_(vehicle_ids))
        .order_by(ServiceRequest.created_at.desc())
        .all()
    )

    return [ServiceRequestResponse.from_orm_with_joins(sr) for sr in service_requests]


# ---------------------------------------------------------------------------
# GET /services/{service_id}
# ---------------------------------------------------------------------------
@router.get(
    "/services/{service_id}",
    response_model=ServiceRequestResponse,
    summary="Get a single service request (owner only)",
)
def get_service_request(
    service_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ServiceRequestResponse:
    """Return the full detail of a service request owned by the current user."""
    sr = _get_owned_service_request(service_id, current_user, db)
    return ServiceRequestResponse.from_orm_with_joins(sr)


# ---------------------------------------------------------------------------
# PATCH /services/{service_id}/status
# ---------------------------------------------------------------------------
@router.patch(
    "/services/{service_id}/status",
    response_model=ServiceRequestResponse,
    summary="Update service request status (admin only)",
)
def update_service_status(
    service_id: uuid.UUID,
    payload: ServiceStatusUpdate,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ServiceRequestResponse:
    """
    Allow an admin to transition a service request to any status value.
    The requesting user must hold admin privileges (see auth.get_current_admin).
    """
    sr: ServiceRequest | None = (
        db.query(ServiceRequest)
        .options(
            joinedload(ServiceRequest.vehicle),
            joinedload(ServiceRequest.service_type),
        )
        .filter(ServiceRequest.service_id == service_id)
        .first()
    )

    if sr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )

    sr.status = payload.status
    db.commit()
    db.refresh(sr)

    # Reload relationships after commit
    sr = (
        db.query(ServiceRequest)
        .options(
            joinedload(ServiceRequest.vehicle),
            joinedload(ServiceRequest.service_type),
        )
        .filter(ServiceRequest.service_id == service_id)
        .one()
    )
    return ServiceRequestResponse.from_orm_with_joins(sr)
