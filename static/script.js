document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    let currentPassword = '';
    const MAX_HISTORY = 5;
    const historyStack = [];

    const els = {
        card: document.getElementById('tilt-card'),
        slider: document.getElementById('length-slider'),
        lengthVal: document.getElementById('length-val'),
        generateBtn: document.getElementById('generate-btn'),
        copyBtn: document.getElementById('copy-btn'),
        regenBtn: document.getElementById('regen-btn'),
        displayText: document.getElementById('password-text'),
        displayContainer: document.getElementById('password-display'),
        cursorBlink: document.querySelector('.cursor-blink'),
        strengthFill: document.getElementById('strength-fill'),
        strengthLabel: document.getElementById('strength-label'),
        entropyVal: document.getElementById('entropy-val'),
        historySection: document.getElementById('history-section'),
        historyList: document.getElementById('history-list'),
        toastPopup: document.getElementById('toast-popup'),
        audio: document.getElementById('sfx-generate'),
        toggles: {
            uppercase: document.getElementById('chk-upper'),
            lowercase: document.getElementById('chk-lower'),
            numbers: document.getElementById('chk-numbers'),
            symbols: document.getElementById('chk-symbols')
        }
    };



    // --- Fire Particle Cursor ---
    const cursorCore = document.querySelector('.cursor-core');
    const container = document.getElementById('flame-container');
    
    document.addEventListener('mousemove', (e) => {
        cursorCore.style.left = e.clientX - 3 + 'px';
        cursorCore.style.top = e.clientY - 3 + 'px';
        spawnFireParticle(e.clientX, e.clientY);
    });

    let lastSpawn = 0;
    function spawnFireParticle(x, y) {
        // Throttle spawn rate to maintain 60fps with 3D tilt
        const now = performance.now();
        if (now - lastSpawn < 16) return; // approx 60Hz limit
        if (Math.random() > 0.6) return; 
        lastSpawn = now;

        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = Math.random() * 12 + 4;
        const life = Math.random() * 500 + 400; // ms
        const drift = Math.random() * 50 + 20;

        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Jitter pos
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;

        particle.style.left = (x + offsetX) + 'px';
        particle.style.top = (y + offsetY) + 'px';
        particle.style.setProperty('--life', life);
        particle.style.setProperty('--drift', drift);

        container.appendChild(particle);

        setTimeout(() => particle.remove(), life);
    }

    // --- Logic Sync ---
    els.slider.addEventListener('input', (e) => {
        els.lengthVal.textContent = e.target.value;
    });

    async function handleGenerate() {
        // Attempt to play sound (may be blocked by browser policy until interaction)
        try {
            els.audio.currentTime = 0;
            els.audio.play().catch(e => { /* Ignore auto-play strict errors */ });
        } catch(e) {}

        const payload = {
            length: parseInt(els.slider.value),
            uppercase: els.toggles.uppercase.checked,
            lowercase: els.toggles.lowercase.checked,
            numbers: els.toggles.numbers.checked,
            symbols: els.toggles.symbols.checked
        };

        // Failsafe
        if (!payload.uppercase && !payload.lowercase && !payload.numbers && !payload.symbols) {
            payload.lowercase = true;
            els.toggles.lowercase.checked = true;
        }

        try {
            const res = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            updateHistory(currentPassword);
            currentPassword = data.password;

            animateEntropy(0, data.entropy, 1000);
            updateStrengthUI(data.strength);
            hackerDecodeEffect(data.password);

        } catch (err) {
            console.error("Generator execution failed:", err);
        }
    }

    // --- Cinematic Animations ---

    // Glitch "Hacker Decode" Effect
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    function hackerDecodeEffect(finalStr) {
        els.displayText.classList.remove('placeholder');
        els.displayContainer.classList.add('glitching');
        
        let iterations = 0;
        const maxIterations = 15;
        const interval = 30; // ms per tick

        const intervalId = setInterval(() => {
            let tempStr = finalStr.split("").map((letter, index) => {
                // Reveal character progressively
                if (index < (iterations / maxIterations) * finalStr.length) {
                    return finalStr[index];
                }
                return chars[Math.floor(Math.random() * chars.length)];
            }).join("");

            els.displayText.textContent = tempStr;
            iterations++;

            if (iterations > maxIterations) {
                clearInterval(intervalId);
                els.displayText.textContent = finalStr;
                els.displayContainer.classList.remove('glitching');
            }
        }, interval);
    }

    // Number ticker for Entropy
    function animateEntropy(start, end, duration) {
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // easeOutQuart
            const easeObj = 1 - Math.pow(1 - progress, 4);
            const currentObj = Math.floor(start + (end - start) * easeObj);
            
            els.entropyVal.textContent = currentObj;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                els.entropyVal.textContent = end;
            }
        }
        requestAnimationFrame(update);
    }

    function updateStrengthUI(str) {
        els.strengthLabel.textContent = str.toUpperCase();
        let color, width;
        if (str === 'Weak') {
            color = 'var(--strength-weak)'; width = '33%';
        } else if (str === 'Medium') {
            color = 'var(--strength-medium)'; width = '66%';
        } else {
            color = 'var(--strength-strong)'; width = '100%';
        }
        els.strengthFill.style.backgroundColor = color;
        els.strengthFill.style.boxShadow = `0 0 15px ${color}`;
        els.strengthFill.style.width = width;
    }

    // --- History & Clipboard ---
    function updateHistory(pwd) {
        if (!pwd || pwd === 'Awaiting Command...') return;

        historyStack.unshift(pwd);
        if (historyStack.length > MAX_HISTORY) historyStack.pop();

        if (historyStack.length > 0) {
            els.historySection.classList.remove('disabled');
        }

        renderHistory();
    }

    function renderHistory() {
        els.historyList.innerHTML = '';
        historyStack.forEach((pwd, idx) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.style.animationDelay = `${idx * 0.05}s`;
            
            const masked = '*'.repeat(Math.min(8, pwd.length)) + (pwd.length > 8 ? pwd.substring(pwd.length - 4) : '');
            const safePwd = pwd.replace(/"/g, '&quot;');
            
            li.innerHTML = `
                <span class="hist-pwd" data-raw="${safePwd}" data-masked="${masked}">${masked}</span>
                <div style="display:flex; gap:15px; align-items:center;">
                    <span class="hist-toggle" title="Toggle Visibility" style="color: rgba(255,255,255,0.3); transition: color 0.2s; cursor: pointer;"><i class="fa-solid fa-eye"></i></span>
                    <span class="hist-copy" style="cursor: pointer;"><i class="fa-solid fa-copy"></i></span>
                </div>
            `;
            
            const pwdSpan = li.querySelector('.hist-pwd');
            const toggleBtn = li.querySelector('.hist-toggle');
            const toggleIcon = toggleBtn.querySelector('i');
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (pwdSpan.textContent === masked) {
                    pwdSpan.textContent = pwd;
                    toggleIcon.className = 'fa-solid fa-eye-slash';
                    toggleBtn.style.color = '#fff';
                } else {
                    pwdSpan.textContent = masked;
                    toggleIcon.className = 'fa-solid fa-eye';
                    toggleBtn.style.color = 'rgba(255,255,255,0.3)';
                }
            });
            
            li.addEventListener('click', () => copyToClipboard(pwd, li.querySelector('.fa-copy')));
            els.historyList.appendChild(li);
        });
    }

    async function copyToClipboard(text, iconEl) {
        if (!text || text === 'Awaiting Command...') return;
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Icon feedback
            const icon = iconEl || els.copyBtn.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fa-solid fa-check';
            icon.style.color = 'var(--fire-orange)';
            
            setTimeout(() => {
                icon.className = originalClass;
                icon.style.color = '';
            }, 1500);

            // Toast feedback
            showToast();
        } catch (e) { console.error('Copy failed', e); }
    }

    function showToast() {
        els.toastPopup.classList.add('show');
        setTimeout(() => els.toastPopup.classList.remove('show'), 2500);
    }

    // --- Binds ---
    els.generateBtn.addEventListener('click', handleGenerate);
    els.regenBtn.addEventListener('click', handleGenerate);
    els.copyBtn.addEventListener('click', () => copyToClipboard(currentPassword, null));
    
    // Auto-initialize engine on page load/reload
    handleGenerate();
});
