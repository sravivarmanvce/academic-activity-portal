# app/schemas.py

from typing import List, Optional
from pydantic import BaseModel
from datetime import date

class DepartmentOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class AcademicYearOut(BaseModel):
    id: int
    year: str
    is_enabled: bool
    deadline: Optional[date] = None
    class Config:
        from_attributes = True

class ProgramCountCreate(BaseModel):
    department_id: int
    academic_year_id: int
    program_type: str
    sub_program_type: Optional[str] = None
    activity_category: str
    budget_mode: str
    count: int
    total_budget: float
    remarks: Optional[str] = ""

class ProgramCountOut(ProgramCountCreate):
    id: int
    class Config:
        from_attributes = True

class ProgramCountBatch(BaseModel):
    entries: List[ProgramCountCreate]

class ProgramTypeCreate(BaseModel):
    program_type: str
    sub_program_type: Optional[str] = None
    activity_category: str
    departments: str
    budget_mode: str
    budget_per_event: Optional[float] = None

class ProgramTypeOut(ProgramTypeCreate):
    id: int
    class Config:
        from_attributes = True