import React from 'react';

interface StatusIndicatorProps {
  isActive: boolean;
  label: string;
  value?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isActive, label, value }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      {value && (
        <span className="text-sm text-gray-500">{value}</span>
      )}
    </div>
  );
};