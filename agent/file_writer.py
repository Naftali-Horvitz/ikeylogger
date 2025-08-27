import os
from abc import ABC, abstractmethod
from datetime import time
import iwriter



class FileWriter(iwriter):
    def __init__(self, base_path="logs"):
        self.base_path = base_path
        os.makedirs(base_path,exist_ok=True)

    def send_data(self, data: str, machine_name: str) -> None:
        timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"log_{machine_name}_{timestamp}.txt"
        file_path = os.path.join(self.base_path, filename)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(data)