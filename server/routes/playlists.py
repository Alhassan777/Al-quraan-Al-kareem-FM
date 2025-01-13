from flask import Blueprint, jsonify, request
from database import db  # Single database instance
from models import SheikhPlaylist  # Use the correct model for the static database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the blueprint
playlist_bp = Blueprint("playlists", __name__)

@playlist_bp.route("/", methods=["GET"])
def get_playlists():
    """
    API endpoint to fetch playlists from the static database.
    Supports filtering by reciter name using a query parameter.
    """
    try:
        # Retrieve optional search query from the request
        query = request.args.get("q", "").strip()

        if query:
            # Filter by reciter name (case-insensitive)
            playlists = SheikhPlaylist.query.filter(
                SheikhPlaylist.reciter.ilike(f"%{query}%")
            ).all()
        else:
            # Fetch all playlists if no query is provided
            playlists = SheikhPlaylist.query.all()

        # Convert each row into a dictionary
        result = [
            {
                "id": playlist.id,
                "reciter": playlist.reciter,
                "link": playlist.link
            }
            for playlist in playlists
        ]

        logger.info(f"Fetched {len(result)} playlists from the database.")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching playlists: {e}")
        return jsonify({"error": "Failed to fetch playlists"}), 500
