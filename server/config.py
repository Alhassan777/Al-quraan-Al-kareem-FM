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