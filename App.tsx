
import React, { useState, useCallback, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { ScanningResult, ExportHistory } from './types';
import { preprocessImage, extractIndianNumbers } from './services/ocrService';
import { ProgressBar } from './components/ProgressBar';

const App: React.FC = () => {
  const [results, setResults] = useState<ScanningResult[]>([]);
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawOcrText, setRawOcrText] = useState<string>(''); // For raw OCR output display as required

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('ocr_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Cast the file list to a File array to resolve 'unknown' type issues in subsequent operations
    const files = Array.from(e.target.files || []).slice(0, 20) as File[];
    if (files.length === 0) return;

    const newResults: ScanningResult[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      progress: 0,
      status: 'pending',
      numbersFound: []
    }));

    setResults(newResults);
    setIsProcessing(true);
    setRawOcrText('');

    const worker = await createWorker('eng', 1, {
        logger: m => {
          // This is a global logger for all jobs if using single worker, 
          // but we'll track individual progress below
        }
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const resultId = newResults[i].id;

      try {
        setResults(prev => prev.map(r => r.id === resultId ? { ...r, status: 'processing' } : r));

        // 1. Preprocess
        const processedImage = await preprocessImage(file);

        // 2. OCR
        const { data: { text } } = await worker.recognize(processedImage, {
          // We can track individual job progress if we use a different pattern, 
          // but for this simple loop we simulate it or use overall progress
        }, {
            // Options
        });

        // 3. Extract and Normalize
        const numbers = extractIndianNumbers(text);
        
        // Append raw text for debug view (as requested)
        setRawOcrText(prev => prev + `--- ${file.name} ---\n${text}\n\n`);

        setResults(prev => prev.map(r => 
          r.id === resultId ? { 
            ...r, 
            status: 'completed', 
            progress: 100, 
            numbersFound: numbers 
          } : r
        ));
      } catch (error) {
        console.error("Error processing " + file.name, error);
        setResults(prev => prev.map(r => r.id === resultId ? { ...r, status: 'error', progress: 0 } : r));
      }
    }

    await worker.terminate();
    setIsProcessing(false);
  };

  const exportCSV = () => {
    const allNumbers = Array.from(new Set(results.flatMap(r => r.numbersFound)));
    if (allNumbers.length === 0) return alert("No numbers found to export!");

    const csvContent = "Number,Phone Number\n" + 
      allNumbers.map((num, idx) => `${idx + 1},${num}`).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // File naming logic 1.csv, 2.csv... based on history length
    const nextFileNumber = history.length + 1;
    const fileName = `${nextFileNumber}.csv`;
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save to history
    const newHistoryItem: ExportHistory = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      count: allNumbers.length,
      fileName: fileName
    };

    const updatedHistory = [newHistoryItem, ...history].slice(0, 5);
    setHistory(updatedHistory);
    localStorage.setItem('ocr_history', JSON.stringify(updatedHistory));
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 pb-24">
      <header className="mb-8 text-center">
        <div className="inline-block p-2 bg-orange-100 rounded-xl mb-2">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bharat-OCR</h1>
        <p className="text-slate-500 text-sm">Batch Extract Indian Phone Numbers</p>
      </header>

      {/* Upload Zone */}
      <div className="mb-6">
        <label className="block w-full">
          <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isProcessing ? 'bg-slate-50 border-slate-200' : 'bg-white border-orange-300 hover:border-orange-500'}`}>
            <svg className="w-12 h-12 text-orange-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm font-semibold text-slate-700">
              {isProcessing ? "Processing Images..." : "Upload Batch (Max 20)"}
            </span>
            <span className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG up to 20 images</span>
          </div>
          <input 
            type="file" 
            className="hidden" 
            multiple 
            accept="image/*" 
            onChange={handleFileSelect}
            disabled={isProcessing}
          />
        </label>
      </div>

      {/* Processing Progress */}
      {results.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Queue</h2>
          <div className="space-y-1">
            {results.map(res => (
              <ProgressBar 
                key={res.id} 
                label={res.fileName} 
                progress={res.progress} 
                status={res.status} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Raw OCR Output (Requested feature) */}
      {rawOcrText && (
        <div className="mb-8 p-4 bg-slate-800 rounded-xl">
           <h2 className="text-xs font-bold text-slate-400 mb-2 uppercase">Raw OCR Data</h2>
           <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40 font-mono">
             {rawOcrText}
           </pre>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Recent Files</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {history.map(item => (
              <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                <div>
                  <div className="font-semibold text-slate-800">{item.fileName}</div>
                  <div className="text-xs text-slate-400">{item.timestamp}</div>
                </div>
                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                  {item.count} Numbers
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center">
        <button
          onClick={exportCSV}
          disabled={isProcessing || results.length === 0}
          className={`w-full max-w-md flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${
            isProcessing || results.length === 0 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
};

export default App;
