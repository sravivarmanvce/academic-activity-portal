# app/api/endpoints/auth.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, crud  # make sure crud is imported
from pydantic import BaseModel

router = APIRouter()

@router.post("/login", response_model=schemas.UserOut)
def login(email: str = Query(...), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
