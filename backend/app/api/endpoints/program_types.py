# app/api/endpoints/program_types.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app import schemas, crud
from app.database import get_db
from app.dependencies import get_current_user_role

router = APIRouter()

@router.get("/program-types", response_model=List[schemas.ProgramTypeOut])
def list_program_types(
    department: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_program_types(db, department)


@router.post("/program-types", response_model=schemas.ProgramTypeOut)
def create_program_type(
    data: schemas.ProgramTypeCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)  # Add role check
):
    if role not in ["admin", "principal"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.create_program_type(db, data)


@router.put("/program-types/{id}", response_model=schemas.ProgramTypeOut)
def update_program_type(
    id: int,
    data: schemas.ProgramTypeCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)  # Add role check
):
    if role not in ["admin", "principal"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.update_program_type(db, id, data)


@router.delete("/program-types/{id}")
def delete_program_type(
    id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)  # Add role check
):
    if role not in ["admin", "principal"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    deleted = crud.delete_program_type(db, id)
    if deleted:
        return {"message": "Program type deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Program type not found")
