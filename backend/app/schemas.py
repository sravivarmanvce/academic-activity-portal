# app/schemas.py

from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

# -------------------------------
# User Schemas
# -------------------------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    department_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):
    pass

class UserOut(UserBase):
    id: int

    class Config:
        orm_mode = True

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

class AcademicYearCreate(BaseModel):
    year: str
    is_enabled: bool

class AcademicYearOut(BaseModel):
    id: int
    year: str
    is_enabled: bool

    class Config:
        orm_mode = True

# -------------------------------
# Module Deadline Schemas
# -------------------------------
class ModuleDeadlineBase(BaseModel):
    academic_year_id: int
    module: str
    deadline: Optional[datetime]

class ModuleDeadlineCreate(ModuleDeadlineBase):
    pass

class ModuleDeadlineOut(ModuleDeadlineBase):
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

    class Config:
        from_attributes = True  # Required for Pydantic v2
        
# -------------------------------
# Module Deadline Schemas   
# -------------------------------
class ModuleDeadlineIn(BaseModel):
    academic_year_id: int
    module: str
    deadline: datetime

class ModuleDeadlineOut(BaseModel):
    id: int
    academic_year_id: int
    module: str
    deadline: datetime

    class Config:
        orm_mode = True

# -------------------------------
# Workflow Status Schemas   
# -------------------------------
class WorkflowStatusUpdate(BaseModel):
    department_id: int
    academic_year_id: int
    status: str  # 'draft', 'submitted', 'approved', 'events_planned', 'completed'

class WorkflowStatusResponse(BaseModel):
    id: int
    department_id: int
    academic_year_id: int
    status: str
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True

# -------------------------------
# Deadline Override Schemas   
# -------------------------------
class DeadlineOverrideCreate(BaseModel):
    department_id: int
    academic_year_id: int
    module_name: str
    enabled_by_principal: bool = True
    reason: Optional[str] = None
    duration_hours: int = 24  # Default 24 hours

class DeadlineOverrideResponse(BaseModel):
    id: int
    department_id: int
    academic_year_id: int
    module_name: str
    enabled_by_principal: bool
    reason: Optional[str]
    expires_at: Optional[datetime]
    duration_hours: int
    created_at: datetime

    class Config:
        orm_mode = True