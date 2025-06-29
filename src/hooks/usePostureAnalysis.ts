import { useState, useCallback, useRef } from 'react';

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
  mood: 'happy' | 'neutral' | 'sad' | 'arms-raised';
  headOffset: number;
  metrics: {
    shoulderWidth: number;
    neckLength: number;
    confidence: number;
    shoulderBalance: number;
  };
  postureIssues: string[];
}

interface CalibrationData {
  shoulderDistance: number;
  headShoulderDistance: number;
  headY: number;
}

export const usePostureAnalysis = () => {
  const [analysis, setAnalysis] = useState<PostureAnalysis>({
    mood: 'neutral',
    headOffset: 0,
    metrics: { shoulderWidth: 0, neckLength: 0, confidence: 0, shoulderBalance: 1 },
    postureIssues: []
  });

  const baselineRef = useRef<CalibrationData | null>(null);
  const calibrationSamplesRef = useRef<PoseData[]>([]);
  const toleranceMultiplier = 0.05; // 5% tolerance

  const analyzePose = useCallback((poseData: PoseData | null) => {
    if (!poseData) {
      setAnalysis(prev => ({ 
        ...prev, 
        metrics: { ...prev.metrics, confidence: 0 },
        postureIssues: ['No pose detected']
      }));
      return;
    }

    // Skip posture analysis if arms are raised
    if (poseData.armsRaised) {
      setAnalysis(prev => ({
        ...prev,
        mood: 'arms-raised',
        metrics: { ...prev.metrics, confidence: poseData.confidence },
        postureIssues: ['Arms raised - posture analysis paused']
      }));
      return;
    }

    // Collect calibration samples for the first 50 frames (more stable baseline)
    if (calibrationSamplesRef.current.length < 50) {
      calibrationSamplesRef.current.push(poseData);
      
      if (calibrationSamplesRef.current.length === 50) {
        // Calculate baseline from calibration samples
        const samples = calibrationSamplesRef.current;
        const avgShoulder = samples.reduce((sum, data) => sum + data.shoulderDistance, 0) / samples.length;
        const avgHeadShoulder = samples.reduce((sum, data) => sum + data.headShoulderDistance, 0) / samples.length;
        const avgHeadY = samples.reduce((sum, data) => sum + data.headY, 0) / samples.length;
        
        baselineRef.current = {
          shoulderDistance: avgShoulder,
          headShoulderDistance: avgHeadShoulder,
          headY: avgHeadY
        };

        console.log('Calibration complete:', baselineRef.current);
      }
      
      // Show calibration progress
      setAnalysis(prev => ({
        ...prev,
        metrics: { ...prev.metrics, confidence: poseData.confidence },
        postureIssues: [`Calibrating... ${calibrationSamplesRef.current.length}/50`]
      }));
      return;
    }

    if (!baselineRef.current) return;

    const baseline = baselineRef.current;
    const postureIssues: string[] = [];

    // Calculate relative metrics with tolerance
    const shoulderRatio = poseData.shoulderDistance / baseline.shoulderDistance;
    const headShoulderRatio = poseData.headShoulderDistance / baseline.headShoulderDistance;
    const headPositionRatio = (poseData.headY - baseline.headY) / baseline.headY;

    // Shoulder width analysis with tolerance
    const minShoulderThreshold = 1 - toleranceMultiplier;
    const maxShoulderThreshold = 1 + toleranceMultiplier;
    const isShoulderWidthOK = shoulderRatio >= minShoulderThreshold && shoulderRatio <= maxShoulderThreshold;

    if (!isShoulderWidthOK) {
      if (shoulderRatio < minShoulderThreshold) {
        postureIssues.push("Shoulders too narrow - You're hunching forward!");
      } else {
        postureIssues.push("Shoulders too wide - You're leaning back too much!");
      }
    }

    // Head position analysis
    const headThreshold = 0.98 - toleranceMultiplier;
    const isHeadPositionOK = headShoulderRatio > headThreshold;
    
    if (!isHeadPositionOK) {
      postureIssues.push("Head position incorrect - Lift your chin!");
    }

    // Shoulder balance analysis
    const maxShoulderHeightDiff = baseline.shoulderDistance * 0.15; // 15% of shoulder width
    const isShoulderBalanceOK = poseData.shoulderHeightDiff <= maxShoulderHeightDiff;
    
    if (!isShoulderBalanceOK) {
      postureIssues.push("Uneven shoulders - Level your shoulders!");
    }

    // Determine mood based on posture issues
    let mood: 'happy' | 'neutral' | 'sad' | 'arms-raised' = 'neutral';

    if (postureIssues.length === 0) {
      mood = 'happy';
    } else if (postureIssues.length >= 2) {
      mood = 'sad';
    } else {
      mood = 'neutral';
    }

    // Calculate head offset for sloth animation (-1 to 1)
    const headOffset = Math.max(-1, Math.min(1, headPositionRatio * 3));

    // Calculate shoulder balance metric (1 = perfect, lower = worse)
    const shoulderBalance = Math.max(0, 1 - (poseData.shoulderHeightDiff / (baseline.shoulderDistance * 0.3)));

    setAnalysis({
      mood,
      headOffset,
      metrics: {
        shoulderWidth: shoulderRatio,
        neckLength: headShoulderRatio,
        confidence: poseData.confidence,
        shoulderBalance
      },
      postureIssues
    });
  }, []);

  const resetCalibration = useCallback(() => {
    calibrationSamplesRef.current = [];
    baselineRef.current = null;
    setAnalysis({
      mood: 'neutral',
      headOffset: 0,
      metrics: { shoulderWidth: 0, neckLength: 0, confidence: 0, shoulderBalance: 1 },
      postureIssues: []
    });
  }, []);

  const isCalibrating = calibrationSamplesRef.current.length < 50;

  return { analysis, analyzePose, resetCalibration, isCalibrating };
};