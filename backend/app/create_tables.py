# app/create_tables.py

from app.database import engine, Base
from app.models import PrincipalRemark  # Import your new model

# Create the table
Base.metadata.create_all(bind=engine)

print("✅ PrincipalRemark table created successfully.")
