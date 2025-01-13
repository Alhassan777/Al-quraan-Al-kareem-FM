# app.py

import os
import logging
import asyncio
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_migrate import Migrate
from threading import Thread

# Import Blueprints
from routes.schedule import schedule_bp
from routes.playlists import playlist_bp
from routes.timezone import timezone_bp

# Import Database
from database import db

# Import Telegram Pipeline
from telegram_pipeline.script import start_telegram_client

########################################################
# 1. Load Environment Variables
########################################################
load_dotenv()
print(f"BACKEND_URL from environment: {os.environ.get('BACKEND_URL')}")

# Retrieve environment variables
API_ID = os.getenv("API_ID")
API_HASH = os.getenv("API_HASH")
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", 30))

FRONTEND_DEV_URL = os.getenv("FRONTEND_DEV_URL")
FRONTEND_PROD_URL = os.getenv("FRONTEND_PROD_URL")
BACKEND_DEV_URL = os.getenv("BACKEND_DEV_URL")
BACKEND_PROD_URL = os.getenv("BACKEND_PROD_URL")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Determine URLs based on environment
if ENVIRONMENT == "production":
    FRONTEND_URL = FRONTEND_PROD_URL
    BACKEND_URL = BACKEND_PROD_URL
else:
    FRONTEND_URL = FRONTEND_DEV_URL
    BACKEND_URL = BACKEND_DEV_URL

# Ensure BACKEND_URL is set
if not BACKEND_URL:
    BACKEND_URL = "http://localhost:5000"  # Default value or raise an error

########################################################
# 2. Configure Logging
########################################################
logging.basicConfig(
    level=logging.INFO,
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
            os.makedirs(db_dir, exist_ok=True)
            logger.info(f"Created directory for database: {db_dir}")

    return dynamic_db_path, static_db_path

########################################################
# 4. Flask App Setup
########################################################
def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Enable CORS for all routes
    CORS(app, resources={r"/*": {"origins": FRONTEND_URL}}, supports_credentials=True)
    logger.info(f"CORS allowed origin set to: {FRONTEND_URL}")

    # Database paths
    dynamic_db_path, static_db_path = setup_database_paths()

    # Configure SQLAlchemy binds
    app.config["SQLALCHEMY_BINDS"] = {
        "dynamic": f"sqlite:///{dynamic_db_path}",
        "static": f"sqlite:///{static_db_path}",
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)

    # Initialize SocketIO with 'eventlet' async mode for better compatibility
    socketio = SocketIO(app, cors_allowed_origins=FRONTEND_URL, async_mode='eventlet')
    app.config["SOCKETIO"] = socketio

    # Register Blueprints
    app.register_blueprint(schedule_bp, url_prefix="/api/schedule")
    app.register_blueprint(playlist_bp, url_prefix="/api/playlists")
    app.register_blueprint(timezone_bp, url_prefix="/api")

    # Root route
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
            db.create_all(bind_key="dynamic")
            db.create_all(bind_key="static")
            logger.info("Successfully initialized all database tables")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise

########################################################
# 6. Telegram Listener Thread
########################################################
def run_telegram_listener(socketio, app):
    """Run the Telegram listener in a separate thread."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        # Schedule the coroutine
        loop.create_task(start_telegram_client(socketio, app, BACKEND_URL))
        loop.run_forever()
    except Exception as e:
        logger.error(f"Telegram listener encountered an error: {e}")

########################################################
# 7. Initialize and Configure the App Globally
########################################################
# Create the Flask app instance globally for Gunicorn
app = create_app()

# Initialize databases
initialize_databases(app)

# Get SocketIO instance
socketio = app.config.get("SOCKETIO")
if not socketio:
    logger.error("SocketIO instance is not available.")
    raise RuntimeError("SocketIO instance is not available.")

# Start Telegram listener thread
telegram_thread = Thread(target=run_telegram_listener, args=(socketio, app), daemon=True)
telegram_thread.start()
logger.info("Telegram listener thread started.")

########################################################
# 8. Entry Point for Development
########################################################
if __name__ == "__main__":
    try:
        # Start Flask-SocketIO server
        socketio.run(
            app,
            host="0.0.0.0",
            port=int(os.environ.get("PORT", 5000)),
            debug=(ENVIRONMENT != "production"),  # Debug mode only in non-production
            allow_unsafe_werkzeug=False,
            use_reloader=False,
        )
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down gracefully...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
