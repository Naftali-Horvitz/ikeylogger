import json
import os
import time
from iwriter import IWriter


class FileWriter(IWriter):
    def __init__(self):
        self.base_path = "logs"
        os.makedirs(self.base_path,exist_ok=True)

    def send_data(self, data: dict, machine_name: str):
        if data == {} or data is None:
            return
        filename = f"{machine_name}.json"
        file_path = os.path.join(self.base_path, filename)

        if os.path.exists(file_path):         #בודק אם כבר קיים קובץ עם אותו שם
            with open(file_path, "r", encoding="utf-8") as f:
                logs = json.load(f)            #במידה וקיים, הוא שולף את הדאטה וממיר ל דיכשנרי
        else:
            logs = []
            # אם אין מפתח למכונה, יוצרים dict ריק
        logs.append(data)  # מוסיף את האובייקט החדש בסוף הרשימה
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=4, ensure_ascii=False)


    def read_data(self,machine_name:str) -> str|None:
        filename = f"{machine_name}.json"
        file_path = os.path.join(self.base_path, filename)
        if not os.path.exists(file_path):
            return None
        with open(file_path,'r', encoding="utf-8") as f:
            data = json.load(f)  # קורא את הקובץ וממיר למילון Python
            if not data:
                return None
        # המרה חזרה למחרוזת JSON
        return json.dumps(data, indent=4, ensure_ascii=False)

    def delete_file(self,machine_name) ->None:
        filename = f"{machine_name}.json"
        file_path = os.path.join(self.base_path, filename)
        try:
            os.remove(file_path)
            print(f"הקובץ {file_path} נמחק בהצלחה.")
        except FileNotFoundError:
            print("הקובץ לא נמצא.")
        except PermissionError:
            print("אין הרשאות למחוק את הקובץ.")
        except Exception as e:
            print(f"שגיאה במחיקה: {e}")






