"""
routes/vehicles.py — Vehicle CRUD endpoints (all require authentication).

Routes
------
GET    /vehicles               — list current user's vehicles
POST   /vehicles               — register a new vehicle for current user
PUT    /vehicles/{vehicle_id}  — update a vehicle (owner only)
DELETE /vehicles/{vehicle_id}  — delete a vehicle (owner only)
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Vehicle
from app.schemas import VehicleCreate, VehicleResponse, VehicleUpdate

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


# ---------------------------------------------------------------------------
# Helper: fetch a vehicle that belongs to the current user or raise 404/403
# ---------------------------------------------------------------------------
def _get_owned_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> Vehicle:
    """
    Return the Vehicle with *vehicle_id* if it belongs to *current_user*.

    Raises
    ------
    404  Vehicle not found in the database.
    403  Vehicle exists but is owned by a different user.
    """
    vehicle: Vehicle | None = db.query(Vehicle).filter(
        Vehicle.vehicle_id == vehicle_id
    ).first()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )
    if vehicle.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this vehicle.",
        )
    return vehicle


# ---------------------------------------------------------------------------
# GET /vehicles
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=list[VehicleResponse],
    summary="List all vehicles for the current user",
)
def list_vehicles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Vehicle]:
    """Return every vehicle registered under the authenticated user's account."""
    return (
        db.query(Vehicle)
        .filter(Vehicle.user_id == current_user.user_id)
        .all()
    )


# ---------------------------------------------------------------------------
# POST /vehicles
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new vehicle",
)
def create_vehicle(
    payload: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Vehicle:
    """
    Create a vehicle owned by the current user.

    Raises 400 if the registration number is already taken.
    """
    existing = db.query(Vehicle).filter(
        Vehicle.registration_number == payload.registration_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration number '{payload.registration_number}' is already registered.",
        )

    vehicle = Vehicle(
        user_id=current_user.user_id,
        manufacturer=payload.manufacturer,
        model=payload.model,
        registration_number=payload.registration_number,
        purchase_year=payload.purchase_year,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


# ---------------------------------------------------------------------------
# PUT /vehicles/{vehicle_id}
# ---------------------------------------------------------------------------
@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Update a vehicle (owner only)",
)
def update_vehicle(
    vehicle_id: uuid.UUID,
    payload: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Vehicle:
    """
    Partially update a vehicle's fields.  Only the vehicle's owner may call
    this endpoint.  Only non-None fields in the request body are applied.

    Raises 400 if the new registration number conflicts with another vehicle.
    """
    vehicle = _get_owned_vehicle(vehicle_id, current_user, db)

    if payload.registration_number is not None:
        conflict = (
            db.query(Vehicle)
            .filter(
                Vehicle.registration_number == payload.registration_number,
                Vehicle.vehicle_id != vehicle_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration number '{payload.registration_number}' is already taken.",
            )
        vehicle.registration_number = payload.registration_number

    if payload.manufacturer is not None:
        vehicle.manufacturer = payload.manufacturer
    if payload.model is not None:
        vehicle.model = payload.model
    if payload.purchase_year is not None:
        vehicle.purchase_year = payload.purchase_year

    db.commit()
    db.refresh(vehicle)
    return vehicle


# ---------------------------------------------------------------------------
# DELETE /vehicles/{vehicle_id}
# ---------------------------------------------------------------------------
@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vehicle (owner only)",
)
def delete_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Permanently remove a vehicle and all its associated service requests
    (cascade delete defined at the model level).
    """
    vehicle = _get_owned_vehicle(vehicle_id, current_user, db)
    db.delete(vehicle)
    db.commit()
