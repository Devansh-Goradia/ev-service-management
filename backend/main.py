"""
main.py — Root entry-point alias.
Allows starting the server either via:
    uvicorn app.main:app --reload
or:
    uvicorn main:app --reload
from within the backend/ folder.
"""
from app.main import app

__all__ = ["app"]
