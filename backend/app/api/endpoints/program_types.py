# app/api/endpoints/program_types.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import schemas, crud
from app.database import get_db
from app.models import ProgramType
from app.dependencies import get_current_user_role
from fastapi.responses import Response

router = APIRouter(prefix="", tags=["Program Types"])

@router.get("/program-types", response_model=List[schemas.ProgramTypeOut])
def list_program_types(
    department: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_program_types(db, department)


@router.post("/program-types", response_model=schemas.ProgramTypeOut, summary="Create a new Program Type")
def create_program_type(
    data: schemas.ProgramTypeCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    if role not in ["admin", "principal", "pa_principal"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.create_program_type(db, data)


@router.put("/program-types/{id}", response_model=schemas.ProgramTypeOut, summary="Update existing Program Type")
def update_program_type(
    id: int,
    data: schemas.ProgramTypeCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    if role not in ["admin", "principal", "pa_principal"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.update_program_type(db, id, data)


@router.delete("/program-types/{id}", status_code=204)
def delete_program_type(
    id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    if role not in ["admin", "principal", "pa_principal"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    deleted = crud.delete_program_type(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Program type not found")
    return Response(status_code=204)


@router.get("/activity-categories", summary="Get distinct activity categories")
def get_activity_categories(db: Session = Depends(get_db)):
    results = db.query(ProgramType.activity_category).distinct().all()
    categories = sorted([r[0] for r in results if r[0]])
    return categories


# Optional: Get one program type by ID (not used now, but useful for modal editing if needed)
@router.get("/program-types/{id}", response_model=schemas.ProgramTypeOut, summary="Get a Program Type by ID")
def get_program_type(id: int, db: Session = Depends(get_db)):
    program = db.query(ProgramType).filter(ProgramType.id == id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program type not found")
    return program
