import { useState, useEffect, useRef } from 'react';

export const usePomodoroTimer = (initialMinutes: number = 25, soundsEnabled: boolean = true) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60); // Convert to seconds
  const [isActive, setIsActive] = useState(false);
  const [minutes, setMinutes] = useState(initialMinutes);
  const intervalRef = useRef<number | null>(null);

  // Sound effect for timer completion
  const playTimerSound = () => {
    if (!soundsEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Completion chime
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.4);
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
  };

  // Show notification for timer completion
  const showTimerNotification = () => {
    if (!soundsEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Complete! 🍅', {
        body: 'Time for a break! Your focus session is finished.',
        icon: '/src/assets/pomodoro.png',
        badge: '/src/assets/pomodoro.png'
      });
    }
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            playTimerSound();
            showTimerNotification();
            return minutes * 60; // Reset when done
          }
          return time - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, minutes, soundsEnabled]);

  const toggle = () => {
    setIsActive(!isActive);
  };

  const reset = () => {
    setIsActive(false);
    setTimeLeft(minutes * 60);
  };

  const updateMinutes = (newMinutes: number) => {
    setMinutes(newMinutes);
    if (!isActive) {
      setTimeLeft(newMinutes * 60);
    }
  };

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isActive,
    minutes,
    toggle,
    reset,
    updateMinutes,
    formatTime
  };
};