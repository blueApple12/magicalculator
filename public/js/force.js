class ForceSystem {
    constructor() {
        this.toxicNum = 0;
        this.toxicForce = false;
        this.collectiveForce = '0';
        this.hud = false;
        this.isArmed = false;
        
        // Touch interception for CollectiveForce
        this.overlay = document.getElementById('collective-force-overlay');
        this.overlay.addEventListener('click', this.handleOverlayClick.bind(this));
        this.overlay.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double firing
            this.handleOverlayClick(e);
        });
        
        // Active indicator (for performer)
        this.indicator = document.getElementById('force-active-indicator');
        
        this.vibrate = () => {
            if (navigator.vibrate) navigator.vibrate(10);
        };
    }

    getForces() {
        // Load from settings logic
        const defaultForces = Array(10).fill('');
        try {
            const saved = localStorage.getItem('magi_forces');
            if (saved) {
                return JSON.parse(saved);
            }
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
            
            // Format ddMMHHmm
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
            this.toxicNum = num; // Fix: 0 selects Force 0
            this.isArmed = false;
            this.vibrate();
            return true; // Handled
        }
        return false;
    }

    handlePercentageClick() {
        if (this.collectiveForce === '0') {
            if (!this.isArmed && !this.toxicForce) {
                // First tap: Arm the force
                this.arm();
            } else if (this.isArmed) {
                // Already armed, but no number selected yet. Let's assume they want default slot or just activate.
                this.isArmed = false;
                this.toxicForce = true;
                this.indicator.classList.add('active');
                this.vibrate();
            } else {
                // Was active, tap again to deactivate
                this.toxicForce = false;
                this.indicator.classList.remove('active');
                this.vibrate();
            }
            return true; // Handled
        }
        return false;
    }

    calculateCollectiveForce() {
        if (this.collectiveForce === '0') {
            const target = parseFloat(this.getForceValue(this.toxicNum));
            const currentDisplay = window.calcInstance.currentValue;
            
            // Re-evaluate current display safely if needed
            let current = parseFloat(window.calcInstance.calculateReal());
            if (isNaN(current)) current = 0;
            
            const diff = target - current;
            
            this.collectiveForce = Math.abs(diff).toString();
            
            // Activate overlay to intercept all taps
            if (this.collectiveForce.length > 0 && this.collectiveForce !== '0') {
                this.overlay.classList.add('active');
                this.indicator.classList.add('pulse');
            }
            
            this.vibrate();
            return true; // Handled
        }
        return false;
    }

    toggleHud() {
        if (this.collectiveForce !== '0') {
            this.hud = !this.hud;
            this.updateHudVisuals();
            return true; // Handled
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
            const diff = target - current;
            
            // Style ± button
            btnPlusMinus.classList.add('hud-active');
            if (diff > 0) {
                btnPlusMinus.innerHTML = '<span class="hud-dimmed">+</span>/-';
            } else {
                btnPlusMinus.innerHTML = '+/<span class="hud-dimmed">-</span>';
            }
            
            // Style number buttons based on string length
            const diffLength = Math.abs(diff).toString().length;
            
            numBtns.forEach(btn => {
                const val = parseInt(btn.dataset.value);
                if (val === diffLength) {
                    btn.classList.add('dimmed');
                } else {
                    btn.classList.remove('dimmed');
                }
            });
            
        } else {
            // Reset
            btnPlusMinus.classList.remove('hud-active');
            btnPlusMinus.innerHTML = '±';
            numBtns.forEach(btn => btn.classList.remove('dimmed'));
        }
    }

    handleOverlayClick(e) {
        if (this.collectiveForce !== '0') {
            this.vibrate();
            
            // Extract first char
            const digit = this.collectiveForce.substring(0, 1);
            
            // Append to calculator
            window.calcInstance.appendNumber(digit);
            
            // Update collective force remainder
            this.collectiveForce = this.collectiveForce.substring(1);
            
            if (this.collectiveForce === '') {
                this.collectiveForce = '0';
                this.overlay.classList.remove('active');
                this.indicator.classList.remove('pulse');
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
            return true; // Handled
        }
        return false;
    }
}
