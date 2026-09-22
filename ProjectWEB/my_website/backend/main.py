from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

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

class UserUpdate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

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
        email=user.email
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