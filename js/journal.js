// ===== 仕訳問題モード（レベル2・3共通） =====

import { LEVEL_DATA } from './data.js';
import { shuffleArray, calculateRank, createTimer } from './utils.js';
import {
    elements, BTN_PRIMARY, BTN_SECONDARY, BTN_WRONG,
    showScreen, showToast, updateMenu, renderResultScreen
} from './ui.js';
import { addToWrongAnswers, removeFromWrongAnswers } from './storage.js';
import { saveHistory } from './quiz.js';

// ===== 仕訳問題モード状態 =====
export const journalState = {
    currentQuestion: 0,
    totalQuestions: 0,
    questions: [],
    correctCount: 0,
    startTime: null,
    elapsedTime: 0,
    timerInterval: null,
    isAnswered: false,
    section: null,
    mode: 'normal'
};

export const journalTimer = createTimer(journalState, document.getElementById('journal-timer-display'));

// ===== モード開始 =====
export function startJournalMode(levelId, mode, sectionId = null) {
    journalState.isAnswered = false;
    journalState.correctCount = 0;
    journalState.currentQuestion = 0;
    journalState.elapsedTime = 0;
    journalState.section = sectionId;
    journalState.mode = 'normal';

    if (levelId === 'L3') {
        let allJournalQuestions = [];
        for (const section of Object.values(LEVEL_DATA['L2'].sections)) {
            allJournalQuestions.push(...section.data);
        }
        journalState.questions = shuffleArray(allJournalQuestions).slice(0, 5);
        document.getElementById('journal-title').textContent = '仕訳問題（総合）';
    } else {
        const section = LEVEL_DATA['L2'].sections[sectionId];
        journalState.questions = shuffleArray(section.data).slice(0, 5);
        document.getElementById('journal-title').textContent = `仕訳問題（${section.name}）`;
    }

    journalState.totalQuestions = journalState.questions.length;
    document.getElementById('journal-total').textContent = journalState.totalQuestions;
    document.getElementById('journal-timer-display').textContent = '00:00';
    elements.journalFeedback.classList.add('hidden');

    showJournalQuestion();
    journalTimer.start();
    showScreen('journal-screen');
}

// ===== 問題表示 =====
export function showJournalQuestion() {
    journalState.isAnswered = false;
    const question = journalState.questions[journalState.currentQuestion];

    document.getElementById('journal-current').textContent = journalState.currentQuestion + 1;
    document.getElementById('journal-transaction-text').textContent = question.取引;

    elements.journalFeedback.classList.add('hidden');
    elements.journalFeedback.classList.remove('correct', 'incorrect');
    elements.journalFeedbackText.innerHTML = '';
    elements.nextJournalBtn.classList.add('hidden');

    const card = document.querySelector('.journal-card');
    if (card) card.scrollTop = 0;

    const choices = generateJournalChoices(question);
    elements.journalChoicesContainer.innerHTML = '';

    choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'journal-choice-btn';

        const debitHTML = choice.借方.map(item => `
            <div class="choice-side-item">
                <span class="choice-acc">${item.科目}</span>
                <span class="choice-amt">${item.金額.toLocaleString()}</span>
            </div>
        `).join('');

        const creditHTML = choice.貸方.map(item => `
            <div class="choice-side-item">
                <span class="choice-acc">${item.科目}</span>
                <span class="choice-amt">${item.金額.toLocaleString()}</span>
            </div>
        `).join('');

        btn.innerHTML = `
            <div class="choice-label">${index + 1}</div>
            <div class="choice-content">
                <div class="choice-side debit-side">${debitHTML}</div>
                <div class="choice-divider"></div>
                <div class="choice-side credit-side">${creditHTML}</div>
            </div>
        `;
        btn.addEventListener('click', () => checkJournalAnswer(choice));
        elements.journalChoicesContainer.appendChild(btn);
    });
}

// ===== 選択肢生成 =====
export function generateJournalChoices(correctQuestion) {
    const choices = [correctQuestion];
    let allPossible = [];

    for (const level of Object.values(LEVEL_DATA)) {
        if (level.sections) {
            for (const section of Object.values(level.sections)) {
                if (section.data && Array.isArray(section.data)) {
                    allPossible.push(...section.data);
                }
            }
        } else if (level.data && Array.isArray(level.data)) {
            allPossible.push(...level.data);
        }
    }

    const shuffled = shuffleArray(allPossible.filter(q =>
        JSON.stringify(q.借方) !== JSON.stringify(correctQuestion.借方) ||
        JSON.stringify(q.貸方) !== JSON.stringify(correctQuestion.貸方)
    ));

    if (shuffled.length >= 2) {
        choices.push(shuffled[0], shuffled[1]);
    } else {
        choices.push(
            { ...correctQuestion, 貸方: [...correctQuestion.借方], 借方: [...correctQuestion.貸方] },
            { ...correctQuestion, 取引: correctQuestion.取引 + '（別解案）' }
        );
    }
    return shuffleArray(choices);
}

