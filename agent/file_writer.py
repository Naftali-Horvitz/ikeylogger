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
                logs = dict(logs)
            res_data = self.deep_merge(data, logs)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(res_data, f, indent=4, ensure_ascii=False)
        else:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)

    def deep_merge(self,source, destination):
        # מבצע מיזוג עמוק של מילונים מקוננים.

        for key, value in source.items():
            if isinstance(value, dict) and key in destination and isinstance(destination[key], dict):
                # אם גם המפתח הקיים וגם החדש הם מילונים, קרא לפונקציה בצורה רקורסיבית
                destination[key] = self.deep_merge(value, destination[key])
            elif isinstance(value, str) and key in destination and isinstance(destination[key], str):
                # אם הערך קיים והוא מחרוזת, שרשר את הערך החדש לקיים
                destination[key] += value
            else:
                # אחרת, פשוט עדכן את הערך
                destination[key] = value
        return destination

    def read_data(self,machine_name:str) -> dict | None:
        filename = f"{machine_name}.json"
        file_path = os.path.join(self.base_path, filename)
        if not os.path.exists(file_path):
            return None
        with open(file_path,'r', encoding="utf-8") as f:
            data = json.load(f)  # קורא את הקובץ וממיר למילון Python
            if not data:
                return None

        return data

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






