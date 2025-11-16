// --- 1. ИМПОРТЫ И НАСТРОЙКА FIREBASE ---
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
let attendanceChart = null;

const statuses = {
    present: { text: 'Присутствовал' }, late: { text: 'Опоздал' }, absent: { text: 'Отсутствовал' },
    sick: { text: 'Болел' }, excused: { text: 'Уваж. причина' }
};
const statusIcons = {
    present: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    late: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    absent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sick: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.7-1.5L11.5 13l1.5-2.5L14.5 12H21"></path></svg>`,
    excused: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>`
};
const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

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
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const chartCanvas = document.getElementById('attendance-chart');
const chartStartDate = document.getElementById('chart-start-date');
const chartEndDate = document.getElementById('chart-end-date');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');

// --- 4. ОСНОВНЫЕ ФУНКЦИИ ---

function saveData() { if (isAdmin) set(ref(database, 'journalData'), appData); }

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
                    <button class="status-${key} ${currentDayData[name] === key ? 'active' : ''}" data-status="${key}" title="${statuses[key].text}">
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

// --- 5. ФУНКЦИИ ТЕМЫ И ДИАГРАММЫ ---

function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeToggleBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
}

function toggleTheme() {
    const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    renderChart();
}

function prepareChartData(startDate, endDate) {
    const labels = [];
    const statusCounts = {};
    Object.keys(statuses).forEach(key => statusCounts[key] = []);
    const { attendanceData = {} } = appData;
    const dates = Object.keys(attendanceData).sort();

    dates.forEach(date => {
        if (date >= startDate && date <= endDate) {
            labels.push(formatDate(date).slice(0, -8));
            const dayData = attendanceData[date];
            const dailyCounts = {};
            Object.keys(statuses).forEach(key => dailyCounts[key] = 0);
            Object.values(dayData).forEach(status => {
                if (dailyCounts[status] !== undefined) dailyCounts[status]++;
            });
            Object.keys(statuses).forEach(key => statusCounts[key].push(dailyCounts[key]));
        }
    });

    const statusColors = { present: '#198754', late: '#ffc107', absent: '#dc3545', sick: '#0dcaf0', excused: '#6c757d' };
    const datasets = Object.keys(statuses).map(key => ({
        label: statuses[key].text,
        data: statusCounts[key],
        backgroundColor: statusColors[key],
    }));
    return { labels, datasets };
}

function hexToRgba(hex, alpha = 0.2) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderChart() {
    if (attendanceChart) attendanceChart.destroy();
    if (!chartStartDate.value || !chartEndDate.value) return;

    const chartData = prepareChartData(chartStartDate.value, chartEndDate.value);
    const isDark = document.body.classList.contains('theme-dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#e4e6eb' : '#606770';

    attendanceChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                fill: true,
                backgroundColor: hexToRgba(dataset.backgroundColor, 0.1),
                borderColor: dataset.backgroundColor,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: dataset.backgroundColor
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: textColor }, position: 'bottom' } },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } }
            }
        }
    });
}

// --- 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }); }
function updateLineNumbers() {
    const lineCount = studentListEditor.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ
function changeDate(offset) {
    // Создаем дату, явно указывая, что это локальное время, чтобы избежать путаницы с UTC
    const currentDateObj = new Date(currentDate + 'T00:00:00');
    // Безопасно изменяем день
    currentDateObj.setDate(currentDateObj.getDate() + offset);

    // Вручную форматируем дату в YYYY-MM-DD, чтобы избежать проблем с часовыми поясами
    const year = currentDateObj.getFullYear();
    const month = String(currentDateObj.getMonth() + 1).padStart(2, '0'); // Месяцы 0-индексированы
    const day = String(currentDateObj.getDate()).padStart(2, '0');
    
    currentDate = `${year}-${month}-${day}`;
    datePicker.value = currentDate;
    render();
}

// --- 7. ОБРАБОТЧИКИ СОБЫТИЙ ---
function handleStatusClick(e) {
    if (!isAdmin) return;
    const button = e.target.closest('button[data-status]');
    if (!button) return;
    const row = button.closest('.student-row');
    const name = row.dataset.name;
    const status = button.dataset.status;

    if (!appData.attendanceData) appData.attendanceData = {};
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
    prevDayBtn.addEventListener('click', () => changeDate(-1));
    nextDayBtn.addEventListener('click', () => changeDate(1));
    studentListContainer.addEventListener('click', handleStatusClick);
    studentListEditor.addEventListener('input', updateLineNumbers);
    themeToggleBtn.addEventListener('click', toggleTheme);
    chartStartDate.addEventListener('change', renderChart);
    chartEndDate.addEventListener('change', renderChart);
    
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
        (appData.students || []).forEach(name => {
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
        studentListEditor.value = (appData.students || []).join('\n');
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
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
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

// --- 8. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
function init() {
    applyTheme(localStorage.getItem('theme') || 'light');
    if (!isAdmin) document.body.classList.add('guest-mode'); else document.title += " [Admin]";
    
    const appDataRef = ref(database, 'journalData');
    onValue(appDataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) appData = data; else if (isAdmin) saveData();
        const allDates = Object.keys(appData.attendanceData || {}).sort();
        if (allDates.length > 0) {
            chartStartDate.value = allDates[0];
            chartEndDate.value = allDates[allDates.length - 1] > currentDate ? allDates[allDates.length - 1] : currentDate;
        } else {
            chartStartDate.value = currentDate;
            chartEndDate.value = currentDate;
        }
        render();
        renderChart();
    });
    datePicker.value = currentDate;
    setupEventListeners();
}

init();
