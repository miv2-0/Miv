
import React from 'react';

interface ProgressBarProps {
  progress: number;
  label: string;
  status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, status }) => {
  const isError = status === 'error';
  const isComplete = status === 'completed';

  return (
    <div className="mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-700 truncate w-2/3">{label}</span>
        <span className="text-xs font-semibold text-slate-500 uppercase">{status}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
