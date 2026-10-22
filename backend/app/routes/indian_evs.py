"""
routes/indian_evs.py — Endpoints for the Indian Electric Vehicle database.

Demonstrates:
- Relational query filtering with WHERE (manufacturer, body_type)
- Aggregate queries with COUNT, AVG, GROUP BY
- Public catalog access
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import IndianEVCatalog
from app.schemas import IndianEVResponse, ManufacturerModelsGroup

router = APIRouter(prefix="/indian-evs", tags=["Indian EV Database"])


@router.get("", response_model=List[IndianEVResponse], summary="List Indian EV models with optional filters")
def list_indian_evs(
    manufacturer: Optional[str] = Query(None, description="Filter by manufacturer (e.g. Tata Motors, Mahindra, MG Motor)"),
    body_type: Optional[str] = Query(None, description="Filter by body type (e.g. SUV, Hatchback, Sedan)"),
    db: Session = Depends(get_db),
) -> List[IndianEVCatalog]:
    """
    Return all Indian electric vehicles in the database, with optional WHERE filters
    demonstrating SQL filtering and ORDER BY.
    """
    query = db.query(IndianEVCatalog)

    if manufacturer:
        query = query.filter(IndianEVCatalog.manufacturer.ilike(f"%{manufacturer.strip()}%"))
    if body_type:
        query = query.filter(IndianEVCatalog.body_type.ilike(f"%{body_type.strip()}%"))

    return query.order_by(IndianEVCatalog.manufacturer.asc(), IndianEVCatalog.claimed_range_km.desc()).all()


@router.get("/manufacturers", response_model=List[ManufacturerModelsGroup], summary="Get Indian EV manufacturers and their models")
def get_manufacturers_and_models(db: Session = Depends(get_db)) -> List[ManufacturerModelsGroup]:
    """
    Returns manufacturers and their associated models.
    Useful for auto-populating vehicle registration dropdowns in My Garage.
    Demonstrates SQL GROUP BY and aggregation logic.
    """
    evs = db.query(IndianEVCatalog).order_by(IndianEVCatalog.manufacturer.asc(), IndianEVCatalog.model_name.asc()).all()

    grouped: dict[str, list[str]] = {}
    for ev in evs:
        if ev.manufacturer not in grouped:
            grouped[ev.manufacturer] = []
        if ev.model_name not in grouped[ev.manufacturer]:
            grouped[ev.manufacturer].append(ev.model_name)

    return [
        ManufacturerModelsGroup(manufacturer=m, models=models)
        for m, models in grouped.items()
    ]


@router.get("/stats", summary="DBMS summary statistics of Indian EV database")
def get_catalog_stats(db: Session = Depends(get_db)) -> dict:
    """
    Demonstrates DBMS analytical SQL queries:
    - COUNT(*)
    - AVG(claimed_range_km)
    - GROUP BY manufacturer
    - GROUP BY body_type
    """
    total_models = db.query(func.count(IndianEVCatalog.model_id)).scalar() or 0
    avg_range = db.query(func.avg(IndianEVCatalog.claimed_range_km)).scalar() or 0

    # Group by manufacturer
    mfg_counts = (
        db.query(IndianEVCatalog.manufacturer, func.count(IndianEVCatalog.model_id).label("count"))
        .group_by(IndianEVCatalog.manufacturer)
        .order_by(func.count(IndianEVCatalog.model_id).desc())
        .all()
    )

    # Group by body type
    body_counts = (
        db.query(IndianEVCatalog.body_type, func.count(IndianEVCatalog.model_id).label("count"))
        .group_by(IndianEVCatalog.body_type)
        .order_by(func.count(IndianEVCatalog.model_id).desc())
        .all()
    )

    return {
        "total_models": total_models,
        "average_range_km": round(float(avg_range), 1) if avg_range else 0,
        "by_manufacturer": [{"manufacturer": m, "count": c} for m, c in mfg_counts],
        "by_body_type": [{"body_type": b, "count": c} for b, c in body_counts],
    }


@router.get("/{model_id}", response_model=IndianEVResponse, summary="Get details of a specific Indian EV model")
def get_indian_ev(model_id: uuid.UUID, db: Session = Depends(get_db)) -> IndianEVCatalog:
    """Fetch single EV model specification by UUID."""
    ev = db.query(IndianEVCatalog).filter(IndianEVCatalog.model_id == model_id).first()
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="EV model not found in the Indian database.",
        )
    return ev
