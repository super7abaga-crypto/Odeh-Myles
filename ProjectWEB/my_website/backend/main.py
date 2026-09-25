from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from argon2 import PasswordHasher

password_hasher = PasswordHasher()

from database import engine, Base, SessionLocal
import models

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


Base.metadata.create_all(bind=engine)


class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str

class UserUpdate(BaseModel):
    name: str
    email: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime | None
    role: str

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True

@app.get("/")
def home():
    return {"message": "My website is running!"}


@app.get("/about")
def about():
    return {
        "name": "My Website",
        "description": "My first real web application",
        "version": "1.0"
    }


@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db=Depends(get_db)):
    db_user = models.User(
        name=user.name,
        email=user.email,
        role=user.role,
        password_hash=password_hasher.hash(user.password)
    )

    db.add(db_user)

    try:
        db.commit()
        db.refresh(db_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    return db_user

@app.post("/login")
def login(user: LoginRequest, db=Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    try:
        password_hasher.verify(
            db_user.password_hash,
            user.password
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "user_id": db_user.id,
        "name": db_user.name,
        "email": db_user.email,
        "role": db_user.role
    }

@app.get("/users", response_model=list[UserResponse])
def get_users(db=Depends(get_db)):
    users = db.query(models.User).all()

    return users

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db=Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully"
    }

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user: UserUpdate,
    db=Depends(get_db)
):
    db_user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    db_user.name = user.name
    db_user.email = user.email
    db_user.role = user.role

    try:
        db.commit()
        db.refresh(db_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    return db_user