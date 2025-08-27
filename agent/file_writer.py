import os
from datetime import datetime
from iwriter import IWriter


class FileWriter(IWriter):
    def __init__(self, base_path="logs"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)

    def send_data(self, data: str, machine_name: str) -> None:

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"log_{machine_name}_{timestamp}.txt"
        file_path = os.path.join(self.base_path, filename)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(data)