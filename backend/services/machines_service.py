import os

def get_machines_list():
    LOG_DIR = "server_logs"
    return os.listdir(LOG_DIR) if os.path.exists(LOG_DIR) else []
