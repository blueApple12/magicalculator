class ForceSystem {
    constructor() {
        this.toxicNum = 0;             // currently selected slot (0-9)
        this.pendingSlot = false;      // long-press % arms slot selection
        this.toxicForce = false;
        this.collectiveForce = '0';    // '0' = inactive; else = diff digit string
        this.hud = false;

        this.overlay = document.getElementById('collective-force-overlay');
        this.indicator = document.getElementById('force-active-indicator');
        this.locked = false;

        // Any tap anywhere fires the overlay when collective force is active
        this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
        this.overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleOverlayClick();
        });

        // Long-press on % resets slot selection
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

    /* ── Storage ── */
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

    /* ── Slot selection (called from number button handler in app.js) ── */
    selectSlot(num) {
        if (this.pendingSlot) {
            this.toxicNum = num;
            this.pendingSlot = false;
            this.vibrate();
            return true; // consumed — don't type the number
        }
        return false;
    }

    /* ── % button: toggle toxicForce ── */
    handlePercentageClick() {
        if (this.collectiveForce === '0') {
            this.toxicForce = !this.toxicForce;
            this.indicator.classList.toggle('active', this.toxicForce);
            this.vibrate();
            return true;
        }
        return false;
    }

    /* ── . button: arm collective force ── */
    calculateCollectiveForce() {
        if (this.collectiveForce === '0') {
            const target = parseFloat(this.getForceValue(this.toxicNum));
            const calc   = window.calcInstance;

            // Evaluate current display to a number
            let current = 0;
            try {
                const raw = calc.currentValue
                    .replace(/[+\-×÷.]$/, '')
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/,/g, '');
                current = parseFloat(new Function('return ' + (raw || '0'))()) || 0;
            } catch(_) {}

            const diff = Math.round(target - current);
            const absDiff = Math.abs(diff);

            if (absDiff > 0) {
                this.collectiveForce = absDiff.toString();
                this.overlay.classList.add('active');
                this.indicator.classList.add('pulse');
            }

            this.vibrate();
            return true;
        }
        return false;
    }

    /* ── Overlay tap: type next digit of diff ── */
    handleOverlayClick() {
        if (this.locked) return;
        if (this.collectiveForce === '0') return;

        this.vibrate();
        const char = this.collectiveForce[0];
        this.collectiveForce = this.collectiveForce.slice(1);

        window.calcInstance.forceInput(char);

        if (this.collectiveForce === '') {
            this.collectiveForce = '0';
            this.indicator.classList.remove('pulse');
            // Freeze for 3 seconds — overlay stays active but taps do nothing
            this.locked = true;
            setTimeout(() => {
                this.locked = false;
                this.overlay.classList.remove('active');
            }, 3000);
        }
    }

    /* ── ± button: toggle HUD (always intercepts ±) ── */
    toggleHud() {
        if (this.collectiveForce === '0') {
            this.hud = !this.hud;
            this.updateHudVisuals();
        }
        return true; // always consume ± — original never does plusMinus
    }

    updateHudVisuals() {
        const btnPM  = document.getElementById('btn-plusminus');
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

            btnPM.classList.add('hud-active');
            // Gray out the direction NOT needed (matching original)
            if (diff > 0) {
                btnPM.innerHTML = '<span style="opacity:0.3">+</span>/-';
            } else {
                btnPM.innerHTML = '+/<span style="opacity:0.3">-</span>';
            }

            // Dim the number button whose value equals the digit-count of the diff
            numBtns.forEach(btn => {
                const val = parseInt(btn.dataset.value);
                btn.classList.toggle('dimmed', val === diffLength);
            });
        } else {
            btnPM.classList.remove('hud-active');
            btnPM.textContent = '±';
            numBtns.forEach(btn => btn.classList.remove('dimmed'));
        }
    }

    /* ── = button: toxic force result ── */
    handleEquals() {
        if (this.collectiveForce === '0' && this.toxicForce) {
            this.toxicForce = false;
            this.indicator.classList.remove('active');

            const forcedValue = this.getForceValue(this.toxicNum);
            const calc = window.calcInstance;
            calc.expression = calc.currentValue;
            calc.currentValue = forcedValue;
            calc.isEvaluated = true;
            calc.displayArea.classList.add('evaluated');
            calc.updateDisplay();
            return true;
        }
        return false;
    }
}
