// ===== ストレージキー =====
const STORAGE_KEYS = {
    HISTORY: 'bookkeeping_quiz_history',
    WRONG_ANSWERS: 'bookkeeping_quiz_wrong',
    ACCOUNT_STATS: 'bookkeeping_quiz_stats'
};

// ===== スプレッドシートURL (公開CSV形式) =====
const SPREADSHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOHnb3gc6-KwJ8R5q_8pma9YoyjMLmlT4A_Y_4XbizqEcxQPOPrvP87SrPgOsSUDVZJdQyK4IA_g4X/pub?gid=0&single=true&output=csv';

// 区分（数値）とシステム内部キーの対応表
const SECTION_MAP = {
    '1': 'cash',
    '2': 'bank',
    '3': 'payable',
    '4': 'receivable'
};

const SECTION_MAP_REVERSE = {
    'cash': '現金',
    'bank': '当座預金',
    'payable': '買掛金',
    'receivable': '売掛金'
};

// ===== レベルデータ（直接埋め込み） =====
const LEVEL_DATA = {
    'L1': {
        name: '5つの要素について',
        available: true,
        data: {
            "資産": ["現金", "売掛金", "商品", "貸付金", "備品", "建物", "土地"],
            "負債": ["買掛金", "借入金"],
            "純資産": ["資本金"],
            "収益": ["商品売買益", "受取手数料", "受取利息"],
            "費用": ["給料", "広告料", "交通費", "通信費", "支払家賃", "水道光熱費", "雑費", "支払利息"]
        }
    },
    'L2': {
        name: '仕訳問題（単元別）',
        available: true,
        sections: {
            'cash': {
                name: '1: 現金',
                data: [
                    {
                        取引: "銀行から現金1,000円を小切手を振り出して借り入れた。",
                        借方: [{ 科目: "現金", 金額: 1000 }],
                        貸方: [{ 科目: "借入金", 金額: 1000 }]
                    },
                    {
                        取引: "商品500円を売り上げ、代金は現金で受け取った。",
                        借方: [{ 科目: "現金", 金額: 500 }],
                        貸方: [{ 科目: "商品売買益", 金額: 500 }]
                    },
                    {
                        取引: "備品300円を現金で購入した。",
                        借方: [{ 科目: "備品", 金額: 300 }],
                        貸方: [{ 科目: "現金", 金額: 300 }]
                    }
                ]
            },
            'bank': {
                name: '2: 当座預金',
                data: [
                    {
                        取引: "売掛金800円が当座預金口座に振り込まれた。",
                        借方: [{ 科目: "当座預金", 金額: 800 }],
                        貸方: [{ 科目: "売掛金", 金額: 800 }]
                    }
                ]
            },
            'payable': {
                name: '3: 買掛金',
                data: [
                    {
                        取引: "商品600円を仕入れ、代金は買掛金とした。",
                        借方: [{ 科目: "商品", 金額: 600 }],
                        貸方: [{ 科目: "買掛金", 金額: 600 }]
                    }
                ]
            },
            'receivable': {
                name: '4: 売掛金',
                data: [
                    {
                        取引: "商品400円を売り上げ、代金は売掛金とした。",
                        借方: [{ 科目: "売掛金", 金額: 400 }],
                        貸方: [{ 科目: "商品売買益", 金額: 400 }]
                    }
                ]
            }
        }
    },
    'L3': {
        name: '仕訳問題（総合）',
        available: true,
        data: []
    }
};

// ===== 勘定科目データベース =====
let accountDatabase = {};
let currentLevel = null;
let currentMode = null;

