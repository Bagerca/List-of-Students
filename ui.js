// ui.js

let themeToggleBtn, settingsBtn, settingsModal, closeModalBtn,
    studentListEditor, lineNumbers, saveStudentsBtn,
    exportDataBtn, importDataBtn, importFileInput,
    chartCanvas, chartStartDate, chartEndDate;

let attendanceChart = null;

const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeToggleBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
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

// Chart functions remain here
function renderChart(appData) {
    // ... chart rendering logic ...
}

export function initUI(appData, saveData, isAdmin) {
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');
    closeModalBtn = settingsModal.querySelector('.close-btn');
    
    applyTheme(localStorage.getItem('theme') || 'light');
    themeToggleBtn.addEventListener('click', toggleTheme);

    settingsBtn.onclick = () => settingsModal.classList.add('show');
    closeModalBtn.onclick = () => settingsModal.classList.remove('show');
    settingsModal.onclick = e => { if (e.target === settingsModal) settingsModal.classList.remove('show'); };

    if (isAdmin) {
        studentListEditor = document.getElementById('student-list-editor');
        lineNumbers = settingsModal.querySelector('.line-numbers');
        saveStudentsBtn = document.getElementById('save-students-btn');
        exportDataBtn = document.getElementById('export-data-btn');
        importDataBtn = document.getElementById('import-data-btn');
        importFileInput = document.getElementById('import-file-input');
        
        // ===== THIS IS THE CORRECTED BLOCK =====
        settingsBtn.onclick = () => {
            // Populate student list
            studentListEditor.value = (appData.students || []).join('\n');
            updateLineNumbers();
            
            // This part was missing and is now restored
            const scheduleEditor = document.getElementById('schedule-editor');
            if (scheduleEditor) {
                const schedule = appData.schedule || [];
                 scheduleEditor.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = schedule.includes(Number(checkbox.dataset.day));
                });
            }
            
            settingsModal.classList.add('show');
        };
        // ===== END OF CORRECTION =====

        studentListEditor.addEventListener('input', updateLineNumbers);

        saveStudentsBtn.onclick = () => {
            appData.students = studentListEditor.value.split('\n').map(s => s.trim()).filter(Boolean);
            saveData();
            alert('Student list saved!');
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
        
        importDataBtn.onclick = () => { if(importFileInput) importFileInput.click(); };
        importFileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.students && importedData.attendanceData && importedData.scheduleData) {
                        appData.students = importedData.students;
                        appData.attendanceData = importedData.attendanceData;
                        appData.scheduleData = importedData.scheduleData;
                        saveData();
                        settingsModal.classList.remove('show');
                    } else { alert('Invalid file format.'); }
                } catch (error) { alert('Error reading file.'); }
            };
            reader.readAsText(file);
            importFileInput.value = '';
        };
    }
}
