// ===== 定数・マスターデータ =====

export const STORAGE_KEYS = {
    HISTORY: 'bookkeeping_quiz_history',
    WRONG_ANSWERS: 'bookkeeping_quiz_wrong',
    ACCOUNT_STATS: 'bookkeeping_quiz_stats'
};

export const SPREADSHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOHnb3gc6-KwJ8R5q_8pma9YoyjMLmlT4A_Y_4XbizqEcxQPOPrvP87SrPgOsSUDVZJdQyK4IA_g4X/pub?gid=0&single=true&output=csv';

// 区分（数値）とシステム内部キーの対応表
export const SECTION_MAP = {
    '1': 'cash',
    '2': 'bank',
    '3': 'payable',
    '4': 'receivable'
};

export const SECTION_MAP_REVERSE = {
    'cash': '現金',
    'bank': '当座預金',
    'payable': '買掛金',
    'receivable': '売掛金'
};

// ===== レベルデータ =====
export const LEVEL_DATA = {
    'L1': {
        id: 'L1',
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
        id: 'L2',
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
        id: 'L3',
        name: '仕訳問題（総合）',
        available: true,
        data: []
    }
};

// 共有アプリ状態（複数モジュールが参照する）
export let accountDatabase = {};
export let currentLevel = null;
export let currentMode = null;

export function setAccountDatabase(db) { accountDatabase = db; }
export function setCurrentLevel(lvl) { currentLevel = lvl; }
export function setCurrentMode(mode) { currentMode = mode; }
