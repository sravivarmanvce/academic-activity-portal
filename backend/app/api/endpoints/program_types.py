# app/api/endpoints/program_types.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app import schemas, crud
from app.database import get_db

router = APIRouter()

@router.get("/program-types", response_model=List[schemas.ProgramTypeOut])
def list_program_types(department: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_program_types(db, department)

@router.post("/program-types", response_model=schemas.ProgramTypeOut)
def create_program_type(data: schemas.ProgramTypeCreate, db: Session = Depends(get_db)):
    return crud.create_program_type(db, data)

@router.put("/program-types/{id}", response_model=schemas.ProgramTypeOut)
def update_program_type(id: int, data: schemas.ProgramTypeCreate, db: Session = Depends(get_db)):
    return crud.update_program_type(db, id, data)

@router.delete("/program-types/{id}")
def delete_program_type(id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_program_type(db, id)
    if deleted:
        return {"message": "Program type deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Program type not found")
