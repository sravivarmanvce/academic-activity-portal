# app/seed_program_types.py

from app.database import SessionLocal
from app.models import ProgramType

# Transformed data with correct field names for SQLAlchemy
program_types_data = [
    {
        "program_type": "Workshops (2 Sessions - Full Day)",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Workshops (3 Sessions - One and Half Day)",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 7500.0
    },
    {
        "program_type": "Workshops (4 Sessions - Two Days)",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 10000.0
    },
    {
        "program_type": "Seminars",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 3000.0
    },
    {
        "program_type": "Guest Lectures",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Hackathons",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "CSE, INF, CSM, CSD",
        "budget_mode": "Fixed",
        "budget_per_event": 20000.0
    },
    {
        "program_type": "Coding Competitions /Technical Competitions",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 10000.0
    },
    {
        "program_type": "Project Showcases",
        "sub_program_type": None,
        "activity_category": "A. Academic and Skill Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 20000.0
    },
    {
        "program_type": "Technical Clubs",
        "sub_program_type": None,
        "activity_category": "B. Extracurricular and Co-curricular Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 10000.0
    },
    {
        "program_type": "Student Chapters of Professional Societies",
        "sub_program_type": None,
        "activity_category": "B. Extracurricular and Co-curricular Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Competitions and Challenges",
        "sub_program_type": None,
        "activity_category": "B. Extracurricular and Co-curricular Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Internships and Industry Projects",
        "sub_program_type": None,
        "activity_category": "B. Extracurricular and Co-curricular Activities",
        "departments": "ALL",
        "budget_mode": "Variable",
        "budget_per_event": None
    },
    {
        "program_type": "Soft Skills Workshops",
        "sub_program_type": None,
        "activity_category": "C. Professional Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Resume Building and Interview Preparation",
        "sub_program_type": None,
        "activity_category": "C. Professional Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Career Counselling and Mentorship Programs",
        "sub_program_type": None,
        "activity_category": "C. Professional Development Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Tech Fests and Exhibitions",
        "sub_program_type": None,
        "activity_category": "D. Community and Social Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 20000.0
    },
    {
        "program_type": "Community Outreach Programs",
        "sub_program_type": None,
        "activity_category": "D. Community and Social Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 15000.0
    },
    {
        "program_type": "Collaborative Projects/Exhibitions",
        "sub_program_type": None,
        "activity_category": "D. Community and Social Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 10000.0
    },
    {
        "program_type": "Field Trips and Industry Visits",
        "sub_program_type": None,
        "activity_category": "E. Recreational and Team-Building Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "Sports and Cultural Events",
        "sub_program_type": None,
        "activity_category": "E. Recreational and Team-Building Activities",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    },
    {
        "program_type": "MOOCs and Online Courses",
        "sub_program_type": None,
        "activity_category": "F. Continuous Learning Initiatives",
        "departments": "ALL",
        "budget_mode": "Variable",
        "budget_per_event": None
    },
    {
        "program_type": "Reading Clubs",
        "sub_program_type": None,
        "activity_category": "F. Continuous Learning Initiatives",
        "departments": "ALL",
        "budget_mode": "Fixed",
        "budget_per_event": 5000.0
    }
]

db = SessionLocal()

try:
    for item in program_types_data:
        db.add(ProgramType(**item))
    db.commit()

except Exception as e:
    db.rollback()

finally:
    db.close()
