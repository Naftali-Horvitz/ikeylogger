import json
import os
import time
from iwriter import IWriter


class FileWriter(IWriter):
    def __init__(self):
        self.base_path = "logs"
        os.makedirs(self.base_path,exist_ok=True)

    def send_data(self, data: dict, machine_name: str):
        timestamp = time.strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"log_{machine_name}_{timestamp}.json"
        file_path = os.path.join(self.base_path, filename)

        # המר את המילון למחרוזת JSON
        json_data = json.dumps(data, indent=4, ensure_ascii=False)

        # כתוב את מחרוזת ה-JSON לקובץ
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(json_data)

