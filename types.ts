
export interface ScanningResult {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  numbersFound: string[];
}

export interface ExportHistory {
  id: string;
  timestamp: string;
  count: number;
  fileName: string;
}
