// schedule.js

let currentWeekStart;
let getAppData, saveData;

let scheduleContainer, weekDisplay, prevWeekBtn, nextWeekBtn;

const weekDays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

function getWeekStart(date) {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
}

export function renderSchedule() {
    const appData = getAppData();
    const start = currentWeekStart;
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weekDisplay.textContent = `Неделя: ${formatDate(start)} - ${formatDate(end)}`;

    scheduleContainer.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + i);
        
        const dayIndex = dayDate.getDay();
        const dayData = appData.scheduleData ? (appData.scheduleData[dayIndex] || null) : null;
        
        const card = document.createElement('div');
        card.className = 'day-card';
        card.dataset.dayIndex = dayIndex;
        
        const isDayOff = !dayData || !dayData.lessons || dayData.lessons.length === 0;
        if (isDayOff) {
            card.classList.add('day-off');
        }

        const lessonsText = (dayData && dayData.lessons) ? dayData.lessons.join('\n') : '';
        const homeworkText = (dayData && dayData.homework) ? dayData.homework : '';

        card.innerHTML = `
            <div class="day-card-header">
                <h3>${weekDays[dayIndex]}</h3>
                <span class="date">${dayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
            </div>
            
            <ul class="lessons-list">
                ${(dayData && dayData.lessons ? dayData.lessons : []).map(lesson => `<li>${lesson}</li>`).join('')}
            </ul>
            <textarea class="schedule-editor lessons-editor" placeholder="Урок 1\nУрок 2...">${lessonsText}</textarea>
            
            ${isDayOff ? '<div class="day-off-message"><span class="emoji">🎉</span>ВЫХОДНОЙ</div>' : ''}

            <div class="homework">
                <h4>Домашнее задание</h4>
                <p class="homework-content">${homeworkText || 'Нет'}</p>
                <textarea class="schedule-editor homework-editor" placeholder="Текст домашнего задания...">${homeworkText}</textarea>
            </div>
            
            ${document.body.classList.contains('guest-mode') ? '' : `
                <button class="edit-schedule-btn" title="Редактировать">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <div class="edit-controls">
                    <button class="primary-button save-btn">✓ Сохранить</button>
                    <button class="secondary-button cancel-btn">✗ Отмена</button>
                </div>
            `}
        `;
        
        scheduleContainer.appendChild(card);
    }
}

function changeWeek(offset) {
    currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
    renderSchedule();
}

export function initSchedule(_getAppData, _saveData) {
    getAppData = _getAppData;
    saveData = _saveData;

    scheduleContainer = document.getElementById('schedule-container');
    weekDisplay = document.getElementById('week-display');
    prevWeekBtn = document.getElementById('prev-week-btn');
    nextWeekBtn = document.getElementById('next-week-btn');
    
    currentWeekStart = getWeekStart(new Date().toISOString().split('T')[0]);

    prevWeekBtn.addEventListener('click', () => changeWeek(-1));
    nextWeekBtn.addEventListener('click', () => changeWeek(1));

    scheduleContainer.addEventListener('click', (e) => {
        const appData = getAppData();
        const card = e.target.closest('.day-card');
        if (!card) return;

        const dayIndex = card.dataset.dayIndex;

        if (e.target.closest('.edit-schedule-btn')) {
            card.classList.add('is-editing');
        }

        if (e.target.closest('.cancel-btn')) {
            const originalData = appData.scheduleData[dayIndex] || { lessons: [], homework: '' };
            card.querySelector('.lessons-editor').value = (originalData.lessons || []).join('\n');
            card.querySelector('.homework-editor').value = originalData.homework || '';
            card.classList.remove('is-editing');
        }

        if (e.target.closest('.save-btn')) {
            const lessonsText = card.querySelector('.lessons-editor').value;
            const homeworkText = card.querySelector('.homework-editor').value;

            const newLessons = lessonsText.split('\n').map(s => s.trim()).filter(Boolean);

            if (newLessons.length === 0 && !homeworkText.trim()) {
                appData.scheduleData[dayIndex] = null;
            } else {
                appData.scheduleData[dayIndex] = {
                    lessons: newLessons,
                    homework: homeworkText.trim()
                };
            }
            
            saveData();
        }
    });

    return { getCurrentWeekStart: () => currentWeekStart };
}
