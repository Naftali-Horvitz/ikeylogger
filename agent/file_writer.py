import os
import time
from iwriter import IWriter


class FileWriter(IWriter):
    def __init__(self):
        self.base_path = r'C:\Users\mma08\PycharmProjects\kod'
        os.makedirs(self.base_path,exist_ok=True)

    def send_data(self, data: str, machine_name: str):
        timestamp = time.strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"log_{machine_name}_{timestamp}.json"
        file_path = os.path.join(self.base_path, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(data)

