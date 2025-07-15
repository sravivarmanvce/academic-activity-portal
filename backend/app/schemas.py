# app/schemas.py

from pydantic import BaseModel
from typing import Optional
from datetime import date

# ----- Department -----
class DepartmentOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# ----- Academic Year -----
class AcademicYearOut(BaseModel):
    id: int
    year: str
    is_enabled: bool
    deadline: Optional[date] = None

    class Config:
        from_attributes = True

# ----- Program Count -----
class ProgramCountIn(BaseModel):
    department_id: int
    academic_year_id: int
    program_type: str
    sub_program_type: Optional[str] = None
    activity_category: str
    budget_mode: str
    count: int = 0
    total_budget: int = 0
    remarks: Optional[str] = None

class ProgramCountOut(ProgramCountIn):
    id: int

    class Config:
        from_attributes = True

# ----- Program Type -----
class ProgramTypeBase(BaseModel):
    program_type: str
    sub_program_type: Optional[str] = None
    activity_category: str
    departments: str
    budget_mode: str
    budget_per_event: Optional[float] = None

class ProgramTypeCreate(ProgramTypeBase):
    pass

class ProgramTypeOut(ProgramTypeBase):
    id: int

    class Config:
        from_attributes = True

