class Calculator {
    constructor(displayElement, previewElement) {
        this.displayElement = displayElement;
        this.previewElement = previewElement;
        this.displayArea = document.getElementById('display-area');
        this.currentValue = '0';
        this.expression = '';
        this.isEvaluated = false;
        this.history = this.loadHistory();

        window.calcInstance = this;
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('magi_history');
            return saved ? JSON.parse(saved) : [];
        } catch(_) { return []; }
    }

    saveHistory() {
        localStorage.setItem('magi_history', JSON.stringify(this.history.slice(-20)));
    }

    renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;
        const recent = this.history.slice(-2);
        list.innerHTML = recent.map(h =>
            `<div class="history-item">
                <span class="history-expr">${this.formatExpression(h.expr)}</span>
                <span class="history-result">= ${this.formatExpression(h.result)}</span>
            </div>`
        ).join('');
    }

    // Live-evaluate the current expression; returns number or null
    tryCalculate() {
        try {
            let clean = this.currentValue
                .replace(/[+\-×÷.]$/, '')
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/,/g, '');
            if (!clean || !/[+\-*/]/.test(clean)) return null;
            const result = new Function('return ' + clean)();
            if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return null;
            return Math.round(result * 1e9) / 1e9;
        } catch (_) { return null; }
    }

    updateDisplay() {
        if (this.isEvaluated) {
            // After = : hide expression, show only result big
            this.displayArea.classList.remove('has-expression');
            this.previewElement.innerText = '';
            this.displayElement.innerText = this.formatExpression(this.currentValue);
        } else {
            const live = this.tryCalculate();
            if (live !== null) {
                // Expression with operator: expression on top, live result below small
                this.displayArea.classList.add('has-expression');
                this.previewElement.innerText = this.formatExpression(this.currentValue);
                this.displayElement.innerText = this.formatExpression(String(live));
            } else {
                // Just a number: show large, no expression above
                this.displayArea.classList.remove('has-expression');
                this.previewElement.innerText = '';
                this.displayElement.innerText = this.formatExpression(this.currentValue);
            }
        }
        this.adjustFontSize();
    }

    setDisplay(value) {
        this.currentValue = value.toString();
        this.isEvaluated = true;
        this.displayArea.classList.add('evaluated');
        this.updateDisplay();
    }

    formatExpression(expr) {
        if (!expr && expr !== 0) return '';
        if (expr === 'Error') return 'Error';
        return expr.toString().replace(/\d+(\.\d*)?/g, (match) => {
            const parts = match.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        });
    }

    adjustFontSize() {
        if (this.isEvaluated) {
            this.displayElement.style.fontSize = '';
            this.previewElement.style.fontSize = '';
            return;
        }
        if (this.displayArea.classList.contains('has-expression')) {
            // Scale expression text
            const len = this.formatExpression(this.currentValue).length;
            this.previewElement.style.fontSize =
                len > 14 ? '1.6rem' : len > 10 ? '2.2rem' : '';
            this.displayElement.style.fontSize = '';
        } else {
            // Scale single number text
            const len = this.formatExpression(this.currentValue).length;
            this.displayElement.style.fontSize =
                len > 12 ? '2rem' : len > 9 ? '2.8rem' : '';
            this.previewElement.style.fontSize = '';
        }
    }

    // Used by collective force: appends without clearing on evaluated
    forceInput(char) {
        const isOp = /[+\-×÷]/.test(char);
        if (this.isEvaluated) {
            // After =, operator continues from result; digit starts fresh
            this.currentValue = isOp ? this.currentValue + char : char;
            this.expression = '';
            this.isEvaluated = false;
            this.displayArea.classList.remove('evaluated');
        } else if (this.currentValue === '0' && !isOp) {
            this.currentValue = char;
        } else {
            this.currentValue += char;
        }
        this.updateDisplay();
    }

    appendNumber(number) {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) {
            this.currentValue = number.toString();
            this.expression = '';
            this.isEvaluated = false;
        } else {
            this.currentValue = this.currentValue === '0'
                ? number.toString()
                : this.currentValue + number.toString();
        }
        this.updateDisplay();
    }

    appendDot() {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) {
            this.currentValue = '0.';
            this.expression = '';
            this.isEvaluated = false;
        } else {
            const match = this.currentValue.match(/[0-9.]+$/);
            if (match && !match[0].includes('.')) {
                this.currentValue += '.';
            } else if (!match) {
                this.currentValue += '0.';
            }
        }
        this.updateDisplay();
    }

    processOperator(operator) {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) {
            this.expression = '';
            this.isEvaluated = false;
        }
        const lastChar = this.currentValue.slice(-1);
        const operators = ['+', '-', '×', '÷'];
        if (operators.includes(lastChar) || lastChar === '.') {
            this.currentValue = this.currentValue.slice(0, -1) + operator;
        } else {
            this.currentValue += operator;
        }
        this.updateDisplay();
    }

    backspace() {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) {
            this.expression = '';
            this.isEvaluated = false;
        }
        this.currentValue = this.currentValue.length > 1
            ? this.currentValue.slice(0, -1)
            : '0';
        this.updateDisplay();
    }

    clear() {
        this.currentValue = '0';
        this.expression = '';
        this.isEvaluated = false;
        this.displayArea.classList.remove('evaluated');
        this.updateDisplay();
    }

    percentage() {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) { this.expression = ''; this.isEvaluated = false; }
        const match = this.currentValue.match(/(\d+\.?\d*|\.\d+)$/);
        if (match) {
            const perc = parseFloat(match[0]) / 100;
            this.currentValue = this.currentValue.slice(0, match.index) + perc.toString();
            this.updateDisplay();
        }
    }

    plusMinus() {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) { this.expression = ''; this.isEvaluated = false; }
        const match = this.currentValue.match(/([\+\-×÷])?(\d+\.?\d*|\.\d+)$/);
        if (match) {
            const index = match.index;
            const op = match[1];
            const numStr = match[2];
            if (op === '+') {
                this.currentValue = this.currentValue.slice(0, index) + '-' + numStr;
            } else if (op === '-') {
                if (index === 0) {
                    this.currentValue = numStr;
                } else {
                    const prev = this.currentValue.slice(index - 1, index);
                    this.currentValue = ['×', '÷'].includes(prev)
                        ? this.currentValue.slice(0, index) + numStr
                        : this.currentValue.slice(0, index) + '+' + numStr;
                }
            } else if (op === '×' || op === '÷') {
                this.currentValue = this.currentValue.slice(0, index + 1) + '-' + numStr;
            } else {
                this.currentValue = '-' + numStr;
            }
        } else {
            const neg = this.currentValue.match(/([×÷])\-(\d+\.?\d*|\.\d+)$/);
            if (neg) {
                this.currentValue = this.currentValue.slice(0, neg.index) + neg[1] + neg[2];
            }
        }
        this.updateDisplay();
    }

    calculateReal() {
        try {
            if (this.isEvaluated || this.currentValue === 'Error') return this.currentValue;

            let cleanValue = this.currentValue.replace(/[+\-×÷.]$/, '') || '0';
            this.expression = cleanValue;

            let evalString = cleanValue
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/(?<!\.)\b0+(?=\d)/g, '');

            const result = new Function('return ' + evalString)();

            this.currentValue = (result === Infinity || result === -Infinity || isNaN(result))
                ? 'Error'
                : (Math.round(result * 1e9) / 1e9).toString();

            this.isEvaluated = true;
            this.displayArea.classList.add('evaluated');

            if (this.currentValue !== 'Error') {
                this.history.push({ expr: this.expression, result: this.currentValue });
                this.saveHistory();
                this.renderHistory();
            }
        } catch (_) {
            this.currentValue = 'Error';
            this.isEvaluated = true;
            this.displayArea.classList.add('evaluated');
        }
        this.updateDisplay();
        return this.currentValue;
    }
}
