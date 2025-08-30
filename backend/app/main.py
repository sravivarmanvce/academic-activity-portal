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
from app.api.endpoints import scorecard
from app.api.endpoints import scorecard_admin

# Initialize FastAPI app with larger file upload limit
app = FastAPI(
    title="Academic Activity Portal API",
    description="API for managing academic activities, score cards, and documents",
    version="1.0.0"
)

# Set maximum request body size to 150MB (to handle 100MB files with overhead)
app.add_middleware(
    lambda app: app,  # Placeholder for custom middleware if needed in future
)

# Add CORS middleware with specific origins to support credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(academic_years.router, prefix="/api", tags=["Academic Years"])
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
app.include_router(scorecard.router, prefix="/api", tags=["scorecard"])
app.include_router(scorecard_admin.router, prefix="/api", tags=["scorecard_admin"])

@app.get("/")
async def root():
    return {"message": "Academic Activity Portal API is running"}

@app.options("/api/scorecard/submissions")
async def options_submissions():
    return {"message": "OK"}

@app.options("/api/scorecard/responses")
async def options_responses():
    return {"message": "OK"}

@app.options("/api/scorecard/upload")
async def options_upload():
    return {"message": "OK"}

@app.post("/test-submission")
async def test_submission():
    """Test endpoint to check if basic POST works"""
    return {"message": "POST request successful", "status": "ok"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

