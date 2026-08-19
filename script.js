const display = document.getElementById('display');
const themeCheckbox = document.getElementById('theme-checkbox');
const historyModal = document.getElementById('history-modal');
const historyLog = document.getElementById('history-log');
const historyToggleBtn = document.getElementById('history-toggle-btn');
const acBtn = document.getElementById('ac-btn');

let currentInput = '0';

// 1. Load saved arrays from localStorage or default to empty lists
let historyArray = JSON.parse(localStorage.getItem('kinchi_history')) || [];
let pinnedItems = JSON.parse(localStorage.getItem('kinchi_pinned')) || [];

// 2. Load saved theme preference on startup
const savedTheme = localStorage.getItem('kinchi_theme');
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeCheckbox) themeCheckbox.checked = true;
} else {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeCheckbox) themeCheckbox.checked = false;
}

// Theme Toggle Listener with localStorage update
if (themeCheckbox) {
    themeCheckbox.addEventListener('change', () => {
        if (themeCheckbox.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('kinchi_theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('kinchi_theme', 'light');
        }
    });
}

// Appends values onto display
function appendNumber(num) {
    triggerFeedback('click');
    if (currentInput === '0' && num !== '.') {
        currentInput = num;
    } else {
        if (num === '.' && currentInput.includes('.')) return;
        currentInput += num;
    }
    updateDisplay();
}

function appendOperator(op) {
    triggerFeedback('operator');
    const lastChar = currentInput.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
        currentInput = currentInput.slice(0, -1) + op;
    } else {
        currentInput += op;
    }
    updateDisplay();
}

// Long Press / Single Tap Logic for AC Button
let holdTimer = null;
let isLongPress = false;
const HOLD_DURATION = 500;

function startPress() {
    isLongPress = false;
    holdTimer = setTimeout(() => {
        isLongPress = true;
        clearDisplay();
        if (acBtn) {
            acBtn.style.transform = 'scale(0.9)';
            setTimeout(() => acBtn.style.transform = '', 150);
        }
    }, HOLD_DURATION);
}

function endPress(event) {
    if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
    }
    if (event && event.type === 'touchend') {
        event.preventDefault();
    }
    if (!isLongPress) {
        handleSingleBackspace();
    }
}

function handleSingleBackspace() {
    triggerFeedback('click');
    if (currentInput !== '0' && currentInput !== '') {
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '' || currentInput === '-') {
            currentInput = '0';
        }
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function clearDisplay() {
    triggerFeedback('operator');
    currentInput = '0';
    updateDisplay();
}

function toggleSign() {
    if (currentInput === '0') {
        currentInput = '-';
        updateDisplay();
        return;
    }

    if (currentInput === '-') {
        currentInput = '0';
        updateDisplay();
        return;
    }

    const match = currentInput.match(/(-?\d+\.?\d*)$/);
    if (match) {
        const lastNum = match[0];
        const startIndex = match.index;
        let toggledNum = lastNum.startsWith('-') ? lastNum.slice(1) : '-' + lastNum;
        currentInput = currentInput.slice(0, startIndex) + toggledNum;
        updateDisplay();
    }
}

function updateDisplay() {
    let renderText = currentInput.replace(/\*/g, 'x').replace(/\//g, '÷');
    display.value = renderText;

    if (acBtn) {
        if (currentInput !== '0' && currentInput !== '') {
            acBtn.innerText = '⌫';
        } else {
            acBtn.innerText = 'AC';
        }
    }
}

if (acBtn) {
    acBtn.addEventListener('mousedown', startPress);
    acBtn.addEventListener('mouseup', endPress);
    acBtn.addEventListener('mouseleave', () => { if (holdTimer) clearTimeout(holdTimer); });
    acBtn.addEventListener('touchstart', startPress);
    acBtn.addEventListener('touchend', endPress);
}

// Perform calculation
function calculate() {
    try {
        const display = document.getElementById('display');
        let expression = display.value;

        if (!expression || expression === 'Error') return;

        // 1. Remove all spaces and normalize operators
        let sanitized = expression
            .replace(/\s+/g, '')
            .replace(/×|x/gi, '*')
            .replace(/÷/g, '/');

        // 2. Fix leading zeros (handles cases like "01", "+01", "*007")
        sanitized = sanitized.replace(/(^|[\+\-\*\/])0+([0-9]+)/g, '$1$2');

        // 3. Evaluate safely
        const result = Function(`'use strict'; return (${sanitized})`)();

        if (isNaN(result) || !isFinite(result)) {
            display.value = 'Error';
            return;
        }

        // 4. Save to history if function exists
        if (typeof addHistoryItem === 'function') {
            addHistoryItem(expression, result);
        }

        display.value = result;
    } catch (err) {
        document.getElementById('display').value = 'Error';
    }
}

// History & Modals UI Logic
function toggleHistoryModal() {
    if (historyModal) historyModal.classList.toggle('hidden');
}

if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', toggleHistoryModal);
}

function addHistoryItem(entry) {
    historyArray.push(entry);
    saveHistoryToLocalStorage();
    renderHistory();
}

function saveHistoryToLocalStorage() {
    localStorage.setItem('kinchi_history', JSON.stringify(historyArray));
    localStorage.setItem('kinchi_pinned', JSON.stringify(pinnedItems));
}

function renderHistory() {
    if (!historyLog) return;
    historyLog.innerHTML = '';

    if (historyArray.length === 0 && pinnedItems.length === 0) {
        historyLog.innerHTML = `
            <p class="empty-msg">No calculations yet.</p>
            <p class="sub-empty-msg">Start solving and your history will appear here.</p>
        `;
        return;
    }

    // Render Pinned Section
    if (pinnedItems.length > 0) {
        const pinHeader = document.createElement('div');
        pinHeader.style.cssText = 'font-weight: bold; font-size: 0.85rem; margin-bottom: 6px; opacity: 0.7; text-align: left;';
        pinHeader.innerText = '📌 PINNED';
        historyLog.appendChild(pinHeader);

        pinnedItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item pinned-item';
            div.title = 'Click to reuse result';
            div.innerHTML = `
                <span class="pin-icon" title="Unpin?">📌</span> 
                <span class="history-text">${item}</span>
            `;
            
            div.querySelector('.history-text').onclick = (e) => {
                e.stopPropagation();
                reuseHistoryResult(item);
            };

            div.querySelector('.pin-icon').onclick = (e) => {
                e.stopPropagation();
                togglePin(item);
            };

            historyLog.appendChild(div);
        });

        const divider = document.createElement('hr');
        divider.style.cssText = 'margin: 10px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);';
        historyLog.appendChild(divider);
    }

    // Render Unpinned History items
    historyArray.forEach(item => {
        if (!pinnedItems.includes(item)) {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.title = 'Click to reuse result';
            div.innerHTML = `
                <span class="history-text">${item}</span>
                <span class="pin-action-btn" title="Pin item">📌</span>
            `;

            div.querySelector('.history-text').onclick = (e) => {
                e.stopPropagation();
                reuseHistoryResult(item);
            };

            div.querySelector('.pin-action-btn').onclick = (e) => {
                e.stopPropagation();
                togglePin(item);
            };

            historyLog.appendChild(div);
        }
    });
}

