# backend/app/api/endpoints/users.py

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app import models
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserOut
from app.database import get_db
import csv
from io import StringIO

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in user.dict().items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted"}

@router.post("/bulk")
def create_users_bulk(data: dict, db: Session = Depends(get_db)):
    users_data = data.get("users", [])
    created_users = []

    for u in users_data:
        user = User(
            name=u["name"],
            email=u["email"],
            role=u["role"],
            department_id=u.get("department_id")
        )
        db.add(user)
        created_users.append(user)

    db.commit()
    return {"message": f"{len(created_users)} users added."}


@router.post("/upload-csv")
async def upload_users_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    contents = await file.read()
    decoded = contents.decode("utf-8")
    csv_reader = csv.DictReader(StringIO(decoded))

    created_users = []
    for row in csv_reader:
        email = row.get("email")
        if not email:
            continue  # skip if email is missing

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            continue  # skip existing user

        user = User(
            name=row.get("name"),
            email=email,
            role=row.get("role"),
            department_id=int(row["department_id"]) if row.get("department_id") else None
        )
        db.add(user)
        created_users.append(user)

    db.commit()
    return {"message": f"{len(created_users)} users uploaded successfully."}

