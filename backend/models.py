from database import db


# Static Database Models
class SheikhPlaylist(db.Model):  # Static model for the static database
    __bind_key__ = 'static'
    __tablename__ = 'sheikh_playlist'
    id = db.Column(db.Integer, primary_key=True)  # Auto-incrementing primary key
    reciter = db.Column(db.String(255), nullable=False)  # Sheikh name
    link = db.Column(db.String(255), nullable=False)  # YouTube playlist link


# Dynamic Database Models
class DailySchedule(db.Model):  # Dynamic model for the dynamic database
    __bind_key__ = 'dynamic'
    __tablename__ = 'daily_schedule'
    id = db.Column(db.Integer, primary_key=True)  # Auto-incrementing primary key
    time = db.Column(db.String(50), nullable=False)  # وقت الإذاعة
    reciter = db.Column(db.String(255), nullable=False)  # اسم الشيخ
    surah = db.Column(db.String(255), nullable=False)  # اسم السورة
    schedule_date = db.Column(db.Date, nullable=False)  # تاريخ الجدول


class DailyTableMetadata(db.Model):  # Metadata for dynamic schedules
    __bind_key__ = 'dynamic'
    __tablename__ = 'daily_table_metadata'
    id = db.Column(db.Integer, primary_key=True)  # Auto-incrementing primary key
    schedule_date = db.Column(db.Date, unique=True, nullable=False)  # Unique date for the schedule
