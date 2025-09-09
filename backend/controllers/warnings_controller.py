from flask import jsonify
import backend.services.warnings_service as warnings_service

def handle_new_warnings():
    try:
        alerts = warnings_service.get_all_warnings()
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_get_warnings():
    try:
        alerts = warnings_service.get_all_warnings()
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
