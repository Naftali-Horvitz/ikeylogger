// קובץ זה יכול לשמש להוספת לוגיקה דינמית, כמו טעינת נתונים מהשרת.
// לדוגמה, טעינת רשימת המחשבים לעמוד הבית.

document.addEventListener('DOMContentLoaded', () => {
    // דוגמה לנתונים שיכולים להגיע מהשרת
    const computers = ["מחשב 1", "מחשב 2", "מחשב 3", "מחשב 4", "מחשב 5"];

    const computerList = document.getElementById('computer-list');
    if (computerList) {
        // מחיקת הפריטים הסטטיים
        computerList.innerHTML = '';
        // יצירת פריטי רשימה חדשים מהנתונים
        computers.forEach(computer => {
            const listItem = document.createElement('li');
            listItem.textContent = computer;
            computerList.appendChild(listItem);
        });
    }

    // כאן תוכל להוסיף לוגיקה גם לעמודים אחרים, למשל טעינת לוגים או התראות.
});