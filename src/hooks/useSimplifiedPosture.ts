import { useState, useCallback, useRef, useEffect } from 'react';

interface PoseData {
  shoulderDistance: number;
  headShoulderDistance: number;
  headY: number;
  confidence: number;
  shoulderHeightDiff: number;
  armsRaised: boolean;
  postureIssues: string[];
}

interface SimplifiedAnalysis {
  mood: 'happy' | 'neutral' | 'angry';
  status: string;
  metrics: {
    confidence: number;
    issueCount: number;
  };
}

export const useSimplifiedPosture = (toleranceValue: number = 25, soundsEnabled: boolean = true) => {
  const [analysis, setAnalysis] = useState<SimplifiedAnalysis>({
    mood: 'happy',
    status: 'Everything looks good',
    metrics: { confidence: 0.95, issueCount: 0 }
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [demoMode] = useState(true);
  const demoStateRef = useRef(0);
  const lastMoodRef = useRef<string>('happy');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission when sounds are enabled
  useEffect(() => {
    if ('Notification' in window && soundsEnabled) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          
          // Show welcome notification if permission granted
          if (permission === 'granted') {
            setTimeout(() => {
              try {
                const welcomeNotification = new Notification('Straighty Notifications Active! 🎉', {
                  body: 'You\'ll receive posture alerts when needed.',
                  icon: '/favicon.ico',
                  tag: 'welcome',
                  requireInteraction: false
                });
                
                setTimeout(() => welcomeNotification.close(), 4000);
              } catch (error) {
                console.log('Welcome notification failed:', error);
              }
            }, 500);
          }
        });
      }
    }
  }, [soundsEnabled]);

  // Calculate cycle speed based on tolerance (lower tolerance = faster detection)
  const getCycleSpeed = () => {
    // Reverse the logic: lower tolerance = more sensitive = faster alerts
    return Math.max(2000, 3000 + (toleranceValue * 80)); // 2-10 seconds
  };

  // Determine posture state based on tolerance
  const getPostureState = () => {
    // Lower tolerance = more frequent alerts
    if (toleranceValue < 20) {
      // Very sensitive - mostly alert states
      const states = ['angry', 'neutral', 'angry', 'neutral', 'happy'];
      return states[demoStateRef.current % states.length];
    } else if (toleranceValue < 50) {
      // Moderate sensitivity - balanced
      const states = ['happy', 'neutral', 'angry', 'happy', 'neutral'];
      return states[demoStateRef.current % states.length];
    } else {
      // Less sensitive - mostly good states
      const states = ['happy', 'happy', 'neutral', 'happy', 'happy'];
      return states[demoStateRef.current % states.length];
    }
  };

  // Sound effects
  const playSound = (type: 'good' | 'warning' | 'alert' | 'notification') => {
    if (!soundsEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch (type) {
        case 'good':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'warning':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'alert':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(350, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
        case 'notification':
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.05);
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
      }
    } catch (error) {
      console.log('Audio context error:', error);
    }
  };

  // Show browser notification
  const showNotification = (title: string, body: string) => {
    if (!soundsEnabled || notificationPermission !== 'granted') {
      console.log('Notifications not enabled or permission denied');
      return;
    }
    
    try {
      // Close any existing posture notifications first
      if ('serviceWorker' in navigator) {
        // For browsers that support it, close existing notifications
      }
      
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'posture-alert', // This will replace previous notifications with same tag
        requireInteraction: false,
        silent: false,
        timestamp: Date.now()
      });

      // Auto-close after 6 seconds
      setTimeout(() => {
        try {
          notification.close();
        } catch (e) {
          // Notification might already be closed
        }
      }, 6000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('Notification sent:', title);
    } catch (error) {
      console.log('Notification error:', error);
    }
  };

  // Demo mode with tolerance-based behavior
  useEffect(() => {
    if (demoMode && !isCalibrating) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const currentMood = getPostureState();
        
        let status = '';
        let issueCount = 0;
        
        switch (currentMood) {
          case 'happy':
            status = 'Everything looks good';
            issueCount = 0;
            break;
          case 'neutral':
            status = 'Head tilted forward';
            issueCount = 1;
            break;
          case 'angry':
            status = 'Shoulders narrow, head forward';
            issueCount = 2;
            break;
        }
        
        // Play sound and show notification for state changes
        if (lastMoodRef.current !== currentMood) {
          switch (currentMood) {
            case 'happy':
              playSound('good');
              break;
            case 'neutral':
              playSound('warning');
              break;
            case 'angry':
              playSound('alert');
              // Show notification for poor posture
              showNotification(
                'Posture Alert 📍',
                'Multiple positioning observations detected. Please adjust your posture.'
              );
              break;
          }
          lastMoodRef.current = currentMood;
        }
        
        setAnalysis({
          mood: currentMood,
          status,
          metrics: {
            confidence: 0.95,
            issueCount
          }
        });

        demoStateRef.current = (demoStateRef.current + 1) % 10; // Cycle through 10 states
      }, getCycleSpeed());

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [demoMode, isCalibrating, toleranceValue, soundsEnabled, notificationPermission]);

  const analyzePose = useCallback((poseData: PoseData | null) => {
    if (demoMode) return;

    if (!poseData) {
      setAnalysis(prev => ({ 
        ...prev, 
        status: 'No pose detected',
        metrics: { ...prev.metrics, confidence: 0 }
      }));
      return;
    }

    if (poseData.armsRaised) {
      setAnalysis(prev => ({
        ...prev,
        mood: 'neutral',
        status: 'Arms raised - monitoring paused',
        metrics: { ...prev.metrics, confidence: poseData.confidence }
      }));
      return;
    }

    setAnalysis({
      mood: 'happy',
      status: 'Everything looks good',
      metrics: {
        confidence: poseData.confidence,
        issueCount: 0
      }
    });
  }, [demoMode]);

  const resetCalibration = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsCalibrating(true);
    playSound('notification');
    
    setAnalysis({
      mood: 'neutral',
      status: 'Calibrating...',
      metrics: { confidence: 0.8, issueCount: 0 }
    });

    // Reset demo state and restart cycle
    setTimeout(() => {
      setIsCalibrating(false);
      demoStateRef.current = 0;
      lastMoodRef.current = 'happy';
      playSound('good');
      
      setAnalysis({
        mood: 'happy',
        status: 'Everything looks good',
        metrics: { confidence: 0.95, issueCount: 0 }
      });
    }, 2000);
  }, [soundsEnabled]);

  return { analysis, analyzePose, resetCalibration, isCalibrating };
};