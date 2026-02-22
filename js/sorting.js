// ===== 仕分けモード =====

import { LEVEL_DATA, accountDatabase, currentLevel, setAccountDatabase, setCurrentLevel } from './data.js';
import { shuffleArray, calculateRank, createTimer } from './utils.js';
import {
    elements, BTN_PRIMARY, BTN_SECONDARY,
    showScreen, renderResultScreen
} from './ui.js';
import { updateAccountStats } from './storage.js';
import { gameState, saveHistory } from './quiz.js';

// ===== 仕分けモード状態 =====
export const sortingState = {
    questions: [],
    currentIndex: 0,
    placements: {},
    startTime: null,
    elapsedTime: 0,
    timerInterval: null,
    draggedAccount: null
};

export const sortingTimer = createTimer(sortingState, elements.sortingTimerDisplay);

// ===== モード開始 =====
export function startSortingMode() {
    let db = accountDatabase;
    if (!db || Object.keys(db).length === 0) {
        setAccountDatabase(LEVEL_DATA['L1'].data);
        setCurrentLevel(LEVEL_DATA['L1']);
        db = LEVEL_DATA['L1'].data;
    }

    const allQuestions = [];
    for (const [category, accounts] of Object.entries(db)) {
        for (const account of accounts) {
            allQuestions.push({ account, answer: category });
        }
    }

    sortingState.questions = shuffleArray(allQuestions);
    sortingState.currentIndex = 0;
    sortingState.placements = {};
    sortingState.elapsedTime = 0;

    document.querySelectorAll('.dropped-items').forEach(zone => { zone.innerHTML = ''; });

    elements.sortingTotal.textContent = sortingState.questions.length;
    elements.sortingTimerDisplay.textContent = '00:00';
    elements.checkAnswersBtn.classList.add('hidden');
    elements.accountCard.classList.remove('hidden');

    sortingTimer.start();
    showNextCard();
    showScreen('sorting');
}

// ===== 次のカード表示 =====
export function showNextCard() {
    if (sortingState.currentIndex >= sortingState.questions.length) {
        elements.accountCard.classList.add('hidden');
        elements.checkAnswersBtn.classList.remove('hidden');
        sortingTimer.stop();
        return;
    }
    const question = sortingState.questions[sortingState.currentIndex];
    elements.cardAccountName.textContent = question.account;
    elements.sortingCurrent.textContent = sortingState.currentIndex + 1;
}

// ===== ドラッグ&ドロップ初期化 =====
export function initDragAndDrop() {
    const card = elements.accountCard;

    card.addEventListener('dragstart', (e) => {
        sortingState.draggedAccount = elements.cardAccountName.textContent;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (sortingState.draggedAccount) {
                placeAccount(sortingState.draggedAccount, zone.dataset.category, zone);
                sortingState.draggedAccount = null;
            }
        });

        zone.addEventListener('click', () => {
            if (sortingState.currentIndex < sortingState.questions.length) {
                const account = elements.cardAccountName.textContent;
                placeAccount(account, zone.dataset.category, zone);
            }
        });
    });
}

// ===== カード配置 =====
function placeAccount(account, category, zone) {
    sortingState.placements[account] = category;
    const droppedItem = document.createElement('span');
    droppedItem.className = 'dropped-item';
    droppedItem.textContent = account;
    droppedItem.dataset.account = account;
    zone.querySelector('.dropped-items').appendChild(droppedItem);
    sortingState.currentIndex++;
    showNextCard();
}

// ===== 答え合わせ =====
export function checkSortingAnswers() {
    let correctCount = 0;
    const wrongAnswers = [];

    for (const question of sortingState.questions) {
        const placed = sortingState.placements[question.account];
        const isCorrect = placed === question.answer;

        if (isCorrect) {
            correctCount++;
        } else {
            wrongAnswers.push({
                account: question.account,
                placed,
                correct: question.answer
            });
        }

        const item = document.querySelector(`.dropped-item[data-account="${question.account}"]`);
        if (item) item.classList.add(isCorrect ? 'correct' : 'incorrect');
        updateAccountStats(question.account, question.answer, isCorrect);

        if (isCorrect) {
            removeFromWrongAnswers(question);
        } else {
            import('./storage.js').then(storage => {
                storage.addToWrongAnswers(question, currentLevel ? currentLevel.id : 'L1', 'sorting');
            });
        }
    }

    setTimeout(() => { showSortingResult(correctCount, wrongAnswers); }, 1500);
}

// ===== 結果表示 =====
export function showSortingResult(correctCount, wrongAnswers) {
    const total = sortingState.questions.length;
    const accuracy = Math.round((correctCount / total) * 100);
    const rank = calculateRank(accuracy, sortingState.elapsedTime);

    gameState.correctCount = correctCount;
    gameState.totalQuestions = total;
    saveHistory(accuracy, rank.grade, '仕訳モード');

    const extra = wrongAnswers.length > 0
        ? `<div class="bg-rose-50 rounded-2xl p-6 text-left">
                <h3 class="text-rose-600 font-bold mb-3 flex items-center gap-2">⚠️ 間違えた問題</h3>
                <div class="text-sm text-rose-500 space-y-1">
                    ${wrongAnswers.map(item => `<div class="wrong-answer-item">
                        <span class="wrong-answer-account">${item.account}</span>
                        <span class="wrong-answer-info">${item.placed} → <span class="correct-answer">${item.correct}</span></span>
                    </div>`).join('')}
                </div>
            </div>`
        : null;

    renderResultScreen({
        title: '分類完了！',
        accuracy, elapsed: sortingState.elapsedTime,
        correct: correctCount, total, rank,
        buttons: [
            { id: 'sorting-retry-btn', cls: BTN_PRIMARY, label: 'もう一度挑戦' },
            { id: 'sorting-menu-btn', cls: BTN_SECONDARY, label: 'メニューに戻る' }
        ],
        extra
    });
}
