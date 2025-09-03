import os, json
from datetime import datetime
from encryptor import Encryptor

def deep_merge(s, d):
    for k, v in s.items():
        if isinstance(v, dict) and isinstance(d.get(k), dict): d[k] = deep_merge(v, d[k])
        elif isinstance(v, str) and isinstance(d.get(k), str): d[k] += v
        else: d[k] = v
    return d

def ptime(s):
    if not s: return None
    s = s.replace('%3A', ':').strip()
    for f in ("%H:%M:%S","%H:%M","%H"):
        try: return datetime.strptime(s, f).time()
        except ValueError: pass
    return None

def hour_from_fname(n):
    try: return int(os.path.splitext(n)[0].rsplit('_',1)[1])
    except Exception: return None

def timekey(k):
    if not isinstance(k, str): return None
    for f in ("%H:%M:%S","%H:%M"):
        try: return datetime.strptime(k.strip(), f).time()
        except ValueError: pass
    return None

def write_to_file(data, log_dir):
    enc = Encryptor(); data = enc.encrypt_dict(data)
    m = next(iter(data)); payload = data.pop(m)
    d = os.path.join(log_dir, m); os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f"{datetime.now():%Y-%m-%d_%H}.json")
    base = {}
    if os.path.exists(path):
        try:
            with open(path,'r',encoding='utf-8') as f: base = dict(json.load(f))
        except Exception: base = {}
    flat = payload.pop(next(iter(payload)))
    with open(path,'w',encoding='utf-8') as f:
        json.dump(deep_merge(flat, base), f, indent=4, ensure_ascii=False)
    return path