// ===== 画面要素の取得 =====
const screens = {
    menu: document.getElementById('menu-screen'),
    level: document.getElementById('level-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    history: document.getElementById('history-screen'),
    weak: document.getElementById('weak-screen'),
    sorting: document.getElementById('sorting-screen'),
    sortingResult: document.getElementById('sorting-result-screen'),
    calc: document.getElementById('calc-screen'),
    calcResult: document.getElementById('calc-result-screen'),
    'journal-screen': document.getElementById('journal-screen'),
    'journal-result-screen': document.getElementById('journal-result-screen'),
    statistics: document.getElementById('stats-screen')
};

const elements = {
    // メニュー
    startBtn: document.getElementById('start-btn'),
    weakReviewBtn: document.getElementById('weak-review-btn'),
    wrongCountBadge: document.getElementById('wrong-count-badge'),
    historyBtn: document.getElementById('history-btn'),
    // レベル選択
    backToMenuBtn: document.getElementById('back-to-menu-btn'),
    // クイズ
    questionNumber: document.getElementById('question-number'),
    totalQuestions: document.getElementById('total-questions'),
    timerDisplay: document.getElementById('timer-display'),
    progressFill: document.getElementById('progress-fill'),
    accountName: document.getElementById('account-name'),
    feedback: document.getElementById('feedback'),
    feedbackText: document.getElementById('feedback-text'),
    // クイズ結果
    accuracy: document.getElementById('accuracy'),
    finalTime: document.getElementById('final-time'),
    correctCount: document.getElementById('correct-count'),
    rank: document.getElementById('rank'),
    rankMessage: document.getElementById('rank-message'),
    retryBtn: document.getElementById('retry-btn'),
    retryWrongResultBtn: document.getElementById('retry-wrong-result-btn'),
    menuBtn: document.getElementById('menu-btn'),
    // 仕分けモード
    sortingTimerDisplay: document.getElementById('sorting-timer-display'),
    accountCard: document.getElementById('account-card'),
    cardAccountName: document.getElementById('card-account-name'),
    sortingCurrent: document.getElementById('sorting-current'),
    sortingTotal: document.getElementById('sorting-total'),
    checkAnswersBtn: document.getElementById('check-answers-btn'),
    backFromSortingBtn: document.getElementById('back-from-sorting-btn'),
    // 仕分け結果
    sortingAccuracy: document.getElementById('sorting-accuracy'),
    sortingFinalTime: document.getElementById('sorting-final-time'),
    sortingCorrectCount: document.getElementById('sorting-correct-count'),
    sortingRank: document.getElementById('sorting-rank'),
    sortingRankMessage: document.getElementById('sorting-rank-message'),
    wrongAnswersList: document.getElementById('wrong-answers-list'),
    wrongAnswersContent: document.getElementById('wrong-answers-content'),
    sortingRetryBtn: document.getElementById('sorting-retry-btn'),
    sortingMenuBtn: document.getElementById('sorting-menu-btn'),
    // 計算モード
    calcTimerDisplay: document.getElementById('calc-timer-display'),
    calcCurrent: document.getElementById('calc-current'),
    calcTotal: document.getElementById('calc-total'),
    calcQuestionText: document.getElementById('calc-question-text'),
    calcDiagram: document.getElementById('calc-diagram'),
    calcAnswerInput: document.getElementById('calc-answer-input'),
    calcInputLabel: document.getElementById('calc-input-label'),
    calcSubmitBtn: document.getElementById('calc-submit-btn'),
    backFromCalcBtn: document.getElementById('back-from-calc-btn'),
    // 計算結果
    calcAccuracy: document.getElementById('calc-accuracy'),
    calcFinalTime: document.getElementById('calc-final-time'),
    calcCorrectCount: document.getElementById('calc-correct-count'),
    calcRank: document.getElementById('calc-rank'),
    calcRankMessage: document.getElementById('calc-rank-message'),
    calcRetryBtn: document.getElementById('calc-retry-btn'),
    calcMenuBtn: document.getElementById('calc-menu-btn'),
    // 仕訳問題
    journalChoicesContainer: document.getElementById('journal-choices-container'),
    journalFeedback: document.getElementById('journal-feedback'),
    journalFeedbackText: document.getElementById('journal-feedback-text'),
    nextJournalBtn: document.getElementById('next-journal-btn'),
    backFromJournalBtn: document.getElementById('back-from-journal-btn'),
    // 仕訳結果
    journalAccuracy: document.getElementById('journal-accuracy'),
    journalFinalTime: document.getElementById('journal-final-time'),
    journalCorrectCount: document.getElementById('journal-correct-count'),
    journalRank: document.getElementById('journal-rank'),
    journalRankMessage: document.getElementById('journal-rank-message'),
    journalRetryBtn: document.getElementById('journal-retry-btn'),
    journalRetryWrongBtn: document.getElementById('journal-retry-wrong-btn'),
    journalMenuBtn: document.getElementById('journal-menu-btn'),
    // 履歴・苦手
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    backFromHistoryBtn: document.getElementById('back-from-history-btn'),
    weakList: document.getElementById('weak-list'),
    backFromWeakBtn: document.getElementById('back-from-weak-btn'),
    statsTableBody: document.getElementById('stats-table-body'),
    backFromStatsBtn: document.getElementById('back-from-stats-btn')
};

// ===== ゲーム状態 =====
let gameState = {
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

// ===== 仕分けモード状態 =====
let sortingState = {
    questions: [],
    currentIndex: 0,
    placements: {},
    startTime: null,
    elapsedTime: 0,
    timerInterval: null
};

// ===== 計算モード状態 =====
let calcState = {
    currentQuestion: 0,
    totalQuestions: 10,
    questions: [],
    correctCount: 0,
    startTime: null,
    elapsedTime: 0,
    timerInterval: null,
    userAnswers: {}
};

// ===== 仕訳問題モード状態 =====
let journalState = {
    currentQuestion: 0,
    totalQuestions: 0,
    questions: [],
    correctCount: 0,
    startTime: null,
    elapsedTime: 0,
    timerInterval: null,
    isAnswered: false,
    section: null // 'cash', 'bank' など
};

// ========================================
// ===== 仕訳問題モード (レベル2, 3共通) =====
// ========================================

function startJournalMode(levelId, mode, sectionId = null) {
    journalState.isAnswered = false;
    journalState.correctCount = 0;
    journalState.currentQuestion = 0;
    journalState.elapsedTime = 0;
    journalState.section = sectionId;

    if (levelId === 'L3') {
        // レベル3：総合問題（L2の全セクションからデータを集める）
        let allJournalQuestions = [];
        for (const section of Object.values(LEVEL_DATA['L2'].sections)) {
            allJournalQuestions.push(...section.data);
        }
        journalState.questions = shuffleArray(allJournalQuestions).slice(0, 5);
        document.getElementById('journal-title').textContent = '仕訳問題（総合）';
    } else {
        // レベル2：単元別
        const section = LEVEL_DATA['L2'].sections[sectionId];
        journalState.questions = shuffleArray(section.data).slice(0, 5);
        document.getElementById('journal-title').textContent = `仕訳問題（${section.name}）`;
    }

    journalState.totalQuestions = journalState.questions.length;
    document.getElementById('journal-total').textContent = journalState.totalQuestions;
    document.getElementById('journal-timer-display').textContent = '00:00';
    elements.journalFeedback.classList.add('hidden');

    showJournalQuestion();
    startJournalTimer();
    showScreen('journal-screen');
}

function startJournalTimer() {
    journalState.startTime = Date.now();
    journalState.timerInterval = setInterval(() => {
        journalState.elapsedTime = Math.floor((Date.now() - journalState.startTime) / 1000);
        document.getElementById('journal-timer-display').textContent = formatTime(journalState.elapsedTime);
    }, 1000);
}

function stopJournalTimer() {
    if (journalState.timerInterval) {
        clearInterval(journalState.timerInterval);
        journalState.timerInterval = null;
    }
}

function showJournalQuestion() {
    journalState.isAnswered = false;
    const question = journalState.questions[journalState.currentQuestion];

    document.getElementById('journal-current').textContent = journalState.currentQuestion + 1;
    document.getElementById('journal-transaction-text').textContent = question.取引;

    // フィードバック表示の完全なリセット
    elements.journalFeedback.classList.add('hidden');
    elements.journalFeedback.classList.remove('correct', 'incorrect');
    elements.journalFeedbackText.innerHTML = '';

    elements.nextJournalBtn.classList.add('hidden'); // 次へボタンを隠す

    // 画面上部へスクロール（問題文が見えるように）
    const card = document.querySelector('.journal-card');
    if (card) card.scrollTop = 0;

    const choices = generateJournalChoices(question);
    elements.journalChoicesContainer.innerHTML = '';

    choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'journal-choice-btn';

        // 借方・貸方のリストを生成
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
                <div class="choice-side debit-side">
                    ${debitHTML}
                </div>
                <div class="choice-divider"></div>
                <div class="choice-side credit-side">
                    ${creditHTML}
                </div>
            </div>
        `;
        btn.addEventListener('click', () => checkJournalAnswer(choice));
        elements.journalChoicesContainer.appendChild(btn);
    });
}

function generateJournalChoices(correctQuestion) {
    const choices = [correctQuestion];

    // 全データから誤答用の候補を収集
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

    // 適切な誤答（全く同じではないもの）を2つ選ぶ
    const shuffled = shuffleArray(allPossible.filter(q => {
        return JSON.stringify(q.借方) !== JSON.stringify(correctQuestion.借方) ||
            JSON.stringify(q.貸方) !== JSON.stringify(correctQuestion.貸方);
    }));

    if (shuffled.length >= 2) {
        choices.push(shuffled[0], shuffled[1]);
    } else {
        // データが足りない場合のフォールバック（科目を入れ替えるなど）
        choices.push(
            { ...correctQuestion, 貸方: [...correctQuestion.借方], 借方: [...correctQuestion.貸方] },
            { ...correctQuestion, 取引: correctQuestion.取引 + "（別解案）" }
        );
    }
    return shuffleArray(choices);
}

function checkJournalAnswer(selectedChoice) {
    if (journalState.isAnswered) return;

    const question = journalState.questions[journalState.currentQuestion];
    journalState.isAnswered = true;

    // 複合仕訳（配列）の完全一致判定
    const isCorrect = JSON.stringify(selectedChoice.借方) === JSON.stringify(question.借方) &&
        JSON.stringify(selectedChoice.貸方) === JSON.stringify(question.貸方);

    // ボタンの視覚フィードバック
    const buttons = elements.journalChoicesContainer.querySelectorAll('.journal-choice-btn');
    buttons.forEach(btn => {
        const text = btn.innerText;
        const correctText = question.借方.map(i => i.科目 + i.金額.toLocaleString()).join('') + question.貸方.map(i => i.科目 + i.金額.toLocaleString()).join('');
        const selectedText = selectedChoice.借方.map(i => i.科目 + i.金額.toLocaleString()).join('') + selectedChoice.貸方.map(i => i.科目 + i.金額.toLocaleString()).join('');

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

        // 誤答を保存 (Level/Section情報を付加)
        const levelId = journalState.section ? 'L2' : 'L3';
        addToWrongAnswers(question, levelId, journalState.section);
    }

    // 自動で進まず、次へボタンを表示する
    elements.nextJournalBtn.classList.remove('hidden');
}

function proceedToNextJournalQuestion() {
    journalState.currentQuestion++;
    if (journalState.currentQuestion >= journalState.totalQuestions) {
        endJournalGame();
    } else {
        showJournalQuestion();
    }
}

function endJournalGame() {
    stopJournalTimer();
    const accuracy = Math.round((journalState.correctCount / journalState.totalQuestions) * 100);
    const rank = calculateRank(accuracy, journalState.elapsedTime);

    saveHistory(accuracy, rank.grade, document.getElementById('journal-title').textContent);

    document.getElementById('journal-accuracy').textContent = `${accuracy}%`;
    document.getElementById('journal-final-time').textContent = formatTime(journalState.elapsedTime);
    document.getElementById('journal-correct-count').textContent = `${journalState.correctCount}/${journalState.totalQuestions}`;

    const rankEl = document.getElementById('journal-rank');
    if (rankEl) {
        rankEl.textContent = rank.grade;
        rankEl.classList.remove('rank-s', 'rank-a', 'rank-b', 'rank-c', 'rank-d');
        rankEl.classList.add(`rank-${rank.grade.toLowerCase()}`);
    }
    document.getElementById('journal-rank-message').textContent = rank.message;

    // 復習モードの場合はスコアを表示せずメニューに戻る
    if (journalState.mode === 'retry') {
        alert('復習が完了しました！');
        updateMenu();
        showScreen('menu');
        return;
    }

    // 間違えた問題がある場合のみ復習ボタンを表示
    if (journalState.correctCount < journalState.totalQuestions) {
        elements.journalRetryWrongBtn.classList.remove('hidden');
    } else {
        elements.journalRetryWrongBtn.classList.add('hidden');
    }

    showScreen('journal-result-screen');
}

// ===== メイン初期化の拡張 =====

// ===== ローカルストレージ操作 =====
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('保存に失敗しました:', e);
    }
}

// ===== イベントリスナーの集約管理 (イベント委譲) =====
function initEventListeners() {
    document.body.addEventListener('click', (e) => {
        const target = e.target;

        // 1. 各種ボタン (idによる判定)
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
                case 'next-journal-btn':
                    proceedToNextJournalQuestion();
                    return;
                case 'retry-btn':
                case 'retry-wrong-result-btn':
                case 'journal-retry-wrong-btn':
                    startRetryWrong();
                    break;
                case 'menu-btn':
                case 'sorting-menu-btn':
                case 'calc-menu-btn':
                case 'journal-menu-btn':
                    updateMenu(); showScreen('menu');
                    break;
                case 'check-answers-btn': checkSortingAnswers(); break;
                case 'back-from-sorting-btn':
                case 'back-from-calc-btn':
                case 'back-from-journal-btn':
                    showScreen('level');
                    break;
                case 'sorting-retry-btn': startSortingMode(); break;
                case 'calc-retry-btn': startCalcMode(); break;
                case 'calc-submit-btn': submitCalcAnswer(); break;
                case 'journal-retry-btn': {
                    const levelId = journalState.section ? 'L2' : 'L3';
                    startJournalMode(levelId, 'journal', journalState.section);
                    break;
                }
            }
        }

        // 1.5 固有のクラスを持つボタン (復習開始ボタンなど)
        const reviewBtn = target.closest('.start-review-btn');
        if (reviewBtn) {
            const level = reviewBtn.dataset.level;
            const section = reviewBtn.dataset.section || null;
            startRetryWrong(level, section);
            return;
        }

        // 2. アコーディオンヘッダー
        const accordionHeader = target.closest('.accordion-header');
        if (accordionHeader && !accordionHeader.classList.contains('disabled')) {
            const levelId = accordionHeader.dataset.level;
            const content = document.getElementById(`accordion-${levelId}`);

            document.querySelectorAll('.accordion-header.active').forEach(h => {
                if (h !== accordionHeader) {
                    h.classList.remove('active');
                    const otherContent = document.getElementById(`accordion-${h.dataset.level}`);
                    if (otherContent) otherContent.classList.remove('open');
                }
            });

            accordionHeader.classList.toggle('active');
            if (content) content.classList.toggle('open');
            return; // アコーディオン処理をしたら終了
        }

        // 3. ゲームモードボタン (.mode-btn)
        const modeBtn = target.closest('.mode-btn');
        if (modeBtn && !modeBtn.classList.contains('disabled')) {
            const levelId = modeBtn.dataset.level;
            const mode = modeBtn.dataset.mode;
            const sectionId = modeBtn.dataset.section;
            const level = LEVEL_DATA[levelId];

            if (level && level.available) {
                startModeGame(levelId, level, mode, sectionId);
            }
            return; // モード開始したら終了
        }

        // 5. クイズの選択肢セル (クイズモード)
        const tableCell = target.closest('.table-cell');
        if (tableCell && !gameState.isAnswered) {
            handleAnswer(tableCell.dataset.answer, tableCell);
            return;
        }
    });

    // 6. 電卓のキー（これだけは伝播が複雑なため個別コンテナで管理）
    const calcKeys = document.querySelector('.calc-keys');
    if (calcKeys) {
        calcKeys.addEventListener('click', (e) => {
            const key = e.target.closest('.calc-key');
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

function startModeGame(levelId, level, mode, sectionId = null) {
    currentLevel = level;
    currentMode = mode;
    accountDatabase = level.data;

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

// ===== ユーティリティ関数 =====
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ===== 画面切り替え =====
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ===== メニュー更新 =====
function updateMenu() {
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

// ===== 問題生成 =====
function generateQuestions() {
    const allQuestions = [];

    for (const [category, accounts] of Object.entries(accountDatabase)) {
        for (const account of accounts) {
            allQuestions.push({
                account: account,
                answer: category
            });
        }
    }

    const shuffled = shuffleArray(allQuestions);
    const questionCount = Math.min(gameState.totalQuestions, shuffled.length);
    return shuffled.slice(0, questionCount);
}

// ===== タイマー =====
function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        elements.timerDisplay.textContent = formatTime(gameState.elapsedTime);
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}


// ===== ゲーム開始 =====
function startGame() {
    gameState.currentQuestion = 0;
    gameState.correctCount = 0;
    gameState.elapsedTime = 0;
    gameState.questions = generateQuestions();
    gameState.totalQuestions = gameState.questions.length;
    gameState.isAnswered = false;
    gameState.wrongAnswers = [];

    startGameWithQuestions();
}

function startGameWithQuestions() {
    gameState.currentQuestion = 0;
    gameState.correctCount = 0;
    gameState.elapsedTime = 0;
    gameState.isAnswered = false;
    gameState.wrongAnswers = [];

    elements.timerDisplay.textContent = '00:00';
    elements.totalQuestions.textContent = gameState.totalQuestions;
    elements.feedback.classList.add('hidden');

    showScreen('quiz');
    startTimer();
    showQuestion();
}

// ===== 問題表示 =====
function showQuestion() {
    const question = gameState.questions[gameState.currentQuestion];

    elements.questionNumber.textContent = gameState.currentQuestion + 1;

    const progress = ((gameState.currentQuestion + 1) / gameState.totalQuestions) * 100;
    elements.progressFill.style.width = `${progress}%`;

    elements.accountName.textContent = question.account;

    const tableCells = document.querySelectorAll('.table-cell');
    tableCells.forEach(cell => {
        cell.disabled = false;
        cell.classList.remove('correct', 'incorrect');
    });

    elements.feedback.classList.add('hidden');
    elements.feedback.classList.remove('correct', 'incorrect');

    gameState.isAnswered = false;
}

// ===== 解答処理 =====
function handleAnswer(selectedAnswer, clickedCell) {
    if (gameState.isAnswered) return;
    gameState.isAnswered = true;

    const question = gameState.questions[gameState.currentQuestion];
    const isCorrect = selectedAnswer === question.answer;

    const tableCells = document.querySelectorAll('.table-cell');
    tableCells.forEach(cell => {
        cell.disabled = true;

        if (cell.dataset.answer === question.answer) {
            cell.classList.add('correct');
        }

        if (cell === clickedCell && !isCorrect) {
            cell.classList.add('incorrect');
        }
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

// ===== 勘定科目統計更新 =====
function updateAccountStats(account, category, isCorrect) {
    const stats = loadFromStorage(STORAGE_KEYS.ACCOUNT_STATS) || {};

    if (!stats[account]) {
        stats[account] = {
            category: category,
            correct: 0,
            total: 0
        };
    }

    stats[account].total++;
    if (isCorrect) {
        stats[account].correct++;
    }

    saveToStorage(STORAGE_KEYS.ACCOUNT_STATS, stats);
}

// ===== 間違いリスト操作 (missフラグ管理) =====
function addToWrongAnswers(question, levelId, sectionId) {
    const wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];

    // 重複チェック
    const existingIndex = wrongAnswers.findIndex(q => {
        if (q.取引 && question.取引) return q.取引 === question.取引;
        if (q.account && question.account) return q.account === question.account;
        return false;
    });

    if (existingIndex === -1) {
        const item = JSON.parse(JSON.stringify(question));
        item.meta = { levelId, sectionId };
        item.miss = true; // 明示的なフラグ管理
        wrongAnswers.push(item);
    } else {
        // 既にリストにある場合はフラグを確実に立てる
        wrongAnswers[existingIndex].miss = true;
    }
    saveToStorage(STORAGE_KEYS.WRONG_ANSWERS, wrongAnswers);
}

function removeFromWrongAnswers(question) {
    let wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    wrongAnswers = wrongAnswers.filter(q => {
        if (q.取引 && question.取引) return q.取引 !== question.取引;
        if (q.account && question.account) return q.account !== question.account;
        if (q.科目 && question.科目) return q.科目 !== question.科目; // 旧形式互換用
        return true;
    });
    saveToStorage(STORAGE_KEYS.WRONG_ANSWERS, wrongAnswers);
}

// ===== ゲーム終了 =====
function endGame() {
    stopTimer();

    const accuracy = Math.round((gameState.correctCount / gameState.totalQuestions) * 100);
    const rank = calculateRank(accuracy, gameState.elapsedTime);

    saveHistory(accuracy, rank.grade, 'クイズモード');

    elements.accuracy.textContent = `${accuracy}%`;
    elements.finalTime.textContent = formatTime(gameState.elapsedTime);
    elements.correctCount.textContent = `${gameState.correctCount}/${gameState.totalQuestions}`;

    const rankEl = elements.rank;
    if (rankEl) {
        rankEl.textContent = rank.grade;
        rankEl.classList.remove('rank-s', 'rank-a', 'rank-b', 'rank-c', 'rank-d');
        rankEl.classList.add(`rank-${rank.grade.toLowerCase()}`);
    }
    elements.rankMessage.textContent = rank.message;

    // 復習モードの場合はスコアを表示せずメニューに戻る
    if (gameState.mode === 'retry') {
        alert('復習が完了しました！');
        updateMenu();
        showScreen('menu');
        return;
    }

    if (gameState.wrongAnswers.length > 0) {
        elements.retryWrongResultBtn.classList.remove('hidden');
    } else {
        elements.retryWrongResultBtn.classList.add('hidden');
    }

    showScreen('result');
}

// ===== 履歴保存 =====
function saveHistory(accuracy, rank, mode) {
    const history = loadFromStorage(STORAGE_KEYS.HISTORY) || [];

    history.unshift({
        date: new Date().toISOString(),
        level: currentLevel ? currentLevel.name : (mode || '不明'),
        accuracy: accuracy,
        time: gameState.elapsedTime || sortingState.elapsedTime || calcState.elapsedTime,
        rank: rank,
        correct: gameState.correctCount || sortingState.correctCount || calcState.correctCount,
        total: gameState.totalQuestions || sortingState.questions.length || calcState.totalQuestions
    });

    if (history.length > 50) {
        history.pop();
    }

    saveToStorage(STORAGE_KEYS.HISTORY, history);
}

// ===== ランク計算 =====
function calculateRank(accuracy, time) {
    if (accuracy === 100 && time <= 30) {
        return {
            grade: 'S',
            message: '🎉 パーフェクト！簿記マスターです！驚異的なスピードと正確さ！'
        };
    } else if (accuracy >= 90 || accuracy === 100) {
        return {
            grade: 'A',
            message: '🌟 素晴らしい！勘定科目をしっかり理解しています！'
        };
    } else if (accuracy >= 70) {
        return {
            grade: 'B',
            message: '👍 良い成績です！もう少しで上位ランク！'
        };
    } else if (accuracy >= 50) {
        return {
            grade: 'C',
            message: '📚 まずまずの結果。復習して再挑戦しましょう！'
        };
    } else {
        return {
            grade: 'D',
            message: '💪 基礎から復習が必要です。頑張りましょう！'
        };
    }
}

// ===== 全成績一覧表示 =====
function showStatistics() {
    const stats = loadFromStorage(STORAGE_KEYS.ACCOUNT_STATS) || {};
    const tableBody = document.getElementById('stats-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // 勘定科目リストを並び替え（カテゴリ順など）
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

    showScreen('statistics');
}
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

// ===== 苦手・復習一覧表示 =====
function showWeakList() {
    const wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    // missフラグが立っているもののみを対象とする
    const missAnswers = wrongAnswers.filter(q => q.miss === true);

    if (missAnswers.length === 0) {
        elements.weakList.innerHTML = '<p class="empty-message">間違えた問題はありません。素晴らしい！</p>';
        showScreen('weak');
        return;
    }

    // レベル・セクションごとに集計
    const grouped = {};
    missAnswers.forEach(q => {
        const levelId = q.meta?.levelId || 'Unknown';
        const sectionId = q.meta?.sectionId || 'total';
        const key = `${levelId}-${sectionId}`;

        if (!grouped[key]) {
            grouped[key] = {
                levelId,
                sectionId,
                count: 0,
                questions: []
            };
        }
        grouped[key].count++;
        grouped[key].questions.push(q);
    });

    // 表示用のHTML生成
    elements.weakList.innerHTML = Object.values(grouped).map(group => {
        let title = '';
        if (group.levelId === 'L1') title = '📗 レベル1: 勘定科目の分類';
        else if (group.levelId === 'L2') {
            const sectionName = SECTION_MAP_REVERSE[group.sectionId] || group.sectionId;
            title = `📘 レベル2: 仕訳問題 (${sectionName})`;
        }
        else if (group.levelId === 'L3') title = '📙 レベル3: 仕訳問題 (総合)';
        else title = group.levelId;

        return `
            <div class="weak-group-card">
                <div class="weak-group-info">
                    <span class="weak-group-title">${title}</span>
                    <span class="weak-group-count">${group.count}問</span>
                </div>
                <button class="btn btn-secondary btn-sm start-review-btn" 
                        data-level="${group.levelId}" 
                        data-section="${group.sectionId === 'total' ? '' : group.sectionId}">
                    復習をはじめる
                </button>
            </div>
        `;
    }).join('');

    showScreen('weak');
}

// ===== 履歴クリア =====
function clearHistory() {
    if (confirm('すべての記録をクリアしますか？')) {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        localStorage.removeItem(STORAGE_KEYS.WRONG_ANSWERS);
        localStorage.removeItem(STORAGE_KEYS.ACCOUNT_STATS);
        showHistory();
        updateMenu();
    }
}

// ========================================
// ===== 仕分けモード =====
// ========================================

function startSortingMode() {
    if (!accountDatabase || Object.keys(accountDatabase).length === 0) {
        accountDatabase = LEVEL_DATA['L1'].data;
        currentLevel = LEVEL_DATA['L1'];
    }

    const allQuestions = [];
    for (const [category, accounts] of Object.entries(accountDatabase)) {
        for (const account of accounts) {
            allQuestions.push({
                account: account,
                answer: category
            });
        }
    }

    sortingState.questions = shuffleArray(allQuestions);
    sortingState.currentIndex = 0;
    sortingState.placements = {};
    sortingState.elapsedTime = 0;

    document.querySelectorAll('.dropped-items').forEach(zone => {
        zone.innerHTML = '';
    });

    elements.sortingTotal.textContent = sortingState.questions.length;
    elements.sortingTimerDisplay.textContent = '00:00';
    elements.checkAnswersBtn.classList.add('hidden');
    elements.accountCard.classList.remove('hidden');

    startSortingTimer();
    showNextCard();
    showScreen('sorting');
}

function startSortingTimer() {
    sortingState.startTime = Date.now();
    sortingState.timerInterval = setInterval(() => {
        sortingState.elapsedTime = Math.floor((Date.now() - sortingState.startTime) / 1000);
        elements.sortingTimerDisplay.textContent = formatTime(sortingState.elapsedTime);
    }, 1000);
}

function stopSortingTimer() {
    if (sortingState.timerInterval) {
        clearInterval(sortingState.timerInterval);
        sortingState.timerInterval = null;
    }
}

function showNextCard() {
    if (sortingState.currentIndex >= sortingState.questions.length) {
        elements.accountCard.classList.add('hidden');
        elements.checkAnswersBtn.classList.remove('hidden');
        stopSortingTimer();
        return;
    }

    const question = sortingState.questions[sortingState.currentIndex];
    elements.cardAccountName.textContent = question.account;
    elements.sortingCurrent.textContent = sortingState.currentIndex + 1;
}

let draggedAccount = null;

function initDragAndDrop() {
    const card = elements.accountCard;

    card.addEventListener('dragstart', (e) => {
        draggedAccount = elements.cardAccountName.textContent;
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

            if (draggedAccount) {
                const category = zone.dataset.category;
                placeAccount(draggedAccount, category, zone);
                draggedAccount = null;
            }
        });

        zone.addEventListener('click', () => {
            if (sortingState.currentIndex < sortingState.questions.length) {
                const account = elements.cardAccountName.textContent;
                const category = zone.dataset.category;
                placeAccount(account, category, zone);
            }
        });
    });
}

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

function checkSortingAnswers() {
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
                placed: placed,
                correct: question.answer
            });
        }

        const item = document.querySelector(`.dropped-item[data-account="${question.account}"]`);
        if (item) {
            item.classList.add(isCorrect ? 'correct' : 'incorrect');
        }

        updateAccountStats(question.account, question.answer, isCorrect);
    }

    setTimeout(() => {
        showSortingResult(correctCount, wrongAnswers);
    }, 1500);
}

function showSortingResult(correctCount, wrongAnswers) {
    const total = sortingState.questions.length;
    const accuracy = Math.round((correctCount / total) * 100);
    const rank = calculateRank(accuracy, sortingState.elapsedTime);

    gameState.correctCount = correctCount;
    gameState.totalQuestions = total;
    saveHistory(accuracy, rank.grade, '仕訳モード');

    elements.sortingAccuracy.textContent = `${accuracy}%`;
    elements.sortingFinalTime.textContent = formatTime(sortingState.elapsedTime);
    elements.sortingCorrectCount.textContent = `${correctCount}/${total}`;

    const rankEl = elements.sortingRank;
    if (rankEl) {
        rankEl.textContent = rank.grade;
        rankEl.classList.remove('rank-s', 'rank-a', 'rank-b', 'rank-c', 'rank-d');
        rankEl.classList.add(`rank-${rank.grade.toLowerCase()}`);
    }
    elements.sortingRankMessage.textContent = rank.message;

    if (wrongAnswers.length > 0) {
        elements.wrongAnswersList.classList.remove('hidden');
        elements.wrongAnswersContent.innerHTML = wrongAnswers.map(item => `
            <div class="wrong-answer-item">
                <span class="wrong-answer-account">${item.account}</span>
                <span class="wrong-answer-info">
                    ${item.placed} → <span class="correct-answer">${item.correct}</span>
                </span>
            </div>
        `).join('');
    } else {
        elements.wrongAnswersList.classList.add('hidden');
    }

    showScreen('sortingResult');
}

// ========================================
// ===== 計算モード =====
// ========================================

function startCalcMode() {
    if (!accountDatabase || Object.keys(accountDatabase).length === 0) {
        accountDatabase = LEVEL_DATA['L1'].data;
        currentLevel = LEVEL_DATA['L1'];
    }

    calcState.currentQuestion = 0;
    calcState.correctCount = 0;
    calcState.elapsedTime = 0;
    calcState.questions = generateCalcQuestions();
    calcState.totalQuestions = calcState.questions.length;
    calcState.userAnswers = {};

    elements.calcTotal.textContent = calcState.totalQuestions;
    elements.calcTimerDisplay.textContent = '00:00';

    startCalcTimer();
    showCalcQuestion();
    showScreen('calc');
}

function generateCalcQuestions() {
    const questions = [];

    for (let i = 0; i < 5; i++) {
        const questionType = Math.floor(Math.random() * 4);
        let question;

        switch (questionType) {
            case 0:
                question = generateBalanceSheetQuestion1();
                break;
            case 1:
                question = generateBalanceSheetQuestion2();
                break;
            case 2:
                question = generateCapitalChangeQuestion();
                break;
            case 3:
                question = generateProfitLossQuestion();
                break;
        }

        questions.push(question);
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
        type: 'bs1',
        values: { asset, liability, equity },
        unknown: unknown,
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
        type: 'bs2',
        values: { asset, liability, equity },
        unknown: unknown,
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
        type: 'capital',
        values: { startCapital, endCapital, profit },
        unknown: unknown,
        answer: unknown === 'startCapital' ? startCapital : unknown === 'endCapital' ? endCapital : profit
    };
}

function generateProfitLossQuestion() {
    // 収益は常に正の値（200-1000の範囲）
    const revenue = Math.floor(Math.random() * 800 + 200) * 10;

    // 費用は収益の50%～150%の範囲（純利益がマイナスになることもある）
    const expenseRatio = Math.random() * 1.0 + 0.5; // 0.5～1.5
    const expense = Math.floor(revenue * expenseRatio / 10) * 10;

    // 純利益（マイナスの場合は純損失）
    const profit = revenue - expense;

    const unknowns = ['revenue', 'expense', 'profit'];
    const unknown = unknowns[Math.floor(Math.random() * unknowns.length)];

    return {
        type: 'pl',
        values: { revenue, expense, profit },
        unknown: unknown,
        answer: unknown === 'revenue' ? revenue : unknown === 'expense' ? expense : profit
    };
}

function showCalcQuestion() {
    const question = calcState.questions[calcState.currentQuestion];

    elements.calcCurrent.textContent = calcState.currentQuestion + 1;
    elements.calcAnswerInput.value = '';
    elements.calcFeedback.classList.add('hidden');
    elements.calcSubmitBtn.disabled = false;

    let diagramHTML = '';
    let questionText = '';
    let inputLabel = '';

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

function generateBSDiagram(question) {
    const { asset, liability, equity } = question.values;
    const unknown = question.unknown;

    return `
        <div class="calc-diagram-bs">
            <div class="calc-item asset">
                <span class="calc-item-label">資産</span>
                <span class="calc-item-value ${unknown === 'asset' ? 'unknown' : ''}">
                    ${unknown === 'asset' ? '?' : asset.toLocaleString()}
                </span>
            </div>
            <div>
                <div class="calc-item liability" style="margin-bottom: 1rem;">
                    <span class="calc-item-label">負債</span>
                    <span class="calc-item-value ${unknown === 'liability' ? 'unknown' : ''}">
                        ${unknown === 'liability' ? '?' : liability.toLocaleString()}
                    </span>
                </div>
                <div class="calc-item equity">
                    <span class="calc-item-label">純資産</span>
                    <span class="calc-item-value ${unknown === 'equity' ? 'unknown' : ''}">
                        ${unknown === 'equity' ? '?' : equity.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function generateCapitalDiagram(question) {
    const { startCapital, endCapital, profit } = question.values;
    const unknown = question.unknown;

    return `
        <div class="calc-diagram-capital">
            <div class="calc-item equity">
                <span class="calc-item-label">期首資本</span>
                <span class="calc-item-value ${unknown === 'startCapital' ? 'unknown' : ''}">
                    ${unknown === 'startCapital' ? '?' : startCapital.toLocaleString()}
                </span>
            </div>
            <div class="calc-arrow">+</div>
            <div class="calc-item revenue">
                <span class="calc-item-label">純利益</span>
                <span class="calc-item-value ${unknown === 'profit' ? 'unknown' : ''}">
                    ${unknown === 'profit' ? '?' : profit.toLocaleString()}
                </span>
            </div>
            <div class="calc-arrow">=</div>
            <div class="calc-item equity">
                <span class="calc-item-label">期末資本</span>
                <span class="calc-item-value ${unknown === 'endCapital' ? 'unknown' : ''}">
                    ${unknown === 'endCapital' ? '?' : endCapital.toLocaleString()}
                </span>
            </div>
        </div>
    `;
}

function generatePLDiagram(question) {
    const { revenue, expense, profit } = question.values;
    const unknown = question.unknown;

    return `
        <div class="calc-diagram-pl">
            <div class="calc-item expense">
                <span class="calc-item-label">費用</span>
                <span class="calc-item-value ${unknown === 'expense' ? 'unknown' : ''}">
                    ${unknown === 'expense' ? '?' : expense.toLocaleString()}
                </span>
            </div>
            <div>
                <div class="calc-item revenue" style="margin-bottom: 1rem;">
                    <span class="calc-item-label">収益</span>
                    <span class="calc-item-value ${unknown === 'revenue' ? 'unknown' : ''}">
                        ${unknown === 'revenue' ? '?' : revenue.toLocaleString()}
                    </span>
                </div>
                <div class="calc-item revenue">
                    <span class="calc-item-label">純利益</span>
                    <span class="calc-item-value ${unknown === 'profit' ? 'unknown' : ''}">
                        ${unknown === 'profit' ? '?' : profit.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function startCalcTimer() {
    calcState.startTime = Date.now();
    calcState.timerInterval = setInterval(() => {
        calcState.elapsedTime = Math.floor((Date.now() - calcState.startTime) / 1000);
        elements.calcTimerDisplay.textContent = formatTime(calcState.elapsedTime);
    }, 1000);
}

function stopCalcTimer() {
    if (calcState.timerInterval) {
        clearInterval(calcState.timerInterval);
        calcState.timerInterval = null;
    }
}

function submitCalcAnswer() {
    const userAnswer = parseInt(elements.calcAnswerInput.value);
    const question = calcState.questions[calcState.currentQuestion];

    if (isNaN(userAnswer)) {
        alert('数値を入力してください');
        return;
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

function endCalcMode() {
    stopCalcTimer();

    const accuracy = Math.round((calcState.correctCount / calcState.totalQuestions) * 100);
    const rank = calculateRank(accuracy, calcState.elapsedTime);

    gameState.correctCount = calcState.correctCount;
    gameState.totalQuestions = calcState.totalQuestions;
    saveHistory(accuracy, rank.grade, '計算モード');

    elements.calcAccuracy.textContent = `${accuracy}%`;
    elements.calcFinalTime.textContent = formatTime(calcState.elapsedTime);
    elements.calcCorrectCount.textContent = `${calcState.correctCount}/${calcState.totalQuestions}`;

    const rankEl = elements.calcRank;
    if (rankEl) {
        rankEl.textContent = rank.grade;
        rankEl.classList.remove('rank-s', 'rank-a', 'rank-b', 'rank-c', 'rank-d');
        rankEl.classList.add(`rank-${rank.grade.toLowerCase()}`);
    }
    elements.calcRankMessage.textContent = rank.message;

    showScreen('calcResult');
}

// (イベントリスナーは initEventListeners で一元管理されているため削除)

function handleNumber(num) {
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

function handleOperator(op) {
    if (calcOperator && !calcNewInput) {
        handleEqual();
    }
    calcPrevValue = parseFloat(calcInput);
    calcOperator = op;
    calcNewInput = true;
}

function handleEqual() {
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

function handleClear() {
    calcInput = '0';
    calcOperator = null;
    calcPrevValue = null;
    calcNewInput = true;
}

function handleBackspace() {
    if (calcNewInput) return;
    calcInput = calcInput.slice(0, -1);
    if (calcInput === '' || calcInput === '-') calcInput = '0';
}

function updateCalcDisplay() {
    const display = document.getElementById('mini-calc-display');
    if (display) {
        let val = calcInput;
        if (val.length > 12) val = parseFloat(val).toExponential(5);
        display.textContent = val;
    }
}

// ===== スプレッドシート連携 (CSV) =====
async function loadQuestionsFromSpreadsheet(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvText = await response.text();
        parseCSVToJournal(csvText);
    } catch (error) {
        console.error('スプレッドシートの読み込みに失敗しました:', error);
    }
}

function parseCSVToJournal(csvText) {
    const lines = csvText.split(/\r?\n/);
    const questionsBySection = {};
    let currentQuestion = null;

    // ヘッダーをスキップ (区分, 問題文, 借方勘定, 借方金額, 貸方勘定, 貸方金額)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // カンマ区切り（引用符内を考慮）
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length < 6) continue;

        const [rawSection, query, dAcc, dAmtRaw, cAcc, cAmtRaw, explanation] = parts;
        const section = SECTION_MAP[rawSection] || rawSection;

        // 新しい問題の開始判定 (区分または問題文がある場合)
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
            if (dAcc && dAmtRaw) {
                const dAmt = parseInt(dAmtRaw.replace(/,/g, '')) || 0;
                currentQuestion.借方.push({ 科目: dAcc, 金額: dAmt });
            }
            if (cAcc && cAmtRaw) {
                const cAmt = parseInt(cAmtRaw.replace(/,/g, '')) || 0;
                currentQuestion.貸方.push({ 科目: cAcc, 金額: cAmt });
            }
            // 2行目以降に解説がある場合も、最初の解説を維持（もしくは必要なら連結）
            // ここでは1行目の解説を優先とする
        }
    }

    // 最後の問題をプッシュ
    if (currentQuestion) {
        if (!questionsBySection[currentQuestion.section]) {
            questionsBySection[currentQuestion.section] = [];
        }
        questionsBySection[currentQuestion.section].push(currentQuestion);
    }

    // LEVEL_DATAに反映
    for (const [section, data] of Object.entries(questionsBySection)) {
        if (LEVEL_DATA['L2'] && LEVEL_DATA['L2'].sections && LEVEL_DATA['L2'].sections[section]) {
            LEVEL_DATA['L2'].sections[section].data = data;
        } else {
            console.warn(`未知の区分です（無視されました）: ${section}`);
        }
    }
}

// ===== 初期化 =====
loadQuestionsFromSpreadsheet(SPREADSHEET_CSV_URL);
updateMenu();
initEventListeners();
initDragAndDrop();

function startRetryWrong(levelId = null, sectionId = null) {
    let wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    if (wrongAnswers.length === 0) return;

    // フィルタリング
    if (levelId) {
        wrongAnswers = wrongAnswers.filter(q => q.meta?.levelId === levelId);
        if (sectionId && sectionId !== 'total') {
            wrongAnswers = wrongAnswers.filter(q => q.meta?.sectionId === sectionId);
        }
    }

    if (wrongAnswers.length === 0) return;

    // 最初の問題の種類でモードを判定
    const firstQuestion = wrongAnswers[0];

    if (firstQuestion.取引) {
        // 仕訳問題モード
        journalState.questions = [...wrongAnswers];
        journalState.totalQuestions = journalState.questions.length;
        journalState.currentQuestion = 0;
        journalState.correctCount = 0;
        journalState.elapsedTime = 0;
        journalState.startTime = Date.now();
        journalState.mode = 'retry';
        showScreen('journal-screen');
        showJournalQuestion();
    } else {
        // 通常の勘定科目クイズモード
        gameState.questions = [...wrongAnswers];
        gameState.currentQuestion = 0;
        gameState.score = 0;
        gameState.startTime = Date.now();
        gameState.mode = 'retry';
        gameState.totalQuestions = gameState.questions.length;
        showScreen('quiz'); // screens.quiz のキーは 'quiz'
        startGameWithQuestions();
    }
}
