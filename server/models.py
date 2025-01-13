from database import db


# Static Database Models
class SheikhPlaylist(db.Model):
    """
    Static model for storing playlist information for different sheikhs (reciters).
    This uses the 'static' database bind.
    """
    __bind_key__ = 'static'
    __tablename__ = 'sheikh_playlist'

    id = db.Column(db.Integer, primary_key=True)  # Auto-incrementing primary key
    reciter = db.Column(db.String(255), nullable=False)  # Name of the Sheikh/Reciter
    link = db.Column(db.String(255), nullable=False)  # YouTube playlist link


# Dynamic Database Models
class DailySchedule(db.Model):
    """
    Dynamic model for storing the daily schedule of Quran recitations.
    This uses the 'dynamic' database bind.
    """
    __bind_key__ = 'dynamic'
    __tablename__ = 'daily_schedule'

    id = db.Column(db.Integer, primary_key=True)  # Auto-incrementing primary key
    time = db.Column(db.String(50), nullable=False)  # Recitation time (e.g., "06:00")
    reciter = db.Column(db.String(255), nullable=False)  # Name of the Sheikh/Reciter
    surah = db.Column(db.String(255), nullable=False)  # Name(s) of the Surah(s) recited
    duration = db.Column(db.String(50), nullable=True)  # Duration of the recitation (e.g., "28 ق")
    schedule_date = db.Column(db.Date, nullable=False)  # Date of the schedule


class DailyTableMetadata(db.Model):
    """
    Metadata model for managing daily schedule information.
    This uses the 'dynamic' database bind.
    """
    __bind_key__ = 'dynamic'
    __tablename__ = 'daily_table_metadata'

    id = db.Column(db.Integer, primary_key=True)  # Auto-incrementing primary key
    schedule_date = db.Column(db.Date, unique=True, nullable=False)  # Unique date for the schedule
