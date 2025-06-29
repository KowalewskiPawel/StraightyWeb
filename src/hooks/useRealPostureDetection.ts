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

interface PostureAnalysis {
  mood: 'happy' | 'neutral' | 'angry';
  status: string;
  metrics: {
    confidence: number;
    issueCount: number;
  };
}

interface CalibrationData {
  shoulderDistanceX: number; // X difference between shoulders (width)
  shoulderDistanceY: number; // Y difference between shoulders (height balance)
  headShoulderDistanceY: number; // Y difference between head and shoulders
}

interface FrameData {
  shoulderXDiff: number;
  shoulderYDiff: number;
  headShoulderYDiff: number;
}

export const useRealPostureDetection = (toleranceValue: number = 25, soundsEnabled: boolean = true) => {
  const [analysis, setAnalysis] = useState<PostureAnalysis>({
    mood: 'neutral',
    status: 'Waiting for camera...',
    metrics: { confidence: 0, issueCount: 0 }
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const baselineRef = useRef<CalibrationData | null>(null);
  const calibrationSamplesRef = useRef<PoseData[]>([]);
  
  // Rolling frame data for Swift-like averaging
  const frameDataRef = useRef<FrameData[]>([]);
  const maxFrameCount = 30; // Keep last 30 frames for averaging
  
  // Timeout and frequency control
  const lastDetectionRef = useRef<number>(Date.now());
  const lastMoodChangeRef = useRef<number>(0);
  const lastMoodRef = useRef<string>('neutral');
  const noPersonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameCounter = useRef<number>(0);
  
  // Thresholds based on Swift implementation
  const getThresholds = () => {
    const sensitivity = (100 - toleranceValue) / 100; // 0 to 1
    return {
      shoulderXThreshold: 0.15 * (1 + sensitivity), // Shoulder width threshold
      shoulderYThreshold: 0.12 * (1 + sensitivity), // Shoulder height balance threshold
      headShoulderYThreshold: 0.10 * (1 + sensitivity) // Head position threshold
    };
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
          gainne.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
      }
    } catch (error) {
      console.log('Audio context error:', error);
    }
  };

  // Update analysis with 2-second cooldown for mood changes
  const updateAnalysisWithCooldown = useCallback((newMood: 'happy' | 'neutral' | 'angry', newStatus: string, issueCount: number, confidence: number) => {
    const now = Date.now();
    const MOOD_CHANGE_COOLDOWN = 2000; // 2 seconds

    // If it's the same mood, update immediately
    if (newMood === lastMoodRef.current) {
      setAnalysis({
        mood: newMood,
        status: newStatus,
        metrics: { confidence, issueCount }
      });
      return;
    }

    // If enough time has passed since last mood change, allow change
    if (now - lastMoodChangeRef.current >= MOOD_CHANGE_COOLDOWN) {
      lastMoodChangeRef.current = now;
      lastMoodRef.current = newMood;
      
      // Play sound for mood change
      switch (newMood) {
        case 'happy':
          playSound('good');
          break;
        case 'neutral':
          playSound('warning');
          break;
        case 'angry':
          playSound('alert');
          break;
      }

      setAnalysis({
        mood: newMood,
        status: newStatus,
        metrics: { confidence, issueCount }
      });
    } else {
      // Keep current mood but update status and metrics
      setAnalysis(prev => ({
        ...prev,
        status: newStatus,
        metrics: { confidence, issueCount }
      }));
    }
  }, [soundsEnabled]);

  const analyzePose = useCallback((poseData: PoseData | null) => {
    const now = Date.now();
    frameCounter.current += 1;
    
    // Clear no-person timeout if we have data
    if (poseData && noPersonTimeoutRef.current) {
      clearTimeout(noPersonTimeoutRef.current);
      noPersonTimeoutRef.current = null;
    }

    if (!poseData) {
      // Set timeout for "no person detected" state
      if (!noPersonTimeoutRef.current) {
        noPersonTimeoutRef.current = setTimeout(() => {
          setAnalysis(prev => ({ 
            ...prev, 
            mood: 'neutral',
            status: 'No person detected',
            metrics: { confidence: 0, issueCount: 0 }
          }));
        }, 3000);
      }
      return;
    }

    lastDetectionRef.current = now;

    // Arms raised detection
    if (poseData.armsRaised) {
      setAnalysis(prev => ({
        ...prev,
        mood: 'neutral',
        status: 'Arms raised - monitoring paused',
        metrics: { confidence: poseData.confidence, issueCount: 0 }
      }));
      return;
    }

    // Calculate current frame values (Swift-style)
    const currentFrameData: FrameData = {
      shoulderXDiff: poseData.shoulderDistance, // X difference between shoulders
      shoulderYDiff: poseData.shoulderHeightDiff, // Y difference between shoulders  
      headShoulderYDiff: poseData.headShoulderDistance // Y difference head-shoulders
    };

    // Calibration phase - collect 40 samples for better baseline
    if (calibrationSamplesRef.current.length < 40) {
      calibrationSamplesRef.current.push(poseData);
      
      if (calibrationSamplesRef.current.length === 40) {
        // Calculate baseline averages (Swift approach)
        const samples = calibrationSamplesRef.current;
        const avgShoulderX = samples.reduce((sum, data) => sum + data.shoulderDistance, 0) / samples.length;
        const avgShoulderY = samples.reduce((sum, data) => sum + data.shoulderHeightDiff, 0) / samples.length;
        const avgHeadShoulderY = samples.reduce((sum, data) => sum + data.headShoulderDistance, 0) / samples.length;
        
        baselineRef.current = {
          shoulderDistanceX: avgShoulderX,
          shoulderDistanceY: avgShoulderY,
          headShoulderDistanceY: avgHeadShoulderY
        };

        setIsCalibrating(false);
        playSound('good');
        
        console.log('Swift-style Calibration complete:', baselineRef.current);
      }
      
      setAnalysis(prev => ({
        ...prev,
        mood: 'neutral',
        status: `Calibrating... ${calibrationSamplesRef.current.length}/40`,
        metrics: { confidence: poseData.confidence, issueCount: 0 }
      }));
      return;
    }

    if (!baselineRef.current) return;

    // Add current frame to rolling buffer (Swift approach)
    frameDataRef.current.push(currentFrameData);
    if (frameDataRef.current.length > maxFrameCount) {
      frameDataRef.current.shift(); // Remove oldest frame
    }

    // Calculate rolling averages (Swift-style)
    const frameCount = frameDataRef.current.length;
    const avgShoulderXDiff = frameDataRef.current.reduce((sum, frame) => sum + frame.shoulderXDiff, 0) / frameCount;
    const avgShoulderYDiff = frameDataRef.current.reduce((sum, frame) => sum + frame.shoulderYDiff, 0) / frameCount;
    const avgHeadShoulderYDiff = frameDataRef.current.reduce((sum, frame) => sum + frame.headShoulderYDiff, 0) / frameCount;

    const baseline = baselineRef.current;
    const thresholds = getThresholds();
    const commands: string[] = [];

    // Debug logging every 60 frames (~1 second like Swift)
    if (frameCounter.current % 60 === 0) {
      console.log('=== SWIFT-STYLE POSTURE DEBUG ===');
      console.log(`Shoulders X: ${avgShoulderXDiff.toFixed(2)} vs baseline: ${baseline.shoulderDistanceX.toFixed(2)}`);
      console.log(`Shoulders Y: ${avgShoulderYDiff.toFixed(2)} vs baseline: ${baseline.shoulderDistanceY.toFixed(2)} (threshold: ${thresholds.shoulderYThreshold.toFixed(2)})`);
      console.log(`Head Y: ${avgHeadShoulderYDiff.toFixed(2)} vs baseline: ${baseline.headShoulderDistanceY.toFixed(2)} (threshold: ${thresholds.headShoulderYThreshold.toFixed(2)})`);
      console.log('================================');
    }

    // Check posture using Swift-style logic - but give actionable commands
    let shoulderXOK = true;
    let shoulderYOK = true;
    let headShoulderYOK = true;

    // 1. Shoulder width analysis (X difference) - Swift style
    const shoulderXChange = Math.abs(avgShoulderXDiff - baseline.shoulderDistanceX);
    const shoulderXThreshold = baseline.shoulderDistanceX * thresholds.shoulderXThreshold;
    
    if (shoulderXChange > shoulderXThreshold) {
      shoulderXOK = false;
      if (avgShoulderXDiff < baseline.shoulderDistanceX) {
        commands.push("Shoulders back!"); // Clear actionable command
      } else {
        commands.push("Ease shoulders forward"); // Clear actionable command
      }
    }

    // 2. Shoulder height balance (Y difference) - Swift style  
    if (avgShoulderYDiff > baseline.shoulderDistanceY + thresholds.shoulderYThreshold) {
      shoulderYOK = false;
      commands.push("Level your shoulders"); // Clear actionable command
    }

    // 3. Head position (Y difference) - Swift style
    const headYThreshold = baseline.headShoulderDistanceY * thresholds.headShoulderYThreshold;
    if (avgHeadShoulderYDiff < baseline.headShoulderDistanceY - headYThreshold) {
      headShoulderYOK = false;
      commands.push("Chin up!"); // Clear actionable command
    }

    // Determine mood and status based on commands
    let mood: 'happy' | 'neutral' | 'angry' = 'happy';
    let status = 'Checking posture!';
    
    if (commands.length === 1) {
      mood = 'neutral';
      status = commands[0];
    } else if (commands.length >= 2) {
      mood = 'angry';
      status = commands.slice(0, 2).join(' & ');
    }

    // Use cooldown function to update analysis
    updateAnalysisWithCooldown(mood, status, commands.length, poseData.confidence);
  }, [toleranceValue, updateAnalysisWithCooldown]);

  const resetCalibration = useCallback(() => {
    calibrationSamplesRef.current = [];
    baselineRef.current = null;
    frameDataRef.current = [];
    frameCounter.current = 0;
    setIsCalibrating(true);
    lastMoodRef.current = 'neutral';
    lastMoodChangeRef.current = 0;
    playSound('notification');
    
    // Clear any existing timeouts
    if (noPersonTimeoutRef.current) {
      clearTimeout(noPersonTimeoutRef.current);
      noPersonTimeoutRef.current = null;
    }
    
    setAnalysis({
      mood: 'neutral',
      status: 'Calibrating...',
      metrics: { confidence: 0, issueCount: 0 }
    });
  }, [soundsEnabled]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (noPersonTimeoutRef.current) {
        clearTimeout(noPersonTimeoutRef.current);
      }
    };
  }, []);

  return { analysis, analyzePose, resetCalibration, isCalibrating };
};