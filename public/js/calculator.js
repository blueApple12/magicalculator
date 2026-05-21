class Calculator {
    constructor(displayElement, previewElement) {
        this.displayElement = displayElement;
        this.previewElement = previewElement;
        this.displayArea = document.getElementById('display-area');
        this.currentValue = '0'; // Holds the full expression string
        this.expression = ''; // Holds the history/previous expression
        this.isEvaluated = false;
        
        window.calcInstance = this;
    }

    updateDisplay() {
        this.displayElement.innerText = this.formatExpression(this.currentValue);
        this.previewElement.innerText = this.formatExpression(this.expression);
        this.adjustFontSize();
    }
    
    setDisplay(value) {
        this.currentValue = value.toString();
        this.displayArea.classList.add('evaluated');
        this.updateDisplay();
    }

    formatExpression(expr) {
        if (!expr) return '';
        if (expr === 'Error') return 'Error';
        
        // Find all numbers (including decimals) and format them with commas
        // Matches digits optionally followed by a dot and more digits
        return expr.toString().replace(/\d+(\.\d*)?/g, (match) => {
            const parts = match.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        });
    }

    adjustFontSize() {
        if (this.isEvaluated) {
            // Let CSS handle evaluated state — clear any inline override
            this.displayElement.style.fontSize = '';
            return;
        }
        const length = this.formatExpression(this.currentValue).length;
        if (length > 12) {
            this.displayElement.style.fontSize = '2rem';
        } else if (length > 9) {
            this.displayElement.style.fontSize = '2.8rem';
        } else {
            this.displayElement.style.fontSize = '3.8rem';
        }
    }

    // AddInput equivalent for collective force: no display-clear on evaluated
    forceInput(char) {
        if (this.isEvaluated) {
            this.currentValue = char;
            this.expression = '';
            this.isEvaluated = false;
            this.displayArea.classList.remove('evaluated');
        } else if (this.currentValue === '0') {
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
            if (this.currentValue === '0') {
                this.currentValue = number.toString();
            } else {
                this.currentValue += number.toString();
            }
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
            // Find the last number token in the expression
            const match = this.currentValue.match(/[0-9\.]+$/);
            if (match) {
                // If the last number already has a dot, do nothing
                if (!match[0].includes('.')) {
                    this.currentValue += '.';
                }
            } else {
                // If no number at the end (e.g. after an operator), append "0."
                this.currentValue += '0.';
            }
        }
        this.updateDisplay();
    }

    processOperator(operator) {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) {
            // Continue operating on the result
            this.expression = '';
            this.isEvaluated = false;
        }
        
        // If last char is an operator or dot, replace it instead of appending
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
            if (this.currentValue.length > 1) {
                this.currentValue = this.currentValue.slice(0, -1);
            } else {
                this.currentValue = '0';
            }
        } else {
            if (this.currentValue.length > 1) {
                this.currentValue = this.currentValue.slice(0, -1);
            } else {
                this.currentValue = '0';
            }
        }
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
        if (this.isEvaluated) {
            this.expression = '';
            this.isEvaluated = false;
        }
        // Find the last number in the expression and divide it by 100
        const match = this.currentValue.match(/(\d+\.?\d*|\.\d+)$/);
        if (match) {
            const numStr = match[0];
            const num = parseFloat(numStr);
            const perc = num / 100;
            // Replace the last number with its percentage
            this.currentValue = this.currentValue.slice(0, match.index) + perc.toString();
            this.updateDisplay();
        }
    }

    plusMinus() {
        this.displayArea.classList.remove('evaluated');
        if (this.isEvaluated) {
            this.expression = '';
            this.isEvaluated = false;
        }
        
        // Find the last number, taking into account any preceding operator
        const match = this.currentValue.match(/([\+\-×÷])?(\d+\.?\d*|\.\d+)$/);
        if (match) {
            const index = match.index;
            const op = match[1]; // +, -, ×, ÷ or undefined
            const numStr = match[2];
            
            if (op === '+') {
                this.currentValue = this.currentValue.slice(0, index) + '-' + numStr;
            } else if (op === '-') {
                if (index === 0) {
                    this.currentValue = numStr;
                } else {
                    const prevChar = this.currentValue.slice(index - 1, index);
                    if (['×', '÷'].includes(prevChar)) {
                        this.currentValue = this.currentValue.slice(0, index) + numStr;
                    } else {
                        this.currentValue = this.currentValue.slice(0, index) + '+' + numStr;
                    }
                }
            } else if (op === '×' || op === '÷') {
                this.currentValue = this.currentValue.slice(0, index + 1) + '-' + numStr;
            } else if (op === undefined) {
                this.currentValue = '-' + numStr;
            }
        } else {
            // Check if it ends with "×-" or "÷-"
            const matchNeg = this.currentValue.match(/([×÷])\-(\d+\.?\d*|\.\d+)$/);
            if (matchNeg) {
                const index = matchNeg.index;
                const op = matchNeg[1];
                const numStr = matchNeg[2];
                this.currentValue = this.currentValue.slice(0, index) + op + numStr;
            }
        }
        
        this.updateDisplay();
    }

    calculateReal() {
        try {
            // Don't do anything if it's already evaluated or empty or error
            if (this.isEvaluated || this.currentValue === 'Error') return this.currentValue;

            // Remove trailing operators
            let cleanValue = this.currentValue.replace(/[+\-×÷.]$/, '');
            if (!cleanValue) cleanValue = '0';

            this.expression = cleanValue + '=';
            
            // Format for JS evaluation
            let evalString = cleanValue
                .replace(/×/g, '*')
                .replace(/÷/g, '/');
                
            // Avoid eval issues with leading zeros (prevent octal parsing)
            // Removes 0s that are preceded by a word boundary (not a dot) and followed by a digit
            evalString = evalString.replace(/(?<!\.)\b0+(?=\d)/g, '');
            
            const result = new Function('return ' + evalString)();
            
            if (result === Infinity || result === -Infinity || isNaN(result)) {
                this.currentValue = 'Error';
            } else {
                // Format to avoid long decimals
                let resStr = (Math.round(result * 1000000000) / 1000000000).toString();
                this.currentValue = resStr;
            }
            
            this.isEvaluated = true;
            this.displayArea.classList.add('evaluated');
        } catch (error) {
            console.error("Evaluation error:", error);
            this.currentValue = 'Error';
            this.isEvaluated = true;
            this.displayArea.classList.add('evaluated');
        }
        this.updateDisplay();
        return this.currentValue;
    }
}
