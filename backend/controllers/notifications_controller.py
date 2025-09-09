from flask import jsonify
import backend.services.notifications_service as notifications_service

def handle_notifications(request):
    text = request.data.decode("utf-8")
    if not text:
        return "No data provided", 400
    try:
        notifications_service.save_notification(text)
        return jsonify({"status": "success", "added": text}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_get_notifications():
    try:
        alerts = notifications_service.get_notifications()
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handle_delete_notifications(request):
    id = request.data.decode("utf-8")
    if not id:
        return "No data provided", 400
    try:
        notifications_service.delete_notification(id)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
