import os
import logging
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Flask app configuration
app = Flask(__name__)
CORS(app)

# Database path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "convert_excel_to_db", "sheikh_playlist.db")
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{DB_PATH}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database
db = SQLAlchemy(app)


# Database Model
class SheikhPlaylist(db.Model):
    __tablename__ = 'sheikh_playlist'

    id = db.Column(db.Integer, primary_key=True)
    reciter = db.Column(db.String(255), nullable=False)
    link = db.Column(db.String(255), nullable=False)


@app.route('/api/playlists/', methods=['GET'])
def get_playlists():
    """
    Endpoint to fetch playlists from the database, optionally filtering by reciter name.
    """
    try:
        # Get the search query from the request args
        query = request.args.get('q', '').strip()
        
        if query:
            # Filter playlists by reciter name (case-insensitive search)
            playlists = SheikhPlaylist.query.filter(
                SheikhPlaylist.reciter.ilike(f"%{query}%")
            ).all()
        else:
            # Fetch all playlists if no query is provided
            playlists = SheikhPlaylist.query.all()

        # Transform data into JSON serializable format
        result = [
            {"id": playlist.id, "reciter": playlist.reciter, "link": playlist.link}
            for playlist in playlists
        ]
        logging.info(f"Successfully fetched {len(result)} playlists.")
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error while fetching playlists: {e}")
        return jsonify({"error": "Failed to fetch playlists"}), 500


@app.route('/')
def index():
    """
    Root endpoint for testing API availability.
    """
    return jsonify({"message": "Welcome to the Sheikh Playlist API!"}), 200


if __name__ == "__main__":
    # Log database path for debugging
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Database path: {DB_PATH}")

    # Start the Flask server
    app.run(debug=True, host="127.0.0.1", port=5000)
