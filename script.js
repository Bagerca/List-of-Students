document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы DOM ---
    const datePicker = document.getElementById('date-picker');
    const sheetDateDisplay = document.getElementById('sheet-date-display');
    const studentListContainer = document.getElementById('student-list-container');
    const downloadBtn = document.getElementById('download-btn');
    const statsContainer = document.getElementById('stats');
    
    // Модальное окно
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const studentListEditor = document.getElementById('student-list-editor');

    // --- Данные ---
    let students = [];
    let attendanceData = {};
    let currentDate = new Date().toISOString().split('T')[0];

    const defaultStudents = [
        'Айрапетянц София', 'Беляев Дмитрий', 'Божеский Артём', 'Бунковская Вероника',
        'Валеева Ульяна', 'Воробель Елизавета', 'Гатикоева Карина', 'Герасимова Полина',
        'Горлов Максим', 'Демидович Вероника', 'Дрыбалов Андрей', 'Елсукова Кира',
        'Ермуханов Жанахмед', 'Калинина Лиана', 'Кочмар Евгения', 'Леонтьева Елизавета',
        'Надьярная Елизавета', 'Очакова Ксения', 'Пяжиева Алина', 'Радивилов Кирилл',
        'Рыбак Григорий', 'Шарин Кирилл', 'Шилова Екатерина', 'Янцевич Полина'
    ];

    const statuses = {
        present: { class: 'status-present', text: 'Присутствовал' },
        late:    { class: 'status-late', text: 'Опоздал' },
        absent:  { class: 'status-absent', text: 'Отсутствовал' },
        sick:    { class: 'status-sick', text: 'Болел' }
    };

    // SVG иконки для статусов
    const statusIcons = {
        present: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        late: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        absent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        sick: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.7-1.5L11.5 13l1.5-2.5L14.5 12H21"></path></svg>`
    };

    // --- Функции ---

    function loadData() {
        students = JSON.parse(localStorage.getItem('students')) || defaultStudents;
        attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || {};
    }

    function saveData() {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00'); // Fix for timezone issues
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function render() {
        sheetDateDisplay.textContent = formatDate(currentDate);
        studentListContainer.innerHTML = '';
        
        if (!attendanceData[currentDate]) {
            attendanceData[currentDate] = {};
        }

        students.forEach(name => {
            const row = document.createElement('div');
            row.className = 'student-row';
            row.dataset.name = name;

            row.innerHTML = `
                <div class="student-name">${name}</div>
                <div class="status-buttons">
                    ${Object.keys(statuses).map(key => `
                        <button class="${statuses[key].class} ${attendanceData[currentDate][name] === key ? 'active' : ''}" data-status="${key}" title="${statuses[key].text}">
                            ${statusIcons[key]}
                        </button>
                    `).join('')}
                </div>
            `;
            studentListContainer.appendChild(row);
        });

        updateStats();
    }
    
    function handleStatusClick(e) {
        const button = e.target.closest('button[data-status]');
        if (!button) return;

        const row = button.closest('.student-row');
        const name = row.dataset.name;
        const status = button.dataset.status;
        const currentStatus = attendanceData[currentDate][name];

        if (currentStatus === status) {
            delete attendanceData[currentDate][name];
            button.classList.remove('active');
        } else {
            attendanceData[currentDate][name] = status;
            row.querySelectorAll('.status-buttons button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }

        saveData();
        updateStats();
    }

    function updateStats() {
        const dayData = attendanceData[currentDate] || {};
        const total = students.length;
        let presentCount = 0, lateCount = 0, absentCount = 0;

        Object.values(dayData).forEach(status => {
            if (status === 'present' || status === 'late') presentCount++;
            if (status === 'late') lateCount++;
            if (status === 'absent' || status === 'sick') absentCount++;
        });

        statsContainer.innerHTML = `
            Присутствует: <strong>${presentCount}/${total}</strong>
            &nbsp;·&nbsp; Опоздало: <strong>${lateCount}</strong>
            &nbsp;·&nbsp; Отсутствует: <strong>${absentCount}</strong>
        `;
    }

    function init() {
        loadData();
        datePicker.value = currentDate;
        render();

        datePicker.addEventListener('change', (e) => {
            currentDate = e.target.value;
            render();
        });

        studentListContainer.addEventListener('click', handleStatusClick);

        downloadBtn.addEventListener('click', () => {
            const sheet = document.getElementById('attendance-sheet');
            // Увеличиваем качество рендера
            html2canvas(sheet, { scale: 2 }).then(canvas => {
                const link = document.createElement('a');
                link.download = `attendance-${currentDate}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });

        // --- Логика модального окна ---
        settingsBtn.onclick = () => {
            studentListEditor.value = students.join('\n');
            settingsModal.classList.add('show');
        };
        const closeModal = () => settingsModal.classList.remove('show');
        
        closeModalBtn.onclick = closeModal;
        settingsModal.onclick = (event) => {
            if (event.target === settingsModal) closeModal();
        };
        
        saveSettingsBtn.onclick = () => {
            students = studentListEditor.value.split('\n').map(s => s.trim()).filter(Boolean);
            saveData();
            render();
            closeModal();
        };
    }

    init();
});
