import os, requests, json
from typing import Any
from iwriter import IWriter

class NetworkWriter(IWriter):
    def __init__(self, server_url: str | None = None, timeout_sec: float = 8.0):
        self.server_url =  "http://127.0.0.1:5000/api/upload"
        self.timeout_sec = timeout_sec

    def send_data(self, data: Any, machine_name: str) -> None:

        payload = data
        try:
            requests.post(self.server_url, json=payload, timeout=self.timeout_sec).raise_for_status()
        except requests.RequestException as e:
            print(f"[NetworkWriter] send failed: {e}")
