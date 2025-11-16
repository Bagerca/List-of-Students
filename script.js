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

// --- 5. ФУНКЦИИ ТЕМЫ И ДИАГРАММЫ (ОБНОВЛЕННАЯ ВЕРСИЯ) ---

// Вспомогательная функция для преобразования HEX цвета в RGBA с прозрачностью
function hexToRgba(hex, alpha = 0.2) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ЗАМЕНИТЕ ВАШУ СТАРУЮ ФУНКЦИЮ renderChart НА ЭТУ
function renderChart() {
    if (attendanceChart) {
        attendanceChart.destroy(); // Уничтожаем старую диаграмму
    }
    if (!chartStartDate.value || !chartEndDate.value) return;

    const chartData = prepareChartData(chartStartDate.value, chartEndDate.value);
    const isDark = document.body.classList.contains('theme-dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#e4e6eb' : '#606770';

    // Меняем настройки для линейного графика
    attendanceChart = new Chart(chartCanvas, {
        type: 'line', // <-- ГЛАВНОЕ ИЗМЕНЕНИЕ: тип диаграммы
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                fill: true, // Закрашиваем область под линией
                backgroundColor: hexToRgba(dataset.backgroundColor, 0.1), // Делаем цвет под линией полупрозрачным
                borderColor: dataset.backgroundColor, // Цвет самой линии оставляем ярким
                tension: 0.4, // Сглаживание линий
                pointRadius: 4,
                pointBackgroundColor: dataset.backgroundColor
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { labels: { color: textColor }, position: 'bottom' },
                tooltip: {
                    position: 'nearest',
                    titleFont: { weight: 'bold' },
                    bodyFont: { size: 14 },
                }
            },
            scales: {
                // Убираем stacked: true, так как графики не должны складываться
                x: { 
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: { 
                    beginAtZero: true,
                    ticks: { color: textColor, precision: 0 }, // Только целые числа на оси Y
                    grid: { color: gridColor }
                }
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
    studentListContainer.addEventListener('click', handleStatusClick);
    studentListEditor.addEventListener('input', updateLineNumbers);
    themeToggleBtn.addEventListener('click', toggleTheme);
    chartStartDate.addEventListener('change', renderChart);
    chartEndDate.addEventListener('change', renderChart);
    downloadBtn.addEventListener('click', () => { /* ... */ });
    copyBtn.addEventListener('click', () => { /* ... */ });
    settingsBtn.onclick = () => { /* ... */ };
    closeModalBtn.onclick = () => settingsModal.classList.remove('show');
    settingsModal.onclick = e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); };
    saveStudentsBtn.onclick = () => { /* ... */ };
    exportDataBtn.onclick = () => { /* ... */ };
    importDataBtn.onclick = () => { if(isAdmin) importFileInput.click(); };
    importFileInput.onchange = (event) => { /* ... */ };
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
