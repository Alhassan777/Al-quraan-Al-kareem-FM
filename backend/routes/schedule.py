# routes/schedule.py

import re
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import emit

# Local imports
from database import db
from models import DailySchedule, DailyTableMetadata
from schedule_parsing.parse_logic import (
    parse_header_dates,
    parse_quran_schedule,
    clean_and_merge,
)

logger = logging.getLogger(__name__)

# Define the Blueprint
schedule_bp = Blueprint("schedule_bp", __name__)

# ------------------------ Helper Functions ------------------------

def process_raw_text(raw_text):
    """
    Processes raw schedule text and returns structured data.
    Returns:
        dict: {
            "schedule_date": "YYYY-MM-DD",
            "final_schedule": [
                {"الوقت": "06:00", "قارئ": "Name", "السورة": "Surah"},
                ...
            ]
        }
    Raises:
        ValueError: If processing fails due to invalid format or missing data.
    """
    logger.info("Starting processing of raw text.")

    # Step 1: Parse header for schedule date
    header_info = parse_header_dates(raw_text) or {}
    date_str = header_info.get("التاريخ_الميلادي", "").strip()

    if not date_str:
        logger.error("No valid Gregorian date (التاريخ_الميلادي) found in the header.")
        raise ValueError("No valid date found in the header.")

    # Remove extra characters (e.g., trailing 'م') from the date
    cleaned_date_str = re.sub(r"[^0-9/]", "", date_str).strip()
    logger.debug(f"Cleaned date string: '{cleaned_date_str}' (original was '{date_str}')")

    # Attempt to parse date
    try:
        schedule_date = datetime.strptime(cleaned_date_str, "%d/%m/%Y").date()
    except ValueError as ve:
        logger.error(f"Invalid date format in the header: '{cleaned_date_str}'. Error: {ve}")
        raise ValueError("Invalid date format in the header.")

    logger.debug(f"Parsed schedule date: {schedule_date}")

    # Step 2: Parse and clean the schedule
    parsed_data = parse_quran_schedule(raw_text)

    if not parsed_data:
        logger.error("Failed to parse schedule data (parsed_data is empty).")
        raise ValueError("Failed to parse schedule data.")

    logger.debug(f"Parsed entries: {len(parsed_data)}. Now cleaning/merging...")
    final_schedule = clean_and_merge(parsed_data)

    if not final_schedule:
        logger.error("Parsed schedule is empty after cleaning (final_schedule is empty).")
        raise ValueError("Parsed schedule is empty.")

    logger.debug(f"Successfully parsed and cleaned schedule. Final entries: {len(final_schedule)}")

    processed_data = {
        "schedule_date": schedule_date.strftime("%Y-%m-%d"),
        "final_schedule": final_schedule
    }

    logger.info("Completed processing of raw text.")
    return processed_data

