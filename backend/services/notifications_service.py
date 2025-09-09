import os, json

def save_notification(text):
    file_path = "notifications.json"
    alerts = []
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            alerts = json.load(f)
    if text not in alerts:
        alerts.append(text)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)

def get_notifications(file_path="notifications.json"):
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else None
    except (json.JSONDecodeError, OSError):
        return None

def delete_notification(notification_id):
    file_path = "notifications.json"
    alerts = []
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            alerts = json.load(f)
    for alert in alerts:
        if notification_id in alert:
            alerts.remove(alert)
            break
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)
