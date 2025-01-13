import re
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import emit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Local imports
from database import db
from models import DailySchedule, DailyTableMetadata
from schedule_parsing.parse_logic import (
    parse_schedule_final,  # the new top-level function
    remove_brackets
)
from schedule_parsing.gemini_handler import (
    process_gemini_output,
    retry_gemini_request
)
from schedule_parsing.gemini_handler import PROMPT_TEMPLATE, API_KEY, model


logger = logging.getLogger(__name__)

# Define the Blueprint
schedule_bp = Blueprint("schedule_bp", __name__)

############################
# HELPER: parse_header_dates
############################
header_date_pattern = re.compile(
    r'يوم\s+(\S+)\s*:\s*(.+?هـ)\s+الموافق\s+(\d+/\d+/\d+م?\.?)(?=\s|$)',
    re.UNICODE
)

def parse_header_dates(raw_text: str) -> dict:
    """
    A local helper that extracts date from lines like:
      يوم (اسم اليوم) : (التاريخ الهجري) الموافق (التاريخ الميلادي)
    """
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = header_date_pattern.search(line)
        if match:
            return {
                "اليوم": match.group(1).strip(),
                "التاريخ_الهجري": match.group(2).strip(),
                "التاريخ_الميلادي": match.group(3).rstrip('.').strip()
            }
    return {}

############################
# HELPER: parse_gregorian_date
############################
def parse_gregorian_date(date_string: str) -> datetime:
    """
    Extract only the DD/MM/YYYY portion from a mixed (Hijri + Gregorian) date string
    and parse it as a Python datetime. Example input:
      '09 رجب 1446هـ الوافق 09/01/2025'
    which should yield a datetime for 2025-01-09.
    
    :param date_string: The raw string potentially containing a Gregorian date substring.
    :return: A datetime object corresponding to the DD/MM/YYYY portion.
    :raises ValueError: If no valid Gregorian date substring is found.
    """
    pattern = r"\d{2}/\d{2}/\d{4}"  # Looks for something like 09/01/2025
    match = re.search(pattern, date_string)
    if not match:
        raise ValueError(f"Could not find a Gregorian date in '{date_string}'")

    extracted_date_str = match.group(0)  # e.g. "09/01/2025"
    return datetime.strptime(extracted_date_str, "%d/%m/%Y")

# ------------------------ Helper Functions ------------------------
def process_raw_text(raw_text):
    """
    Processes raw schedule text using Gemini AI (with retry logic),
    falling back to existing parsing logic if needed.
    
    Returns structured data in the format:
    {
        "schedule_date": "YYYY-MM-DD",
        "final_schedule": [...]
    }
    """
    logger.info("Starting processing of raw text.")

    # Step 1: Parse header for schedule date
    header_info = parse_header_dates(raw_text) or {}
    date_str = header_info.get("التاريخ_الميلادي", "").strip()
    if not date_str:
        logger.error("No valid Gregorian date found in the header.")
        raise ValueError("No valid date found in the header.")

    # Instead of manually "cleaning" the date string, use parse_gregorian_date
    try:
        schedule_date = parse_gregorian_date(date_str).date()
        logger.debug(f"Parsed schedule date: {schedule_date}")
    except ValueError as ve:
        logger.error(f"Invalid date format in the header: '{date_str}'. Error: {ve}")
        raise ValueError("Invalid date format in the header.")

    # Step 2: Try Gemini (with retries) and then finalize its output
    try:
        logger.info("Attempting to process the schedule via Gemini + retry logic.")
        gemini_raw_result = retry_gemini_request(raw_text, retries=3, backoff_factor=1.0)
        # Convert Gemini's JSON to our final format
        gemini_processed = process_gemini_output(gemini_raw_result)

        # **Override** the date from Gemini with our locally parsed date
        final_schedule = gemini_processed["final_schedule"]
        logger.info("Gemini successfully processed the schedule with retry logic.")
    except Exception as gemini_error:
        # Gemini (all retries) failed -> fallback to parse_schedule_final
        logger.error(f"Gemini processing failed: {gemini_error}. Falling back.")
        try:
            final_schedule = parse_schedule_final(raw_text)
            if not final_schedule:
                raise ValueError("Fallback parsing logic returned an empty schedule.")
            logger.info("Fallback parsing logic successfully processed the schedule.")
        except Exception as fallback_error:
            logger.error(f"Fallback parsing logic failed: {fallback_error}")
            raise ValueError("Both Gemini (after retries) and fallback parsing failed.")

    # Double-check final schedule
    if not final_schedule:
        logger.error("Parsed schedule is empty after both Gemini and fallback processing.")
        raise ValueError("Parsed schedule is empty.")

    logger.debug(f"Final schedule entries: {len(final_schedule)}")

    # Return structured data (keeping the schedule_date from the header)
    processed_data = {
        "schedule_date": schedule_date.strftime("%Y-%m-%d"),
        "final_schedule": final_schedule
    }
    logger.info("Completed processing of raw text.")
    return processed_data


