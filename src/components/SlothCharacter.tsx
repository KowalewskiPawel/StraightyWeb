import React from 'react';

interface SlothCharacterProps {
  mood: 'happy' | 'neutral' | 'sad' | 'arms-raised';
  headOffset: number; // -1 to 1, where -1 is up, 1 is down
}

export const SlothCharacter: React.FC<SlothCharacterProps> = ({ mood, headOffset }) => {
  const getEyeShape = () => {
    switch (mood) {
      case 'happy':
        return 'M20,25 Q25,20 30,25'; // Curved up (happy eyes)
      case 'sad':
        return 'M20,20 Q25,25 30,20'; // Curved down (sad eyes)
      case 'arms-raised':
        return 'M20,22.5 Q25,20 30,22.5'; // Slightly curved up (alert)
      default:
        return 'M20,22.5 L30,22.5'; // Straight line (neutral)
    }
  };

  const getMouthShape = () => {
    switch (mood) {
      case 'happy':
        return 'M15,35 Q25,45 35,35'; // Smile
      case 'sad':
        return 'M15,40 Q25,30 35,40'; // Frown
      case 'arms-raised':
        return 'M20,37.5 Q25,35 30,37.5'; // Slight smile (alert but pleased)
      default:
        return 'M20,37.5 L30,37.5'; // Straight line
    }
  };

  const getSlothColor = () => {
    switch (mood) {
      case 'happy':
        return '#8FBC8F'; // Light green
      case 'sad':
        return '#A0A0A0'; // Gray
      case 'arms-raised':
        return '#87CEEB'; // Sky blue
      default:
        return '#DEB887'; // Beige
    }
  };

  const getMessage = () => {
    switch (mood) {
      case 'happy':
        return '😊 Great posture!';
      case 'sad':
        return '😔 Poor posture detected';
      case 'arms-raised':
        return '🙋 Arms raised - analysis paused';
      default:
        return '😐 Posture is okay';
    }
  };

  const getSubMessage = () => {
    switch (mood) {
      case 'happy':
        return 'Keep it up! Your body will thank you.';
      case 'sad':
        return 'Straighten up! You can do it!';
      case 'arms-raised':
        return 'Lower your arms to resume monitoring.';
      default:
        return 'Keep your shoulders wide and head up!';
    }
  };

  const headY = 10 + (headOffset * 15); // Move head up/down based on user's head

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="200" height="300" viewBox="0 0 100 150" className="drop-shadow-lg">
          {/* Body */}
          <ellipse
            cx="50"
            cy="90"
            rx="25"
            ry="35"
            fill={getSlothColor()}
            stroke="#654321"
            strokeWidth="1"
            className="transition-all duration-500 ease-out"
          />
          
          {/* Arms - adjust position based on mood */}
          <ellipse
            cx="25"
            cy={mood === 'arms-raised' ? 70 : 80}
            rx="8"
            ry="20"
            fill={getSlothColor()}
            stroke="#654321"
            strokeWidth="1"
            transform={`rotate(${mood === 'arms-raised' ? -40 : -20} 25 ${mood === 'arms-raised' ? 70 : 80})`}
            className="transition-all duration-500 ease-out"
          />
          <ellipse
            cx="75"
            cy={mood === 'arms-raised' ? 70 : 80}
            rx="8"
            ry="20"
            fill={getSlothColor()}
            stroke="#654321"
            strokeWidth="1"
            transform={`rotate(${mood === 'arms-raised' ? 40 : 20} 75 ${mood === 'arms-raised' ? 70 : 80})`}
            className="transition-all duration-500 ease-out"
          />
          
          {/* Head */}
          <circle
            cx="50"
            cy={headY + 35}
            r="20"
            fill={getSlothColor()}
            stroke="#654321"
            strokeWidth="1"
            className="transition-all duration-300 ease-out"
          />
          
          {/* Eyes */}
          <path
            d={getEyeShape()}
            stroke="#333"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            transform={`translate(0, ${headY})`}
            className="transition-all duration-300 ease-out"
          />
          <path
            d={getEyeShape()}
            stroke="#333"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            transform={`translate(20, ${headY})`}
            className="transition-all duration-300 ease-out"
          />
          
          {/* Nose */}
          <circle
            cx="50"
            cy={headY + 30}
            r="2"
            fill="#333"
            className="transition-all duration-300 ease-out"
          />
          
          {/* Mouth */}
          <path
            d={getMouthShape()}
            stroke="#333"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            transform={`translate(0, ${headY})`}
            className="transition-all duration-300 ease-out"
          />
          
          {/* Chest marking */}
          <ellipse
            cx="50"
            cy="85"
            rx="12"
            ry="18"
            fill="rgba(255,255,255,0.3)"
            className="transition-all duration-500 ease-out"
          />

          {/* Special effects for arms-raised mode */}
          {mood === 'arms-raised' && (
            <>
              <circle cx="25" cy="60" r="3" fill="#FFD700" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="75" cy="60" r="3" fill="#FFD700" opacity="0.8">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
              </circle>
            </>
          )}
        </svg>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold text-gray-700">
          {getMessage()}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {getSubMessage()}
        </p>
      </div>
    </div>
  );
};