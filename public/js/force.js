class ForceSystem {
    constructor() {
        this.toxicNum = 0;
        this.pendingSlot = false;
        this.toxicForce = false;
        this.collectiveForce = '0';
        this.hud = false;
        this.locked = false;
        this.justActivated = false;

        this.overlay = document.getElementById('collective-force-overlay');
        this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
        this.overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleOverlayClick();
        });

        // Long-press % to arm slot selection
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
    }

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
        if (this.collectiveForce === '0') {
            this.toxicForce = !this.toxicForce;
            this.vibrate();
            return true;
        }
        return false;
    }

    calculateCollectiveForce() {
        if (this.collectiveForce === '0') {
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

                this.collectiveForce = forceString;
                this.justActivated = true;
                setTimeout(() => { this.justActivated = false; }, 250);
                this.overlay.classList.add('active');
            }

            this.vibrate();
            return true;
        }
        return false;
    }

    handleOverlayClick() {
        if (this.locked || this.justActivated) return;
        if (this.collectiveForce === '0') return;

        this.vibrate();
        const char = this.collectiveForce[0];
        this.collectiveForce = this.collectiveForce.slice(1);
        window.calcInstance.forceInput(char);

        if (this.collectiveForce === '') {
            this.collectiveForce = '0';
            this.locked = true;
            setTimeout(() => {
                this.locked = false;
                this.overlay.classList.remove('active');
            }, 1000);
        }
    }

    toggleHud() {
        if (this.collectiveForce === '0') {
            this.hud = !this.hud;
            this.updateHudVisuals();
        }
        return true;
    }

    updateHudVisuals() {
        const btnPM   = document.getElementById('btn-plusminus');
        const numBtns = document.querySelectorAll('.btn-number');

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

            // Show +/- with just the relevant sign in a faint warm tint
            btnPM.style.fontSize = '1.3rem';
            if (diff > 0) {
                btnPM.innerHTML = '<span style="color:#ffd4b0">+</span>/-';
            } else {
                btnPM.innerHTML = '+/<span style="color:#ffd4b0">-</span>';
            }

            // Dim the number button whose value = digit-count of the diff
            numBtns.forEach(btn => {
                btn.classList.toggle('dimmed', parseInt(btn.dataset.value) === diffLength);
            });
        } else {
            btnPM.style.fontSize = '';
            btnPM.textContent = '±';
            numBtns.forEach(btn => btn.classList.remove('dimmed'));
        }
    }

    handleEquals() {
        if (this.collectiveForce === '0' && this.toxicForce) {
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
