import json
import os
import time
from iwriter import IWriter


class FileWriter(IWriter):
    def __init__(self):
        self.base_path = "logs"
        os.makedirs(self.base_path,exist_ok=True)

    def send_data(self, data: dict, machine_name: str):
        filename = f"log_{machine_name}.json"
        file_path = os.path.join(self.base_path, filename)

        if os.path.exists(file_path):         #בודק אם כבר קיים קובץ עם אותו שם
            with open(file_path, "r", encoding="utf-8") as f:
                logs = json.load(f)            #במידה וקיים, הוא שולף את הדאטה וממיר ל דיכשנרי
        else:
            logs = {}
            # אם אין מפתח למכונה, יוצרים dict ריק
        if machine_name not in logs:
            logs[machine_name] = []  # כאן יהיה רשימה של כל האובייקטים
        logs[machine_name].append(data)  # מוסיף את האובייקט החדש בסוף הרשימה
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=4, ensure_ascii=False)


    def read_data(self,machine_name:str) -> str|None:
        filename = f"log_{machine_name}.json"
        file_path = os.path.join(self.base_path, filename)
        if not os.path.exists(file_path):
            return None
        with open(file_path, 'r', encoding="utf-8") as f:
            data = json.load(f)  # קורא את הקובץ וממיר למילון Python
        # המרה חזרה למחרוזת JSON
        return json.dumps(data, indent=4, ensure_ascii=False)



