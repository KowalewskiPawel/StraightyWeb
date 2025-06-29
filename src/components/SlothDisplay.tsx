import React from 'react';

interface SlothDisplayProps {
  mood: 'happy' | 'neutral' | 'angry';
  status: string;
  isCalibrating: boolean;
}

export const SlothDisplay: React.FC<SlothDisplayProps> = ({ mood, status, isCalibrating }) => {
  const getSlothImage = () => {
    switch (mood) {
      case 'happy':
        return '/src/assets/sloth_happy.png';
      case 'angry':
        return '/src/assets/sloth_angry.png';
      default:
        return '/src/assets/sloth_sad.png';
    }
  };

  if (isCalibrating) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative">
          <img 
            src="/src/assets/sloth_happy.png" 
            alt="Sloth" 
            className="w-32 h-32 object-contain animate-pulse"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <img 
          src={getSlothImage()} 
          alt="Sloth" 
          className="w-32 h-32 object-contain transition-all duration-500"
        />
      </div>
    </div>
  );
};