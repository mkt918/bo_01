// ===== エントリーポイント =====
// 全モジュールをインポートして初期化する

import {
    LEVEL_DATA, STORAGE_KEYS, SECTION_MAP, SECTION_MAP_REVERSE, SPREADSHEET_CSV_URL,
    accountDatabase, currentLevel,
    setAccountDatabase, setCurrentLevel, setCurrentMode
} from './data.js';
import { formatTime, formatDate, shuffleArray } from './utils.js';
import {
    showScreen, updateMenu, showToast, renderResultScreen, elements
} from './ui.js';
import { loadFromStorage, saveToStorage } from './storage.js';

import { gameState, quizTimer, startGame, handleAnswer } from './quiz.js';
import { sortingState, sortingTimer, startSortingMode, showNextCard, checkSortingAnswers, initDragAndDrop } from './sorting.js';
import { calcState, calcTimer, startCalcMode, submitCalcAnswer, handleNumber, handleOperator, handleEqual, handleClear, handleBackspace, updateCalcDisplay } from './calc.js';
import { journalState, journalTimer, startJournalMode, proceedToNextJournalQuestion } from './journal.js';

// ===== タイマー停止を ui.js に登録 =====
import { registerTimerStop } from './ui.js';
registerTimerStop(() => quizTimer.stop());
registerTimerStop(() => sortingTimer.stop());
registerTimerStop(() => calcTimer.stop());
registerTimerStop(() => journalTimer.stop());

