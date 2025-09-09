from flask import jsonify, session, render_template, redirect
import backend.services.login_service as login_service

def handle_login(request):
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify({"success": False, "message": "Missing username or password"}), 400

    username = data["username"]
    password = data["password"]

    if login_service.is_valid_user(username, password):
        session["user"] = username
        return jsonify({"success": True, "message": "Login successful"}), 200
    else:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401

def home_page():
    if not session.get("user"):
        return redirect("/login")
    return render_template("index.html")

def login_page():
    if session.get("user"):
        return redirect("/home")
    return render_template("login.html")

def api_logout():
    session.clear()
    return {"success": True, "message": "Logged out"}
