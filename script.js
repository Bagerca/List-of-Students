document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы DOM ---
    const datePicker = document.getElementById('date-picker');
    const studentListContainer = document.getElementById('student-list-container');
    const downloadBtn = document.getElementById('download-btn');
    const statsContainer = document.getElementById('stats');
    
    // Элементы модального окна
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const studentListEditor = document.getElementById('student-list-editor');

    // --- Данные ---
    let students = [];
    let attendanceData = {};
    let currentDate = new Date().toISOString().split('T')[0];

    // Список учеников по умолчанию
    const defaultStudents = [
        'Айрапетянц София', 'Беляев Дмитрий', 'Божеский Артём', 'Бунковская Вероника',
        'Валеева Ульяна', 'Воробель Елизавета', 'Гатикоева Карина', 'Герасимова Полина',
        'Горлов Максим', 'Демидович Вероника', 'Дрыбалов Андрей', 'Елсукова Кира',
        'Ермуханов Жанахмед', 'Калинина Лиана', 'Кочмар Евгения', 'Леонтьева Елизавета',
        'Надьярная Елизавета', 'Очакова Ксения', 'Пяжиева Алина', 'Радивилов Кирилл',
        'Рыбак Григорий', 'Шарин Кирилл', 'Шилова Екатерина', 'Янцевич Полина'
    ];

    const statuses = {
        present: { icon: '✅', class: 'status-present', text: 'Присутствовал' },
        late:    { icon: '🕒', class: 'status-late', text: 'Опоздал' },
        absent:  { icon: '❌', class: 'status-absent', text: 'Отсутствовал' },
        sick:    { icon: '⚕️', class: 'status-sick', text: 'Болел' }
    };

    // --- Функции ---

    // Загрузка данных из localStorage
    function loadData() {
        const savedStudents = localStorage.getItem('students');
        students = savedStudents ? JSON.parse(savedStudents) : defaultStudents;

        const savedAttendance = localStorage.getItem('attendanceData');
        attendanceData = savedAttendance ? JSON.parse(savedAttendance) : {};
    }

    // Сохранение данных в localStorage
    function saveData() {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
    }

    // Отрисовка списка учеников
    function renderStudents() {
        studentListContainer.innerHTML = '';
        if (!attendanceData[currentDate]) {
            attendanceData[currentDate] = {};
        }

        students.forEach(name => {
            const row = document.createElement('div');
            row.className = 'student-row';
            row.dataset.name = name;

            const studentName = document.createElement('div');
            studentName.className = 'student-name';
            studentName.textContent = name;

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'status-buttons';

            for (const key in statuses) {
                const button = document.createElement('button');
                button.innerHTML = statuses[key].icon;
                button.dataset.status = key;
                button.className = statuses[key].class;
                button.title = statuses[key].text;

                if (attendanceData[currentDate][name] === key) {
                    button.classList.add('active');
                }
                
                button.addEventListener('click', () => handleStatusClick(name, key));
                buttonsContainer.appendChild(button);
            }

            row.appendChild(studentName);
            row.appendChild(buttonsContainer);
            studentListContainer.appendChild(row);
        });

        updateStats();
    }

    // Обработка клика по статусу
    function handleStatusClick(name, status) {
        const currentStatus = attendanceData[currentDate][name];
        
        // Если нажимаем на активную кнопку - снимаем статус
        if (currentStatus === status) {
            delete attendanceData[currentDate][name];
        } else {
            attendanceData[currentDate][name] = status;
        }

        saveData();
        
        // Обновляем только одну строку для производительности
        const row = document.querySelector(`.student-row[data-name="${name}"]`);
        if (row) {
            row.querySelectorAll('.status-buttons button').forEach(btn => {
                btn.classList.remove('active');
            });
            if (attendanceData[currentDate][name]) {
                row.querySelector(`button[data-status="${status}"]`).classList.add('active');
            }
        }
        updateStats();
    }

    // Обновление статистики
    function updateStats() {
        const dayData = attendanceData[currentDate] || {};
        const total = students.length;
        let present = 0, late = 0, absent = 0, sick = 0;

        Object.values(dayData).forEach(status => {
            if (status === 'present') present++;
            if (status === 'late') late++;
            if (status === 'absent') absent++;
            if (status === 'sick') sick++;
        });

        statsContainer.innerHTML = `
            Присутствует: <strong>${present + late} / ${total}</strong> | 
            Опоздало: <strong>${late}</strong> | 
            Отсутствует: <strong>${absent + sick}</strong>
        `;
    }

    // Инициализация
    function init() {
        datePicker.value = currentDate;
        loadData();
        renderStudents();

        datePicker.addEventListener('change', (e) => {
            currentDate = e.target.value;
            renderStudents();
        });

        downloadBtn.addEventListener('click', () => {
            // Временно убираем тень для чистого скриншота
            const sheet = document.getElementById('attendance-sheet');
            sheet.style.boxShadow = 'none';

            html2canvas(sheet).then(canvas => {
                const link = document.createElement('a');
                link.download = `посещаемость-${currentDate}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                // Возвращаем тень
                sheet.style.boxShadow = '';
            });
        });

        // Логика модального окна
        settingsBtn.onclick = () => {
            studentListEditor.value = students.join('\n');
            settingsModal.style.display = 'flex';
        };
        closeModalBtn.onclick = () => {
            settingsModal.style.display = 'none';
        };
        window.onclick = (event) => {
            if (event.target == settingsModal) {
                settingsModal.style.display = 'none';
            }
        };
        saveSettingsBtn.onclick = () => {
            const newStudents = studentListEditor.value.split('\n').map(s => s.trim()).filter(s => s);
            students = newStudents;
            saveData();
            renderStudents();
            settingsModal.style.display = 'none';
        };
    }

    init();
});
