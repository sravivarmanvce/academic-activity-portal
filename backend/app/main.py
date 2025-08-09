# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import users
from app.api.endpoints import departments, academic_years, program_counts, program_types
from app.api.endpoints import deadlines
from app.api.endpoints import principal_remarks
from app.api.endpoints import hod_remarks
from app.api.endpoints import auth
from app.api.endpoints import reminder
from app.api.endpoints import workflow_status
from app.api.endpoints import deadline_override
from app.api.endpoints import events
from app.api.endpoints import notifications
from app.api.endpoints import notifications_inbox
from app.api.endpoints import analytics
from app.api.endpoints import documents

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://localhost:3001",  # In case you change ports
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(academic_years.router)
app.include_router(deadlines.router)
app.include_router(program_counts.router)
app.include_router(program_types.router)
app.include_router(principal_remarks.router)
app.include_router(hod_remarks.router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(reminder.router, tags=["reminder"])
app.include_router(workflow_status.router, tags=["workflow"])
app.include_router(deadline_override.router, tags=["deadline_override"])
app.include_router(events.router, tags=["events"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(notifications_inbox.router, prefix="/notifications", tags=["notifications"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])

