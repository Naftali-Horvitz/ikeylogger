VALID_USERS = {
    "מאיר": "12345",
    "user2": "mypassword",
    "admin": "adminpass"
}

def is_valid_user(username: str, password: str) -> bool:
    return username in VALID_USERS and VALID_USERS[username] == password
