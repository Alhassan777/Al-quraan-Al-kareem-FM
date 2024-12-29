import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

class Config:
    """
    Base configuration class for shared settings.
    """
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Disable SQLAlchemy event notifications
    SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")  # Default secret key
    DEBUG = os.getenv("DEBUG", "True").lower() in ["true", "1"]  # Enable/Disable debug mode

class StaticConfig(Config):
    """
    Configuration for the static schedule database.
    """
    # Build an absolute path to 'convert_excel_to_db/sheikh_playlist.db'
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DB_PATH = os.path.join(BASE_DIR, "convert_excel_to_db", "sheikh_playlist.db")
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{DB_PATH}"  # Absolute path

class DynamicConfig(Config):
    """
    Configuration for the dynamic schedule database.
    """
    # If you ever need a second DB:
    # BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    # DYNAMIC_PATH = os.path.join(BASE_DIR, "dynamic_schedule.db")
    # SQLALCHEMY_DATABASE_URI = f"sqlite:///{DYNAMIC_PATH}"
    pass
