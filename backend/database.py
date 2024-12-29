from flask_sqlalchemy import SQLAlchemy

# Create separate database objects
static_db = SQLAlchemy()
dynamic_db = SQLAlchemy()
