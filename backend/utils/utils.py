import os
from datetime import datetime

class Encryptor:
    def __init__(self, key="nmrd"):
        self.key = key
        self.key_length = len(self.key)

    def encrypt_dict(self, data_dict: dict):
        encrypted_dict = {}
        for k, v in data_dict.items():
            encrypted_k = self.encrypt_decrypt(str(k))
            if isinstance(v, dict):
                encrypted_v = self.encrypt_dict(v)
            else:
                encrypted_v = self.encrypt_decrypt(str(v))
            encrypted_dict[encrypted_k] = encrypted_v
        return encrypted_dict

    def encrypt_decrypt(self, data: str) -> str:
        result = []
        for i, char in enumerate(data):
            key_char = self.key[i % self.key_length]
            result.append(chr(ord(char) ^ ord(key_char)))
        return ''.join(result)

def deep_merge(s, d):
    for k, v in s.items():
        if isinstance(v, dict) and isinstance(d.get(k), dict):
            d[k] = deep_merge(v, d[k])
        elif isinstance(v, str) and isinstance(d.get(k), str):
            d[k] += v
        else:
            d[k] = v
    return d

def ptime(s):
    if not s: return None
    s = s.replace("%3A", ":").strip()
    for f in ("%H:%M:%S","%H:%M","%H"):
        try: return datetime.strptime(s, f).time()
        except ValueError: pass
    return None

def hour_from_fname(n):
    try: return int(os.path.splitext(n)[0].rsplit("_",1)[1])
    except: return None

def timekey(k):
    if not isinstance(k, str): return None
    for f in ("%H:%M:%S","%H:%M"):
        try: return datetime.strptime(k.strip(), f).time()
        except ValueError: pass
    return None