def store_processed_data(processed_data):
    """
    Stores the processed schedule data into the database.
    The expected structure of processed_data is:
    {
        "schedule_date": "YYYY-MM-DD",
        "final_schedule": [...]
    }
    Raises:
        ValueError if schedule already exists or invalid data.
    """
    logger.info(f"Starting storage of schedule for date: {processed_data['schedule_date']}")

    # Extract fields
    schedule_date_str = processed_data["schedule_date"].strip()
    final_schedule = processed_data["final_schedule"]

    # Validate schedule_date format
    try:
        schedule_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
    except ValueError as ve:
        logger.error(f"Invalid date format: '{schedule_date_str}'. Error: {ve}")
        raise ValueError("Invalid date format. Expected YYYY-MM-DD.")

    # Check if this schedule already exists
    existing_metadata = DailyTableMetadata.query.filter_by(schedule_date=schedule_date).first()
    if existing_metadata:
        logger.warning(f"Schedule for {schedule_date} already exists in daily_table_metadata.")
        raise ValueError(f"Schedule for {schedule_date} already exists.")

    # Insert metadata
    new_metadata = DailyTableMetadata(schedule_date=schedule_date)
    db.session.add(new_metadata)

    # Insert each schedule entry
    for idx, item in enumerate(final_schedule, start=1):
        time_val = item.get("الوقت", "").strip()
        reciter_val = item.get("القارئ", "").strip()
        surah_val = item.get("السورة", "").strip()
        duration_val = item.get("المدة", "").strip()  # Optional field

        logger.debug(
            f"Inserting entry #{idx}: time={time_val}, reciter={reciter_val}, "
            f"surah={surah_val}, duration={duration_val}"
        )

        new_entry = DailySchedule(
            time=time_val,
            reciter=reciter_val,
            surah=surah_val,
            duration=duration_val,  # optional
            schedule_date=schedule_date,
        )
        db.session.add(new_entry)

    # Commit the transaction
    logger.info("All schedule entries added to DB session. Committing...")
    db.session.commit()
    logger.info(f"Schedule for {schedule_date} successfully stored in the database.")

    # Emit a WebSocket event
    socketio = current_app.config.get('SOCKETIO')
    if socketio:
        socketio.emit(
            'new_schedule',
            {
                "schedule_date": schedule_date.strftime("%Y-%m-%d"),
                "final_schedule": final_schedule
            },
            namespace='/'
        )
        logger.info(f"Emitted 'new_schedule' event for date: {schedule_date}")
    else:
        logger.error("SocketIO instance not found. Cannot emit 'new_schedule' event.")


# ------------------------ Route Definitions ------------------------

