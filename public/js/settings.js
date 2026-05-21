class SettingsManager {
    constructor() {
        this.view = document.getElementById('settings-view');
        this.closeBtn = document.getElementById('close-settings');
        this.saveBtn = document.getElementById('save-settings');
        this.listContainer = document.getElementById('forces-list');

        this.initTrigger();
        this.initUI();
        this.bindEvents();
    }

    initTrigger() {
        // Primary trigger: ⋮ menu button
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) menuBtn.addEventListener('click', () => this.open());

        // Secret backup: 2-finger double-tap anywhere on the header
        const header = document.getElementById('calc-header');
        let lastTwoFingerTap = 0;
        if (header) {
            header.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    const now = Date.now();
                    if (now - lastTwoFingerTap < 500 && now - lastTwoFingerTap > 0) {
                        this.open();
                        lastTwoFingerTap = 0;
                    } else {
                        lastTwoFingerTap = now;
                    }
                }
            }, { passive: false });
        }
    }

    initUI() {
        const forces = this.loadForces();
        this.listContainer.innerHTML = '';
        
        for (let i = 0; i <= 9; i++) {
            let val = forces[i] || '';
            let isTime = false;
            
            if (val.startsWith('Time')) {
                isTime = true;
                val = val.substring(4);
            }
            
            const item = document.createElement('div');
            item.className = 'force-item';
            
            item.innerHTML = `
                <div class="force-header">
                    <span class="force-title">Force ${i}</span>
                    <label class="checkbox-label">
                        <input type="checkbox" id="time-toggle-${i}" ${isTime ? 'checked' : ''}>
                        Time Force
                    </label>
                </div>
                <input type="number" id="force-input-${i}" class="force-input" placeholder="Value or seconds offset" value="${val}">
            `;
            
            this.listContainer.appendChild(item);
        }
    }

    bindEvents() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.saveBtn.addEventListener('click', () => this.saveAndClose());
    }

    open() {
        this.initUI(); // Refresh UI with latest data
        this.view.classList.remove('hidden');
    }

    close() {
        this.view.classList.add('hidden');
    }

    saveAndClose() {
        const forces = [];
        for (let i = 0; i <= 9; i++) {
            const input = document.getElementById(`force-input-${i}`);
            const toggle = document.getElementById(`time-toggle-${i}`);
            
            let val = input.value;
            if (toggle.checked) {
                val = 'Time' + val;
            }
            
            forces[i] = val;
        }
        
        localStorage.setItem('magi_forces', JSON.stringify(forces));
        
        // Visual feedback
        this.saveBtn.textContent = 'Saved!';
        this.saveBtn.style.backgroundColor = '#4caf50';
        
        setTimeout(() => {
            this.saveBtn.textContent = 'Save Forces';
            this.saveBtn.style.backgroundColor = '';
            this.close();
        }, 800);
    }

    loadForces() {
        try {
            const saved = localStorage.getItem('magi_forces');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Error loading settings", e);
        }
        return Array(10).fill('');
    }
}
