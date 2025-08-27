import requests
from iwriter import IWriter

class NetworkWriter(IWriter):
    def __init__(self, server_url="http://127.0.0.1:5000/api/upload"):
        self.server_url = server_url

    def send_data(self, data: str, machine_name: str) -> None:
        payload = {"machine": machine_name, "data": data}
        try:
            response = requests.post(self.server_url, json=payload)
            response.raise_for_status()
            print("Data sent successfully!")
        except Exception as e:
            print(f"Failed to send data: {e}")
