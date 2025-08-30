# app/schemas.py

from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime, date

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
        from_attributes = True

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
        from_attributes = True

# -------------------------------
# Academic Year Schemas
# -------------------------------

class AcademicYearCreate(BaseModel):
    year: str
    is_enabled: bool

class AcademicYearOut(BaseModel):
    id: int
    year: str
    is_enabled: bool

    class Config:
        from_attributes = True

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
        from_attributes = True


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
        from_attributes = True

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
        from_attributes = True

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
        from_attributes = True

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
        from_attributes = True

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
        from_attributes = True

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
        from_attributes = True

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
        from_attributes = True

# -------------------------------
# Event Schemas   
# -------------------------------
from datetime import date, time

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: date
    budget_amount: float
    coordinator_name: Optional[str] = None
    coordinator_contact: Optional[str] = None
    department_id: int
    academic_year_id: int
    program_type_id: int

class EventCreate(EventBase):
    pass

class EventUpdate(EventBase):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    budget_amount: Optional[float] = None
    coordinator_name: Optional[str] = None
    coordinator_contact: Optional[str] = None

class EventResponse(EventBase):
    id: int
    event_status: str
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]

    class Config:
        from_attributes = True

# -------------------------------
# Notification Schemas
# -------------------------------
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationOut(NotificationBase):
    id: int
    user_id: int
    read: bool  # Match your table column name
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    read: bool

# -------------------------------
# Score Card Schemas
# -------------------------------

class ScoreCardTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    academic_year_id: int
    is_active: bool = True

class ScoreCardTemplateCreate(ScoreCardTemplateBase):
    pass

class ScoreCardTemplateOut(ScoreCardTemplateBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ScoreCardQuestionBase(BaseModel):
    question_number: str  # Changed from int to str to support "1.1", "2.1" format
    question_text: str
    question_type: str = 'objective'
    max_score: int = 5
    requires_document: bool = False
    is_mandatory: bool = True
    document_description: Optional[str] = None
    document_formats: Optional[str] = None

class ScoreCardQuestionCreate(ScoreCardQuestionBase):
    template_id: int

class ScoreCardQuestionUpdate(ScoreCardQuestionBase):
    pass

class ScoreCardQuestionOut(ScoreCardQuestionBase):
    id: int
    template_id: int

    class Config:
        from_attributes = True

class ScoreCardDocumentBase(BaseModel):
    document_type: str = 'upload'
    file_name: Optional[str] = None
    onedrive_link: Optional[str] = None
    physical_location: Optional[str] = None
    physical_status: str = 'pending'

class ScoreCardDocumentCreate(ScoreCardDocumentBase):
    pass

class ScoreCardDocumentOut(ScoreCardDocumentBase):
    id: int
    response_id: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    physical_received_date: Optional[date] = None
    physical_received_by: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class ScoreCardResponseBase(BaseModel):
    response_text: Optional[str] = None
    score: float = 0.0
    reviewer_comments: Optional[str] = None

class ScoreCardResponseCreate(ScoreCardResponseBase):
    question_id: int
    documents: List[ScoreCardDocumentCreate] = []

class ScoreCardResponseOut(ScoreCardResponseBase):
    id: int
    submission_id: int
    question_id: int
    created_at: datetime
    updated_at: datetime
    documents: List[ScoreCardDocumentOut] = []

    class Config:
        from_attributes = True

class ScoreCardSubmissionBase(BaseModel):
    submission_status: str = 'draft'
    comments: Optional[str] = None

class ScoreCardSubmissionCreate(ScoreCardSubmissionBase):
    template_id: int
    department_id: int
    responses: List[ScoreCardResponseCreate] = []

class ScoreCardSubmissionUpdate(BaseModel):
    submission_status: Optional[str] = None
    comments: Optional[str] = None
    responses: Optional[List[ScoreCardResponseCreate]] = None

class ScoreCardSubmissionOut(ScoreCardSubmissionBase):
    id: int
    template_id: int
    department_id: int
    submitted_by: int
    submission_date: Optional[datetime] = None
    total_score: float = 0.0
    max_possible_score: float = 0.0
    percentage_score: float = 0.0
    reviewed_by: Optional[int] = None
    reviewed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    responses: List[ScoreCardResponseOut] = []

    class Config:
        from_attributes = True

# Template with Questions
class ScoreCardTemplateWithQuestions(ScoreCardTemplateOut):
    questions: List[ScoreCardQuestionOut] = []

    class Config:
        from_attributes = True

# Submission Summary for Dashboard
class ScoreCardSubmissionSummary(BaseModel):
    id: int
    template_name: str
    department_name: str
    submission_status: str
    submission_date: Optional[datetime] = None
    percentage_score: float = 0.0
    submitted_by_name: str
    reviewed_by_name: Optional[str] = None

class ScoreCardAuditLogOut(BaseModel):
    id: int
    submission_id: int
    user_id: int
    action: str
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True