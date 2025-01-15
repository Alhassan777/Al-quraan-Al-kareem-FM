from telethon import TelegramClient
from dotenv import load_dotenv
import os
import base64

# Load environment variables
load_dotenv()

# Access API credentials from .env file
API_ID = int(os.getenv("API_ID"))
API_HASH = os.getenv("API_HASH")
SESSION_FILE_NAME = 'telegram_session.session'
OUTPUT_FILE_NAME = 'telegram_session_base64.txt'

def save_session_as_base64(file_name, output_file):
    """
    Save the session file as a Base64-encoded string to a .txt file.
    """
    with open(file_name, "rb") as session_file:
        session_data = session_file.read()
    session_b64 = base64.b64encode(session_data).decode("utf-8")
    
    # Save the Base64 string into a .txt file
    with open(output_file, "w") as output:
        output.write(session_b64)
    
    print(f"Base64-encoded session saved to {output_file}")
    return session_b64

async def main():
    """
    Generate a new Telegram session by logging in and save it as Base64.
    """
    # Create a new Telegram client
    client = TelegramClient(SESSION_FILE_NAME, API_ID, API_HASH)
    
    try:
        # Connect to Telegram servers
        await client.start()
        print("Logged in successfully!")
        
        # Save the session as Base64 and write to a .txt file
        save_session_as_base64(SESSION_FILE_NAME, OUTPUT_FILE_NAME)
        
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Disconnect the client
        await client.disconnect()

# Run the script
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
