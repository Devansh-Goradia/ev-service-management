"""
routes/users.py — Authentication and user-profile endpoints.

Routes
------
POST   /auth/register  — create a new user account, return JWT
POST   /auth/login     — verify credentials, return JWT
GET    /auth/me        — return the currently authenticated user
GET    /users/me       — alias for /auth/me (profile page convenience)
PUT    /users/me       — update the current user's name and/or phone
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.database import get_db
from app.models import User
from app.schemas import (
    LoginRequest,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(tags=["Authentication & Users"])


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------
@router.post(
    "/auth/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    """
    Hash the user's password with bcrypt, persist the new User row, and
    return a signed JWT so the client is immediately authenticated.

    Raises 400 if the e-mail address is already registered.
    """
    # Guard: email must be unique
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=get_password_hash(payload.password),
        is_admin=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.user_id)})
    return Token(access_token=access_token)


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post(
    "/auth/login",
    response_model=Token,
    summary="Login with email and password",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """
    Verify email + bcrypt password.  Returns a JWT on success.

    Raises 401 with a generic message on any credential mismatch to avoid
    leaking whether an email address is registered.
    """
    user: User | None = db.query(User).filter(User.email == payload.email).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.user_id)})
    return Token(access_token=access_token)


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------
@router.get(
    "/auth/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
def auth_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the user record extracted from the Bearer token."""
    return current_user


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------
@router.get(
    "/users/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
def get_profile(current_user: User = Depends(get_current_user)) -> User:
    """Convenience alias for the profile page — identical to GET /auth/me."""
    return current_user


# ---------------------------------------------------------------------------
# PUT /users/me
# ---------------------------------------------------------------------------
@router.put(
    "/users/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Update ``full_name`` and/or ``phone`` for the current user.
    Only provided (non-None) fields are modified.
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone

    db.commit()
    db.refresh(current_user)
    return current_user
