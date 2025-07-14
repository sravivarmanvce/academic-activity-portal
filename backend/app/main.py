from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import departments, academic_years, program_counts

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # set your frontend origin in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(departments.router)
app.include_router(academic_years.router)
app.include_router(program_counts.router)
