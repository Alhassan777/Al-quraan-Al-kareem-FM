# config.py

import os
from dotenv import load_dotenv

load_dotenv()  # Loads environment variables from .env if present

class Config:
    # Use an environment variable or default to a local SQLite DB
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI", "sqlite:///quran_schedule.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")
