# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import departments, academic_years, program_counts, program_types
from app.api.endpoints import deadlines
from app.api.endpoints import principal_remarks
from app.api.endpoints import hod_remarks

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(departments.router)
app.include_router(academic_years.router)
app.include_router(deadlines.router)
app.include_router(program_counts.router)
app.include_router(program_types.router)
app.include_router(principal_remarks.router)
app.include_router(hod_remarks.router)
