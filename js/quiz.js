// ===== クイズモード =====

import { STORAGE_KEYS, accountDatabase, currentLevel } from './data.js';
import { shuffleArray, calculateRank, createTimer } from './utils.js';
import {
    elements, BTN_PRIMARY, BTN_SECONDARY, BTN_WRONG,
    showScreen, showToast, updateMenu, renderResultScreen
} from './ui.js';
import { loadFromStorage, saveToStorage, addToWrongAnswers, removeFromWrongAnswers, updateAccountStats } from './storage.js';

// ===== ゲーム状態 =====
export const gameState = {
    currentQuestion: 0,
    correctCount: 0,
    totalQuestions: 10,
    questions: [],
    startTime: null,
    elapsedTime: 0,
    timerInterval: null,
    isAnswered: false,
    wrongAnswers: [],
    mode: 'normal'
};

export const quizTimer = createTimer(gameState, elements.timerDisplay);

// ===== 問題生成 =====
export function generateQuestions() {
    const allQuestions = [];
    for (const [category, accounts] of Object.entries(accountDatabase)) {
        for (const account of accounts) {
            allQuestions.push({ account, answer: category });
        }
    }
    const shuffled = shuffleArray(allQuestions);
    const questionCount = Math.min(gameState.totalQuestions, shuffled.length);
    return shuffled.slice(0, questionCount);
}

// ===== ゲーム開始 =====
/**
 * @param {boolean} [useExistingQuestions=false] - trueの場合、設定済みのgameState.questionsを使用する
 */
export function startGame(useExistingQuestions = false) {
    if (!useExistingQuestions) {
        gameState.questions = generateQuestions();
        gameState.totalQuestions = gameState.questions.length;
    }
    gameState.currentQuestion = 0;
    gameState.correctCount = 0;
    gameState.elapsedTime = 0;
    gameState.isAnswered = false;
    gameState.wrongAnswers = [];

    elements.timerDisplay.textContent = '00:00';
    elements.totalQuestions.textContent = gameState.totalQuestions;
    elements.feedback.classList.add('hidden');

    showScreen('quiz');
    quizTimer.start();
    showQuestion();
}

// ===== 問題表示 =====
export function showQuestion() {
    const question = gameState.questions[gameState.currentQuestion];
    elements.questionNumber.textContent = gameState.currentQuestion + 1;

    const progress = ((gameState.currentQuestion + 1) / gameState.totalQuestions) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.accountName.textContent = question.account;

    document.querySelectorAll('.table-cell').forEach(cell => {
        cell.disabled = false;
        cell.classList.remove('correct', 'incorrect');
    });

    elements.feedback.classList.add('hidden');
    elements.feedback.classList.remove('correct', 'incorrect');
    gameState.isAnswered = false;
}

// ===== 解答処理 =====
export function handleAnswer(selectedAnswer, clickedCell) {
    if (gameState.isAnswered) return;
    gameState.isAnswered = true;

    const question = gameState.questions[gameState.currentQuestion];
    const isCorrect = selectedAnswer === question.answer;

    document.querySelectorAll('.table-cell').forEach(cell => {
        cell.disabled = true;
        if (cell.dataset.answer === question.answer) cell.classList.add('correct');
        if (cell === clickedCell && !isCorrect) cell.classList.add('incorrect');
    });

    updateAccountStats(question.account, question.answer, isCorrect);

    if (isCorrect) {
        gameState.correctCount++;
        removeFromWrongAnswers(question);
    } else {
        gameState.wrongAnswers.push(question);
        addToWrongAnswers(question, currentLevel ? currentLevel.id : 'L1', null);
    }

    elements.feedback.classList.remove('hidden', 'correct', 'incorrect');
    elements.feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    elements.feedbackText.textContent = isCorrect
        ? '⭕ 正解！'
        : `❌ 不正解... 正解は「${question.answer}」`;

    setTimeout(() => {
        gameState.currentQuestion++;
        if (gameState.currentQuestion >= gameState.totalQuestions) {
            endGame();
        } else {
            showQuestion();
        }
    }, 1200);
}

// ===== ゲーム終了 =====
export function endGame() {
    quizTimer.stop();
    const accuracy = Math.round((gameState.correctCount / gameState.totalQuestions) * 100);
    const rank = calculateRank(accuracy, gameState.elapsedTime);
    saveHistory(accuracy, rank.grade, 'クイズモード');

    if (gameState.mode === 'retry') {
        showToast('復習が完了しました！', 'success');
        updateMenu();
        showScreen('menu');
        return;
    }

    const buttons = [
        { id: 'retry-btn', cls: BTN_PRIMARY, label: 'もう一度挑戦' },
        ...(gameState.wrongAnswers.length > 0
            ? [{ id: 'retry-wrong-result-btn', cls: BTN_WRONG, label: '🔄間違えた問題だけ復習' }]
            : []),
        { id: 'menu-btn', cls: BTN_SECONDARY, label: 'メニューに戻る' }
    ];

    renderResultScreen({
        title: 'クイズ完了！',
        accuracy, elapsed: gameState.elapsedTime,
        correct: gameState.correctCount, total: gameState.totalQuestions,
        rank, buttons
    });
}

// ===== 履歴保存（全モード共有） =====
export function saveHistory(accuracy, rank, modeName) {
    const history = loadFromStorage(STORAGE_KEYS.HISTORY) || [];
    history.unshift({
        date: new Date().toISOString(),
        level: currentLevel ? currentLevel.name : (modeName || '不明'),
        accuracy,
        time: gameState.elapsedTime,
        rank,
        correct: gameState.correctCount,
        total: gameState.totalQuestions
    });
    if (history.length > 50) history.pop();
    saveToStorage(STORAGE_KEYS.HISTORY, history);
}
