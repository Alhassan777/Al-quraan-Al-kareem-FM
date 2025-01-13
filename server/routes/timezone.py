# routes/timezone.py

from flask import Blueprint, request, jsonify, make_response
from zoneinfo import available_timezones  # Python 3.9+
import logging

logger = logging.getLogger(__name__)

timezone_bp = Blueprint('timezone_bp', __name__)

def is_valid_timezone(tz_str):
    return tz_str in available_timezones()

@timezone_bp.route('/set_timezone/', methods=['POST'])
def set_timezone():
    data = request.get_json()
    timezone = data.get('timezone', None)
    if timezone and is_valid_timezone(timezone):
        resp = make_response(jsonify({"status": "success", "timezone": timezone}), 200)
        # Set the timezone in a secure, HttpOnly cookie
        resp.set_cookie('user_timezone', timezone, max_age=30*24*60*60, secure=False, httponly=True, samesite='Lax') # turn secure=True in production
        logger.info(f"Timezone set to {timezone}")
        return resp
    else:
        logger.warning("Invalid or no timezone provided in the request.")
        return jsonify({"status": "failure", "error": "Invalid or no timezone provided"}), 400
