import os
import logging
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_migrate import Migrate

# Import Blueprints
from routes.schedule import schedule_bp
from routes.playlists import playlist_bp
from routes.timezone import timezone_bp

# Import Database
from database import db

########################################################
# 1. Load Environment Variables
########################################################
load_dotenv()

API_ID = os.getenv("API_ID")
API_HASH = os.getenv("API_HASH")
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME")
SERVER_URL = os.getenv("SERVER_URL")
CLIENT_TESTING_URL=os.getenv("CLIENT_TESTING_URL")
CLIENT_BASE_URL=os.getenv("CLIENT_BASE_URL")
TESTING=os.getenv("TESTING")

URL = CLIENT_TESTING_URL if TESTING== 'TRUE' else CLIENT_BASE_URL

# Validate Environment Variables
missing_vars = [
    var for var in ["API_ID", "API_HASH", "CHANNEL_USERNAME", "SERVER_URL"]
    if not os.getenv(var)
]
if missing_vars:
    raise ValueError(f"Missing environment variables: {', '.join(missing_vars)}")

########################################################
# 2. Configure Logging
########################################################
logging.basicConfig(
    level=logging.INFO,  # Set to DEBUG for more verbose output
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

########################################################
# 3. Database Path Setup
########################################################
def setup_database_paths():
    """Set up database paths and ensure directories exist."""
    base_dir = os.path.abspath(os.path.dirname(__file__))
    dynamic_db_dir = os.path.join(base_dir, "db")
    static_db_dir = os.path.join(base_dir, "convert_excel_to_db")

    dynamic_db_path = os.path.join(dynamic_db_dir, "dynamic_schedule.db")
    static_db_path = os.path.join(static_db_dir, "sheikh_playlist.db")

    # Ensure directories exist
    for db_dir in [dynamic_db_dir, static_db_dir]:
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
            logger.info(f"Created directory for database: {db_dir}")

    return dynamic_db_path, static_db_path

########################################################
# 4. Flask App Setup
########################################################
def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Enable CORS for all routes with credentials
    CORS(
        app,
        resources={r"/*": {"origins": URL}},  # Adjust for your frontend's origin
        supports_credentials=True,
    )

    # Set up database paths
    dynamic_db_path, static_db_path = setup_database_paths()

    # Configure SQLAlchemy with multiple binds
    app.config["SQLALCHEMY_BINDS"] = {
        "dynamic": f"sqlite:///{dynamic_db_path}",
        "static": f"sqlite:///{static_db_path}",
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)  # Optional: Use Flask-Migrate for database migrations

    # Initialize SocketIO
    socketio = SocketIO(app, cors_allowed_origins=URL)  
    # For production, you may adjust to your domain or set to "*"
    app.config["SOCKETIO"] = socketio  # Store SocketIO instance in app config

    # Register Blueprints
    app.register_blueprint(schedule_bp, url_prefix="/api/schedule")
    app.register_blueprint(playlist_bp, url_prefix="/api/playlists")
    app.register_blueprint(timezone_bp, url_prefix="/api")

    # Register Root Route
    @app.route("/")
    def index():
        return jsonify({"message": "Welcome to the Quran FM API!"}), 200

    return app

########################################################
# 5. Database Initialization
########################################################
def initialize_databases(app):
    """Initialize all database tables."""
    with app.app_context():
        try:
            # Create tables for each bind
            db.create_all(bind_key="dynamic")
            db.create_all(bind_key="static")
            logger.info("Successfully initialized all database tables")
        except Exception as e:
            logger.error(f"Failed to initialize databases: {str(e)}")
            raise

########################################################
# 6. Main Function
########################################################
def main():
    """Main application entry point."""
    try:
        # Initialize databases
        initialize_databases(app)

        # Retrieve SocketIO instance from app config
        socketio = app.config.get("SOCKETIO")
        if not socketio:
            logger.error("SocketIO instance not found in app config.")
            raise Exception("SocketIO not initialized.")

        # Start the Flask server with SocketIO support
        logger.info("Starting Flask server with SocketIO...")

        port = int(os.getenv("PORT", 5000))  # Use the PORT environment variable
        socketio.run(
            app,
            debug=False,            # Set to False in production
            port=port,
            allow_unsafe_werkzeug=False,  # Remove or set to False in production
            use_reloader=False    # Disable reloader if using SocketIO
        )
    except Exception as e:
        logger.error(f"Application failed to start: {str(e)}")
        raise

########################################################
# 7. Entry Point
########################################################
app = create_app()  # Create the app globally for WSGI servers

if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down gracefully...")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise
