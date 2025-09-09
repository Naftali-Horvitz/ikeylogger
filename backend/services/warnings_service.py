import os, json
from .notifications_service import get_notifications
from .machines_service import get_machines_list

def get_all_warnings():
    arr_notifications = get_notifications() or []
    key_of_notification = []
    data = {}
    for notification in arr_notifications:
        notice = json.loads(notification)
        keywords = notice.get("keywords", [])
        if isinstance(keywords, list):
            key_of_notification.extend(keywords)
        elif isinstance(keywords, str):
            key_of_notification.append(keywords)

    arr_machine = get_machines_list()
    for machine in arr_machine:
        res_find_notice = find_warnings_in_data(machine, key_of_notification)
        if res_find_notice:
            data.setdefault(machine, []).append(res_find_notice)
    return data

def find_warnings_in_data(machine, warnings):
    folder = os.path.join("server_logs", machine)
    alerts = {}
    for filename in os.listdir(folder):
        file_name = filename[:-8]
        full_path = os.path.join(folder, filename)
        with open(full_path, "r", encoding="utf-8") as f:
            file_content = json.load(f)
            for k, v in file_content.items():
                if isinstance(v, dict):
                    for k_k, v_v in v.items():
                        fields = (k, k_k, v_v)
                        for f in fields:
                            if any(w in f for w in warnings):
                                alerts.setdefault(file_name, {}).setdefault(k, {}).setdefault(k_k, v_v)
    if alerts:
        return alerts
