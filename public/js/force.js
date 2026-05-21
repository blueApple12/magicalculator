class ForceSystem {
    constructor() {
        this.toxicNum = 0;
        this.toxicForce = false;
        this.collectiveForce = '0';
        this.hud = false;
        this.isArmed = false;
        this.slotSelected = false;
        this.isLocked = false;

        this.overlay = document.getElementById('collective-force-overlay');
        this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
        this.overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleOverlayClick(e);
        });

        this.indicator = document.getElementById('force-active-indicator');

        this.vibrate = () => {
            if (navigator.vibrate) navigator.vibrate(10);
        };
    }

    getForces() {
        const defaultForces = Array(10).fill('');
        try {
            const saved = localStorage.getItem('magi_forces');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Error loading forces", e);
        }
        return defaultForces;
    }

    getForceValue(index) {
        const forces = this.getForces();
        let val = forces[index] || '0';

        if (val.startsWith('Time')) {
            val = val.substring(4);
            const offsetSeconds = parseInt(val) || 0;
            const now = new Date();
            now.setSeconds(now.getSeconds() + offsetSeconds);
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            return `${dd}${mm}${hh}${mins}`;
        }

        return isNaN(parseFloat(val)) ? '0' : val;
    }

    arm() {
        this.isArmed = true;
        this.vibrate();
    }

    selectSlot(num) {
        if (this.isArmed) {
            this.toxicNum = num;
            this.slotSelected = true;
            this.isArmed = false;
            this.vibrate();
            return true;
        }
        return false;
    }

    handlePercentageClick() {
        if (this.collectiveForce === '0') {
            if (!this.isArmed && !this.toxicForce) {
                this.arm();
            } else if (this.isArmed) {
                this.isArmed = false;
                this.toxicForce = true;
                this.indicator.classList.add('active');
                this.vibrate();
            } else {
                this.toxicForce = false;
                this.indicator.classList.remove('active');
                this.vibrate();
            }
            return true;
        }
        return false;
    }

    calculateCollectiveForce() {
        if (this.collectiveForce === '0') {
            const forceVal = this.getForceValue(this.toxicNum).toString();

            if (forceVal && forceVal !== '0') {
                this.collectiveForce = forceVal;

                // Clear display so typing starts fresh
                const calc = window.calcInstance;
                calc.currentValue = '0';
                calc.expression = '';
                calc.isEvaluated = false;
                calc.displayArea.classList.remove('evaluated');
                calc.updateDisplay();

                this.overlay.classList.add('active');
                this.indicator.classList.add('pulse');
            }

            this.vibrate();
            return true;
        }
        return false;
    }

    toggleHud() {
        if (this.slotSelected && this.collectiveForce === '0') {
            this.hud = !this.hud;
            this.updateHudVisuals();
            return true;
        }
        return false;
    }

    updateHudVisuals() {
        const btnPlusMinus = document.getElementById('btn-plusminus');
        const numBtns = document.querySelectorAll('.btn-number');

        if (this.hud) {
            const target = parseFloat(this.getForceValue(this.toxicNum));
            let current = parseFloat(window.calcInstance.currentValue);
            if (isNaN(current)) current = 0;
            const diff = Math.round(target - current);
            const sign = diff >= 0 ? '+' : '';

            btnPlusMinus.classList.add('hud-active');
            btnPlusMinus.style.fontSize = '1rem';
            btnPlusMinus.textContent = `${sign}${diff}`;

            numBtns.forEach(btn => btn.classList.remove('dimmed'));
        } else {
            btnPlusMinus.classList.remove('hud-active');
            btnPlusMinus.style.fontSize = '';
            btnPlusMinus.textContent = '±';
            numBtns.forEach(btn => btn.classList.remove('dimmed'));
        }
    }

    handleOverlayClick(_e) {
        // During 3-sec lock, overlay is still active but we do nothing
        if (this.isLocked) return;

        if (this.collectiveForce !== '0') {
            this.vibrate();

            const char = this.collectiveForce[0];
            this.collectiveForce = this.collectiveForce.slice(1);

            if (char === '.') {
                window.calcInstance.appendDot();
            } else {
                window.calcInstance.appendNumber(parseInt(char));
            }

            if (this.collectiveForce === '') {
                this.collectiveForce = '0';
                this.indicator.classList.remove('pulse');
                this.indicator.classList.add('locked');

                // Lock for 3 seconds
                this.isLocked = true;
                setTimeout(() => {
                    this.isLocked = false;
                    this.overlay.classList.remove('active');
                    this.indicator.classList.remove('locked');
                }, 3000);
            }
        }
    }

    handleEquals() {
        if (this.collectiveForce === '0' && this.toxicForce) {
            this.toxicForce = false;
            this.indicator.classList.remove('active');

            const forcedValue = this.getForceValue(this.toxicNum);
            window.calcInstance.expression = window.calcInstance.currentValue + '=';
            window.calcInstance.setDisplay(forcedValue);
            window.calcInstance.isEvaluated = true;
            return true;
        }
        return false;
    }
}
