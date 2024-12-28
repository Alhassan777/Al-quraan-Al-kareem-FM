# app.py

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import db
from routes.schedule import schedule_bp
import logging

def create_app():
    """
    Create and configure the Flask application.
    """
    app = Flask(__name__)
    
    # Enable CORS if React frontend is on a different domain/port
    CORS(app)  

    # Load configuration from Config class
    app.config.from_object(Config)

    # Initialize database
    db.init_app(app)

    # Create tables if not exist
    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(schedule_bp, url_prefix="/api/schedule")

    # Global error handler for uncaught exceptions
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "An internal server error occurred"}), 500

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    return app

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Create Flask app
    app = create_app()
    
    # Log a startup message
    logging.info("Starting Flask server...")
    
    # Run the app
    app.run(
        debug=True,  # Enable debug mode during development
        host="127.0.0.1",  # Change to "0.0.0.0" for public hosting
        port=5000  # Ensure the port matches your frontend config
    )
