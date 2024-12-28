# routes/schedule.py
from flask import Blueprint, request, jsonify
from database import db
from models import Reciter, ScheduleEntry
from schedule_parsing.parse_logic import (
    parse_header_dates,
    parse_quran_schedule,
    clean_and_merge,
)

schedule_bp = Blueprint("schedule_bp", __name__)

@schedule_bp.route("/all", methods=["GET"])
def get_all_schedule():
    """
    Returns all schedule entries in JSON format.
    """
    entries = ScheduleEntry.query.all()
    data = []
    for e in entries:
        data.append({
            "id": e.id,
            "date_str": e.date_str,
            "time_str": e.time_str,
            "surah": e.surah,
            "reciter": e.reciter.name if e.reciter else "",
            "youtube_link": e.reciter.youtube_link if (e.reciter and e.reciter.youtube_link) else None
        })
    return jsonify(data), 200

@schedule_bp.route("/store", methods=["POST"])
def store_schedule():
    """
    Expects JSON { "raw_text": "the entire schedule text" }
    Parses the schedule, merges, and saves to DB.
    """
    data = request.get_json()
    raw_text = data.get("raw_text", "")
    if not raw_text:
        return jsonify({"error": "No raw_text provided"}), 400

    # 1) Parse the header for date
    header_info = parse_header_dates(raw_text)
    date_str = header_info.get("التاريخ_الميلادي", "")  # e.g. 25/12/2024

    # 2) Parse the schedule
    parsed_data = parse_quran_schedule(raw_text)
    final_schedule = clean_and_merge(parsed_data)  # list of { وقت, قارئ, سورة }

    # 3) Insert into DB
    for item in final_schedule:
        time_str = item["الوقت"]
        surah = item["السورة"]
        reciter_name = item["قارئ"]

        # find or create reciter
        reciter_obj = get_or_create_reciter(reciter_name)

        new_entry = ScheduleEntry(
            date_str=date_str,
            time_str=time_str,
            surah=surah,
            reciter=reciter_obj
        )
        db.session.add(new_entry)

    db.session.commit()
    return jsonify({"status": "success", "header_info": header_info}), 200

def get_or_create_reciter(name: str):
    """
    Check if a reciter with 'name' exists, else create it
    (We won't set youtube_link yet—can update later if needed).
    """
    name = name.strip()
    if not name:
        return None

    # try to find existing reciter
    existing = Reciter.query.filter_by(name=name).first()
    if existing:
        return existing
    # else create
    new_reciter = Reciter(name=name)
    db.session.add(new_reciter)
    db.session.commit()
    return new_reciter
