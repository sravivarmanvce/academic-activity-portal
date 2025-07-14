from .database import engine, Base
from .models import AcademicYear, Department

# Create tables
Base.metadata.create_all(bind=engine)
