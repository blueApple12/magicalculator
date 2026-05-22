document.addEventListener('DOMContentLoaded', () => {
    const isPWA = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    // First-tap setup: fullscreen (browser only) + portrait lock
    const onFirstTap = () => {
        if (!isPWA && !document.fullscreenElement) {
            document.documentElement.requestFullscreen({ navigationUI: 'show' }).catch(() => {});
        }
        if (screen.orientation?.lock) screen.orientation.lock('portrait').catch(() => {});
    };
    document.body.addEventListener('pointerdown', onFirstTap, { once: true });

    // Disable right-click except inside inputs
    addEventListener('contextmenu', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });

    // Init systems
    const calc        = new Calculator(
        document.getElementById('main-display'),
        document.getElementById('expression-preview')
    );
    const forceSystem = new ForceSystem();
    const settings    = new SettingsManager();

    // Keypad: fire on pointerdown for instant response
    document.getElementById('keypad').addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        if (forceSystem.isActive() || forceSystem.isFrozen()) return;
        if (navigator.vibrate) navigator.vibrate(10);
        handleButtonPress(btn);
    });

    function handleButtonPress(btn) {
        if (btn.classList.contains('btn-number')) {
            const val = parseInt(btn.dataset.value);
            if (forceSystem.selectSlot(val)) return;
            calc.appendNumber(val);
            return;
        }
        if (btn.classList.contains('btn-operator')) {
            calc.processOperator(btn.dataset.value);
            return;
        }
        switch (btn.id) {
            case 'btn-clear':      calc.clear();                                                   break;
            case 'btn-backspace':  calc.backspace();                                               break;
            case 'btn-percentage': if (!forceSystem.handlePercentageClick())    calc.percentage(); break;
            case 'btn-plusminus':  if (!forceSystem.toggleHud())                calc.plusMinus();  break;
            case 'btn-dot':        if (!forceSystem.calculateCollectiveForce()) calc.appendDot();  break;
            case 'btn-equals':     if (!forceSystem.handleEquals())             calc.calculateReal(); break;
        }
    }

    // Keyboard support (desktop testing)
    addEventListener('keydown', (e) => {
        if (!settings.view.classList.contains('hidden')) return;
        const k = e.key;
        if (/[0-9]/.test(k)) {
            if (forceSystem.selectSlot(+k)) return;
            calc.appendNumber(+k);
        }
        else if (k === '+' || k === '-')                    calc.processOperator(k);
        else if (k === '*' || k === 'x')                    calc.processOperator('×');
        else if (k === '/')                                 calc.processOperator('÷');
        else if (k === '.' || k === ',')                    { if (!forceSystem.calculateCollectiveForce()) calc.appendDot(); }
        else if (k === 'Enter' || k === '=')                { e.preventDefault(); if (!forceSystem.handleEquals()) calc.calculateReal(); }
        else if (k === 'Backspace')                         calc.backspace();
        else if (k === 'Escape' || k === 'c' || k === 'C')  calc.clear();
        else if (k === '%')                                 { if (!forceSystem.handlePercentageClick()) calc.percentage(); }
    });

    // Service worker
    if ('serviceWorker' in navigator) {
        addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(r => r.update()).catch(() => {});
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
        });
    }
});