// ===== 解答チェック =====
export function checkJournalAnswer(selectedChoice) {
    if (journalState.isAnswered) return;
    const question = journalState.questions[journalState.currentQuestion];
    journalState.isAnswered = true;

    const isCorrect =
        JSON.stringify(selectedChoice.借方) === JSON.stringify(question.借方) &&
        JSON.stringify(selectedChoice.貸方) === JSON.stringify(question.貸方);

    const buttons = elements.journalChoicesContainer.querySelectorAll('.journal-choice-btn');
    buttons.forEach(btn => {
        const text = btn.innerText;
        const correctText = question.借方.map(i => i.科目 + i.金額.toLocaleString()).join('') +
            question.貸方.map(i => i.科目 + i.金額.toLocaleString()).join('');
        const selectedText = selectedChoice.借方.map(i => i.科目 + i.金額.toLocaleString()).join('') +
            selectedChoice.貸方.map(i => i.科目 + i.金額.toLocaleString()).join('');

        if (text.replace(/\s/g, '').includes(correctText.replace(/\s/g, ''))) {
            btn.classList.add('correct-choice');
        } else if (text.replace(/\s/g, '').includes(selectedText.replace(/\s/g, '')) && !isCorrect) {
            btn.classList.add('incorrect-choice');
        }
        btn.disabled = true;
    });

    elements.journalFeedback.classList.remove('hidden', 'correct', 'incorrect');
    elements.journalFeedback.classList.add(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
        journalState.correctCount++;
        elements.journalFeedbackText.textContent = '⭕ 正解！完璧な仕訳です。';
        removeFromWrongAnswers(question);
    } else {
        const correctInfo = `【正解】<br>` +
            question.借方.map(d => `借: ${d.科目} ${d.金額.toLocaleString()}`).join('<br>') + '<br>' +
            question.貸方.map(c => `貸: ${c.科目} ${c.金額.toLocaleString()}`).join('<br>');

        let feedbackHTML = `❌ 不正解...<br><small>${correctInfo}</small>`;
        if (question.explanation) {
            feedbackHTML += `<div class="journal-explanation mt-2 text-sm text-slate-500"><strong>💡 解説:</strong> ${question.explanation}</div>`;
        }
        elements.journalFeedbackText.innerHTML = feedbackHTML;

        const levelId = journalState.section ? 'L2' : 'L3';
        addToWrongAnswers(question, levelId, journalState.section);
    }

    elements.nextJournalBtn.classList.remove('hidden');
}

// ===== 次の問題へ =====
export function proceedToNextJournalQuestion() {
    journalState.currentQuestion++;
    if (journalState.currentQuestion >= journalState.totalQuestions) {
        endJournalGame();
    } else {
        showJournalQuestion();
    }
}

// ===== ゲーム終了 =====
export function endJournalGame() {
    journalTimer.stop();
    const accuracy = Math.round((journalState.correctCount / journalState.totalQuestions) * 100);
    const rank = calculateRank(accuracy, journalState.elapsedTime);
    saveHistory(accuracy, rank.grade, document.getElementById('journal-title').textContent);

    if (journalState.mode === 'retry') {
        showToast('復習が完了しました！', 'success');
        updateMenu();
        showScreen('menu');
        return;
    }

    const hasWrong = journalState.correctCount < journalState.totalQuestions;
    const buttons = [
        { id: 'journal-retry-btn', cls: BTN_PRIMARY, label: 'もう一度挑戦' },
        ...(hasWrong ? [{ id: 'journal-retry-wrong-btn', cls: BTN_WRONG, label: '間違えた問題を復習' }] : []),
        { id: 'journal-menu-btn', cls: BTN_SECONDARY, label: 'メニューに戻る' }
    ];

    renderResultScreen({
        title: '仕訳完了！',
        accuracy, elapsed: journalState.elapsedTime,
        correct: journalState.correctCount, total: journalState.totalQuestions,
        rank, buttons
    });
}
