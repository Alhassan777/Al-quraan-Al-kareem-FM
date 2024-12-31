# telegram_pipeline.py

from telethon import TelegramClient, events
from dotenv import load_dotenv
import os
import requests
import logging

# Load environment variables from .env file
load_dotenv()

# Access credentials and configuration from environment variables
API_ID = os.getenv("API_ID")
API_HASH = os.getenv("API_HASH")
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME")
SERVER_URL = os.getenv("SERVER_URL")

# Validate environment variables
if not all([API_ID, API_HASH, CHANNEL_USERNAME, SERVER_URL]):
    raise ValueError("One or more environment variables are missing. Check your .env file.")

# Create the Telethon client
client = TelegramClient('session_name', API_ID, API_HASH)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@client.on(events.NewMessage(chats=CHANNEL_USERNAME))
async def new_message_handler(event):
    raw_text = event.raw_text

    # Log the raw text received
    logger.info(f"Raw message received: {raw_text}")

    # Only process messages that contain the schedule marker
    if "برنامج إذاعة القرآن" in raw_text:
        logger.info("New schedule detected!")

        try:
            # Send the raw text to your processing server
            response = requests.post(
                f"{SERVER_URL}/api/schedule/store",
                json={"raw_text": raw_text},
            )

            # Log the server response
            logger.info(f"Server response: {response.status_code}, {response.text}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send schedule to the server: {e}")

if __name__ == "__main__":
    try:
        logger.info("Starting Telethon client and listening for new messages...")
        client.start()                # Log in or load existing session
        client.run_until_disconnected()
    except Exception as e:
        logger.error(f"An error occurred while running the Telegram client: {e}")
