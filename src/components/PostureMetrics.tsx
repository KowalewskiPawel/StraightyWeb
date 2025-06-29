import React from 'react';

interface PostureMetricsProps {
  metrics: {
    shoulderWidth: number;
    neckLength: number;
    confidence: number;
    shoulderBalance: number;
  };
  isCalibrating: boolean;
  postureIssues: string[];
}

export const PostureMetrics: React.FC<PostureMetricsProps> = ({ 
  metrics, 
  isCalibrating, 
  postureIssues 
}) => {
  const getScoreColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getShoulderWidthColor = (value: number) => {
    const tolerance = 0.05;
    if (value >= 1 - tolerance && value <= 1 + tolerance) return 'text-green-600';
    if (value >= 1 - tolerance * 2 && value <= 1 + tolerance * 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatRatio = (value: number) => `${Math.round(value * 100)}%`;
  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  if (isCalibrating) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-blue-600 text-center">
            <div className="text-2xl mb-2">📏</div>
            <div className="font-semibold">Calibrating...</div>
            <div className="text-sm">Please maintain good posture</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-800">Posture Metrics</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Shoulder Width:</span>
            <span className={`text-sm font-medium ${getShoulderWidthColor(metrics.shoulderWidth)}`}>
              {formatRatio(metrics.shoulderWidth)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Neck Position:</span>
            <span className={`text-sm font-medium ${getScoreColor(metrics.neckLength, 0.9)}`}>
              {formatPercentage(metrics.neckLength)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Shoulder Balance:</span>
            <span className={`text-sm font-medium ${getScoreColor(metrics.shoulderBalance, 0.8)}`}>
              {formatPercentage(metrics.shoulderBalance)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Detection Quality:</span>
            <span className={`text-sm font-medium ${getScoreColor(metrics.confidence, 0.5)}`}>
              {formatPercentage(metrics.confidence)}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          💡 Keep shoulders wide, level, and head up for best posture
        </div>
      </div>

      {/* Posture Issues */}
      {postureIssues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
            ⚠️ Posture Issues
          </h4>
          <ul className="space-y-1">
            {postureIssues.map((issue, index) => (
              <li key={index} className="text-sm text-amber-700">
                • {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};