def store_processed_data(processed_data):
    """
    Stores the processed schedule data into the database.
    Args:
        processed_data (dict): {
            "schedule_date": "YYYY-MM-DD",
            "final_schedule": [
                {"الوقت": "06:00", "قارئ": "Name", "السورة": "Surah"},
                ...
            ]
        }
    Raises:
        ValueError: If storage fails due to existing schedule or invalid data.
    """
    logger.info(f"Starting storage of schedule for date: {processed_data['schedule_date']}")

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

    # Insert metadata for the schedule date
    new_metadata = DailyTableMetadata(schedule_date=schedule_date)
    db.session.add(new_metadata)

    # Insert each schedule entry
    for idx, item in enumerate(final_schedule, start=1):
        time_val = item.get("الوقت", "").strip()
        reciter_val = item.get("قارئ", "").strip()
        surah_val = item.get("السورة", "").strip()

        logger.debug(
            f"Inserting entry #{idx}: time={time_val}, reciter={reciter_val}, surah={surah_val}"
        )

        new_entry = DailySchedule(
            time=time_val,
            reciter=reciter_val,
            surah=surah_val,
            schedule_date=schedule_date,
        )
        db.session.add(new_entry)

    # Commit the transaction
    logger.info("All schedule entries added to DB session. Committing...")
    db.session.commit()
    logger.info(f"Schedule for {schedule_date} successfully stored in the database.")

    # Emit a WebSocket event to notify frontend of the new schedule
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
    Returns all schedule entries in JSON format.
    Supports pagination for large datasets.
    """
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        pagination = DailySchedule.query.paginate(
            page=page, per_page=per_page, error_out=False
        )

        data = [
            {
                "id": entry.id,
                "schedule_date": entry.schedule_date.strftime("%Y-%m-%d"),
                "time": entry.time,
                "reciter": entry.reciter,
                "surah": entry.surah,
            }
            for entry in pagination.items
        ]

        return jsonify({
            "data": data,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
        }), 200

    except Exception as e:
        logger.error(f"Error fetching schedule entries: {e}", exc_info=True)
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

        # Process the raw text
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
        "final_schedule": [
            {"الوقت": "06:00", "قارئ": "Name", "السورة": "Surah"},
            ...
        ]
    }
    Returns confirmation of successful storage.
    """
    try:
        data = request.get_json()
        if not data:
            logger.warning("No input data provided.")
            return jsonify({"error": "No input data provided"}), 400

        if "raw_text" in data:
            # Process raw_text first
            raw_text = data["raw_text"].strip()
            logger.info(f"Received raw text for processing (length={len(raw_text)}).")

            try:
                processed_data = process_raw_text(raw_text)
            except ValueError as ve:
                logger.error(f"Processing error: {ve}")
                return jsonify({"error": str(ve)}), 400

            # Now store the processed_data
            try:
                store_processed_data(processed_data)
            except ValueError as ve:
                logger.error(f"Storage error: {ve}")
                return jsonify({"error": str(ve)}), 400

            return jsonify({
                "status": "success",
                "message": f"Schedule for {processed_data['schedule_date']} stored successfully."
            }), 200

        else:
            # Accept structured data
            # Check for unexpected keys
            expected_keys = {"schedule_date", "final_schedule"}
            received_keys = set(data.keys())
            unexpected_keys = received_keys - expected_keys
            if unexpected_keys:
                logger.warning(f"Unexpected keys in request: {unexpected_keys}")
                return jsonify({"error": f"Unexpected keys in request: {unexpected_keys}"}), 400

            if "schedule_date" not in data or "final_schedule" not in data:
                logger.warning("Incomplete data provided for storage.")
                return jsonify({"error": "Incomplete data provided"}), 400

            schedule_date_str = data["schedule_date"].strip()
            final_schedule = data["final_schedule"]

            # Validate schedule_date format
            try:
                schedule_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
            except ValueError as ve:
                logger.error(f"Invalid date format: '{schedule_date_str}'. Error: {ve}")
                return jsonify({"error": "Invalid date format. Expected YYYY-MM-DD."}), 400

            # Validate final_schedule structure
            if not isinstance(final_schedule, list):
                logger.warning("'final_schedule' must be a list.")
                return jsonify({"error": "'final_schedule' must be a list."}), 400

            for idx, entry in enumerate(final_schedule, start=1):
                if not isinstance(entry, dict):
                    logger.warning(f"Schedule entry #{idx} is not a JSON object.")
                    return jsonify({"error": f"Schedule entry #{idx} is not a valid object."}), 400
                if not all(key in entry for key in ("الوقت", "قارئ", "السورة")):
                    logger.warning(f"Missing keys in schedule entry #{idx}.")
                    return jsonify({"error": f"Each schedule entry must contain 'الوقت', 'قارئ', and 'السورة'."}), 400

            logger.info(f"Storing schedule for date: {schedule_date}")

            # Check if this schedule already exists
            existing_metadata = DailyTableMetadata.query.filter_by(schedule_date=schedule_date).first()
            if existing_metadata:
                logger.warning(f"Schedule for {schedule_date} already exists in daily_table_metadata.")
                return jsonify({"error": f"Schedule for {schedule_date} already exists."}), 400

            # Insert metadata for the schedule date
            new_metadata = DailyTableMetadata(schedule_date=schedule_date)
            db.session.add(new_metadata)

            # Insert each schedule entry
            for idx, item in enumerate(final_schedule, start=1):
                time_val = item.get("الوقت", "").strip()
                reciter_val = item.get("قارئ", "").strip()
                surah_val = item.get("السورة", "").strip()

                logger.debug(
                    f"Inserting entry #{idx}: time={time_val}, reciter={reciter_val}, surah={surah_val}"
                )

                new_entry = DailySchedule(
                    time=time_val,
                    reciter=reciter_val,
                    surah=surah_val,
                    schedule_date=schedule_date,
                )
                db.session.add(new_entry)

            # Commit the transaction
            logger.info("All schedule entries added to DB session. Committing...")
            db.session.commit()
            logger.info(f"Schedule for {schedule_date} successfully stored in the database.")

            # Emit a WebSocket event to notify frontend of the new schedule
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

            return jsonify({
                "status": "success",
                "message": f"Schedule for {schedule_date} stored successfully."
            }), 200

    except Exception as e:
        logger.error(f"Unexpected error in store_schedule: {e}", exc_info=True)
        return jsonify({"error": "Failed to store schedule."}), 500

    @schedule_bp.route("/process_and_store", methods=["POST"])
    def process_and_store_schedule():
        """
        Combined endpoint to process raw schedule text and store it in the database.
        Expects JSON payload: { "raw_text": "schedule text" }.
        Returns confirmation of successful storage.
        """
        try:
            data = request.get_json()
            if not data or "raw_text" not in data:
                logger.warning("No raw_text provided in the request.")
                return jsonify({"error": "No raw_text provided"}), 400

            raw_text = data["raw_text"].strip()
            logger.info(f"Received raw text for processing and storing (length={len(raw_text)}).")

            # Process the raw text
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
                return jsonify({"error": str(ve)}), 400

            return jsonify({"status": "success", "message": f"Schedule for {processed_data['schedule_date']} stored successfully."}), 200

        except Exception as e:
            logger.error(f"Error in process_and_store_schedule: {e}", exc_info=True)
            return jsonify({"error": "Failed to process and store schedule"}), 500


    @schedule_bp.route("/debug/raw_and_parsed", methods=["GET"])
    def debug_raw_and_parsed():
        """
        Debug endpoint to view the raw text, header info, parsed data,
        and final schedule before inserting into DB.
        Note: This endpoint's utility is reduced due to the separation of processing and storing.
        It can be modified or removed based on your debugging needs.
        """
        return jsonify({
            "message": "This endpoint has limited utility after separating processing and storing.",
            "instruction": "Use the /process or /process_and_store endpoints."
        }), 200


    @schedule_bp.route("/clear_old", methods=["DELETE"])
    def clear_old_schedules():
        """
        Deletes old schedules older than a given threshold (default: 30 days).
        """
        try:
            threshold_days = int(request.args.get("threshold", 30))  # default 30
            cutoff_date = datetime.utcnow().date() - timedelta(days=threshold_days)

            # Fetch old schedules + metadata
            old_schedules = DailySchedule.query.filter(
                DailySchedule.schedule_date < cutoff_date
            ).all()
            old_metadata = DailyTableMetadata.query.filter(
                DailyTableMetadata.schedule_date < cutoff_date
            ).all()

            if old_schedules or old_metadata:
                # Delete them
                for schedule in old_schedules:
                    db.session.delete(schedule)
                for metadata in old_metadata:
                    db.session.delete(metadata)

                db.session.commit()
                logger.info(f"Old schedules older than {cutoff_date} cleared from DB.")
                return jsonify({
                    "status": "success",
                    "message": f"Schedules older than {cutoff_date} deleted."
                }), 200

            logger.info("No old schedules found for deletion.")
            return jsonify({"status": "success", "message": "No old schedules to delete."}), 200

        except Exception as e:
            logger.error(f"Error clearing old schedules: {e}", exc_info=True)
            db.session.rollback()
            return jsonify({"error": "Failed to clear old schedules."}), 500
