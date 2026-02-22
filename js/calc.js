// ===== 計算モード =====

import { LEVEL_DATA, accountDatabase, setAccountDatabase, setCurrentLevel } from './data.js';
import { calculateRank, createTimer } from './utils.js';
import {
    elements, BTN_PRIMARY, BTN_SECONDARY,
    showScreen, renderResultScreen
} from './ui.js';
import { gameState, saveHistory } from './quiz.js';

// ===== 計算モード状態 =====
export const calcState = {
    currentQuestion: 0,
    totalQuestions: 10,
    questions: [],
    correctCount: 0,
    startTime: null,
    elapsedTime: 0,
    timerInterval: null,
    userAnswers: {}
};

export const calcTimer = createTimer(calcState, elements.calcTimerDisplay);

// ===== ミニ電卓状態 =====
let calcInput = '0';
let calcOperator = null;
let calcPrevValue = null;
let calcNewInput = true;

// ===== モード開始 =====
export function startCalcMode() {
    let db = accountDatabase;
    if (!db || Object.keys(db).length === 0) {
        setAccountDatabase(LEVEL_DATA['L1'].data);
        setCurrentLevel(LEVEL_DATA['L1']);
    }

    calcState.currentQuestion = 0;
    calcState.correctCount = 0;
    calcState.elapsedTime = 0;
    calcState.questions = generateCalcQuestions();
    calcState.totalQuestions = calcState.questions.length;
    calcState.userAnswers = {};

    elements.calcTotal.textContent = calcState.totalQuestions;
    elements.calcTimerDisplay.textContent = '00:00';

    calcTimer.start();
    showCalcQuestion();
    showScreen('calc');
}

// ===== 問題生成 =====
export function generateCalcQuestions() {
    const questions = [];
    for (let i = 0; i < 5; i++) {
        const questionType = Math.floor(Math.random() * 4);
        switch (questionType) {
            case 0: questions.push(generateBalanceSheetQuestion1()); break;
            case 1: questions.push(generateBalanceSheetQuestion2()); break;
            case 2: questions.push(generateCapitalChangeQuestion()); break;
            case 3: questions.push(generateProfitLossQuestion()); break;
        }
    }
    return questions;
}

function generateBalanceSheetQuestion1() {
    const asset = Math.floor(Math.random() * 900 + 100) * 10;
    const liability = Math.floor(Math.random() * (asset / 2 / 10)) * 10;
    const equity = asset - liability;
    const unknowns = ['asset', 'liability', 'equity'];
    const unknown = unknowns[Math.floor(Math.random() * unknowns.length)];
    return {
        type: 'bs1', values: { asset, liability, equity }, unknown,
        answer: unknown === 'asset' ? asset : unknown === 'liability' ? liability : equity
    };
}

function generateBalanceSheetQuestion2() {
    const liability = Math.floor(Math.random() * 500 + 100) * 10;
    const equity = Math.floor(Math.random() * 500 + 100) * 10;
    const asset = liability + equity;
    const unknowns = ['asset', 'liability', 'equity'];
    const unknown = unknowns[Math.floor(Math.random() * unknowns.length)];
    return {
        type: 'bs2', values: { asset, liability, equity }, unknown,
        answer: unknown === 'asset' ? asset : unknown === 'liability' ? liability : equity
    };
}

function generateCapitalChangeQuestion() {
    const startCapital = Math.floor(Math.random() * 500 + 100) * 10;
    const profit = Math.floor(Math.random() * 300 + 50) * 10;
    const endCapital = startCapital + profit;
    const unknowns = ['startCapital', 'endCapital', 'profit'];
    const unknown = unknowns[Math.floor(Math.random() * unknowns.length)];
    return {
        type: 'capital', values: { startCapital, endCapital, profit }, unknown,
        answer: unknown === 'startCapital' ? startCapital : unknown === 'endCapital' ? endCapital : profit
    };
}

function generateProfitLossQuestion() {
    const revenue = Math.floor(Math.random() * 800 + 200) * 10;
    const expenseRatio = Math.random() * 1.0 + 0.5;
    const expense = Math.floor(revenue * expenseRatio / 10) * 10;
    const profit = revenue - expense;
    const unknowns = ['revenue', 'expense', 'profit'];
    const unknown = unknowns[Math.floor(Math.random() * unknowns.length)];
    return {
        type: 'pl', values: { revenue, expense, profit }, unknown,
        answer: unknown === 'revenue' ? revenue : unknown === 'expense' ? expense : profit
    };
}

