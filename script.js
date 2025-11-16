// --- 1. НАСТРОЙКА FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdEYhK5jZn1DjEpQlwFr1WBS-k6iJZdyQ",
    authDomain: "list-of-students-4e903.firebaseapp.com",
    databaseURL: "https://list-of-students-4e903-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "list-of-students-4e903",
    storageBucket: "list-of-students-4e903.firebasestorage.app",
    messagingSenderId: "124322945806",
    appId: "1:124322945806:web:a0630135eed481dbe4d55f"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ---
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'true';
let appData = { students: [], attendanceData: {} };
let currentDate = new Date().toISOString().split('T')[0];

const statuses = {
    present: { class: 'status-present', text: 'Присутствовал' },
    late:    { class: 'status-late', text: 'Опоздал' },
    absent:  { class: 'status-absent', text: 'Отсутствовал' },
    sick:    { class: 'status-sick', text: 'Болел' },
    excused: { class: 'status-excused', text: 'Уважительная причина' }
};

const statusIcons = {
    present: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    late: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    absent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sick: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.7-1.5L11.5 13l1.5-2.5L14.5 12H21"></path></svg>`,
    excused: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>`
};

// --- 3. ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ DOM ---
const datePicker = document.getElementById('date-picker');
const sheetDateDisplay = document.getElementById('sheet-date-display');
const studentListContainer = document.getElementById('student-list-container');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const statsContainer = document.getElementById('stats');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.querySelector('.close-btn');
const saveStudentsBtn = document.getElementById('save-students-btn');
const studentListEditor = document.getElementById('student-list-editor');
const lineNumbers = document.querySelector('.line-numbers');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFileInput = document.getElementById('import-file-input');

// --- 4. ОСНОВНЫЕ ФУНКЦИИ ---

function saveData() {
    if (!isAdmin) return;
    set(ref(database, 'journalData'), appData);
}

function render() {
    const { students = [], attendanceData = {} } = appData;
    sheetDateDisplay.textContent = formatDate(currentDate);
    studentListContainer.innerHTML = '';

    if (students.length === 0) {
        studentListContainer.innerHTML = `<p style="text-align:center; color: var(--secondary-text-color); padding: 20px;">Список учеников пуст. Добавьте их в настройках.</p>`;
    } else {
        students.forEach(name => {
            const row = document.createElement('div');
            row.className = 'student-row';
            row.dataset.name = name;
            const currentDayData = attendanceData[currentDate] || {};
            row.innerHTML = `<div class="student-name">${name}</div><div class="status-buttons">
                ${Object.keys(statuses).map(key => `
                    <button class="${statuses[key].class} ${currentDayData[name] === key ? 'active' : ''}" data-status="${key}" title="${statuses[key].text}">
                        ${statusIcons[key]}
                    </button>
                `).join('')}</div>`;
            studentListContainer.appendChild(row);
        });
    }
    updateStats();
}

function updateStats() {
    const { students = [], attendanceData = {} } = appData;
    const dayData = attendanceData[currentDate] || {};
    const total = students.length;
    let presentCount = 0, lateCount = 0, absentCount = 0;

    students.forEach(student => {
        const status = dayData[student];
        if (status === 'present' || status === 'late') presentCount++;
        if (status === 'late') lateCount++;
        if (['absent', 'sick', 'excused'].includes(status)) absentCount++;
    });
    statsContainer.innerHTML = `Присутствует: <strong>${presentCount}/${total}</strong> &nbsp;·&nbsp; Опоздало: <strong>${lateCount}</strong> &nbsp;·&nbsp; Отсутствует: <strong>${absentCount}</strong>`;
}

// --- 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function updateLineNumbers() {
    const lineCount = studentListEditor.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
}

// --- 6. ОБРАБОТЧИКИ СОБЫТИЙ ---

function handleStatusClick(e) {
    if (!isAdmin) return;
    const button = e.target.closest('button[data-status]');
    if (!button) return;

    const row = button.closest('.student-row');
    const name = row.dataset.name;
    const status = button.dataset.status;

    if (!appData.attendanceData[currentDate]) appData.attendanceData[currentDate] = {};
    const currentStatus = appData.attendanceData[currentDate][name];

    if (currentStatus === status) {
        delete appData.attendanceData[currentDate][name];
    } else {
        appData.attendanceData[currentDate][name] = status;
    }
    saveData();
}

function setupEventListeners() {
    datePicker.addEventListener('change', e => { currentDate = e.target.value; render(); });
    studentListContainer.addEventListener('click', handleStatusClick);
    studentListEditor.addEventListener('input', updateLineNumbers);

    downloadBtn.addEventListener('click', () => {
        html2canvas(document.getElementById('attendance-sheet'), { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `attendance-${currentDate}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    copyBtn.addEventListener('click', () => {
        const dayData = appData.attendanceData[currentDate] || {};
        let reportText = `Отчет о посещаемости за ${formatDate(currentDate)}:\n\n`;
        appData.students.forEach(name => {
            const statusKey = dayData[name];
            const statusText = statusKey ? statuses[statusKey].text : 'Не отмечен';
            reportText += `${name}: ${statusText}\n`;
        });
        navigator.clipboard.writeText(reportText).then(() => {
            const btnText = copyBtn.querySelector('.btn-text');
            const originalText = btnText.textContent;
            btnText.textContent = 'Скопировано!';
            setTimeout(() => { btnText.textContent = originalText; }, 2000);
        });
    });

    const closeModal = () => settingsModal.classList.remove('show');
    settingsBtn.onclick = () => {
        studentListEditor.value = appData.students.join('\n');
        updateLineNumbers();
        settingsModal.classList.add('show');
    };
    closeModalBtn.onclick = closeModal;
    settingsModal.onclick = e => { if (e.target === settingsModal) closeModal(); };

    saveStudentsBtn.onclick = () => {
        if (!isAdmin) return;
        appData.students = studentListEditor.value.split('\n').map(s => s.trim()).filter(Boolean);
        saveData();
    };
    
    exportDataBtn.onclick = () => {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    importDataBtn.onclick = () => { if(isAdmin) importFileInput.click(); };
    importFileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.students && importedData.attendanceData) {
                    appData = importedData;
                    saveData();
                    closeModal();
                } else { alert('Ошибка: неверный формат файла.'); }
            } catch (error) { alert('Ошибка при чтении файла.'); }
        };
        reader.readAsText(file);
        importFileInput.value = '';
    };
}

// --- 7. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---

function init() {
    if (!isAdmin) document.body.classList.add('guest-mode');
    else document.title += " [Admin]";
    
    const appDataRef = ref(database, 'journalData');
    onValue(appDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            appData = data;
        } else if (isAdmin) {
            // Если в базе пусто, админ может создать первую запись
            saveData();
        }
        render();
    }, { onlyOnce: false });

    datePicker.value = currentDate;
    setupEventListeners();
}

init();
