# app/schemas.py

from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


# -------------------------------
# Department Schemas
# -------------------------------

class DepartmentBase(BaseModel):
    name: str

class DepartmentOut(DepartmentBase):
    id: int
    name: str
    full_name: str

    class Config:
        orm_mode = True

# -------------------------------
# Academic Year Schemas
# -------------------------------

class AcademicYearBase(BaseModel):
    year: str

class AcademicYearOut(AcademicYearBase):
    id: int

    class Config:
        orm_mode = True

# -------------------------------
# Program Type Schemas
# -------------------------------

class ProgramTypeBase(BaseModel):
    program_type: str
    sub_program_type: Optional[str] = None
    activity_category: str
    departments: str  # comma-separated or "ALL"
    budget_mode: str  # "Fixed" or "Variable"
    budget_per_event: Optional[float] = None

class ProgramTypeCreate(ProgramTypeBase):
    pass

class ProgramTypeCreate(ProgramTypeBase):
    pass

class ProgramTypeUpdate(ProgramTypeBase):
    pass

class ProgramTypeOut(ProgramTypeBase):
    id: int

    class Config:
        orm_mode = True

# -------------------------------
# Program Count Schemas
# -------------------------------

class ProgramCountBase(BaseModel):
    department_id: int
    academic_year_id: int
    program_type: str
    sub_program_type: Optional[str] = None
    activity_category: str
    budget_mode: str
    count: int
    total_budget: float
    remarks: Optional[str] = ""

class ProgramCountCreate(ProgramCountBase):
    pass

class ProgramCountBatch(BaseModel):
    entries: List[ProgramCountCreate]

class ProgramCountOut(ProgramCountBase):
    id: int
    principal_remarks: Optional[str] = None

    class Config:
        orm_mode = True

# -------------------------------
# Principal Remarks Schemas
# -------------------------------

class PrincipalRemarkBase(BaseModel):
    department_id: int
    academic_year_id: int

class PrincipalRemarkCreate(PrincipalRemarkBase):
    remarks: str

class PrincipalRemarkOut(PrincipalRemarkBase):
    id: int
    remarks: str

    class Config:
        orm_mode = True

class PrincipalRemarksInput(BaseModel):
    department_id: int
    academic_year_id: int
    principal_remarks: str

# -------------------------------
# Hod Remarks Schemas  
# -------------------------------
class HodRemarksBase(BaseModel):
    department_id: int
    academic_year_id: int
    remarks: str

class HodRemarksCreate(HodRemarksBase):
    pass

class HodRemarksOut(HodRemarksBase):
    id: int

    class Config:
        orm_mode = True

# -------------------------------
class AcademicYearOut(BaseModel):
    id: int
    year: str
    is_enabled: bool
    deadline: datetime | None

    class Config:
        from_attributes = True  # Required for Pydantic v2