from flask import Blueprint, jsonify
from database import static_db  # Reference to the static database initialized in the app
from models import StaticSchedule  # Reference to the database model

# Define the blueprint
playlist_bp = Blueprint("playlists", __name__)

@playlist_bp.route("/", methods=["GET"])
def get_playlists():
    """
    API endpoint to fetch playlists from the static database.
    """
    try:
        # Query the database using Flask-SQLAlchemy
        schedules = StaticSchedule.query.all()

        # Convert each row into a dictionary
        playlists = [
            {
                "id": s.id,
                "reciter": s.reciter,
                "link": s.link
            }
            for s in schedules
        ]

        return jsonify(playlists), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
