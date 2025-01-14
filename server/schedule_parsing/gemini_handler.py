import os
import json
import logging
import re
import time
import google.generativeai as genai
from dotenv import load_dotenv
from jsonschema import validate, ValidationError
from datetime import datetime
import dateparser

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Load API key from environment variables
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.error("GEMINI_API_KEY is not set in the environment variables.")
    raise EnvironmentError("GEMINI_API_KEY is required but not set.")

# Initialize the Gemini client
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# -----------------------------------------------------------------------------
# PROMPT_TEMPLATE
# -----------------------------------------------------------------------------
# Updated prompt that explicitly requires the date in DD/MM/YYYY (Gregorian only)
PROMPT_TEMPLATE = """
You are a data assistant specialized in processing Arabic text data. I have a raw Arabic radio schedule, and I need you to extract the relevant information and return it in a precise JSON format.

### Requirements:

1. **Extract the Date (Gregorian Only):**
   - Identify and extract the **Gregorian date** of the schedule from the raw text.
   - **Output the date strictly as DD/MM/YYYY** (e.g. "09/01/2025"), ignoring any Hijri portion.

2. **Extract Schedule Items:**
   - For each schedule entry, extract the following details:
     - **الوقت (Time)**: The time the program starts.
     - **القارئ (Reciter)**: The name of the reciter.
     - **السور (Surahs)**: The Surahs being recited.
     - **المدة (Duration)**: The duration of the recitation.

3. **JSON Structure:**
   - The extracted information should be organized into a JSON object with the following structure:
   {{
     "date": "<Extracted Date in DD/MM/YYYY>",
     "schedule": [
       {{
         "الوقت": "<Time>",
         "القارئ": "<Reciter>",
         "السور": "<Surahs>",
         "المدة": "<Duration>"
       }},
       ...
     ]
   }}

4. **Output Only JSON:**
   - Your response must contain only the JSON object as specified. 
   - Do not include any additional text, explanations, or Markdown fences.

5. **Handle Formatting Variations:**
   - The raw text may have slight variations in formatting. Please be as consistent as possible in extracting the data.
   - Ensure the "date" is always in the DD/MM/YYYY format.

Raw Arabic Radio Schedule Text:
{raw_text}
"""

# -----------------------------------------------------------------------------
# GEMINI_RESPONSE_SCHEMA
# -----------------------------------------------------------------------------
# Ensures the response from Gemini has the right structure.
GEMINI_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "date": {"type": "string"},  # e.g., "09/01/2025"
        "schedule": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "الوقت": {"type": "string"},
                    "القارئ": {"type": "string"},
                    "السور": {"type": "string"},
                    "المدة": {"type": "string"}  # Optional field
                },
                "required": ["الوقت", "القارئ", "السور"]
            }
        }
    },
    "required": ["date", "schedule"]
}

