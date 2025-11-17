// schedule.js

let currentWeekStart;
let scheduleContainer, weekDisplay, prevWeekBtn, nextWeekBtn;

const weekDays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

function getWeekStart(date) {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник - первый день недели
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
}

export function renderSchedule(appData) {
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

        let contentHTML = `
            <div class="day-card-header">
                <h3>${weekDays[dayIndex]}</h3>
                <span class="date">${dayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
            </div>`;
        
        if (dayData && dayData.lessons && dayData.lessons.length > 0) {
            const lessonsList = Array.isArray(dayData.lessons) ? dayData.lessons.join('\n') : dayData.lessons;
            card.innerHTML += `
                <ul class="lessons-list">
                    ${(dayData.lessons || []).map(lesson => `<li>${lesson}</li>`).join('')}
                </ul>
                <textarea class="schedule-editor lessons-editor">${lessonsList}</textarea>
                <div class="homework">
                    <h4>Домашнее задание</h4>
                    <p class="homework-content">${dayData.homework || 'Нет'}</p>
                    <textarea class="schedule-editor homework-editor">${dayData.homework || ''}</textarea>
                </div>
            `;
        } else {
            card.classList.add('day-off');
            card.innerHTML += `<div class="day-off-message"><span class="emoji">🎉</span>ВЫХОДНОЙ</div>`;
        }

        if (!document.body.classList.contains('guest-mode')) {
            card.innerHTML += `
                <button class="edit-schedule-btn" title="Редактировать">✏️</button>
                <div class="edit-controls">
                    <button class="primary-button save-btn">✓ Сохранить</button>
                    <button class="secondary-button cancel-btn">✗ Отмена</button>
                </div>
            `;
        }
        
        scheduleContainer.appendChild(card);
    }
}

function changeWeek(offset, appData) {
    currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
    renderSchedule(appData);
}

function enterEditMode(card) {
    card.classList.add('is-editing');
}

function exitEditMode(card) {
    card.classList.remove('is-editing');
    // Сбрасываем значения textarea на случай, если пользователь нажал "Отмена"
    const dayIndex = card.dataset.dayIndex;
    const dayData = window.appDataForSchedule.scheduleData[dayIndex] || { lessons: [], homework: '' };
    card.querySelector('.lessons-editor').value = Array.isArray(dayData.lessons) ? dayData.lessons.join('\n') : '';
    card.querySelector('.homework-editor').value = dayData.homework || '';
}

export function initSchedule(appData, saveData) {
    scheduleContainer = document.getElementById('schedule-container');
    weekDisplay = document.getElementById('week-display');
    prevWeekBtn = document.getElementById('prev-week-btn');
    nextWeekBtn = document.getElementById('next-week-btn');
    
    currentWeekStart = getWeekStart(new Date().toISOString().split('T')[0]);

    prevWeekBtn.addEventListener('click', () => changeWeek(-1, appData));
    nextWeekBtn.addEventListener('click', () => changeWeek(1, appData));

    scheduleContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.day-card');
        if (!card) return;

        const dayIndex = card.dataset.dayIndex;

        if (e.target.classList.contains('edit-schedule-btn')) {
            enterEditMode(card);
        }

        if (e.target.classList.contains('cancel-btn')) {
            // Просто выходим из режима редактирования, не сохраняя
            // Данные сбросятся при следующем рендере, либо можно сделать это вручную
            card.classList.remove('is-editing');
        }

        if (e.target.classList.contains('save-btn')) {
            const lessonsText = card.querySelector('.lessons-editor').value;
            const homeworkText = card.querySelector('.homework-editor').value;

            const newLessons = lessonsText.split('\n').map(s => s.trim()).filter(Boolean);

            if (newLessons.length === 0 && !homeworkText) {
                appData.scheduleData[dayIndex] = null; // День стал выходным
            } else {
                appData.scheduleData[dayIndex] = {
                    lessons: newLessons,
                    homework: homeworkText.trim()
                };
            }
            
            saveData();
            // Выходить из режима редактирования не нужно, т.к. onValue из main.js все перерисует
        }
    });

    return { getCurrentWeekStart: () => currentWeekStart };
}
