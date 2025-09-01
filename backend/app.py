import os
import json
import random

from flask import Flask, request, jsonify
from datetime import datetime
from encryptor import Encryptor
# יוצר מופע של יישום Flask
app = Flask(__name__)

# הגדרת נתיב לשמירת קבצי היומן
LOG_DIR = 'server_logs'
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)


@app.route('/api/upload', methods=['POST'])
def save_data():
    status = 400
    status_listen = random.randint(0, 1)  # אופציה לעצירת האזנה נצרך להחליף לקלט מהמשתמש
    # בדוק אם הבקשה מכילה נתוני JSON
    if not request.is_json:
        return jsonify({"error": "Request must5 be JSON"}), status

    # קבל את הנתונים מהבקשה
    data = request.get_json()
    try:
        status = write_to_file(data)
        return jsonify({"message": "Data saved successfully", "status_listen": status_listen}), status

    except Exception as e:
        return jsonify({"error": "Failed to save data", "details": str(e)}), status

def write_to_file(data: dict):
    try:
        if data == {}:
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

    except Exception:
        return 500


# מריץ את השרת רק אם הקובץ מופעל ישירות
if __name__ == '__main__':
    app.run(debug=True, port=5000)