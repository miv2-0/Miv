
/**
 * Omni Extractor Core Logic
 * Handles OCR batch processing, image optimization, and CSV export.
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
    reset: document.getElementById('resetBtn') as HTMLButtonElement,
    canvas: document.getElementById('procCanvas') as HTMLCanvasElement
};

/**
 * Handle File Selection
 */
el.input.addEventListener('change', async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []).slice(0, 20);
    if (!files.length) return;

    // Reset UI for new batch
    el.status.classList.remove('hidden');
    extractedSet.clear();
    el.badge.innerText = '0';
    el.btn.disabled = true;
    el.btn.className = "w-full py-5 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold border border-slate-700 tracking-widest transition-all uppercase cursor-not-allowed";
    
    writeLog(`Batch extraction initialized for ${files.length} images.`);

    for (let i = 0; i < files.length; i++) {
        const progressVal = (i / files.length) * 100;
        updateProgress(progressVal);
        el.txt.innerText = `PROCESSING: FILE ${i + 1}`;
        
        try {
            const processedImg = await preprocessImage(files[i]);
            // @ts-ignore - Tesseract provided via global CDN
            const { data } = await Tesseract.recognize(processedImg, 'eng');
            const foundCount = parseNumbers(data.text);
            
            if (foundCount > 0) {
                writeLog(`File ${i + 1}: Extracted ${foundCount} new valid signatures.`);
            } else {
                writeLog(`File ${i + 1}: No valid signatures detected.`);
            }
        } catch (error) {
            writeLog(`Kernel error on file ${i + 1}: Engine failure.`);
            console.error(error);
        }
    }

    updateProgress(100);
    el.txt.innerText = "SCAN COMPLETE";
    writeLog("Processing cycle complete. Finalizing data...");

    if (extractedSet.size > 0) {
        enableDownloadButton();
    } else {
        writeLog("Critical failure: Zero valid results in current batch.");
    }
});

/**
 * Image Preprocessing: Grayscale and Contrast optimization for OCR accuracy
 */
function preprocessImage(file: File): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ctx = el.canvas.getContext('2d');
            if (!ctx) return resolve(URL.createObjectURL(file));
            
            el.canvas.width = img.width;
            el.canvas.height = img.height;
            // High contrast for sharp text detection
            ctx.filter = "grayscale(100%) contrast(150%)";
            ctx.drawImage(img, 0, 0);
            resolve(el.canvas.toDataURL('image/jpeg', 0.95));
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Logic: Parse Indian Mobile Numbers
 */
function parseNumbers(text: string): number {
    const initialSize = extractedSet.size;
    // Captures 10-digit numbers starting with 6-9, with optional +91, 91 or 0 prefix
    const regex = /(?:\+?91|0)?\s?([6-9]\d{9})/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Normalize all to 91XXXXXXXXXX format
        extractedSet.add('91' + match[1]);
    }
    
    el.badge.innerText = extractedSet.size.toString();
    return extractedSet.size - initialSize;
}

/**
 * CSV Generation: Google Contacts Compatible
 */
function downloadCSV() {
    if (extractedSet.size === 0) return;

    let csv = "Name,Phone 1 - Value\n";
    let i = 1;
    extractedSet.forEach(num => {
        csv += `Extracted_${i},${num}\n`;
        i++;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniBatch_${dlIndex}.csv`;
    a.click();
    
    dlIndex++;
    localStorage.setItem('dlIndex', dlIndex.toString());
    writeLog(`Export successful: OmniBatch_${dlIndex - 1}.csv generated.`);
    URL.revokeObjectURL(url);
}

/**
 * UI Utilities
 */
function updateProgress(val: number) {
    el.bar.style.width = `${val}%`;
    el.pct.innerText = `${Math.round(val)}%`;
}

function writeLog(msg: string) {
    const p = document.createElement('p');
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    p.innerHTML = `<span class="text-slate-600">[${time}]</span> :: ${msg}`;
    el.logs.appendChild(p);
    el.logs.scrollTop = el.logs.scrollHeight;
}

function enableDownloadButton() {
    el.btn.disabled = false;
    el.btn.innerText = "DOWNLOAD CSV DATA";
    el.btn.className = "w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] uppercase border-none active:scale-[0.98]";
}

// Global Event Listeners
el.btn.addEventListener('click', downloadCSV);
el.reset.addEventListener('click', () => {
    if (confirm("Confirm: Clear local engine cache and reset session?")) {
        localStorage.clear();
        window.location.reload();
    }
});