@schedule_bp.route("/all", methods=["GET"])
def get_all_schedules():
    """
    Fetches the schedule from the database in JSON.
    ...
    """
    try:
        # user timezone from cookie or default
        logger.debug(f"Cookie content: {request.cookies}")
        user_timezone_str = request.cookies.get('user_timezone', 'Africa/Cairo')
        logger.debug(f"user_timezone_str from cookie: {user_timezone_str}")

        try:
            user_timezone = ZoneInfo(user_timezone_str)
        except ZoneInfoNotFoundError:
            logger.warning(f"Invalid or missing timezone '{user_timezone_str}'. Defaulting to Cairo's timezone.")
            user_timezone = ZoneInfo("Africa/Cairo")

        cairo_timezone = ZoneInfo("Africa/Cairo")

        # The user might request a specific date
        requested_date_str = request.args.get("date", "")  # e.g. ?date=2025-12-21
        logger.info(f"Requested date: {requested_date_str}")

        query = DailySchedule.query
        if requested_date_str:
            try:
                requested_date = datetime.strptime(requested_date_str, "%Y-%m-%d").date()
                query = query.filter_by(schedule_date=requested_date)
            except ValueError:
                logger.warning(f"Invalid requested_date format: {requested_date_str}")

        # Fallback to the LATEST date
        if not requested_date_str or query.count() == 0:
            newest_metadata = DailyTableMetadata.query.order_by(DailyTableMetadata.schedule_date.desc()).first()
            if newest_metadata:
                fallback_date = newest_metadata.schedule_date
                logger.info(f"No valid requested date or no schedule found, fallback to latest: {fallback_date}")
                query = DailySchedule.query.filter_by(schedule_date=fallback_date)
            else:
                # No schedules at all
                logger.warning("No schedules exist in DB.")
                return jsonify({"data": [], "message": "No schedules in DB"}), 200

        # Pagination
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 100, type=int)

        pagination = query.order_by(DailySchedule.time.asc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        data = []
        for entry in pagination.items:
            time_str = entry.time.strip()
            cairo_dt = None
            for fmt in ("%I:%M %p", "%H:%M"):
                try:
                    parsed_time = datetime.strptime(time_str, fmt).time()
                    cairo_dt = datetime.combine(entry.schedule_date, parsed_time, tzinfo=cairo_timezone)
                    break
                except ValueError:
                    continue

            if not cairo_dt:
                logger.error(f"Time parsing error for entry ID {entry.id}: '{time_str}'")
                continue

            # Convert to user's TZ
            user_datetime = cairo_dt.astimezone(user_timezone)
            converted_time = user_datetime.strftime("%I:%M %p")

            data.append({
                "id": entry.id,
                "schedule_date": user_datetime.strftime("%Y-%m-%d"),
                "time": converted_time,
                "reciter": entry.reciter,
                "surah": entry.surah,
                "duration": entry.duration if entry.duration else ""
            })

        return jsonify({
            "data": data,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page
        }), 200

    except Exception as e:
        logger.error(f"Error fetching schedules: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch schedules"}), 500


@schedule_bp.route("/process", methods=["POST"])
def process_schedule():
    """
    Endpoint to process the Quran schedule from raw text.
    Expects JSON payload: { "raw_text": "schedule text" }.
    Returns the processed data for debugging and verification.
    """
    try:
        data = request.get_json()
        if not data or "raw_text" not in data:
            logger.warning("No raw_text provided in the request.")
            return jsonify({"error": "No raw_text provided"}), 400

        raw_text = data["raw_text"].strip()
        logger.info(f"Received raw text for processing (length={len(raw_text)}).")

        processed_data = process_raw_text(raw_text)

        return jsonify({
            "status": "success",
            "processed_data": processed_data
        }), 200

    except ValueError as ve:
        logger.error(f"Processing error: {ve}")
        return jsonify({"error": str(ve)}), 400

    except Exception as e:
        logger.error(f"Error while processing schedule: {e}", exc_info=True)
        return jsonify({"error": "Failed to process schedule"}), 500


