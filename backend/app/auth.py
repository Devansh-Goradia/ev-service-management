"""
auth.py — JWT authentication helpers and FastAPI dependencies.

Exports
-------
  verify_password(plain, hashed) -> bool
  get_password_hash(password) -> str
  create_access_token(data, expires_delta) -> str
  get_current_user  — FastAPI dependency → User ORM object
  get_current_admin — FastAPI dependency → User ORM object (admin only)
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import TokenData

# ---------------------------------------------------------------------------
# Load environment configuration
# ---------------------------------------------------------------------------
load_dotenv()

SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_in_production_32chars_min")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# Hard-coded admin email — always receives admin privileges regardless of DB flag
HARDCODED_ADMIN_EMAIL = "admin@evservice.com"

# ---------------------------------------------------------------------------
import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash of *password*. Never store plaintext passwords."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Encode *data* into a signed JWT.

    Parameters
    ----------
    data:
        Dictionary of claims to include in the token payload.
        Typically ``{"sub": str(user_id)}``.
    expires_delta:
        How long until the token expires.  Defaults to
        ``ACCESS_TOKEN_EXPIRE_MINUTES`` from the environment.

    Returns
    -------
    str
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# OAuth2 scheme — reads Bearer token from Authorization header
# ---------------------------------------------------------------------------
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the JWT Bearer token and return the corresponding User row.

    Raises 401 if the token is missing, malformed, expired, or the user
    no longer exists in the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception

    user: Optional[User] = db.query(User).filter(
        User.user_id == token_data.user_id
    ).first()

    if user is None:
        raise credentials_exception

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require that the authenticated user has admin privileges.

    Admin access is granted when **either** of the following is true:
    - ``current_user.is_admin`` is ``True`` in the database
    - ``current_user.email`` matches the hard-coded admin address

    Raises 403 Forbidden otherwise.
    """
    if not current_user.is_admin and current_user.email != HARDCODED_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
