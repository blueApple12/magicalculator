document.addEventListener('DOMContentLoaded', () => {
    // In browser (non-PWA), hide the address bar but keep the system nav bar
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;
    if (!isPWA) {
        const requestFullscreen = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen({ navigationUI: 'show' })
                    .catch(() => {});
            }
        };
        document.body.addEventListener('click', requestFullscreen, { once: true });
        document.body.addEventListener('touchstart', requestFullscreen, { once: true });
    }

    // Prevent default context menu (makes it feel more native)
    window.addEventListener('contextmenu', e => {
        // Only prevent if we are not in an input field (for settings)
        if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
        }
    });

    // Initialize systems
    const displayElement = document.getElementById('main-display');
    const previewElement = document.getElementById('expression-preview');
    
    const calc = new Calculator(displayElement, previewElement);
    const forceSystem = new ForceSystem();
    const settings = new SettingsManager();
    
    // Bind touch/click events to calculator buttons
    const keypad = document.getElementById('keypad');
    
    // Variables for long press detection (no longer used for %, but kept for structure)
    let pressTimer;
    
    keypad.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        
        // Vibration is handled by forceSystem or we add it here
        if (navigator.vibrate && !['btn-percentage', 'btn-dot', 'btn-plusminus', 'btn-equals'].includes(btn.id)) {
            navigator.vibrate(10);
        }
    });
    
    keypad.addEventListener('pointerup', (e) => {
        const btn = e.target.closest('.btn');
        if (pressTimer) clearTimeout(pressTimer);
        
        if (!btn) return;
        handleButtonPress(btn);
    });
    
    keypad.addEventListener('pointerleave', () => {
        if (pressTimer) clearTimeout(pressTimer);
    });

    function handleButtonPress(btn) {
        // If collective force is active, let the overlay handle it
        if (forceSystem.collectiveForce !== '0') {
            // Actually, overlay intercepts clicks because it's z-index 100
            // but just in case:
            return;
        }

        if (btn.classList.contains('btn-number')) {
            const val = parseInt(btn.dataset.value);
            
            // Check if force system wants to intercept (Select slot)
            if (forceSystem.selectSlot(val)) return;
            
            calc.appendNumber(val);
        } 
        else if (btn.classList.contains('btn-operator')) {
            calc.processOperator(btn.dataset.value);
        }
        else {
            switch(btn.id) {
                case 'btn-clear':
                    calc.clear();
                    break;
                case 'btn-backspace':
                    calc.backspace();
                    break;
                case 'btn-percentage':
                    // Check if force system intercepts
                    if (forceSystem.handlePercentageClick()) return;
                    calc.percentage();
                    break;
                case 'btn-plusminus':
                    // Check if force system intercepts
                    if (forceSystem.toggleHud()) return;
                    calc.plusMinus();
                    break;
                case 'btn-dot':
                    // Check if force system intercepts
                    if (forceSystem.calculateCollectiveForce()) return;
                    calc.appendDot();
                    break;
                case 'btn-equals':
                    // Check if force system intercepts
                    if (forceSystem.handleEquals()) return;
                    calc.calculateReal();
                    break;
            }
        }
    }

    // Keyboard support for desktop testing
    document.addEventListener('keydown', (e) => {
        // Don't intercept keyboard if settings are open
        if (!settings.view.classList.contains('hidden')) return;
        
        const key = e.key;
        
        if (/[0-9]/.test(key)) {
            if (forceSystem.selectSlot(parseInt(key))) return;
            calc.appendNumber(parseInt(key));
        } else if (['+', '-'].includes(key)) {
            calc.processOperator(key);
        } else if (key === '*' || key === 'x') {
            calc.processOperator('×');
        } else if (key === '/') {
            calc.processOperator('÷');
        } else if (key === '.' || key === ',') {
            if (forceSystem.calculateCollectiveForce()) return;
            calc.appendDot();
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault(); // Prevent accidental form submission or other defaults
            if (forceSystem.handleEquals()) return;
            calc.calculateReal();
        } else if (key === 'Backspace') {
            calc.backspace();
        } else if (key === 'Escape' || key === 'c' || key === 'C') {
            calc.clear();
        } else if (key === '%') {
            if (forceSystem.handlePercentageClick()) return;
            calc.percentage();
        }
    });

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('SW registered: ', registration);
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }
});
