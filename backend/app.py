import os
import json
from flask import Flask, request, jsonify
from datetime import datetime

# יוצר מופע של יישום Flask
app = Flask(__name__)

# הגדרת נתיב לשמירת קבצי היומן
LOG_DIR = 'server_logs'
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)


@app.route('/api/upload', methods=['POST'])
def save_data():
    """
    מקבל בקשת POST עם נתוני JSON, שומר אותם לקובץ JSON
    ומחזיר תגובה.
    """
    # בדוק אם הבקשה מכילה נתוני JSON
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    # קבל את הנתונים מהבקשה
    data_to_save = request.get_json()

    # יצירת שם קובץ ייחודי עם חותמת זמן
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"data_{timestamp}.json"
    file_path = os.path.join(LOG_DIR, filename)

    try:
        # שמירת הנתונים לקובץ JSON
        with open(file_path, 'w', encoding='utf-8') as f:
            # המר את מילון הפייתון למחרוזת JSON
            json.dump(data_to_save, f, indent=4, ensure_ascii=False)

        # שלח תגובה חזרה למשתמש
        print(f"נתונים נשמרו בהצלחה לקובץ: {file_path}")
        return jsonify({"message": "Data saved successfully", "filename": filename}), 200

    except Exception as e:
        # טיפול בשגיאות ושליחת הודעת שגיאה
        print(f"שגיאה בשמירת הנתונים: {e}")
        return jsonify({"error": "Failed to save data", "details": str(e)}), 500


# מריץ את השרת רק אם הקובץ מופעל ישירות
if __name__ == '__main__':
    app.run(debug=True, port=5000)