// ===== 履歴・苦手一覧表示 =====
function showHistory() {
    const history = loadFromStorage(STORAGE_KEYS.HISTORY) || [];
    if (history.length === 0) {
        elements.historyList.innerHTML = '<p class="empty-message">まだ記録がありません</p>';
    } else {
        elements.historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <span class="history-date">${formatDate(item.date)}</span>
                    <span class="history-level">${item.level}</span>
                </div>
                <div class="history-stats">
                    <span class="history-accuracy">${item.accuracy}%</span>
                    <span class="history-time">${formatTime(item.time)}</span>
                </div>
                <span class="history-rank rank-${item.rank.toLowerCase()}">${item.rank}</span>
            </div>
        `).join('');
    }
    showScreen('history');
}

function showWeakList() {
    const wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    const missAnswers = wrongAnswers.filter(q => q.miss === true);

    if (missAnswers.length === 0) {
        elements.weakList.innerHTML = '<p class="empty-message">間違えた問題はありません。素晴らしい！</p>';
        showScreen('weak');
        return;
    }

    const grouped = {};
    missAnswers.forEach(q => {
        const levelId = q.meta?.levelId || 'Unknown';
        const sectionId = q.meta?.sectionId || 'total';
        const key = `${levelId}-${sectionId}`;
        if (!grouped[key]) {
            grouped[key] = { levelId, sectionId, count: 0, questions: [] };
        }
        grouped[key].count++;
        grouped[key].questions.push(q);
    });

    elements.weakList.innerHTML = Object.values(grouped).map(group => {
        let title = '';
        if (group.levelId === 'L1') title = '📗 レベル1: 勘定科目の分類';
        else if (group.levelId === 'L2') {
            const sectionName = SECTION_MAP_REVERSE[group.sectionId] || group.sectionId;
            title = `📘 レベル2: 仕訳問題 (${sectionName})`;
        } else if (group.levelId === 'L3') title = '📙 レベル3: 仕訳問題 (総合)';
        else title = group.levelId;

        return `<div class="weak-group-card">
            <div class="weak-group-info">
                <span class="weak-group-title">${title}</span>
                <span class="weak-group-count">${group.count}問</span>
            </div>
            <button class="btn btn-secondary btn-sm start-review-btn"
                    data-level="${group.levelId}"
                    data-section="${group.sectionId === 'total' ? '' : group.sectionId}">
                復習をはじめる
            </button>
        </div>`;
    }).join('');

    showScreen('weak');
}

function showStatistics() {
    const stats = loadFromStorage(STORAGE_KEYS.ACCOUNT_STATS) || {};
    const tableBody = document.getElementById('stats-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const sortedAccounts = Object.keys(stats).sort((a, b) => {
        const catOrder = { '資産': 1, '負債': 2, '純資産': 3, '収益': 4, '費用': 5 };
        return catOrder[stats[a].category] - catOrder[stats[b].category];
    });

    if (sortedAccounts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-message">データがありません。問題を解いてみましょう！</td></tr>';
    } else {
        sortedAccounts.forEach(account => {
            const data = stats[account];
            const rate = Math.round((data.correct / data.total) * 100);
            let rateClass = 'rate-low';
            if (rate >= 80) rateClass = 'rate-high';
            else if (rate >= 50) rateClass = 'rate-mid';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="category-badge badge-${data.category}">${data.category}</span></td>
                <td>${account}</td>
                <td>${data.total}</td>
                <td>${data.correct}</td>
                <td class="${rateClass}">${rate}%</td>
            `;
            tableBody.appendChild(tr);
        });
    }
    // ===== 苦手・復習リスト表示 =====
    function showWeakList() {
        const wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
        const listContainer = document.getElementById('weak-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (wrongAnswers.length === 0) {
            listContainer.innerHTML = `
            <div class="text-center py-12 opacity-50">
                <div class="text-4xl mb-4">✨</div>
                <p class="font-bold text-slate-500">苦手な問題はありません！<br>すべての問題をマスターしました。</p>
            </div>
        `;
        } else {
            // グルーピング表示
            const categories = {
                'sorting': { name: '科目の分類', icon: '📋' },
                'calc': { name: '計算問題', icon: '🔢' },
                'journal': { name: '仕訳問題', icon: '📝' },
                'quiz': { name: 'Q&Aクイズ', icon: '🎯' }
            };

            const grouped = {};
            wrongAnswers.forEach(q => {
                const type = q.取引 ? 'journal' : (q.type ? 'calc' : (q.meta?.sectionId === 'sorting' ? 'sorting' : 'quiz'));
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(q);
            });

            Object.keys(grouped).forEach(type => {
                const cat = categories[type] || { name: 'その他', icon: '❓' };
                const section = document.createElement('div');
                section.className = 'mb-6';
                section.innerHTML = `
                <h3 class="flex items-center gap-2 font-black text-slate-400 text-xs uppercase tracking-widest mb-3">
                    <span>${cat.icon}</span> ${cat.name} (${grouped[type].length})
                </h3>
                <div class="flex flex-wrap gap-2">
                    ${grouped[type].map(q => `
                        <div class="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-sm font-bold text-slate-600">
                            ${q.account || q.取引 || '計算問題'}
                        </div>
                    `).join('')}
                </div>
            `;
                listContainer.appendChild(section);
            });

            const startBtn = document.createElement('button');
            startBtn.className = 'btn-premium w-full py-5 rounded-2xl font-bold text-lg mt-4 shadow-xl';
            startBtn.innerHTML = '🔄 復習をはじめる';
            startBtn.onclick = () => startRetryWrong();
            listContainer.appendChild(startBtn);
        }
        showScreen('weak-screen');
    }

    function clearHistory() {
        const history = loadFromStorage(STORAGE_KEYS.HISTORY) || [];
        const wrongCount = (loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || []).length;
        const statsCount = Object.keys(loadFromStorage(STORAGE_KEYS.ACCOUNT_STATS) || {}).length;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
        <div class="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl">
            <h3 class="text-2xl font-bold text-slate-800 mb-4">⚠️ データの完全削除</h3>
            <p class="text-slate-600 mb-6">以下のデータがすべて削除されます:</p>
            <ul class="text-left mb-6 space-y-2">
                <li class="flex items-center gap-2"><span class="text-indigo-600">📊</span><span>過去の記録: <strong>${history.length}件</strong></span></li>
                <li class="flex items-center gap-2"><span class="text-rose-600">📉</span><span>間違えた問題: <strong>${wrongCount}問</strong></span></li>
                <li class="flex items-center gap-2"><span class="text-emerald-600">📋</span><span>成績データ: <strong>${statsCount}科目</strong></span></li>
            </ul>
            <p class="text-rose-600 font-bold mb-6">この操作は取り消せません。</p>
            <div class="flex gap-3">
                <button class="btn-cancel flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 font-bold hover:bg-slate-200">キャンセル</button>
                <button class="btn-confirm flex-1 bg-rose-600 text-white rounded-xl py-3 font-bold hover:bg-rose-700">削除する</button>
            </div>
        </div>
    `;
        document.body.appendChild(modal);
        modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-confirm').addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEYS.HISTORY);
            localStorage.removeItem(STORAGE_KEYS.WRONG_ANSWERS);
            localStorage.removeItem(STORAGE_KEYS.ACCOUNT_STATS);
            modal.remove();
            showToast('すべてのデータを削除しました', 'success');
            showHistory();
            updateMenu();
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    // ===== モード振り分け =====
    function startModeGame(levelId, level, mode, sectionId = null) {
        setCurrentLevel(level);
        setCurrentMode(mode);
        setAccountDatabase(level.data || {});

        if (mode === 'quiz') {
            gameState.mode = 'normal';
            startGame();
        } else if (mode === 'sorting') {
            startSortingMode();
        } else if (mode === 'calc') {
            startCalcMode();
        } else if (mode === 'journal' || mode === 'journal-total') {
            startJournalMode(levelId, mode, sectionId);
        }
    }

    // ===== 復習開始 =====
    function startRetryWrong(levelId = null, sectionId = null) {
        let wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
        if (wrongAnswers.length === 0) return;

        // フィルター
        if (levelId) {
            wrongAnswers = wrongAnswers.filter(q => q.meta?.levelId === levelId);
            if (sectionId && sectionId !== 'total') {
                wrongAnswers = wrongAnswers.filter(q => q.meta?.sectionId === sectionId);
            }
        }

        if (wrongAnswers.length === 0) return;

        const firstQuestion = wrongAnswers[0];

        // モード判定と起動
        if (firstQuestion.取引) {
            // 仕訳モード
            import('./journal.js').then(m => {
                m.journalState.questions = [...wrongAnswers];
                m.journalState.totalQuestions = m.journalState.questions.length;
                m.journalState.currentQuestion = 0;
                m.journalState.correctCount = 0;
                m.journalState.elapsedTime = 0;
                m.journalState.mode = 'retry';
                m.journalTimer.start();
                showScreen('journal-screen');
                m.showJournalQuestion();
            });
        } else if (firstQuestion.type) {
            // 計算モード
            import('./calc.js').then(m => {
                m.calcState.questions = [...wrongAnswers];
                m.calcState.totalQuestions = m.calcState.questions.length;
                m.calcState.currentQuestion = 0;
                m.calcState.correctCount = 0;
                m.calcState.elapsedTime = 0;
                m.calcTimer.start();
                showScreen('calc');
                m.showCalcQuestion();
            });
        } else {
            // クイズまたは分類
            if (firstQuestion.meta?.sectionId === 'sorting') {
                import('./sorting.js').then(m => {
                    m.sortingState.questions = [...wrongAnswers];
                    m.sortingState.currentIndex = 0;
                    m.sortingState.placements = {};
                    m.sortingState.elapsedTime = 0;
                    document.querySelectorAll('.dropped-items').forEach(zone => { zone.innerHTML = ''; });
                    elements.sortingTotal.textContent = m.sortingState.questions.length;
                    elements.checkAnswersBtn.classList.add('hidden');
                    elements.accountCard.classList.remove('hidden');
                    m.sortingTimer.start();
                    m.showNextCard();
                    showScreen('sorting');
                });
            } else {
                // Q&Aクイズ
                import('./quiz.js').then(m => {
                    m.gameState.questions = [...wrongAnswers];
                    m.gameState.totalQuestions = m.gameState.questions.length;
                    m.gameState.mode = 'retry';
                    m.startGame(true);
                });
            }
        }
    }

    // ===== イベント委任 =====
    function initEventListeners() {
        document.body.addEventListener('click', (e) => {
            const target = e.target;

            // IDボタン
            const btn = target.closest('button[id]');
            if (btn) {
                const id = btn.id;
                switch (id) {
                    case 'start-btn': showScreen('level'); break;
                    case 'back-to-menu-btn': showScreen('menu'); break;
                    case 'weak-review-btn': showWeakList(); break;
                    case 'history-btn': showHistory(); break;
                    case 'stats-btn': showStatistics(); break;
                    case 'back-from-history-btn': showScreen('menu'); break;
                    case 'back-from-weak-btn': showScreen('menu'); updateMenu(); break;
                    case 'back-from-stats-btn': showScreen('menu'); break;
                    case 'clear-history-btn': clearHistory(); break;
                    case 'next-journal-btn': proceedToNextJournalQuestion(); return;
                    case 'retry-btn':
                    case 'retry-wrong-result-btn':
                    case 'journal-retry-wrong-btn': startRetryWrong(); break;
                    case 'menu-btn':
                    case 'sorting-menu-btn':
                    case 'calc-menu-btn':
                    case 'journal-menu-btn': updateMenu(); showScreen('menu'); break;
                    case 'check-answers-btn': checkSortingAnswers(); break;
                    case 'quiz-back-btn':
                    case 'sorting-back-btn':
                    case 'calc-back-btn':
                    case 'journal-back-btn':
                    case 'back-from-sorting-btn':
                    case 'back-from-calc-btn':
                    case 'back-from-journal-btn': showScreen('level'); break;
                    case 'sorting-retry-btn': startSortingMode(); break;
                    case 'calc-retry-btn': startCalcMode(); break;
                    case 'calc-submit-btn': submitCalcAnswer(); break;
                    case 'journal-retry-btn': {
                        const lvl = journalState.section ? 'L2' : 'L3';
                        startJournalMode(lvl, 'journal', journalState.section);
                        break;
                    }
                }
            }

            // 復習ボタン
            const reviewBtn = target.closest('.start-review-btn');
            if (reviewBtn) {
                startRetryWrong(reviewBtn.dataset.level, reviewBtn.dataset.section || null);
                return;
            }

            // アコーディオン
            const accordionHeader = target.closest('.accordion-header');
            if (accordionHeader && !accordionHeader.classList.contains('disabled')) {
                const lvlId = accordionHeader.dataset.level;
                const content = document.getElementById(`accordion-${lvlId}`);
                document.querySelectorAll('.accordion-header.active').forEach(h => {
                    if (h !== accordionHeader) {
                        h.classList.remove('active');
                        const other = document.getElementById(`accordion-${h.dataset.level}`);
                        if (other) other.classList.remove('open');
                    }
                });
                accordionHeader.classList.toggle('active');
                if (content) content.classList.toggle('open');
                return;
            }

            // モードボタン
            const modeBtn = target.closest('.mode-btn');
            if (modeBtn && !modeBtn.classList.contains('disabled')) {
                const lvlId = modeBtn.dataset.level;
                const mode = modeBtn.dataset.mode;
                const sectionId = modeBtn.dataset.section;
                const level = LEVEL_DATA[lvlId];
                if (level && level.available) startModeGame(lvlId, level, mode, sectionId);
                return;
            }

            // クイズセル
            const tableCell = target.closest('.table-cell');
            if (tableCell && !gameState.isAnswered) {
                handleAnswer(tableCell.dataset.answer, tableCell);
                return;
            }
        });

        // 電卓キー
        const calcKeys = document.querySelector('.calc-keys');
        if (calcKeys) {
            calcKeys.addEventListener('click', (e) => {
                const key = e.target.closest('.calc-key, .num-key');
                if (!key) return;
                const type = key.dataset.type;
                const val = key.dataset.val;
                if (key.classList.contains('num-key')) handleNumber(val);
                else if (type === 'operator') handleOperator(val);
                else if (type === 'equal') handleEqual();
                else if (type === 'clear') handleClear();
                else if (type === 'backspace') handleBackspace();
                updateCalcDisplay();
            });
        }
    }

    // ===== CSV読込 =====
    async function loadQuestionsFromSpreadsheet(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            if (!csvText || csvText.trim().length === 0) throw new Error('Empty CSV data');

            parseCSVToJournal(csvText);
        } catch (error) {
            if (error.name === 'AbortError') {
                showToast('データ読み込みに時間がかかっています', 'error');
            } else {
                console.error('CSV読み込みエラー:', error);
                showToast('オンライン問題の読み込みに失敗しました', 'error');
            }
            throw error;
        }
    }

    function parseCSVToJournal(csvText) {
        const lines = csvText.split(/\r?\n/);
        const questionsBySection = {};
        let currentQuestion = null;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
            if (parts.length < 6) continue;

            const [rawSection, query, dAcc, dAmtRaw, cAcc, cAmtRaw, explanation] = parts;
            const section = SECTION_MAP[rawSection] || rawSection;

            if (rawSection || query) {
                if (currentQuestion) {
                    if (!questionsBySection[currentQuestion.section]) {
                        questionsBySection[currentQuestion.section] = [];
                    }
                    questionsBySection[currentQuestion.section].push(currentQuestion);
                }
                currentQuestion = {
                    section: section || 'unknown',
                    取引: query || '',
                    explanation: explanation ? explanation.replace(/^"|"$/g, '').trim() : '',
                    借方: [],
                    貸方: []
                };
            }

            if (currentQuestion) {
                if (dAcc && dAmtRaw) currentQuestion.借方.push({ 科目: dAcc, 金額: parseInt(dAmtRaw.replace(/,/g, '')) || 0 });
                if (cAcc && cAmtRaw) currentQuestion.貸方.push({ 科目: cAcc, 金額: parseInt(cAmtRaw.replace(/,/g, '')) || 0 });
            }
        }

        if (currentQuestion) {
            if (!questionsBySection[currentQuestion.section]) questionsBySection[currentQuestion.section] = [];
            questionsBySection[currentQuestion.section].push(currentQuestion);
        }

        for (const [section, data] of Object.entries(questionsBySection)) {
            if (LEVEL_DATA['L2']?.sections?.[section]) {
                LEVEL_DATA['L2'].sections[section].data = data;
            } else {
                console.warn(`未知の区分です（無視されました）: ${section}`);
            }
        }
    }

    // ===== 初期化 =====
    async function init() {
        try {
            await loadQuestionsFromSpreadsheet(SPREADSHEET_CSV_URL);
            console.log('L2データ読み込み完了');
        } catch (error) {
            console.error('L2データ読み込み失敗:', error);
            document.querySelectorAll('[data-level="L2"]').forEach(el => {
                el.disabled = true;
                el.classList.add('opacity-50', 'cursor-not-allowed');
                el.title = 'データ読み込みに失敗しました';
            });
        } finally {
            updateMenu();
            initEventListeners();
            initDragAndDrop();
        }
    }

    init();
