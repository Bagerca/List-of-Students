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
let studentChart = null;

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

// Объявляем переменные здесь, но находим элементы после загрузки DOM
let datePicker, prevDayBtn, nextDayBtn, sheetDateDisplay, studentListContainer, 
    downloadBtn, copyBtn, statsContainer, settingsBtn, themeToggleBtn, 
    chartCanvas, chartStartDate, chartEndDate, settingsModal, closeModalBtn, 
    saveStudentsBtn, studentListEditor, lineNumbers, exportDataBtn, 
    importDataBtn, importFileInput, studentStatsModal, studentStatsName, 
    studentStatsList, studentChartCanvas, statsStartDate, statsEndDate, 
    downloadStudentChartBtn, studentStatsModalCloseBtn;

// --- 4. ФУНКЦИИ ПРИЛОЖЕНИЯ (без изменений) ---
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
            row.innerHTML = `<div class="student-name clickable">${name}</div><div class="status-buttons">
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

function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    if(themeToggleBtn) themeToggleBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
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
    return {
        labels,
        datasets: Object.keys(statuses).map(key => ({
            label: statuses[key].text,
            data: statusCounts[key],
            backgroundColor: statusColors[key],
        }))
    };
}

function hexToRgba(hex, alpha = 0.2) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderChart() {
    if (attendanceChart) attendanceChart.destroy();
    if (!chartStartDate || !chartStartDate.value || !chartEndDate.value) return;
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

function renderStudentChart(stats) {
    if (studentChart) studentChart.destroy();
    const statusColors = { present: '#198754', late: '#ffc107', absent: '#dc3545', sick: '#0dcaf0', excused: '#6c757d' };
    const chartData = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
    for (const status in stats) {
        if (stats[status] > 0) {
            chartData.labels.push(statuses[status].text);
            chartData.datasets[0].data.push(stats[status]);
            chartData.datasets[0].backgroundColor.push(statusColors[status]);
        }
    }
    const isDark = document.body.classList.contains('theme-dark');
    const textColor = isDark ? '#e4e6eb' : '#606770';
    studentChart = new Chart(studentChartCanvas, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 10 } } }
        }
    });
}

function updateStudentStats() {
    const studentName = studentStatsModal.dataset.currentStudent;
    if (!studentName) return;
    const startDate = statsStartDate.value;
    const endDate = statsEndDate.value;
    const attendanceData = appData.attendanceData || {};
    const stats = { present: 0, late: 0, absent: 0, sick: 0, excused: 0 };
    Object.keys(attendanceData).forEach(date => {
        if (date >= startDate && date <= endDate) {
            const dayData = attendanceData[date];
            const status = dayData[studentName];
            if (status && stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        }
    });
    const totalAbsences = stats.absent + stats.sick + stats.excused;
    studentStatsList.innerHTML = `
        <li>Присутствовал: <strong>${stats.present} дн.</strong></li>
        <li>Опоздал: <strong>${stats.late} раз</strong></li>
        <li>Отсутствовал (всего): <strong>${totalAbsences} дн.</strong></li>
        <li style="padding-left: 20px;">- По болезни: <strong>${stats.sick} дн.</strong></li>
        <li style="padding-left: 20px;">- По ув. причине: <strong>${stats.excused} дн.</strong></li>
        <li style="padding-left: 20px;">- Без причины: <strong>${stats.absent} дн.</strong></li>
    `;
    renderStudentChart(stats);
}

function openStudentStatsModal(studentName) {
    studentStatsName.textContent = `Статистика: ${studentName}`;
    studentStatsModal.dataset.currentStudent = studentName;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    statsEndDate.value = end.toISOString().split('T')[0];
    statsStartDate.value = start.toISOString().split('T')[0];
    updateStudentStats();
    studentStatsModal.classList.add('show');
}

function formatDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }); }

function changeDate(offset) {
    const currentDateObj = new Date(currentDate + 'T00:00:00');
    currentDateObj.setDate(currentDateObj.getDate() + offset);
    const year = currentDateObj.getFullYear();
    const month = String(currentDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(currentDateObj.getDate()).padStart(2, '0');
    currentDate = `${year}-${month}-${day}`;
    datePicker.value = currentDate;
    render();
}

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

// --- 5. ФУНКЦИИ ИНИЦИАЛИЗАЦИИ ---

function cacheDOMElements() {
    datePicker = document.getElementById('date-picker');
    prevDayBtn = document.getElementById('prev-day-btn');
    nextDayBtn = document.getElementById('next-day-btn');
    sheetDateDisplay = document.getElementById('sheet-date-display');
    studentListContainer = document.getElementById('student-list-container');
    downloadBtn = document.getElementById('download-btn');
    copyBtn = document.getElementById('copy-btn');
    statsContainer = document.getElementById('stats');
    settingsBtn = document.getElementById('settings-btn');
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    chartCanvas = document.getElementById('attendance-chart');
    chartStartDate = document.getElementById('chart-start-date');
    chartEndDate = document.getElementById('chart-end-date');
    studentStatsModal = document.getElementById('student-stats-modal');
    studentStatsName = document.getElementById('student-stats-name');
    studentStatsList = document.getElementById('student-stats-list');
    studentChartCanvas = document.getElementById('student-chart');
    statsStartDate = document.getElementById('stats-start-date');
    statsEndDate = document.getElementById('stats-end-date');
    downloadStudentChartBtn = document.getElementById('download-student-chart-btn');
    studentStatsModalCloseBtn = studentStatsModal.querySelector('.close-btn');

    // Находим элементы, которые есть только у админа
    if (isAdmin) {
        settingsModal = document.getElementById('settings-modal');
        closeModalBtn = settingsModal.querySelector('.close-btn');
        saveStudentsBtn = document.getElementById('save-students-btn');
        studentListEditor = document.getElementById('student-list-editor');
        lineNumbers = settingsModal.querySelector('.line-numbers');
        exportDataBtn = document.getElementById('export-data-btn');
        importDataBtn = document.getElementById('import-data-btn');
        importFileInput = document.getElementById('import-file-input');
    }
}

// ===== ГЛАВНОЕ ИЗМЕНЕНИЕ ЗДЕСЬ =====
function setupEventListeners() {
    // --- ОБЩИЕ ОБРАБОТЧИКИ (для всех) ---
    if (datePicker) datePicker.addEventListener('change', e => { currentDate = e.target.value; render(); });
    if (prevDayBtn) prevDayBtn.addEventListener('click', () => changeDate(-1));
    if (nextDayBtn) nextDayBtn.addEventListener('click', () => changeDate(1));
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (chartStartDate) chartStartDate.addEventListener('change', renderChart);
    if (chartEndDate) chartEndDate.addEventListener('change', renderChart);
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
        html2canvas(document.getElementById('attendance-sheet'), { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `attendance-${currentDate}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
    if (copyBtn) copyBtn.addEventListener('click', () => {
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

    // Обработчик кликов в списке студентов
    if (studentListContainer) studentListContainer.addEventListener('click', e => {
        const studentNameDiv = e.target.closest('.student-name.clickable');
        if (studentNameDiv) {
            const studentName = studentNameDiv.closest('.student-row').dataset.name;
            openStudentStatsModal(studentName);
            return;
        }
        if (isAdmin) {
            handleStatusClick(e);
        }
    });

    // Обработчики модального окна статистики
    if(studentStatsModalCloseBtn) studentStatsModalCloseBtn.onclick = () => studentStatsModal.classList.remove('show');
    if(studentStatsModal) studentStatsModal.onclick = e => { if (e.target === studentStatsModal) studentStatsModal.classList.remove('show'); };
    if(statsStartDate) statsStartDate.addEventListener('change', updateStudentStats);
    if(statsEndDate) statsEndDate.addEventListener('change', updateStudentStats);
    if(downloadStudentChartBtn) downloadStudentChartBtn.addEventListener('click', () => {
        const studentName = studentStatsModal.dataset.currentStudent.replace(' ', '_');
        const link = document.createElement('a');
        link.href = studentChart.toBase64Image();
        link.download = `stats_${studentName}_${statsStartDate.value}_${statsEndDate.value}.png`;
        link.click();
    });

    // --- ОБРАБОТЧИКИ ТОЛЬКО ДЛЯ АДМИНА ---
    if (isAdmin) {
        if(settingsBtn) settingsBtn.onclick = () => {
            studentListEditor.value = (appData.students || []).join('\n');
            updateLineNumbers();
            settingsModal.classList.add('show');
        };
        if(closeModalBtn) closeModalBtn.onclick = () => settingsModal.classList.remove('show');
        if(settingsModal) settingsModal.onclick = e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); };
        if(saveStudentsBtn) saveStudentsBtn.onclick = () => {
            appData.students = studentListEditor.value.split('\n').map(s => s.trim()).filter(Boolean);
            saveData();
        };
        if(studentListEditor) studentListEditor.addEventListener('input', updateLineNumbers);
        if(exportDataBtn) exportDataBtn.onclick = () => {
            const dataStr = JSON.stringify(appData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        if(importDataBtn) importDataBtn.onclick = () => { if(importFileInput) importFileInput.click(); };
        if(importFileInput) importFileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.students && importedData.attendanceData) {
                        appData = importedData;
                        saveData();
                        settingsModal.classList.remove('show');
                    } else { alert('Ошибка: неверный формат файла.'); }
                } catch (error) { alert('Ошибка при чтении файла.'); }
            };
            reader.readAsText(file);
            importFileInput.value = '';
        };
    }
}

function updateLineNumbers() {
    if (isAdmin && studentListEditor && lineNumbers) {
        const lineCount = studentListEditor.value.split('\n').length;
        lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
    }
}

function init() {
    cacheDOMElements();
    applyTheme(localStorage.getItem('theme') || 'light');
    if (!isAdmin) {
        document.body.classList.add('guest-mode');
    } else {
        document.title += " [Admin]";
    }
    const appDataRef = ref(database, 'journalData');
    onValue(appDataRef, (snapshot) => {
        const data = snapshot.val();
        appData = {
            students: (data && data.students) || [],
            attendanceData: (data && data.attendanceData) || {}
        };
        if (!data && isAdmin) {
            saveData();
        }
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

// Запускаем приложение после полной загрузки страницы
document.addEventListener('DOMContentLoaded', init);
