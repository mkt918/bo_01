// ===== UI管理・画面遷移・共有レンダリング =====

import { formatTime } from './utils.js';
import { STORAGE_KEYS } from './data.js';
import { loadFromStorage } from './storage.js';

// ===== ボタンCSS定数 =====
// ===== ボタンCSS定数 (New Design) =====
export const BTN_PRIMARY = 'btn-premium w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2';
export const BTN_SECONDARY = 'btn-glass w-full py-4 rounded-xl font-bold text-slate-500';
export const BTN_WRONG = 'w-full py-4 rounded-xl font-bold border-2 border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 transition-all';

// ===== 画面要素 =====
export const screens = {
    menu: document.getElementById('menu-screen'),
    level: document.getElementById('level-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    history: document.getElementById('history-screen'),
    weak: document.getElementById('weak-screen'),
    sorting: document.getElementById('sorting-screen'),
    calc: document.getElementById('calc-screen'),
    'journal-screen': document.getElementById('journal-screen'),
    statistics: document.getElementById('stats-screen')
};

// ===== DOM要素 =====
export const elements = {
    // メニュー
    wrongCountBadge: document.getElementById('wrong-count-badge'),
    weakReviewBtn: document.getElementById('weak-review-btn'),
    // クイズ
    questionNumber: document.getElementById('question-number'),
    totalQuestions: document.getElementById('total-questions'),
    timerDisplay: document.getElementById('timer-display'),
    progressFill: document.getElementById('progress-fill'),
    accountName: document.getElementById('account-name'),
    feedback: document.getElementById('feedback'),
    feedbackText: document.getElementById('feedback-text'),
    // 仕分けモード
    sortingTimerDisplay: document.getElementById('sorting-timer-display'),
    accountCard: document.getElementById('account-card'),
    cardAccountName: document.getElementById('card-account-name'),
    sortingCurrent: document.getElementById('sorting-current'),
    sortingTotal: document.getElementById('sorting-total'),
    checkAnswersBtn: document.getElementById('check-answers-btn'),
    // 計算モード
    calcTimerDisplay: document.getElementById('calc-timer-display'),
    calcCurrent: document.getElementById('calc-current'),
    calcTotal: document.getElementById('calc-total'),
    calcQuestionText: document.getElementById('calc-question-text'),
    calcDiagram: document.getElementById('calc-diagram'),
    calcAnswerInput: document.getElementById('calc-answer-input'),
    calcInputLabel: document.getElementById('calc-input-label'),
    calcSubmitBtn: document.getElementById('calc-submit-btn'),
    calcFeedback: document.getElementById('calc-feedback'),
    calcFeedbackText: document.getElementById('calc-feedback-text'),
    // 仕訳問題
    journalChoicesContainer: document.getElementById('journal-choices-container'),
    journalFeedback: document.getElementById('journal-feedback'),
    journalFeedbackText: document.getElementById('journal-feedback-text'),
    nextJournalBtn: document.getElementById('next-journal-btn'),
    // 履歴・苦手
    historyList: document.getElementById('history-list'),
    weakList: document.getElementById('weak-list'),
    statsTableBody: document.getElementById('stats-table-body')
};

// タイマー停止コールバック（各モジュールから登録）
const timerStopCallbacks = [];
export function registerTimerStop(fn) { timerStopCallbacks.push(fn); }

// ===== 画面切り替え =====
export function showScreen(screenName) {
    timerStopCallbacks.forEach(fn => fn());
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ===== メニュー更新 =====
export function updateMenu() {
    const wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    if (wrongAnswers.length > 0) {
        elements.wrongCountBadge.textContent = wrongAnswers.length;
        elements.wrongCountBadge.classList.remove('hidden');
        if (elements.weakReviewBtn) {
            elements.weakReviewBtn.disabled = false;
            elements.weakReviewBtn.style.opacity = '1';
        }
    } else {
        elements.wrongCountBadge.classList.add('hidden');
        if (elements.weakReviewBtn) {
            elements.weakReviewBtn.disabled = true;
            elements.weakReviewBtn.style.opacity = '0.5';
        }
    }
}

// ===== トースト通知 =====
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fixed top-4 right-4 bg-white shadow-xl rounded-2xl p-4 z-50 animate-slide-in`;

    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    const flexDiv = document.createElement('div');
    flexDiv.className = 'flex items-center gap-3';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'text-2xl';
    iconSpan.textContent = icon;

    const textP = document.createElement('p');
    textP.className = 'font-semibold';
    textP.textContent = message;

    flexDiv.appendChild(iconSpan);
    flexDiv.appendChild(textP);
    toast.appendChild(flexDiv);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== 共有結果画面レンダリング =====
/**
 * @param {{ title, accuracy, elapsed, correct, total, rank, buttons, extra? }} config
 */
export function renderResultScreen({ title, accuracy, elapsed, correct, total, rank, buttons, extra = null }) {
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-accuracy').textContent = `${accuracy}%`;
    document.getElementById('result-time').textContent = formatTime(elapsed);
    document.getElementById('result-correct-count').textContent = `${correct}/${total}`;

    const rankEl = document.getElementById('result-rank');
    rankEl.textContent = rank.grade;
    rankEl.className = `rank-splash rank-${rank.grade.toLowerCase()}`;
    document.getElementById('result-rank-message').textContent = rank.message;

    const extraEl = document.getElementById('result-extra');
    if (extra) {
        extraEl.innerHTML = extra;
        extraEl.classList.remove('hidden');
    } else {
        extraEl.innerHTML = '';
        extraEl.classList.add('hidden');
    }

    document.getElementById('result-buttons').innerHTML = buttons
        .map(b => `<button id="${b.id}" class="${b.cls}">${b.label}</button>`)
        .join('');

    showScreen('result');
}
