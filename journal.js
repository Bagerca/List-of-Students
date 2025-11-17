// journal.js

let currentDate = new Date().toISOString().split('T')[0];
let getAppData, saveData, fullRender;

let datePicker, prevDayBtn, nextDayBtn, sheetDateDisplay, studentListContainer, 
    downloadBtn, copyBtn, statsContainer;

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

function formatDate(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function updateStats() {
    const appData = getAppData();
    const dayData = appData.attendanceData[currentDate] || {};
    const total = appData.students.length;
    let presentCount = 0, lateCount = 0, absentCount = 0;

    appData.students.forEach(student => {
        const status = dayData[student];
        if (!status) return;

        const statusArray = Array.isArray(status) ? status : [status];
        const increment = 1 / statusArray.length;

        statusArray.forEach(s => {
            if (s === 'present' || s === 'late') presentCount += increment;
            if (s === 'late') lateCount += increment;
            if (['absent', 'sick', 'excused'].includes(s)) absentCount += increment;
        });
    });
    
    statsContainer.innerHTML = `Присутствует: <strong>${Number(presentCount.toFixed(1))}/${total}</strong> &nbsp;·&nbsp; Опоздало: <strong>${Number(lateCount.toFixed(1))}</strong> &nbsp;·&nbsp; Отсутствует: <strong>${Number(absentCount.toFixed(1))}</strong>`;
}

export function renderJournal() {
    const appData = getAppData();
    sheetDateDisplay.textContent = formatDate(currentDate);
    statsContainer.style.display = '';
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    
    const { students = [], attendanceData = {} } = appData;
    studentListContainer.innerHTML = '';
    if (students.length === 0) {
        studentListContainer.innerHTML = `<p style="text-align:center; color: var(--secondary-text-color); padding: 20px;">Список учеников пуст.</p>`;
    } else {
        students.forEach(name => {
            const row = document.createElement('div');
            row.className = 'student-row';
            row.dataset.name = name;
            const currentDayData = attendanceData[currentDate] || {};
            const studentStatus = currentDayData[name];

            row.innerHTML = `<div class="student-name clickable">${name}</div><div class="status-buttons">
                ${Object.keys(statuses).map(key => {
                    let classes = `status-${key}`;
                    if (typeof studentStatus === 'string' && studentStatus === key) {
                        classes += ' active';
                    } else if (Array.isArray(studentStatus)) {
                        if (studentStatus[0] === key) classes += ' active-half status-half-left';
                        if (studentStatus[1] === key) classes += ' active-half status-half-right';
                    }
                    return `<button class="${classes}" data-status="${key}" title="${statuses[key].text}">
                                ${statusIcons[key]}
                            </button>`;
                }).join('')}</div>`;
            studentListContainer.appendChild(row);
        });
    }
    updateStats();
}

export function showDayOffMessageInJournal() {
    sheetDateDisplay.textContent = formatDate(currentDate);
    statsContainer.style.display = 'none';
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    studentListContainer.innerHTML = `
        <div class="day-off-message">
            <span class="emoji">🌴</span>
            Выходной день
        </div>
    `;
}

function handleStatusClick(e) {
    const appData = getAppData();
    const button = e.target.closest('button[data-status]');
    if (!button) return;
    
    const row = button.closest('.student-row');
    const name = row.dataset.name;
    const clickedStatus = button.dataset.status;

    if (!appData.attendanceData[currentDate]) appData.attendanceData[currentDate] = {};
    let currentStatus = appData.attendanceData[currentDate][name];
    
    if (typeof currentStatus === 'string') {
        if (currentStatus === clickedStatus) delete appData.attendanceData[currentDate][name];
        else appData.attendanceData[currentDate][name] = [currentStatus, clickedStatus];
    } else if (Array.isArray(currentStatus)) {
        const statusIndex = currentStatus.indexOf(clickedStatus);
        if (statusIndex > -1) {
            currentStatus.splice(statusIndex, 1);
            appData.attendanceData[currentDate][name] = currentStatus[0];
        } else {
            currentStatus[1] = clickedStatus;
            appData.attendanceData[currentDate][name] = currentStatus;
        }
    } else {
        appData.attendanceData[currentDate][name] = clickedStatus;
    }
    saveData();
}

function changeDate(offset) {
    const currentDateObj = new Date(currentDate + 'T00:00:00');
    currentDateObj.setDate(currentDateObj.getDate() + offset);
    currentDate = currentDateObj.toISOString().split('T')[0];
    datePicker.value = currentDate;
    fullRender();
}

export function initJournal(_getAppData, _saveData, _fullRender) {
    getAppData = _getAppData;
    saveData = _saveData;
    fullRender = _fullRender;

    datePicker = document.getElementById('date-picker');
    prevDayBtn = document.getElementById('prev-day-btn');
    nextDayBtn = document.getElementById('next-day-btn');
    sheetDateDisplay = document.getElementById('sheet-date-display');
    studentListContainer = document.getElementById('student-list-container');
    downloadBtn = document.getElementById('download-btn');
    copyBtn = document.getElementById('copy-btn');
    statsContainer = document.getElementById('stats');

    datePicker.value = currentDate;

    datePicker.addEventListener('change', e => { 
        currentDate = e.target.value; 
        fullRender();
    });
    prevDayBtn.addEventListener('click', () => changeDate(-1));
    nextDayBtn.addEventListener('click', () => changeDate(1));

    studentListContainer.addEventListener('click', e => {
        if (document.body.classList.contains('guest-mode')) return;
        handleStatusClick(e);
    });
    
    copyBtn.addEventListener('click', () => {
        const appData = getAppData();
        const dayData = appData.attendanceData[currentDate] || {};
        let reportText = `Отчет о посещаемости за ${formatDate(currentDate)}:\n\n`;
        appData.students.forEach(name => {
            const status = dayData[name];
            let statusText = 'Не отмечен';
            if (typeof status === 'string') {
                statusText = statuses[status]?.text || 'Не отмечен';
            } else if (Array.isArray(status)) {
                statusText = status.map(s => statuses[s]?.text).join(' / ');
            }
            reportText += `${name}: ${statusText}\n`;
        });
        navigator.clipboard.writeText(reportText);
    });

    downloadBtn.addEventListener('click', () => {
        html2canvas(document.getElementById('attendance-sheet'), { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `attendance-${currentDate}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    return { getCurrentDate: () => currentDate };
}