@schedule_bp.route("/store", methods=["POST"])
def store_schedule():
    """
    Endpoint to store the Quran schedule into the database.
    Accepts either:
    - Raw text: { "raw_text": "schedule text" }
    OR
    - Structured data: {
        "schedule_date": "YYYY-MM-DD",
        "final_schedule": [ ... ]
    }
    Returns a confirmation of successful storage.
    """
    try:
        data = request.get_json()
        if not data:
            logger.warning("No input data provided.")
            return jsonify({"error": "No input data provided"}), 400

        # Case 1: raw_text
        if "raw_text" in data:
            raw_text = data["raw_text"].strip()
            logger.info(f"Received raw text for processing (length={len(raw_text)}).")

            try:
                processed_data = process_raw_text(raw_text)
            except ValueError as ve:
                logger.error(f"Processing error: {ve}")
                return jsonify({"error": str(ve)}), 400

            # Store the processed data
            try:
                store_processed_data(processed_data)
            except ValueError as ve:
                logger.error(f"Storage error: {ve}")
                db.session.rollback()
                return jsonify({"error": str(ve)}), 400
            except Exception as e:
                logger.error(f"Unexpected storage error: {e}", exc_info=True)
                db.session.rollback()
                return jsonify({"error": "Failed to store schedule."}), 500

            return jsonify({
                "status": "success",
                "message": f"Schedule for {processed_data['schedule_date']} stored successfully."
            }), 200

        # Case 2: structured data
        else:
            expected_keys = {"schedule_date", "final_schedule"}
            received_keys = set(data.keys())
            unexpected_keys = received_keys - expected_keys
            if unexpected_keys:
                logger.warning(f"Unexpected keys in request: {unexpected_keys}")
                return jsonify({"error": f"Unexpected keys: {unexpected_keys}"}), 400

            if "schedule_date" not in data or "final_schedule" not in data:
                logger.warning("Incomplete data provided for storage.")
                return jsonify({"error": "Incomplete data."}), 400

            schedule_date_str = data["schedule_date"].strip()
            final_schedule = data["final_schedule"]

            # Validate schedule_date
            try:
                schedule_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
            except ValueError as ve:
                logger.error(f"Invalid date format: '{schedule_date_str}'. Error: {ve}")
                return jsonify({"error": "Invalid date format. Expected YYYY-MM-DD."}), 400

            if not isinstance(final_schedule, list):
                logger.warning("'final_schedule' must be a list.")
                return jsonify({"error": "'final_schedule' must be a list."}), 400

            for idx, entry in enumerate(final_schedule, start=1):
                if not isinstance(entry, dict):
                    logger.warning(f"Schedule entry #{idx} is not a JSON object.")
                    return jsonify({"error": f"Schedule entry #{idx} is invalid."}), 400
                if not all(k in entry for k in ("الوقت", "القارئ", "السورة")):
                    logger.warning(f"Missing mandatory keys in schedule entry #{idx}.")
                    return jsonify({
                        "error": f"Missing 'الوقت', 'القارئ', or 'السورة' in entry #{idx}."
                    }), 400

            logger.info(f"Storing schedule for date: {schedule_date}")

            existing_metadata = DailyTableMetadata.query.filter_by(schedule_date=schedule_date).first()
            if existing_metadata:
                logger.warning(f"Schedule for {schedule_date} already exists.")
                return jsonify({"error": f"Schedule for {schedule_date} already exists."}), 400

            new_metadata = DailyTableMetadata(schedule_date=schedule_date)
            db.session.add(new_metadata)

            for idx, item in enumerate(final_schedule, start=1):
                time_val = item.get("الوقت", "").strip()
                reciter_val = item.get("القارئ", "").strip()
                surah_val = item.get("السورة", "").strip()
                duration_val = item.get("المدة", "").strip()  # optional

                logger.debug(
                    f"Inserting entry #{idx}: time={time_val}, reciter={reciter_val}, "
                    f"surah={surah_val}, duration={duration_val}"
                )
                new_entry = DailySchedule(
                    time=time_val,
                    reciter=reciter_val,
                    surah=surah_val,
                    duration=duration_val,
                    schedule_date=schedule_date,
                )
                db.session.add(new_entry)

            # Commit
            try:
                logger.info("All schedule entries added. Committing to DB...")
                db.session.commit()
                logger.info(f"Schedule for {schedule_date} stored in DB.")
            except Exception as e:
                logger.error(f"DB commit failed: {e}", exc_info=True)
                db.session.rollback()
                return jsonify({"error": "Failed to store schedule."}), 500

            # WebSocket event
            try:
                socketio = current_app.config.get('SOCKETIO')
                if socketio:
                    socketio.emit(
                        'new_schedule',
                        {
                            "schedule_date": schedule_date.strftime("%Y-%m-%d"),
                            "final_schedule": final_schedule
                        },
                        namespace='/'
                    )
                    logger.info(f"Emitted 'new_schedule' event for {schedule_date}")
                else:
                    logger.error("SocketIO not found. Cannot emit 'new_schedule'.")
            except Exception as e:
                logger.error(f"Failed to emit 'new_schedule': {e}", exc_info=True)

            return jsonify({
                "status": "success",
                "message": f"Schedule for {schedule_date} stored successfully."
            }), 200

    except ValueError as ve:
        logger.error(f"Validation error: {ve}")
        db.session.rollback()
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error storing schedule: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Failed to store schedule."}), 500


