from telethon import TelegramClient, events
from dotenv import load_dotenv
import os
import requests

# Load environment variables from .env file
load_dotenv()

# Access credentials and configuration from environment variables
API_ID = os.getenv("API_ID")
API_HASH = os.getenv("API_HASH")
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME")
SERVER_URL = os.getenv("SERVER_URL")

# Create the Telethon client
client = TelegramClient('session_name', API_ID, API_HASH)

# Event listener for new messages in the channel
@client.on(events.NewMessage(chats=CHANNEL_USERNAME))
async def new_message_handler(event):
    raw_text = event.raw_text

    # Only process messages that contain the schedule marker
    if "برنامج إذاعة القرآن" in raw_text:
        print("New schedule detected!")

        # Send the raw text to your processing server
        response = requests.post(
            SERVER_URL,
            json={"raw_text": raw_text}
        )

        if response.status_code == 200:
            print("Schedule successfully sent to the server!")
        else:
            print("Error:", response.status_code, response.text)

# Start the client and listen for messages
print("Listening for new messages...")
client.start()
client.run_until_disconnected()
