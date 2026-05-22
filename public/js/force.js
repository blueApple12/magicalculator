class ForceSystem {
    constructor() {
        this.toxicNum = 0;
        this.pendingSlot = false;
        this.toxicForce = false;
        this.collectiveForce = '';   // '' = inactive; non-empty = digits left to type
        this.lockedUntil = 0;        // freeze button presses until this timestamp
        this.hud = false;

        this.overlay = document.getElementById('collective-force-overlay');
        // pointerdown = instant response (no wait for click to fire)
        this.overlay.addEventListener('pointerdown', () => this.handleOverlayClick());

        const pctBtn = document.getElementById('btn-percentage');
        let longPressTimer;
        pctBtn.addEventListener('pointerdown', () => {
            longPressTimer = setTimeout(() => {
                this.pendingSlot = true;
                if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            }, 600);
        });
        pctBtn.addEventListener('pointerup',    () => clearTimeout(longPressTimer));
        pctBtn.addEventListener('pointerleave', () => clearTimeout(longPressTimer));

        this.vibrate = () => { if (navigator.vibrate) navigator.vibrate(10); };
        window.forceSystem = this;
    }

    isActive() { return this.collectiveForce !== ''; }
    isFrozen() { return Date.now() < this.lockedUntil; }

    getForces() {
        try {
            const saved = localStorage.getItem('magi_forces');
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return Array(10).fill('');
    }

    getForceValue(index) {
        const forces = this.getForces();
        let val = forces[index] || '0';
        if (val.startsWith('Time')) {
            const offsetSec = parseInt(val.substring(4)) || 0;
            const d = new Date();
            d.setSeconds(d.getSeconds() + offsetSec);
            return String(d.getDate()).padStart(2,'0')
                 + String(d.getMonth()+1).padStart(2,'0')
                 + String(d.getHours()).padStart(2,'0')
                 + String(d.getMinutes()).padStart(2,'0');
        }
        return isNaN(parseFloat(val)) ? '0' : val;
    }

    selectSlot(num) {
        if (this.pendingSlot) {
            this.toxicNum = num;
            this.pendingSlot = false;
            this.vibrate();
            return true;
        }
        return false;
    }

    handlePercentageClick() {
        if (!this.isActive()) {
            this.toxicForce = !this.toxicForce;
            window.calcInstance?.updateDisplay(); // refresh live preview now that the "lie" toggled
            this.vibrate();
            return true;
        }
        return false;
    }

    calculateCollectiveForce() {
        if (this.isActive()) return false;

        const target = parseFloat(this.getForceValue(this.toxicNum));
        const calc   = window.calcInstance;

        let current = 0;
        try {
            const raw = calc.currentValue
                .replace(/[+\-×÷.]$/, '')
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/,/g, '');
            current = parseFloat(new Function('return ' + (raw || '0'))()) || 0;
        } catch(_) {}

        const diff    = Math.round(target - current);
        const absDiff = Math.abs(diff);

        if (absDiff > 0) {
            const operator = diff > 0 ? '+' : '-';
            const lastChar = calc.currentValue.slice(-1);
            const isOp = ['+', '-', '×', '÷'].includes(lastChar);

            let forceString = absDiff.toString();
            if (!isOp) {
                forceString = operator + forceString;
            } else if ((lastChar === '+' || lastChar === '-') && lastChar !== operator) {
                calc.currentValue = calc.currentValue.slice(0, -1);
                forceString = operator + forceString;
            }

            // Delay so the '.' synthetic click doesn't consume the first digit
            setTimeout(() => {
                this.collectiveForce = forceString;
                this.overlay.classList.add('active');
            }, 250);
        }

        this.vibrate();
        return true;
    }

    handleOverlayClick() {
        if (this.isFrozen()) return;
        if (!this.isActive()) return;

        this.vibrate();
        const char = this.collectiveForce[0];
        this.collectiveForce = this.collectiveForce.slice(1);
        window.calcInstance.forceInput(char);

        if (!this.isActive()) {
            this.overlay.classList.remove('active');
            this.lockedUntil = Date.now() + 1000;  // 1-second freeze after last digit
        }
    }

    toggleHud() {
        if (!this.isActive()) {
            this.hud = !this.hud;
            this.updateHudVisuals();
        }
        return true;
    }

    updateHudVisuals() {
        const pmPlus  = document.getElementById('pm-plus');
        const pmMinus = document.getElementById('pm-minus');
        const numBtns = document.querySelectorAll('.btn-number');
        const TINT    = '#ffaa70';

        if (this.hud) {
            const target = parseFloat(this.getForceValue(this.toxicNum));
            const calc   = window.calcInstance;
            let current  = 0;
            try {
                const raw = calc.currentValue
                    .replace(/[+\-×÷.]$/, '')
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/,/g, '');
                current = parseFloat(new Function('return ' + (raw || '0'))()) || 0;
            } catch(_) {}

            const diff       = Math.round(target - current);
            const diffLength = Math.abs(diff).toString().length;

            pmPlus.style.color  = diff > 0 ? TINT : '';
            pmMinus.style.color = diff < 0 ? TINT : '';

            numBtns.forEach(btn => {
                btn.classList.toggle('dimmed', parseInt(btn.dataset.value) === diffLength);
            });
        } else {
            pmPlus.style.color  = '';
            pmMinus.style.color = '';
            numBtns.forEach(btn => btn.classList.remove('dimmed'));
        }
    }

    handleEquals() {
        if (!this.isActive() && this.toxicForce) {
            this.toxicForce = false;
            const calc = window.calcInstance;
            calc.expression  = calc.currentValue;
            calc.currentValue = this.getForceValue(this.toxicNum);
            calc.isEvaluated  = true;
            calc.displayArea.classList.add('evaluated');
            calc.updateDisplay();
            return true;
        }
        return false;
    }
}
