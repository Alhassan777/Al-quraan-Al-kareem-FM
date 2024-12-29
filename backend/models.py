from database import static_db, dynamic_db

class StaticSchedule(static_db.Model):
    __tablename__ = 'sheikh_playlist'
    id = static_db.Column(static_db.Integer, primary_key=True)  # Auto-incrementing primary key
    reciter = static_db.Column(static_db.String(255), nullable=False)
    link = static_db.Column(static_db.String(255), nullable=False)


"""
class DynamicSchedule(dynamic_db.Model):
    __tablename__ = 'dynamic_schedule'
    id = dynamic_db.Column(dynamic_db.Integer, primary_key=True)
    program_name = dynamic_db.Column(dynamic_db.String(255), nullable=False)
    start_time = dynamic_db.Column(dynamic_db.String(50), nullable=False)
    reciter = dynamic_db.Column(dynamic_db.String(255), nullable=False)
    surah = dynamic_db.Column(dynamic_db.String(255), nullable=True)
"""
