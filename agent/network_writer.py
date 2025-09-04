import os, requests, json
from typing import Any
from iwriter import IWriter

class NetworkWriter(IWriter):
    def __init__(self, server_url: str , timeout_sec: float = 8.0):
        self.server_url =  server_url
        self.timeout_sec = timeout_sec

    def send_data(self, data: Any, machine_name: str) -> requests.Response | None:
        payload = data
        try:
            response = requests.post(self.server_url, json=payload, timeout=self.timeout_sec)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            return None