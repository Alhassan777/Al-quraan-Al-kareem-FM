# telegram_pipeline/script.py

from telethon import TelegramClient, events
from dotenv import load_dotenv
import os
import httpx  # Use an async HTTP client
import logging
import base64  # For decoding Base64 session

# Load environment variables
load_dotenv()

# Access environment variables
API_ID = int(os.getenv("API_ID"))
API_HASH = os.getenv("API_HASH")
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME")
BACKEND_DEV_URL = os.getenv("BACKEND_DEV_URL")
BACKEND_PROD_URL = os.getenv("BACKEND_PROD_URL")
TELEGRAM_SESSION_B64 = os.getenv("TELEGRAM_SESSION_B64")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Determine the appropriate backend URL
BACKEND_URL = BACKEND_PROD_URL if ENVIRONMENT == "production" else BACKEND_DEV_URL

# Log the backend URL for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info(f"BACKEND_URL from environment: {BACKEND_URL}")

# Decode Base64 session and save it as a file
SESSION_FILE_NAME = 'telegram_session.session'
if TELEGRAM_SESSION_B64:
    try:
        with open(SESSION_FILE_NAME, "wb") as session_file:
            session_file.write(base64.b64decode(TELEGRAM_SESSION_B64))
        logger.info("Decoded and saved the Telegram session from Base64.")
    except Exception as e:
        logger.error(f"Failed to decode and save the Telegram session: {e}")
        raise
else:
    logger.warning("No Base64-encoded session provided. Ensure TELEGRAM_SESSION_B64 is set.")

async def start_telegram_client(socketio, app, server_url):
    """
    Starts the Telegram listener and processes incoming messages.

    Args:
        socketio (SocketIO): The SocketIO instance from the Flask app.
        app (Flask): The Flask application instance.
        server_url (str): The backend server URL to send POST requests.
    """
    # Initialize the Telegram client with the persistent session
    client = TelegramClient(SESSION_FILE_NAME, API_ID, API_HASH)

    try:
        # Connect to the Telegram servers
        await client.connect()
        logger.info("Telethon client connected.")

        # Ensure the session is valid
        if not await client.is_user_authorized():
            raise RuntimeError("Session is invalid. Please provide a valid session file.")

        @client.on(events.NewMessage(chats=CHANNEL_USERNAME))
        async def new_message_handler(event):
            raw_text = event.raw_text

            # Log the raw text received
            logger.info(f"Raw message received: {raw_text}")

            # Only process messages that contain the schedule marker
            if "برنامج إذاعة القرآن" in raw_text:
                logger.info("New schedule detected!")
                try:
                    # Use an asynchronous HTTP client to avoid blocking
                    async with httpx.AsyncClient() as http_client:
                        response = await http_client.post(
                            f"{server_url}/api/schedule/store",
                            json={"raw_text": raw_text},
                            timeout=10
                        )
                        response.raise_for_status()
                        logger.info(f"Processed schedule: {response.status_code}, {response.text}")

                        # Emit WebSocket event to notify clients
                        with app.app_context():
                            socketio.emit(
                                'new_schedule',
                                {"message": "New schedule processed and stored."},
                                namespace='/'
                            )
                except httpx.RequestError as e:
                    logger.error(f"Failed to send schedule to the server: {e}")

        logger.info("Telethon client started and listening for new messages...")
        await client.run_until_disconnected()
    except Exception as e:
        logger.error(f"An error occurred while running the Telegram client: {e}")
    finally:
        await client.disconnect()
