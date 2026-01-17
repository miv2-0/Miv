
/**
 * OMNI EXTRACTOR CORE - Stealth Logic
 * Handles OCR, Preprocessing, and Strict CSV Formatting (+91 Prefix)
 * Column A: Sequential Index (Name), Column B: Formatted Phone Number (+91)
 */

// Global State
let extractedSet = new Set<string>();
let dlIndex = parseInt(localStorage.getItem('dlIndex') || '1');

// DOM Elements
const el = {
    input: document.getElementById('fileInput') as HTMLInputElement,
    status: document.getElementById('statusPanel') as HTMLDivElement,
    bar: document.getElementById('progressBar') as HTMLDivElement,
    pct: document.getElementById('percentText') as HTMLSpanElement,
    txt: document.getElementById('currentStatus') as HTMLSpanElement,
    btn: document.getElementById('dlBtn') as HTMLButtonElement,
    badge: document.getElementById('countBadge') as HTMLSpanElement,
    logs: document.getElementById('consoleLog') as HTMLDivElement,
    canvas: document.getElementById('procCanvas') as HTMLCanvasElement,
    reset: document.getElementById('resetBtn') as HTMLButtonElement
};

/**
 * Main Event: File Batch Processing
 */
el.input.addEventListener('change', async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []).slice(0, 50);
    if (!files.length) return;

    // Reset Engine UI
    el.status.classList.remove('hidden');
    extractedSet.clear();
    el.badge.innerText = '0';
    disableBtn();
    writeLog(`SEQUENCE STARTED: Analyzing batch of ${files.length} source objects.`);

    for (let i = 0; i < files.length; i++) {
        const progressVal = Math.round((i / files.length) * 100);
        updateProgress(progressVal);
        el.txt.innerText = `READING_OBJECT_${i + 1}`;
        
        try {
            const imgData = await preprocessImage(files[i]);
            // @ts-ignore - Tesseract is loaded via CDN in index.html
            const { data } = await Tesseract.recognize(imgData, 'eng');
            const foundCount = parseNumbers(data.text);
            
            if (foundCount > 0) {
                writeLog(`OBJECT ${i + 1}: Captured ${foundCount} new valid signatures.`);
            } else {
                writeLog(`OBJECT ${i + 1}: No valid patterns found in source.`);
            }
        } catch (err) {
            writeLog(`CRITICAL ERROR: Failed to scan object ${i + 1}. Neural bypass failed.`);
            console.error(err);
        }
    }

    updateProgress(100);
    el.txt.innerText = "SEQUENCE COMPLETE";
    writeLog(`Processing finished. Unique entities buffered: ${extractedSet.size}`);

    if (extractedSet.size > 0) {
        enableBtn();
    } else {
        writeLog("TERMINATED: Data buffer empty. No valid numbers detected.");
    }
});

/**
 * Image Pre-Processing Engine
 */
function preprocessImage(file: File): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ctx = el.canvas.getContext('2d');
            if (!ctx) return resolve(URL.createObjectURL(file));
            
            el.canvas.width = img.width;
            el.canvas.height = img.height;
            // Grayscale + Contrast optimization for stealthy OCR
            ctx.filter = "grayscale(100%) contrast(140%) brightness(110%)";
            ctx.drawImage(img, 0, 0);
            resolve(el.canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Regex Parsing & Normalization
 * Captures 10-digit Indian mobiles and forces +91 prefix.
 * Regex (?:\+?91|0|\+)? matches optional prefixes +91, 91, 0, or +.
 * Capturing group ([6-9]\d{9}) isolates the strictly 10-digit mobile number.
 */
function parseNumbers(text: string): number {
    const prevSize = extractedSet.size;
    // Captures exactly 10 digits starting with 6-9, ignoring leading +91, 91, 0 or +
    const regex = /(?:\+?91|0|\+)?\s?([6-9]\d{9})/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Strict normalization: Remove prefix by capturing group 1 and adding +91
        // This effectively satisfies stripping +, 0, 91 as they are outside the capture group
        extractedSet.add("+91" + match[1]);
    }
    
    el.badge.innerText = extractedSet.size.toString();
    return extractedSet.size - prevSize;
}

/**
 * CSV Generation: Strict sequential index formatting
 * Column A: Header "Name", Value: Index only (1, 2, 3...)
 * Column B: Header "mobile number", Value: Formatted Number (+91...)
 */
function downloadCSV() {
    if (extractedSet.size === 0) return;

    // Headers updated for strict requirement: Name and mobile number
    let csvContent = "Name,mobile number\n"; 
    let index = 1;
    
    extractedSet.forEach(phoneNumber => {
        // Col A: index, Col B: normalized phone number
        csvContent += `${index},${phoneNumber}\n`;
        index++;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `Batch_Export_${dlIndex}.csv`;
    link.click();
    
    writeLog(`DOWNLOADED: Batch_Export_${dlIndex}.csv saved to local disk.`);
    dlIndex++;
    localStorage.setItem('dlIndex', dlIndex.toString());
    URL.revokeObjectURL(url);
}

/**
 * UI Support Functions
 */
function updateProgress(val: number) {
    el.bar.style.width = `${val}%`;
    el.pct.innerText = `${val}%`;
}

function writeLog(msg: string) {
    const p = document.createElement('p');
    p.innerText = `:: ${msg}`;
    el.logs.appendChild(p);
    el.logs.scrollTop = el.logs.scrollHeight;
}

function enableBtn() {
    el.btn.disabled = false;
    el.btn.innerText = "DOWNLOAD CONTACTS (CSV)";
    el.btn.className = "w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black cursor-pointer transition-all shadow-lg shadow-blue-900/50 tracking-[4px] border-none active:scale-[0.98]";
}

function disableBtn() {
    el.btn.disabled = true;
    el.btn.innerText = "BUFFERING DATA...";
    el.btn.className = "w-full py-4 bg-slate-800 text-slate-500 rounded-2xl text-xs font-black border border-slate-700 tracking-widest cursor-not-allowed";
}

// Global Event Handlers
el.btn.addEventListener('click', downloadCSV);
el.reset.addEventListener('click', () => {
    if (confirm("Confirm system memory wipe? Current buffered detections will be lost.")) {
        localStorage.clear();
        window.location.reload();
    }
});