# -----------------------------------------------------------------------------
# strip_code_fences
# -----------------------------------------------------------------------------
def strip_code_fences(text: str) -> str:
    """
    Removes Markdown code fences (e.g., ```json) from the beginning and end of the text.
    """
    pattern = r'^```(?:json)?\s*\n?(.*?)\n?```$'
    match = re.match(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

# -----------------------------------------------------------------------------
# process_schedule_with_gemini
# -----------------------------------------------------------------------------
def process_schedule_with_gemini(raw_text: str) -> dict:
    """
    Sends raw schedule text to the Gemini API, retrieves the response, 
    and parses it into a structured JSON object.

    Args:
        raw_text (str): The raw text of the schedule.

    Returns:
        dict: A JSON object containing the processed schedule.

    Raises:
        ValueError: If Gemini response cannot be parsed or lacks required data.
        Exception: For unexpected errors during API interaction.
    """
    logger.info("Sending raw text to Gemini for processing.")
    
    # Build the prompt
    prompt = PROMPT_TEMPLATE.format(raw_text=raw_text)

    try:
        # Send the prompt to Gemini
        response = model.generate_content(prompt)

        if not response.text:
            logger.error("No response received from Gemini.")
            raise ValueError("Gemini API returned an empty response.")

        logger.debug("Response received from Gemini.")

        # Strip potential code fences
        cleaned_response = strip_code_fences(response.text)

        # Parse the response as JSON
        parsed_json = json.loads(cleaned_response)

        # Validate the structure of the JSON against our schema
        validate(instance=parsed_json, schema=GEMINI_RESPONSE_SCHEMA)

        logger.info("Successfully processed schedule with Gemini.")
        return parsed_json

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Gemini response: {e}")
        logger.debug(f"Gemini raw response: {response.text}")
        raise ValueError("Invalid JSON format in Gemini response.") from e

    except ValidationError as e:
        logger.error(f"Schema validation error in Gemini response: {e.message}")
        logger.debug(f"Gemini raw response: {response.text}")
        raise ValueError("Gemini response does not match the expected schema.") from e

    except Exception as e:
        logger.error(f"Error while processing schedule with Gemini: {e}")
        raise

# -----------------------------------------------------------------------------
# process_gemini_output
# -----------------------------------------------------------------------------
def process_gemini_output(gemini_output: dict) -> dict:
    """
    Takes the JSON from Gemini and converts it to our final format, ensuring
    we parse the 'DD/MM/YYYY' string into 'YYYY-MM-DD' internally.
    
    Returns a dict like:
    {
        "schedule_date": "YYYY-MM-DD",
        "final_schedule": [...]
    }
    """
    # 1) Grab the raw date from Gemini
    date_raw = gemini_output["date"].strip()

    # 2) Extract only the DD/MM/YYYY portion
    match = re.search(r"\b\d{1,2}/\d{1,2}/\d{4}\b", date_raw)
    if not match:
        # If we can't find day/month/year, raise an error
        raise ValueError(f"Could not locate Gregorian date in '{date_raw}'")

    extracted_date = match.group(0)  # e.g. "09/01/2025"

    # 3) Convert the substring into a Python datetime
    parsed_dt = dateparser.parse(extracted_date, languages=["ar"])
    if not parsed_dt:
        raise ValueError(f"Could not parse date from '{extracted_date}' using dateparser.")

    # We'll store it internally as "YYYY-MM-DD"
    schedule_date = parsed_dt.strftime("%Y-%m-%d")

    # 4) Convert schedule array
    final_schedule = []
    for item in gemini_output["schedule"]:
        # We'll rename 'السور' -> 'السورة' and remove non-digits from 'المدة'
        final_schedule.append({
            "الوقت": item.get("الوقت", "").strip(),
            "القارئ": item.get("القارئ", "").strip(),
            "السورة": item.get("السور", "").strip(),
            "المدة": re.sub(r"[^\d.]", "", item.get("المدة", "")) 
        })

    # 5) Return final structure
    return {
        "schedule_date": schedule_date,
        "final_schedule": final_schedule
    }

# -----------------------------------------------------------------------------
# retry_gemini_request
# -----------------------------------------------------------------------------
def retry_gemini_request(raw_text: str, retries: int = 3, backoff_factor: float = 1.0) -> dict:
    """
    Retries the Gemini request in case of failures.

    Args:
        raw_text (str): The raw schedule text.
        retries (int): Number of retries.
        backoff_factor (float): Backoff multiplier for delay.

    Returns:
        dict: Parsed schedule JSON from Gemini.

    Raises:
        Exception: If all retries fail.
    """
    for attempt in range(retries):
        try:
            logger.info(f"Attempt {attempt + 1} of {retries} to process schedule with Gemini.")
            return process_schedule_with_gemini(raw_text)
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                delay = backoff_factor * (2 ** attempt)
                logger.info(f"Retrying after {delay} seconds...")
                time.sleep(delay)

    logger.error("All retry attempts to process schedule with Gemini failed.")
    raise Exception("Failed to process schedule with Gemini after multiple attempts.")