@schedule_bp.route("/process_and_store", methods=["POST"])
def process_and_store_schedule():
    """
    Endpoint to process raw schedule text using Gemini AI (with retries)
    or fallback logic, then store in the DB.
    """
    try:
        data = request.get_json()
        if not data or "raw_text" not in data:
            logger.warning("No raw_text provided in the request.")
            return jsonify({
                "error": "No raw_text provided. Please provide the schedule text in the request payload."
            }), 400

        raw_text = data["raw_text"].strip()
        logger.info(f"Received raw text for processing and storage (length={len(raw_text)}).")

        # Process
        try:
            processed_data = process_raw_text(raw_text)
            logger.info("Successfully processed raw text into structured data.")
        except ValueError as ve:
            logger.error(f"Processing error: {ve}")
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logger.error(f"Unexpected error during processing: {e}", exc_info=True)
            return jsonify({"error": "Failed to process the schedule text."}), 500

        # Store
        try:
            store_processed_data(processed_data)
            logger.info(f"Successfully stored schedule for date: {processed_data['schedule_date']}")
        except ValueError as ve:
            logger.error(f"Storage error: {ve}")
            db.session.rollback()
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logger.error(f"Unexpected storage error: {e}", exc_info=True)
            db.session.rollback()
            return jsonify({"error": "Failed to store the schedule in the database."}), 500

        # Done
        return jsonify({
            "status": "success",
            "message": f"Schedule for {processed_data['schedule_date']} processed and stored successfully."
        }), 200

    except Exception as e:
        logger.error(f"Error in process_and_store_schedule: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({
            "error": "An unexpected error occurred while processing and storing the schedule."
        }), 500


@schedule_bp.route("/clear_old", methods=["DELETE"])
def clear_old_schedules():
    """
    Deletes old schedules older than a given threshold (default: 30 days).
    """
    try:
        threshold_days = int(request.args.get("threshold", 30))
        cutoff_date = datetime.utcnow().date() - timedelta(days=threshold_days)

        old_schedules = DailySchedule.query.filter(
            DailySchedule.schedule_date < cutoff_date
        ).all()
        old_metadata = DailyTableMetadata.query.filter(
            DailyTableMetadata.schedule_date < cutoff_date
        ).all()

        if old_schedules or old_metadata:
            for sch in old_schedules:
                db.session.delete(sch)
            for md in old_metadata:
                db.session.delete(md)
            db.session.commit()
            logger.info(f"Deleted schedules older than {cutoff_date}")
            return jsonify({
                "status": "success",
                "message": f"Schedules older than {cutoff_date} removed."
            }), 200

        logger.info("No old schedules found to delete.")
        return jsonify({"status": "success", "message": "No old schedules to delete"}), 200

    except Exception as e:
        logger.error(f"Error clearing old schedules: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Failed to clear old schedules."}), 500


@schedule_bp.route("/debug/timezone", methods=["GET"])
def debug_timezone():
    """
    Debug endpoint for timezone conversions.
    """
    user_timezone_str = request.cookies.get('user_timezone', 'Africa/Cairo')
    try:
        user_timezone = ZoneInfo(user_timezone_str)
    except ZoneInfoNotFoundError:
        user_timezone = ZoneInfo("Africa/Cairo")

    now_utc = datetime.utcnow()
    now_user = now_utc.replace(tzinfo=ZoneInfo("UTC")).astimezone(user_timezone)

    return jsonify({
        "utc_time": now_utc.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "user_time": now_user.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "user_timezone": user_timezone_str
    }), 200

# Debug endpoint to view raw Gemini response
@schedule_bp.route("/gemini/debug", methods=["GET", "POST"])
def debug_gemini_response():
    """
    Endpoint to debug Gemini response.
    Accepts raw_text via GET (query params) or POST (form data).
    """
    try:
        raw_text = ""
        if request.method == "POST":
            raw_text = request.form.get("raw_text", "").strip()
        elif request.method == "GET":
            raw_text = request.args.get("raw_text", "").strip()

        if not raw_text:
            logger.warning("No raw_text provided in the request.")
            return "<h1>No raw_text provided.</h1>", 400

        logger.info(f"Received raw text for Gemini debugging (length={len(raw_text)}).")

        # Process the input with Gemini
        prompt = PROMPT_TEMPLATE.format(raw_text=raw_text)
        response = model.generate_content(prompt)

        if not response.text:
            logger.error("No response received from Gemini.")
            return "<h1>Gemini API returned an empty response.</h1>", 500

        # Here, we do NOT strip fences explicitly, so we can see raw output
        raw_response = response.text
        return f"<pre>{raw_response}</pre>", 200

    except Exception as e:
        logger.error(f"Error in Gemini debug endpoint: {e}", exc_info=True)
        return f"<h1>Failed to process Gemini response for debugging:</h1><pre>{e}</pre>", 500
