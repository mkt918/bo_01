// ===== ユーティリティ関数（副作用なし純粋関数） =====

export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function calculateRank(accuracy, time) {
    if (accuracy === 100 && time <= 30) {
        return { grade: 'S', message: '🎉 パーフェクト！簿記マスターです！驚異的なスピードと正確さ！' };
    } else if (accuracy >= 90 || accuracy === 100) {
        return { grade: 'A', message: '🌟 素晴らしい！勘定科目をしっかり理解しています！' };
    } else if (accuracy >= 70) {
        return { grade: 'B', message: '👍 良い成績です！もう少しで上位ランク！' };
    } else if (accuracy >= 50) {
        return { grade: 'C', message: '📚 まずまずの結果。復習して再挑戦しましょう！' };
    } else {
        return { grade: 'D', message: '💪 基礎から復習が必要です。頑張りましょう！' };
    }
}

/**
 * ゲームモードの state オブジェクトと表示要素を受け取り、
 * start()/stop() メソッドを持つタイマーオブジェクトを返す。
 * @param {{timerInterval:?, startTime:?, elapsedTime:number}} state
 * @param {HTMLElement|null} displayEl
 */
export function createTimer(state, displayEl) {
    return {
        start() {
            if (state.timerInterval) clearInterval(state.timerInterval);
            state.startTime = Date.now();
            state.timerInterval = setInterval(() => {
                state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
                if (displayEl) displayEl.textContent = formatTime(state.elapsedTime);
            }, 1000);
        },
        stop() {
            if (state.timerInterval) {
                clearInterval(state.timerInterval);
                state.timerInterval = null;
            }
        }
    };
}