function reuseHistoryResult(entry) {
    if (entry.includes('=')) {
        const parts = entry.split('=');
        const resultValue = parts[parts.length - 1].trim();

        currentInput = resultValue;
        updateDisplay();
        toggleHistoryModal();
    }
}

function togglePin(item) {
    if (pinnedItems.includes(item)) {
        pinnedItems = pinnedItems.filter(i => i !== item);
    } else {
        pinnedItems.push(item);
    }
    saveHistoryToLocalStorage();
    renderHistory();
}

function clearHistory() {
    historyArray = [];
    pinnedItems = [];
    saveHistoryToLocalStorage();
    renderHistory();
}

// Tooltips Init
function initTooltips() {
    const hasSeenTooltips = localStorage.getItem('kinchi_tooltips_seen');

    if (!hasSeenTooltips) {
        setTimeout(() => {
            const acTooltip = document.getElementById('ac-tooltip');
            const themeTooltip = document.getElementById('theme-tooltip');

            if (acTooltip) acTooltip.classList.add('show');
            if (themeTooltip) themeTooltip.classList.add('show');
        }, 600);
    }
}

function dismissTooltip(tooltipId) {
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
        tooltip.classList.remove('show');
    }
    localStorage.setItem('kinchi_tooltips_seen', 'true');
}

// Keyboard Listener
document.addEventListener('keydown', (event) => {
    const key = event.key;

    if ((key >= '0' && key <= '9') || key === '.') {
        appendNumber(key);
    }
    if (['+', '-', '*', '/'].includes(key)) {
        appendOperator(key);
    }
    if (key === '%') {
        appendOperator('%');
    }
    if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
    }
    if (key === 'Escape' || key.toLowerCase() === 'c') {
        clearDisplay();
    }
    if (key === 'Backspace') {
        handleSingleBackspace();
    }
});

// Startup Initialization
window.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    initTooltips();
});

// Audio System
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type = 'click') {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.03);

            osc.start(now);
            osc.stop(now + 0.03);
        } else if (type === 'operator') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.04);

            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {}
}

function triggerFeedback(type = 'click') {
    setTimeout(() => playSound(type), 0);
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(type === 'error' ? 30 : 10);
        } catch (e) {}
    }
}

window.addEventListener('pointerdown', () => getAudioContext(), { once: true });

