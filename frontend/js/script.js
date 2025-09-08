// ===== מצב ושמירה מקומית =====
const LS_KEYS = {
  alerts:  "kl_alerts",
  agent:   "kl_agent_settings",
  agentOn: "kl_agent_enabled",
};

// BASE של ה-API (ללא UI; ערך ברירת מחדל, שנה פה אם צריך)
const API_BASE = "http://127.0.0.1:5000/api";





// ===== Login =====
async function login(username, password){
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include"   // <--- הוסף את זה! חשוב לשמירת session
    });
    const data = await res.json();

    if(data.success){
      window.location.href = "/home"; // <--- עדכן ל-route של Flask
    } else {
      toast(data.message, false);
    }
  } catch(e) {
    console.error(e);
    toast("שגיאה בשרת. נסה שוב.", false);
  }
}





// ===== אירועים ואתחול =====
document.addEventListener("DOMContentLoaded", ()=>{

//לוגין
const loginForm = document.getElementById("loginForm");
    if(loginForm){
      loginForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        if(!username || !password) return toast("יש למלא שם משתמש וסיסמה", false);
        login(username, password);
      });
    }

});
