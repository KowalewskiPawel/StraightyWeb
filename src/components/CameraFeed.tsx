import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

interface CameraFeedProps {
  onPoseData: (poseData: any) => void;
  isActive: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onPoseData, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Request camera permission
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraPermission('granted');
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraPermission('denied');
        setError('Camera access denied. Please allow camera access and refresh the page.');
      }
    };

    const loadModel = async () => {
      try {
        // Initialize TensorFlow.js
        await tf.ready();
        
        // Create pose detector
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        };
        
        const poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet, 
          detectorConfig
        );
        
        setDetector(poseDetector);
        setIsLoading(false);
      } catch (err) {
        console.error('Model loading error:', err);
        setError('Failed to load pose detection model. Please refresh the page.');
        setIsLoading(false);
      }
    };

    if (isActive) {
      setupCamera();
      loadModel();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive]);

  const detectPoses = async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isActive || !isCameraReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState >= 2 && ctx) {
      try {
        // Detect poses
        const poses = await detector.estimatePoses(video);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (poses.length > 0) {
          const pose = poses[0];
          
          // Extract key points
          const keypoints = pose.keypoints;
          const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
          const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
          const nose = keypoints.find(kp => kp.name === 'nose');
          const leftEar = keypoints.find(kp => kp.name === 'left_ear');
          const rightEar = keypoints.find(kp => kp.name === 'right_ear');

          // Check if key points are detected with sufficient confidence
          const minConfidence = 0.3;
          const hasGoodDetection = leftShoulder?.score > minConfidence && 
                                  rightShoulder?.score > minConfidence && 
                                  nose?.score > minConfidence;

          if (hasGoodDetection && leftShoulder && rightShoulder && nose) {
            // Calculate metrics
            const shoulderDistance = Math.abs(rightShoulder.x - leftShoulder.x);
            const shoulderMidpoint = {
              x: (leftShoulder.x + rightShoulder.x) / 2,
              y: (leftShoulder.y + rightShoulder.y) / 2
            };
            
            const headShoulderDistance = Math.sqrt(
              Math.pow(nose.x - shoulderMidpoint.x, 2) + 
              Math.pow(nose.y - shoulderMidpoint.y, 2)
            );
            
            const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
            
            // Check if arms are raised (simple heuristic)
            const leftElbow = keypoints.find(kp => kp.name === 'left_elbow');
            const rightElbow = keypoints.find(kp => kp.name === 'right_elbow');
            const armsRaised = (leftElbow && leftElbow.y < leftShoulder.y && leftElbow.score > minConfidence) ||
                              (rightElbow && rightElbow.y < rightShoulder.y && rightElbow.score > minConfidence);

            // Calculate average confidence
            const avgConfidence = pose.keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / pose.keypoints.length;

            // Send pose data
            onPoseData({
              shoulderDistance,
              headShoulderDistance,
              headY: nose.y,
              confidence: avgConfidence,
              shoulderHeightDiff,
              armsRaised,
              postureIssues: []
            });

            // Draw pose on canvas (optional visualization)
            drawPose(ctx, pose);
          } else {
            // Low confidence detection
            onPoseData(null);
          }
        } else {
          onPoseData(null);
        }
      } catch (err) {
        console.error('Pose detection error:', err);
        onPoseData(null);
      }
    }

    // Continue detection loop
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(detectPoses);
    }
  };

  const drawPose = (ctx: CanvasRenderingContext2D, pose: poseDetection.Pose) => {
    const keypoints = pose.keypoints;
    
    // Draw keypoints
    keypoints.forEach(keypoint => {
      if (keypoint.score && keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
      }
    });

    // Draw skeleton connections
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'nose'],
      ['right_shoulder', 'nose'],
    ];

    connections.forEach(([pointA, pointB]) => {
      const kpA = keypoints.find(kp => kp.name === pointA);
      const kpB = keypoints.find(kp => kp.name === pointB);
      
      if (kpA && kpB && kpA.score && kpB.score && kpA.score > 0.3 && kpB.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    if (detector && videoRef.current && isActive && cameraPermission === 'granted' && isCameraReady) {
      detectPoses();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detector, isActive, cameraPermission, isCameraReady]);

  if (!isActive) return null;

  return (
    <div className="camera-container">
      {isLoading && (
        <div className="camera-status loading">
          <div className="spinner"></div>
          <p>Loading camera and AI model...</p>
        </div>
      )}
      
      {error && (
        <div className="camera-status error">
          <p>❌ {error}</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      )}
      
      {cameraPermission === 'denied' && (
        <div className="camera-status error">
          <p>📹 Camera access is required for posture detection</p>
          <p>Please allow camera access and refresh the page</p>
        </div>
      )}

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            display: 'block',
            opacity: 0, // Hide video preview but keep it in render tree for GPU access
            width: '100%',
            height: 'auto',
            transform: 'scaleX(-1)' // Mirror the video
          }}
          onLoadedData={async () => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              
              try {
                // Ensure video is playing and ready for GPU processing
                await videoRef.current.play();
                setIsCameraReady(true);
              } catch (error) {
                console.error('Error starting video playback:', error);
              }
            }
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0,
            display: 'block', // Always keep canvas in render tree
            opacity: 0, // Hide canvas but keep it accessible for GPU
            transform: 'scaleX(-1)' // Mirror the canvas
          }}
        />
      </div>

      <style jsx>{`
        .camera-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .camera-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .camera-status.loading {
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #3b82f6;
        }

        .camera-status.error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(59, 130, 246, 0.3);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .video-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background-color: #000;
          height: 0; /* Hide the container since we don't need preview */
        }

        video {
          width: 100%;
          height: auto;
          display: block;
        }

        canvas {
          pointer-events: none;
        }

        button {
          padding: 8px 16px;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 8px;
        }

        button:hover {
          background-color: #dc2626;
        }
      `}</style>
    </div>
  );
};