// Copy and Paste Functions
async function copyDisplayToClipboard() {
    if (!display || display.value === 'Error') return;

    try {
        await navigator.clipboard.writeText(currentInput);
        triggerFeedback('click');
        showToast('Copied to clipboard!');
    } catch (err) {
        if (display.select) display.select();
        document.execCommand('copy');
        showToast('Copied!');
    }
}

async function handlePaste(pasteText) {
    if (!pasteText) return;

    let cleaned = pasteText.replace(/\s+/g, '').replace(/x/gi, '*').replace(/÷/g, '/');

    if (/^[0-9+\-*/%.()]+$/.test(cleaned)) {
        if (currentInput === '0') {
            currentInput = cleaned;
        } else {
            currentInput += cleaned;
        }
        updateDisplay();
        triggerFeedback('operator');
        showToast('Pasted formula!');
    } else {
        showToast('Invalid paste data');
    }
}

function showToast(message) {
    let toast = document.getElementById('calculator-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'calculator-toast';
        toast.className = 'calculator-toast';
        document.body.appendChild(toast);
    }

    toast.innerText = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 1800);
}

if (display) {
    display.style.cursor = 'pointer';
    display.title = 'Click to copy';
    display.addEventListener('click', copyDisplayToClipboard);
}

document.addEventListener('paste', (event) => {
    event.preventDefault();
    const pasteData = (event.clipboardData || window.clipboardData).getData('text');
    handlePaste(pasteData);
});

// Search and Export Listeners
const searchInput = document.getElementById('history-search');
const jsonExportBtn = document.getElementById('export-json-btn');
const csvExportBtn = document.getElementById('export-csv-btn');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const historyItems = document.querySelectorAll('#history-log .history-item');

        historyItems.forEach(item => {
            const itemText = item.textContent.toLowerCase();

            if (itemText.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

if (jsonExportBtn) {
    jsonExportBtn.addEventListener('click', () => {
        const allItems = [...pinnedItems, ...historyArray];
        if (allItems.length === 0) return alert('History is empty!');

        const dataStr = JSON.stringify(allItems, null, 2);
        downloadFile(dataStr, 'calculator_history.json', 'application/json');
    });
}

if (csvExportBtn) {
    csvExportBtn.addEventListener('click', () => {
        const allItems = [...pinnedItems, ...historyArray];
        if (allItems.length === 0) return alert('History is empty!');

        let csvContent = "Expression,Result\n";

        allItems.forEach(item => {
            if (item.includes('=')) {
                const parts = item.split('=');
                csvContent += `"${parts[0].trim()}","${parts[1].trim()}"\n`;
            } else {
                csvContent += `"${item}"\n`;
            }
        });

        downloadFile(csvContent, 'calculator_history.csv', 'text/csv');
    });
}

// --- MODAL CLOSE & CLEAR EVENT LISTENERS ---

// 1. EXIT / CLOSE BUTTON (Fixed Typo)
const closeModalBtn = document.getElementById('close-modal-btn');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        if (historyModal) historyModal.classList.add('hidden');
    });
}

// 2. CLEAR BUTTON (Clears ONLY unpinned items without confirmation)
const clearBtn = document.querySelector('.modal-footer .clear-btn'); 
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (historyArray.length === 0) return;
        historyArray = [];
        saveHistoryToLocalStorage();
        renderHistory();
        showToast('Cleared recent history');
    });
}

// 3. CLEAR HISTORY BUTTON (Clears EVERYTHING with a confirmation pop-up)
const clearHistoryBtn = document.getElementById('clear-history-btn');
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        if (historyArray.length === 0 && pinnedItems.length === 0) return;
        
        const confirmDelete = confirm("Are you sure you want to permanently delete ALL history including pinned items?");
        if (confirmDelete) {
            clearHistory(); 
            showToast('All history erased');
        }
    });
}

// --- PINNED FILTER BUTTON TOGGLE ---
const pinnedFilterBtn = document.getElementById('pinned-filter-btn');
let isFilterPinnedOnly = false;

if (pinnedFilterBtn) {
    pinnedFilterBtn.addEventListener('click', () => {
        isFilterPinnedOnly = !isFilterPinnedOnly; 
        
        const unpinnedItems = document.querySelectorAll('#history-log .history-item:not(.pinned-item)');
        
        if (isFilterPinnedOnly) {
            pinnedFilterBtn.style.background = '#fb8500'; 
            pinnedFilterBtn.innerText = '📌 Show All';
            
            unpinnedItems.forEach(item => item.style.display = 'none');
        } else {
            pinnedFilterBtn.style.background = '#023e8a'; 
            pinnedFilterBtn.innerText = '📌 Pinned';
            
            unpinnedItems.forEach(item => item.style.display = 'flex');
        }
    });
}

// PWA SERVICE REGISTRATION
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registered successfully!', reg))
        .catch((err) => console.log('Service Worker registration failed:', err));
    });
}