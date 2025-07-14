from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from typing import Dict


class DepartmentOut(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class AcademicYearOut(BaseModel):
    id: int
    year: str
    is_enabled: bool
    deadline: Optional[date]
    class Config:
        orm_mode = True

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
        orm_mode = True

class ProgramCountData(ProgramCountIn):
    pass