// ===== 問題表示 =====
export function showCalcQuestion() {
    const question = calcState.questions[calcState.currentQuestion];
    elements.calcCurrent.textContent = calcState.currentQuestion + 1;
    elements.calcAnswerInput.value = '';
    elements.calcFeedback.classList.add('hidden');
    elements.calcSubmitBtn.disabled = false;

    let diagramHTML = '', questionText = '', inputLabel = '';
    switch (question.type) {
        case 'bs1':
        case 'bs2':
            questionText = '次の貸借対照表の空欄を埋めてください';
            diagramHTML = generateBSDiagram(question);
            inputLabel = question.unknown === 'asset' ? '資産' : question.unknown === 'liability' ? '負債' : '純資産';
            break;
        case 'capital':
            questionText = '次の資本変動の空欄を埋めてください';
            diagramHTML = generateCapitalDiagram(question);
            inputLabel = question.unknown === 'startCapital' ? '期首資本' : question.unknown === 'endCapital' ? '期末資本' : '純利益';
            break;
        case 'pl':
            questionText = '次の損益計算書の空欄を埋めてください（純利益がマイナスの場合は純損失）';
            diagramHTML = generatePLDiagram(question);
            inputLabel = question.unknown === 'revenue' ? '収益' : question.unknown === 'expense' ? '費用' : '純利益';
            break;
    }

    elements.calcQuestionText.textContent = questionText;
    elements.calcDiagram.innerHTML = diagramHTML;
    elements.calcInputLabel.textContent = inputLabel;
    elements.calcAnswerInput.focus();
}

// ===== 図表生成 =====
function generateBSDiagram(question) {
    const { asset, liability, equity } = question.values;
    const u = question.unknown;
    return `
    <div class="game-table shadow-sm mb-4 max-w-md mx-auto">
        <div class="game-table-header"><span>（借方）</span><span>貸借対照表</span><span>（貸方）</span></div>
        <div class="grid grid-cols-2 h-36">
            <div class="calc-item asset border-r border-slate-100">
                <span class="calc-item-label">資産</span>
                <span class="calc-item-value ${u === 'asset' ? 'unknown' : ''}">${u === 'asset' ? '?' : asset.toLocaleString()}</span>
            </div>
            <div class="flex flex-col h-full">
                <div class="calc-item liability border-b border-slate-100 flex-1">
                    <span class="calc-item-label">負債</span>
                    <span class="calc-item-value ${u === 'liability' ? 'unknown' : ''}">${u === 'liability' ? '?' : liability.toLocaleString()}</span>
                </div>
                <div class="calc-item equity flex-1">
                    <span class="calc-item-label">純資産</span>
                    <span class="calc-item-value ${u === 'equity' ? 'unknown' : ''}">${u === 'equity' ? '?' : equity.toLocaleString()}</span>
                </div>
            </div>
        </div>
    </div>`;
}

function generateCapitalDiagram(question) {
    const { startCapital, endCapital, profit } = question.values;
    const u = question.unknown;
    return `
    <div class="game-table shadow-sm mb-4 max-w-md mx-auto">
        <div class="game-table-header text-center justify-center"><span>資本の変動</span></div>
        <div class="grid grid-cols-[1fr,auto,1fr,auto,1fr] items-center p-4 bg-white min-h-[100px]">
            <div class="calc-item flex-1">
                <span class="calc-item-label">期首資本</span>
                <span class="calc-item-value ${u === 'startCapital' ? 'unknown' : ''}">${u === 'startCapital' ? '?' : startCapital.toLocaleString()}</span>
            </div>
            <div class="calc-arrow">+</div>
            <div class="calc-item flex-1">
                <span class="calc-item-label">純利益</span>
                <span class="calc-item-value ${u === 'profit' ? 'unknown' : ''}">${u === 'profit' ? '?' : profit.toLocaleString()}</span>
            </div>
            <div class="calc-arrow">=</div>
            <div class="calc-item flex-1">
                <span class="calc-item-label">期末資本</span>
                <span class="calc-item-value ${u === 'endCapital' ? 'unknown' : ''}">${u === 'endCapital' ? '?' : endCapital.toLocaleString()}</span>
            </div>
        </div>
    </div>`;
}

function generatePLDiagram(question) {
    const { revenue, expense, profit } = question.values;
    const u = question.unknown;
    return `
    <div class="game-table shadow-sm mb-4 max-w-md mx-auto">
        <div class="game-table-header"><span>（借方）</span><span>損益計算書</span><span>（貸方）</span></div>
        <div class="grid grid-cols-2 h-32">
            <div class="flex flex-col h-full border-r border-slate-100">
                <div class="calc-item expense flex-1">
                    <span class="calc-item-label">費用</span>
                    <span class="calc-item-value ${u === 'expense' ? 'unknown' : ''}">${u === 'expense' ? '?' : expense.toLocaleString()}</span>
                </div>
                <div class="${profit >= 0 ? 'bg-cyan-50/50 text-cyan-500' : 'bg-rose-50/50 text-rose-500'} text-[9px] font-bold text-center py-1 border-t border-slate-100">
                    ${profit >= 0 ? '当期純利益' : '当期純損失'}
                </div>
            </div>
            <div class="calc-item revenue h-full">
                <span class="calc-item-label">収益</span>
                <span class="calc-item-value ${u === 'revenue' ? 'unknown' : ''}">${u === 'revenue' ? '?' : revenue.toLocaleString()}</span>
                ${u === 'profit' ? `<div class="mt-2 calc-item-value unknown">?</div>` : ''}
            </div>
        </div>
    </div>`;
}

