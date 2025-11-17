import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import { initJournal, renderJournal } from './journal.js';
import { initSchedule, renderSchedule } from './schedule.js';
import { initUI } from './ui.js';

// --- 1. FIREBASE И ГЛОБАЛЬНОЕ СОСТОЯНИЕ ---
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

// Центральное хранилище данных приложения
let appData = {
    students: [],
    attendanceData: {},
    scheduleData: {}
};

// Функция для сохранения данных, передается в модули
function saveData() {
    if (isAdmin) {
        set(ref(database, 'journalData'), appData);
    }
}

// --- 2. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
function init() {
    if (!isAdmin) {
        document.body.classList.add('guest-mode');
    } else {
        document.title += " [Admin]";
    }

    // Инициализируем каждый модуль
    const journalAPI = initJournal(appData, saveData);
    const scheduleAPI = initSchedule(appData, saveData);
    initUI(appData, saveData, isAdmin);

    // Главный слушатель данных из Firebase
    const appDataRef = ref(database, 'journalData');
    onValue(appDataRef, (snapshot) => {
        const data = snapshot.val();
        
        // Обновляем глобальное состояние с данными из Firebase или значениями по умолчанию
        appData.students = (data && data.students) || [];
        appData.attendanceData = (data && data.attendanceData) || {};
        appData.scheduleData = (data && data.scheduleData) || {};

        if (!data && isAdmin) {
            saveData(); // Первоначальное сохранение, если база пуста
        }

        // Получаем текущие даты из модулей
        const currentDate = journalAPI.getCurrentDate();
        const currentWeekStart = scheduleAPI.getCurrentWeekStart();

        // Перерисовываем интерфейс с новыми данными
        renderJournal(appData, currentDate);
        renderSchedule(appData, currentWeekStart);
    });
}

// Запускаем приложение после полной загрузки страницы
document.addEventListener('DOMContentLoaded', init);
