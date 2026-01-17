
import { createWorker } from 'tesseract.js';

/**
 * Preprocess image using canvas: grayscale, contrast enhancement, and sharpening.
 */
export async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(URL.createObjectURL(file));

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Grayscale & Contrast
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Simple contrast stretch
        const contrast = 1.2;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const val = factor * (avg - 128) + 128;
        
        data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, val));
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Normalize and extract Indian mobile numbers.
 * Logic: Match 10 digits starting with 6-9, optionally prefixed by 91/0.
 */
export function extractIndianNumbers(text: string): string[] {
  // Clean string: remove common OCR artifacts and normalize separators
  const cleanText = text.replace(/[\s\-\(\)]/g, '');
  
  // Regex: Look for 10 digit numbers starting with 6, 7, 8, or 9
  // We look for patterns like 919876543210, 09876543210, or 9876543210
  const regex = /(?:(?:(?:\+|00)91)|0)?([6-9]\d{9})/g;
  
  const matches = [...cleanText.matchAll(regex)];
  const numbers = matches.map(match => `91${match[1]}`);
  
  // Deduplicate
  return Array.from(new Set(numbers));
}