// ===== エラー表示 =====
function showCalcError(message) {
    elements.calcFeedback.classList.remove('hidden', 'correct');
    elements.calcFeedback.classList.add('incorrect');
    elements.calcFeedbackText.textContent = `⚠️ ${message}`;
    setTimeout(() => elements.calcFeedback.classList.add('hidden'), 2000);
}

// ===== 解答送信 =====
export function submitCalcAnswer() {
    const inputValue = elements.calcAnswerInput.value.trim();
    if (!inputValue) { showCalcError('金額を入力してください'); return; }

    const userAnswer = parseInt(inputValue, 10);
    if (isNaN(userAnswer)) { showCalcError('有効な数値を入力してください'); return; }

    const question = calcState.questions[calcState.currentQuestion];
    if (userAnswer < 0 && question.unknown !== 'profit') {
        showCalcError('正の数値を入力してください'); return;
    }

    const isCorrect = userAnswer === question.answer;
    if (isCorrect) {
        calcState.correctCount++;
        elements.calcFeedback.classList.remove('hidden', 'incorrect');
        elements.calcFeedback.classList.add('correct');
        elements.calcFeedbackText.textContent = '⭕ 正解！';
    } else {
        elements.calcFeedback.classList.remove('hidden', 'correct');
        elements.calcFeedback.classList.add('incorrect');
        elements.calcFeedbackText.textContent = `❌ 不正解... 正解は ${question.answer.toLocaleString()} 円`;
    }

    elements.calcSubmitBtn.disabled = true;
    setTimeout(() => {
        calcState.currentQuestion++;
        if (calcState.currentQuestion >= calcState.totalQuestions) {
            endCalcMode();
        } else {
            showCalcQuestion();
        }
    }, 1500);
}

// ===== モード終了 =====
export function endCalcMode() {
    calcTimer.stop();
    const accuracy = Math.round((calcState.correctCount / calcState.totalQuestions) * 100);
    const rank = calculateRank(accuracy, calcState.elapsedTime);

    gameState.correctCount = calcState.correctCount;
    gameState.totalQuestions = calcState.totalQuestions;
    saveHistory(accuracy, rank.grade, '計算モード');

    renderResultScreen({
        title: '計算完了！',
        accuracy, elapsed: calcState.elapsedTime,
        correct: calcState.correctCount, total: calcState.totalQuestions,
        rank,
        buttons: [
            { id: 'calc-retry-btn', cls: BTN_PRIMARY, label: 'もう一度挑戦' },
            { id: 'calc-menu-btn', cls: BTN_SECONDARY, label: 'メニューに戻る' }
        ]
    });
}

// ===== ミニ電卓操作 =====
export function handleNumber(num) {
    if (calcNewInput) {
        calcInput = (num === '00' || num === '.') ? '0' : num;
        if (num === '.') calcInput = '0.';
        calcNewInput = false;
    } else {
        if (num === '.' && calcInput.includes('.')) return;
        if (calcInput === '0' && num !== '.') {
            calcInput = num === '00' ? '0' : num;
        } else {
            calcInput += num;
        }
    }
}

export function handleOperator(op) {
    if (calcOperator && !calcNewInput) handleEqual();
    calcPrevValue = parseFloat(calcInput);
    calcOperator = op;
    calcNewInput = true;
}

export function handleEqual() {
    if (!calcOperator || calcPrevValue === null) return;
    const current = parseFloat(calcInput);
    let result = 0;
    switch (calcOperator) {
        case '+': result = calcPrevValue + current; break;
        case '-': result = calcPrevValue - current; break;
        case '*': result = calcPrevValue * current; break;
        case '/': result = current !== 0 ? calcPrevValue / current : 0; break;
    }
    calcInput = result.toString();
    calcOperator = null;
    calcPrevValue = null;
    calcNewInput = true;
}

export function handleClear() {
    calcInput = '0';
    calcOperator = null;
    calcPrevValue = null;
    calcNewInput = true;
}

export function handleBackspace() {
    if (calcNewInput) return;
    calcInput = calcInput.slice(0, -1);
    if (calcInput === '' || calcInput === '-') calcInput = '0';
}

export function updateCalcDisplay() {
    const display = document.getElementById('mini-calc-display');
    if (display) {
        let val = calcInput;
        if (val.length > 12) val = parseFloat(val).toExponential(5);
        display.textContent = val;
    }
}
