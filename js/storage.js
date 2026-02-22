// ===== ローカルストレージ操作 =====

import { STORAGE_KEYS } from './data.js';
import { showToast } from './ui.js';

export function validateStorageData(key, data) {
    switch (key) {
        case STORAGE_KEYS.HISTORY:
            return Array.isArray(data) && data.every(item =>
                item.date && item.level && typeof item.accuracy === 'number'
            );
        case STORAGE_KEYS.WRONG_ANSWERS:
            return Array.isArray(data);
        case STORAGE_KEYS.ACCOUNT_STATS:
            return typeof data === 'object' && data !== null;
        default:
            return true;
    }
}

export function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        if (!data) return null;
        const parsed = JSON.parse(data);
        if (!validateStorageData(key, parsed)) {
            console.warn(`Invalid data for key ${key}, resetting...`);
            return null;
        }
        return parsed;
    } catch (error) {
        console.error(`Failed to load ${key}:`, error);
        try { localStorage.removeItem(key); } catch { }
        return null;
    }
}

export function saveToStorage(key, data) {
    try {
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 5 * 1024 * 1024) throw new Error('Data size exceeds 5MB limit');
        localStorage.setItem(key, dataStr);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            showToast('ストレージ容量が不足しています', 'error');
        } else {
            console.error('Failed to save data:', error);
            showToast('データの保存に失敗しました', 'error');
        }
        return false;
    }
}

export function addToWrongAnswers(question, levelId, sectionId) {
    const wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    const existingIndex = wrongAnswers.findIndex(q => {
        if (q.取引 && question.取引) return q.取引 === question.取引;
        if (q.account && question.account) return q.account === question.account;
        return false;
    });

    if (existingIndex === -1) {
        const item = JSON.parse(JSON.stringify(question));
        item.meta = { levelId, sectionId };
        item.miss = true;
        wrongAnswers.push(item);
    } else {
        wrongAnswers[existingIndex].miss = true;
    }
    saveToStorage(STORAGE_KEYS.WRONG_ANSWERS, wrongAnswers);
}

export function removeFromWrongAnswers(question) {
    let wrongAnswers = loadFromStorage(STORAGE_KEYS.WRONG_ANSWERS) || [];
    wrongAnswers = wrongAnswers.filter(q => {
        if (q.取引 && question.取引) return q.取引 !== question.取引;
        if (q.account && question.account) return q.account !== question.account;
        if (q.科目 && question.科目) return q.科目 !== question.科目;
        return true;
    });
    saveToStorage(STORAGE_KEYS.WRONG_ANSWERS, wrongAnswers);
}

export function updateAccountStats(account, category, isCorrect) {
    const stats = loadFromStorage(STORAGE_KEYS.ACCOUNT_STATS) || {};
    if (!stats[account]) {
        stats[account] = { category, correct: 0, total: 0 };
    }
    stats[account].total++;
    if (isCorrect) stats[account].correct++;
    saveToStorage(STORAGE_KEYS.ACCOUNT_STATS, stats);
}
