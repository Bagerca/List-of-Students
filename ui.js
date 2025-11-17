// ui.js

let getAppData, saveData;

let themeToggleBtn, settingsBtn, settingsModal, closeModalBtn,
    studentListEditor, lineNumbers, saveStudentsBtn,
    exportDataBtn, importDataBtn, importFileInput,
    chartCanvas, chartStartDate, chartEndDate, downloadMainChartBtn,
    studentStatsModal, studentStatsName, studentStatsList, studentChartCanvas,
    statsStartDate, statsEndDate, downloadStudentChartBtn, studentStatsModalCloseBtn;

let attendanceChart = null;
let studentChart = null;
    
const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeToggleBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    renderChart();
}

function toggleTheme() {
    const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function updateLineNumbers() {
    if (studentListEditor && lineNumbers) {
        const lineCount = studentListEditor.value.split('\n').length;
        lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
    }
}

export function setChartDateRange(start, end) {
    if (chartStartDate && chartEndDate) {
        chartStartDate.value = start;
        chartEndDate.value = end;
    }
}

function hexToRgba(hex, alpha = 0.2) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderChart() {
    const appData = getAppData();
    if (attendanceChart) attendanceChart.destroy();
    if (!chartCanvas || !chartStartDate.value || !chartEndDate.value) return;

    const labels = [];
    const statusCounts = { present: [], late: [], absent: [], sick: [], excused: [] };
    const dates = Object.keys(appData.attendanceData || {}).sort();

    dates.forEach(date => {
        if (date >= chartStartDate.value && date <= chartEndDate.value) {
            labels.push(new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }));
            const dayData = appData.attendanceData[date];
            const dailyCounts = { present: 0, late: 0, absent: 0, sick: 0, excused: 0 };
            
            Object.values(dayData).forEach(status => {
                const statusArray = Array.isArray(status) ? status : [status];
                const increment = 1 / statusArray.length;
                statusArray.forEach(s => {
                    if (dailyCounts[s] !== undefined) dailyCounts[s] += increment;
                });
            });

            for (const key in statusCounts) {
                statusCounts[key].push(dailyCounts[key]);
            }
        }
    });

    const statusColors = { present: '#198754', late: '#ffc107', absent: '#dc3545', sick: '#0dcaf0', excused: '#6c757d' };
    const datasets = Object.keys(statusCounts).map(key => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        data: statusCounts[key],
        backgroundColor: statusColors[key],
        borderColor: statusColors[key],
        fill: false,
        tension: 0.1
    }));
    
    const isDark = document.body.classList.contains('theme-dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#e4e6eb' : '#606770';

    attendanceChart = new Chart(chartCanvas, {
        type: 'line',
        data: { labels, datasets },
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

function renderStudentChart(stats, statuses) {
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
    const appData = getAppData();
    const studentName = studentStatsModal.dataset.currentStudent;
    if (!studentName) return;
    const startDate = statsStartDate.value;
    const endDate = statsEndDate.value;
    const attendanceData = appData.attendanceData || {};
    const stats = { present: 0, late: 0, absent: 0, sick: 0, excused: 0 };

    Object.keys(attendanceData).forEach(date => {
        if (date >= startDate && date <= endDate) {
            const status = attendanceData[date]?.[studentName];
            if (!status) return;
            
            const statusArray = Array.isArray(status) ? status : [status];
            const increment = 1 / statusArray.length;

            statusArray.forEach(s => {
                if (stats.hasOwnProperty(s)) {
                    stats[s] += increment;
                }
            });
        }
    });

    const totalAbsences = stats.absent + stats.sick + stats.excused;
    const statuses = { present: { text: 'Присутствовал' }, late: { text: 'Опоздал' }, absent: { text: 'Отсутствовал' }, sick: { text: 'Болел' }, excused: { text: 'Уваж. причина' } };
    studentStatsList.innerHTML = `
        <li>Присутствовал: <strong>${Number(stats.present.toFixed(1))} дн.</strong></li>
        <li>Опоздал: <strong>${Number(stats.late.toFixed(1))} раз</strong></li>
        <li>Отсутствовал (всего): <strong>${Number(totalAbsences.toFixed(1))} дн.</strong></li>
        <li style="padding-left: 20px;">- По болезни: <strong>${Number(stats.sick.toFixed(1))} дн.</strong></li>
        <li style="padding-left: 20px;">- По ув. причине: <strong>${Number(stats.excused.toFixed(1))} дн.</strong></li>
        <li style="padding-left: 20px;">- Без причины: <strong>${Number(stats.absent.toFixed(1))} дн.</strong></li>
    `;
    renderStudentChart(stats, statuses);
}

export function openStudentStatsModal(studentName) {
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

export function initUI(_getAppData, _saveData, isAdmin) {
    getAppData = _getAppData;
    saveData = _saveData;

    themeToggleBtn = document.getElementById('theme-toggle-btn');
    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');
    closeModalBtn = settingsModal.querySelector('.close-btn');
    chartCanvas = document.getElementById('attendance-chart');
    chartStartDate = document.getElementById('chart-start-date');
    chartEndDate = document.getElementById('chart-end-date');
    downloadMainChartBtn = document.getElementById('download-main-chart-btn');
    
    studentStatsModal = document.getElementById('student-stats-modal');
    studentStatsName = document.getElementById('student-stats-name');
    studentStatsList = document.getElementById('student-stats-list');
    studentChartCanvas = document.getElementById('student-chart');
    statsStartDate = document.getElementById('stats-start-date');
    statsEndDate = document.getElementById('stats-end-date');
    downloadStudentChartBtn = document.getElementById('download-student-chart-btn');
    studentStatsModalCloseBtn = studentStatsModal.querySelector('.close-btn');

    applyTheme(localStorage.getItem('theme') || 'light');
    themeToggleBtn.addEventListener('click', toggleTheme);

    settingsBtn.onclick = () => settingsModal.classList.add('show');
    closeModalBtn.onclick = () => settingsModal.classList.remove('show');
    settingsModal.onclick = e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); };
    
    chartStartDate.addEventListener('change', renderChart);
    chartEndDate.addEventListener('change', renderChart);

    downloadMainChartBtn.addEventListener('click', () => {
        if (attendanceChart) {
            const link = document.createElement('a');
            link.href = attendanceChart.toBase64Image('image/png', 1);
            link.download = `attendance_chart_${chartStartDate.value}_to_${chartEndDate.value}.png`;
            link.click();
        }
    });

    studentStatsModalCloseBtn.onclick = () => studentStatsModal.classList.remove('show');
    studentStatsModal.onclick = e => { if (e.target === studentStatsModal) studentStatsModal.classList.remove('show'); };
    statsStartDate.addEventListener('change', updateStudentStats);
    statsEndDate.addEventListener('change', updateStudentStats);

    if (isAdmin) {
        studentListEditor = document.getElementById('student-list-editor');
        lineNumbers = settingsModal.querySelector('.line-numbers');
        saveStudentsBtn = document.getElementById('save-students-btn');
        exportDataBtn = document.getElementById('export-data-btn');
        importDataBtn = document.getElementById('import-data-btn');
        importFileInput = document.getElementById('import-file-input');
        
        settingsBtn.onclick = () => {
            const appData = getAppData();
            studentListEditor.value = (appData.students || []).join('\n');
            updateLineNumbers();
            settingsModal.classList.add('show');
        };

        studentListEditor.addEventListener('input', updateLineNumbers);

        saveStudentsBtn.onclick = () => {
            const appData = getAppData();
            appData.students = studentListEditor.value.split('\n').map(s => s.trim()).filter(Boolean);
            saveData();
            alert('Список студентов сохранен!');
        };
        
        exportDataBtn.onclick = () => {
            const appData = getAppData();
            const dataStr = JSON.stringify(appData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        
        importDataBtn.onclick = () => { if(importFileInput) importFileInput.click(); };
        importFileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.students && importedData.attendanceData && importedData.scheduleData) {
                        const appData = getAppData();
                        appData.students = importedData.students;
                        appData.attendanceData = importedData.attendanceData;
                        appData.scheduleData = importedData.scheduleData;
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
