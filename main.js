import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import { initJournal, renderJournal, showDayOffMessageInJournal } from './journal.js';
import { initSchedule, renderSchedule } from './schedule.js';
import { initUI, renderChart, setChartDateRange, openStudentStatsModal } from './ui.js';

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
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'true';

let appData = {
    students: [],
    attendanceData: {},
    scheduleData: {}
};

const getAppData = () => appData;

function saveData() {
    if (isAdmin) {
        set(ref(database, 'journalData'), appData);
    }
}

function isSchoolDay(dateString) {
    const day = new Date(dateString + 'T00:00:00').getDay();
    const scheduleData = appData.scheduleData || {};
    // День является учебным, если для него есть запись, и она не null
    return scheduleData[day] !== undefined && scheduleData[day] !== null;
}

function fullRender() {
    const currentDate = journalAPI.getCurrentDate();
    
    if (isSchoolDay(currentDate)) {
        renderJournal();
    } else {
        showDayOffMessageInJournal();
    }
    
    renderSchedule();
    renderChart();
}

let journalAPI, scheduleAPI;

function init() {
    if (!isAdmin) {
        document.body.classList.add('guest-mode');
    } else {
        document.title += " [Admin]";
    }

    journalAPI = initJournal(getAppData, saveData, fullRender);
    scheduleAPI = initSchedule(getAppData, saveData, fullRender);
    initUI(getAppData, saveData, isAdmin);
    
    // Восстанавливаем обработчик клика по имени студента
    document.getElementById('student-list-container').addEventListener('click', (e) => {
        const studentNameDiv = e.target.closest('.student-name.clickable');
        if (studentNameDiv) {
            const studentName = studentNameDiv.closest('.student-row').dataset.name;
            openStudentStatsModal(studentName);
        }
    });

    const appDataRef = ref(database, 'journalData');
    onValue(appDataRef, (snapshot) => {
        const data = snapshot.val() || {};
        
        appData.students = data.students || [];
        appData.attendanceData = data.attendanceData || {};
        appData.scheduleData = data.scheduleData || {};

        if (!snapshot.val() && isAdmin) {
            saveData();
        }

        const allDates = Object.keys(appData.attendanceData || {}).sort();
        const today = journalAPI.getCurrentDate();
        if (allDates.length > 0) {
            const endDate = allDates[allDates.length - 1] > today ? allDates[allDates.length - 1] : today;
            setChartDateRange(allDates[0], endDate);
        } else {
            setChartDateRange(today, today);
        }

        fullRender();
    });
}

document.addEventListener('DOMContentLoaded', init);
