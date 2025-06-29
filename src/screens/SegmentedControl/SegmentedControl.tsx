import React, { useState, useEffect } from 'react';
import { CameraFeed } from '../../components/CameraFeed';
import { useRealPostureDetection } from '../../hooks/useRealPostureDetection';
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer';
import { assets } from '../../assets';

export const SegmentedControl = (): JSX.Element => {
  const [toleranceValue, setToleranceValue] = useState(25);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('straighty-theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });
  // Always show terms modal on each session - no localStorage persistence
  const [showTermsModal, setShowTermsModal] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const { analysis, analyzePose, resetCalibration, isCalibrating } = useRealPostureDetection(toleranceValue, soundsEnabled);
  
  const {
    isActive: isPomodoroActive,
    minutes: pomodoroMinutes,
    toggle: togglePomodoro,
    reset: resetPomodoro,
    formatTime,
    updateMinutes: updatePomodoroMinutes
  } = usePomodoroTimer(25, soundsEnabled);

  // Theme management
  useEffect(() => {
    localStorage.setItem('straighty-theme', darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleAcceptTerms = () => {
    // Note: We still save to localStorage for potential future use,
    // but we don't check it to determine if modal should show
    localStorage.setItem('straighty-terms-accepted', 'true');
    localStorage.setItem('straighty-terms-accepted-timestamp', Date.now().toString());
    setShowTermsModal(false);
  };

  const handleDeclineTerms = () => {
    window.close(); // Attempt to close tab
    // If that doesn't work, redirect away
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  };

  const getStatusMessage = () => {
    if (isCalibrating) return 'Calibrating...';
    if (analysis.status === 'No person detected') return 'No person detected';
    if (analysis.mood === 'happy') return 'Everything looks good';
    return analysis.status;
  };

  const getSubMessage = () => {
    if (isCalibrating) return 'Please maintain comfortable position while we calibrate';
    if (analysis.status === 'No person detected') return 'Please sit in front of the camera to resume monitoring';
    if (analysis.mood === 'happy') return "Posture observations are within normal range";
    if (analysis.mood === 'neutral') return "Small positioning change detected";
    return 'Multiple positioning observations detected';
  };

  const getProgressValue = () => {
    if (isCalibrating) return 75;
    if (analysis.status === 'No person detected') return 0;
    if (analysis.mood === 'happy') return 100;
    if (analysis.mood === 'neutral') return 50;
    return 25;
  };

  const getBackgroundColor = () => {
    if (analysis.status === 'No person detected') return 'var(--status-neutral)';
    if (analysis.mood === 'happy') return 'var(--status-good)';
    if (analysis.mood === 'neutral') return 'var(--status-warning)';
    return 'var(--status-alert)';
  };

  const getSlothImage = () => {
    if (isCalibrating || analysis.status === 'No person detected') return assets.slothSad;
    if (analysis.mood === 'happy') return assets.slothHappy;
    if (analysis.mood === 'neutral') return assets.slothSad;
    return assets.slothAngry;
  };

  const handleToleranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToleranceValue(Number(e.target.value));
  };

  const handleSoundsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSoundsEnabled(e.target.checked);
    
    if (e.target.checked) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.log('Audio test failed');
      }
    }
  };

  const getSensitivityDescription = () => {
    if (toleranceValue < 25) return 'Very Sensitive - Frequent alerts';
    if (toleranceValue < 50) return 'Moderate - Balanced detection';
    if (toleranceValue < 75) return 'Relaxed - Less frequent alerts';
    return 'Minimal - Only major observations';
  };

  const handleInfoClick = () => {
    setShowInfoModal(true);
  };

  const handleCloseInfoModal = () => {
    setShowInfoModal(false);
  };

  const handleVisitWebsite = () => {
    window.open('https://Straighty.app', '_blank', 'noopener,noreferrer');
  };

  const handleRateUsClick = () => {
    window.open('https://straighty.app/?page_id=232', '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Terms of Service Modal - Always shown on each session */}
      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Welcome to Straighty Demo</h2>
              <p>Please review and accept our terms for this session</p>
            </div>
            
            <div className="modal-body">
              <div className="terms-section">
                <h3>Terms of Use</h3>
                <div className="terms-text">
                  <p><strong>1. Informational Purpose Only</strong></p>
                  <p>Straighty Demo is designed for informational and awareness purposes only. This application is not a medical device and does not provide medical advice, diagnosis, or treatment.</p>
                  
                  <p><strong>2. Not Medical Advice</strong></p>
                  <p>The posture observations and feedback provided by this demo are not intended to replace professional medical advice. Always consult with a healthcare professional for medical concerns.</p>
                  
                  <p><strong>3. Camera Usage</strong></p>
                  <p>This demo uses your camera locally on your device for posture detection. No video data is transmitted or stored on external servers.</p>
                  
                  <p><strong>4. Use at Your Own Risk</strong></p>
                  <p>You use this demo application at your own risk. We are not responsible for any health issues that may arise from using this demo.</p>
                  
                  <p><strong>5. Data Privacy</strong></p>
                  <p>All processing is done locally on your device. We do not collect, store, or transmit personal data or camera footage.</p>
                  
                  <p><strong>6. Session-Based Agreement</strong></p>
                  <p>This agreement is valid for your current session only. You will be required to accept these terms each time you use the demo.</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="modal-button decline" onClick={handleDeclineTerms}>
                Decline
              </button>
              <button className="modal-button accept" onClick={handleAcceptTerms}>
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="modal-overlay">
          <div className="modal-content info-modal">
            <div className="info-modal-header">
              <div className="info-header-content">
                <h2>Welcome to Straighty!</h2>
                <img 
                  src={assets.slothHappy}
                  alt="Straighty Sloth" 
                  className="info-sloth"
                />
              </div>
            </div>
            
            <div className="info-modal-body">
              <div className="info-steps">
                <div className="info-step">
                  <span className="step-number">1.</span>
                  <div className="step-content">
                    <h4>Sit Comfortably:</h4>
                    <p>Sit straight with your shoulders back and chin up.</p>
                  </div>
                </div>

                <div className="info-step">
                  <span className="step-number">2.</span>
                  <div className="step-content">
                    <h4>Important Camera Position:</h4>
                    <p>Straighty works best with a <span className="highlight">front-facing camera</span>, like your MacBook's built-in webcam. Side angles or external cameras are not supported at the moment.</p>
                  </div>
                </div>

                <div className="info-step">
                  <span className="step-number">3.</span>
                  <div className="step-content">
                    <h4>Calibrate:</h4>
                    <p>Click the "Recalibrate" button to adjust the app to your posture.</p>
                  </div>
                </div>

                <div className="info-step">
                  <span className="step-number">4.</span>
                  <div className="step-content">
                    <h4>Monitor Your Posture:</h4>
                    <p>The app will provide real-time feedback about your sitting position through visual indicators and optional sound alerts.</p>
                  </div>
                </div>

                <div className="info-step">
                  <span className="step-number">5.</span>
                  <div className="step-content">
                    <h4>Adjust Sensitivity:</h4>
                    <p>Use the Detection Sensitivity slider to control how strict the monitoring should be.</p>
                  </div>
                </div>

                <div className="info-step">
                  <span className="step-number">6.</span>
                  <div className="step-content">
                    <h4>Focus Timer:</h4>
                    <p>Use the built-in Pomodoro timer for productive work sessions with posture monitoring.</p>
                  </div>
                </div>

                <div className="full-app-info">
                  <h4>Get the Full App</h4>
                  <p>This is a demo version. The full Straighty app includes additional features and is available for:</p>
                  <ul>
                    <li>• macOS (Available now)</li>
                    <li>• iOS (Coming soon)</li>
                    <li>• Windows (Future release)</li>
                  </ul>
                  <button className="visit-website-btn" onClick={handleVisitWebsite}>
                    Visit Straighty.app
                  </button>
                </div>
              </div>
            </div>
            
            <div className="info-modal-footer">
              <button className="modal-button ready" onClick={handleCloseInfoModal}>
                I'm Ready!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="desktop-app">
        <div className="app-container">
          {/* Header Bar */}
          <header className="top-header">
            <div className="header-left">
              <div className="logo">
                <img 
                  src={assets.slothHappy}
                  alt="Straighty Logo" 
                  className="logo-img"
                />
              </div>
              <h1 className="app-name">Straighty</h1>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="content-wrapper">
            {/* Left Panel - System Settings */}
            <aside className="left-panel">
              {/* Sound Effects Card */}
              <div className="panel-card">
                <div className="card-header">
                  <img 
                    src={assets.slothMusic}
                    alt="Sound Effects" 
                    className="card-icon-img"
                  />
                  <div className="card-info">
                    <h3 className="card-title">Sound Effects</h3>
                    <p className="card-subtitle">Audio feedback alerts</p>
                  </div>
                </div>
                <div className="card-content">
                  <label className="toggle-control">
                    <input 
                      type="checkbox" 
                      checked={soundsEnabled}
                      onChange={handleSoundsToggle}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-label">
                    {soundsEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>

              {/* Dark Mode Card */}
              <div className="panel-card">
                <div className="card-header">
                  <img 
                    src={assets.slothSettings}
                    alt="Appearance Settings" 
                    className="card-icon-img"
                  />
                  <div className="card-info">
                    <h3 className="card-title">Appearance</h3>
                    <p className="card-subtitle">Theme preference</p>
                  </div>
                </div>
                <div className="card-content">
                  <label className="toggle-control">
                    <input 
                      type="checkbox" 
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-label">
                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                  </div>
                </div>
              </div>

              {/* Detection Sensitivity Card */}
              <div className="panel-card">
                <div className="card-header">
                  <img 
                    src={assets.love}
                    alt="Detection Sensitivity" 
                    className="card-icon-img"
                  />
                  <div className="card-info">
                    <h3 className="card-title">Detection Sensitivity</h3>
                    <p className="card-subtitle">Monitoring strictness</p>
                  </div>
                </div>
                <div className="card-content">
                  <div className="slider-container">
                    <span className="slider-emoji">🟢</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={toleranceValue}
                      onChange={handleToleranceChange}
                      className="slider"
                    />
                    <span className="slider-emoji">🔴</span>
                  </div>
                  <div className="tolerance-display">
                    {toleranceValue}% - {getSensitivityDescription()}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Posture Display */}
            <main className="main-content">
              <div 
                className="posture-display"
                style={{ backgroundColor: getBackgroundColor() }}
              >
                <div className="status-message-container">
                  <h2 className="status-message">{getStatusMessage()}</h2>
                </div>
                
                <div className="sloth-container">
                  <img 
                    src={getSlothImage()}
                    alt="Sloth character" 
                    className="sloth-character"
                  />
                  {analysis.mood === 'angry' && (
                    <div className="stress-marks">⚡</div>
                  )}
                  {analysis.status === 'No person detected' && (
                    <div className="no-person-indicator">👤</div>
                  )}
                </div>

                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${analysis.mood}`}
                      style={{ width: `${getProgressValue()}%` }}
                    ></div>
                  </div>
                </div>

                <div className="sub-message-container">
                  <p className="sub-message">{getSubMessage()}</p>
                </div>

                {/* Recalibrate Button - Moved below sloth */}
                <div className="recalibrate-container">
                  <button
                    onClick={resetCalibration}
                    className="recalibrate-btn"
                    disabled={isCalibrating}
                  >
                    {isCalibrating ? 'Calibrating...' : 'Recalibrate'}
                  </button>
                </div>
              </div>

              {/* Camera Feed - Hidden but Active */}
              <div className="camera-section">
                <CameraFeed 
                  onPoseData={analyzePose}
                  isActive={cameraEnabled}
                />
              </div>
            </main>

            {/* Right Panel - Functional Features */}
            <aside className="right-panel">
              {/* Focus Timer Card */}
              <div className="panel-card">
                <div className="card-header">
                  <img 
                    src={assets.pomodoro}
                    alt="Focus Timer" 
                    className="card-icon-img"
                  />
                  <div className="card-info">
                    <h3 className="card-title">Focus Timer</h3>
                    <p className="card-subtitle">Productivity sessions with alarm</p>
                  </div>
                </div>
                <div className="card-content">
                  <div className="timer">
                    {formatTime()}
                  </div>
                  <div className="timer-controls">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={pomodoroMinutes}
                      onChange={(e) => updatePomodoroMinutes(Number(e.target.value))}
                      className="timer-slider"
                      disabled={isPomodoroActive}
                    />
                    <div className="timer-label">
                      {pomodoroMinutes} minutes
                    </div>
                  </div>
                  <div className="button-group">
                    <button 
                      className="circle-button"
                      onClick={resetPomodoro}
                      title="Reset Timer"
                    >
                      ↺
                    </button>
                    <button 
                      className="circle-button accent"
                      onClick={togglePomodoro}
                      title={isPomodoroActive ? "Pause Timer" : "Start Timer"}
                    >
                      {isPomodoroActive ? '■' : '▶'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info & Feedback Card */}
              <div className="panel-card">
                <div className="card-header">
                  <img 
                    src={assets.slothMeditation}
                    alt="Info & Feedback" 
                    className="card-icon-img"
                  />
                  <div className="card-info">
                    <h3 className="card-title">Info & Feedback</h3>
                    <p className="card-subtitle">Help us improve</p>
                  </div>
                </div>
                <div className="card-content">
                  <button 
                    className="info-button"
                    onClick={handleInfoClick}
                    title="How to use Straighty"
                  >
                    i
                  </button>
                  <button 
                    className="rate-button"
                    onClick={handleRateUsClick}
                  >
                    Rate Us
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <style jsx>{`
        :root[data-theme="dark"] {
          --bg-primary: #0f0f0f;
          --bg-secondary: #1a1a1a;
          --bg-tertiary: #262626;
          --bg-card: rgba(38, 38, 38, 0.8);
          --bg-card-hover: rgba(38, 38, 38, 1);
          --text-primary: #ffffff;
          --text-secondary: #a3a3a3;
          --text-muted: #737373;
          --border-color: rgba(64, 64, 64, 0.5);
          --accent-color: #f97316;
          --accent-hover: #ea580c;
          --status-good: #2d4a3e;
          --status-warning: #4a412d;
          --status-alert: #4a2d2d;
          --status-neutral: #2d2d2d;
        }

        :root[data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --bg-card: rgba(255, 255, 255, 0.9);
          --bg-card-hover: rgba(255, 255, 255, 1);
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;
          --border-color: rgba(200, 200, 200, 0.5);
          --accent-color: #f97316;
          --accent-hover: #ea580c;
          --status-good: #dcfce7;
          --status-warning: #fef3c7;
          --status-alert: #fee2e2;
          --status-neutral: #f3f4f6;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body, html {
          height: 100%;
          overflow-x: hidden;
        }

        .desktop-app {
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          max-width: 1800px;
          margin: 0 auto;
          width: 100%;
          padding: 0 20px;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 30px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background-color: var(--bg-card);
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .app-name {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .content-wrapper {
          display: flex;
          gap: 30px;
          flex: 1;
          min-height: 0;
        }

        .left-panel, .right-panel {
          width: 280px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex-shrink: 0;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          min-width: 0;
        }

        .posture-display {
          width: 100%;
          max-width: 600px;
          border-radius: 24px;
          padding: 40px;
          text-align: center;
          transition: background-color 0.5s ease;
          position: relative;
          margin-bottom: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
        }

        .status-message-container {
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .status-message {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
          text-align: center;
          max-width: 100%;
          word-wrap: break-word;
          hyphens: auto;
        }

        .sloth-container {
          position: relative;
          margin-bottom: 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 220px;
          flex-shrink: 0;
        }

        .sloth-character {
          width: 220px;
          height: 220px;
          object-fit: contain;
          border-radius: 50%;
          filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
          flex-shrink: 0;
        }

        .stress-marks {
          position: absolute;
          top: 20px;
          right: 60px;
          font-size: 24px;
          color: #ff4444;
          animation: pulse 1s infinite;
        }

        .no-person-indicator {
          position: absolute;
          top: 20px;
          left: 60px;
          font-size: 24px;
          opacity: 0.5;
          animation: fade 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }

        @keyframes fade {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
        }

        .progress-container {
          margin-bottom: 24px;
          width: 100%;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.5s ease, background-color 0.5s ease;
          border-radius: 4px;
        }

        .progress-fill.happy {
          background-color: #10b981;
        }

        .progress-fill.neutral {
          background-color: #f59e0b;
        }

        .progress-fill.angry {
          background-color: #ef4444;
        }

        .sub-message-container {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .sub-message {
          font-size: 18px;
          line-height: 1.5;
          max-width: 400px;
          margin: 0 auto;
          text-align: center;
          word-wrap: break-word;
          hyphens: auto;
        }

        /* Theme-specific text colors for sub-message */
        :root[data-theme="dark"] .sub-message {
          color: rgba(255, 255, 255, 0.9);
        }

        :root[data-theme="light"] .sub-message {
          color: rgba(0, 0, 0, 0.8);
        }

        .recalibrate-container {
          display: flex;
          justify-content: center;
          margin-top: auto;
        }

        .recalibrate-btn {
          padding: 14px 28px;
          background-color: var(--accent-color);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .recalibrate-btn:hover:not(:disabled) {
          background-color: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
        }

        .recalibrate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .camera-section {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .panel-card {
          background: var(--bg-card);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          transition: background-color 0.2s, transform 0.2s;
        }

        .panel-card:hover {
          background: var(--bg-card-hover);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .card-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--bg-tertiary);
        }

        .card-icon-img {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: cover;
        }

        .card-info {
          flex: 1;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .card-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .toggle-control {
          position: relative;
          width: 60px;
          height: 32px;
          cursor: pointer;
        }

        .toggle-control input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-tertiary);
          transition: 0.3s;
          border-radius: 32px;
          border: 1px solid var(--border-color);
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 24px;
          width: 24px;
          left: 3px;
          bottom: 3px;
          background-color: var(--text-primary);
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-control input:checked + .toggle-slider {
          background-color: var(--accent-color);
          border-color: var(--accent-color);
        }

        .toggle-control input:checked + .toggle-slider:before {
          transform: translateX(28px);
        }

        .toggle-label {
          font-size: 14px;
          color: var(--text-secondary);
          text-align: center;
        }

        .slider-container {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .slider-emoji {
          font-size: 16px;
        }

        .slider {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: var(--bg-tertiary);
          border-radius: 3px;
          outline: none;
          border: 1px solid var(--border-color);
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-color);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .tolerance-display {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.4;
        }

        .timer {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .timer-controls {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .timer-slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: var(--bg-tertiary);
          border-radius: 3px;
          outline: none;
          border: 1px solid var(--border-color);
        }

        .timer-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-color);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .timer-slider:disabled {
          opacity: 0.5;
        }

        .timer-slider:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }

        .timer-label {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .circle-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s;
        }

        .circle-button:hover {
          background: var(--bg-card);
          transform: scale(1.05);
        }

        .circle-button.accent {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .circle-button.accent:hover {
          background: var(--accent-hover);
          border-color: var(--accent-hover);
        }

        .info-button {
          width: 48px;
          height: 48px;
          background: var(--accent-color);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 20px;
          margin-bottom: 8px;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .info-button:hover {
          background: var(--accent-hover);
        }

        .rate-button {
          padding: 12px 24px;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .rate-button:hover {
          background: var(--accent-hover);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
          text-align: center;
          flex-shrink: 0;
        }

        .modal-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .modal-header p {
          color: var(--text-secondary);
          font-size: 16px;
        }

        .modal-body {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .terms-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 16px;
        }

        .terms-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .terms-text p {
          margin-bottom: 12px;
        }

        .terms-text strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .modal-button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }

        .modal-button.decline {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .modal-button.decline:hover {
          background: var(--bg-card);
          color: var(--text-primary);
        }

        .modal-button.accept, .modal-button.ready {
          background: var(--accent-color);
          color: white;
        }

        .modal-button.accept:hover, .modal-button.ready:hover {
          background: var(--accent-hover);
        }

        /* Info Modal Styles */
        .info-modal {
          max-width: 700px;
          max-height: 90vh;
        }

        .info-modal-header {
          padding: 32px 24px 24px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .info-header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .info-header-content h2 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .info-sloth {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        }

        .info-modal-body {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .info-steps {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .info-step {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .step-number {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent-color);
          min-width: 24px;
        }

        .step-content h4 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .step-content p {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .highlight {
          color: var(--accent-color);
          font-weight: 600;
        }

        .full-app-info {
          margin-top: 32px;
          padding: 20px;
          background: var(--bg-secondary);
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .full-app-info h4 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .full-app-info p {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .full-app-info ul {
          list-style: none;
          margin-bottom: 16px;
        }

        .full-app-info li {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .visit-website-btn {
          padding: 12px 24px;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          width: 100%;
        }

        .visit-website-btn:hover {
          background: var(--accent-hover);
        }

        .info-modal-footer {
          padding: 20px 24px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Responsive Design */
        @media (max-width: 1400px) {
          .left-panel, .right-panel {
            width: 260px;
          }
        }

        @media (max-width: 1200px) {
          .content-wrapper {
            flex-direction: column;
          }
          
          .left-panel, .right-panel {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            order: 2;
          }

          .main-content {
            order: 1;
          }
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 0 10px;
          }
          
          .top-header {
            flex-direction: column;
            gap: 20px;
            align-items: stretch;
          }
          
          .sloth-container {
            min-height: 180px;
          }
          
          .sloth-character {
            width: 180px;
            height: 180px;
          }
          
          .status-message {
            font-size: 28px;
          }
          
          .status-message-container {
            min-height: 70px;
          }
          
          .sub-message-container {
            min-height: 50px;
          }
          
          .left-panel, .right-panel {
            grid-template-columns: 1fr;
          }
          
          .modal-content, .info-modal {
            margin: 10px;
            max-height: 95vh;
            min-height: 300px;
          }
          
          .modal-footer, .info-modal-footer {
            flex-direction: column;
            padding: 16px 20px;
          }

          /* Mobile-specific button ordering */
          .modal-footer .modal-button.accept {
            order: 1;
          }

          .modal-footer .modal-button.decline {
            order: 2;
          }
          
          .modal-button {
            width: 100%;
            padding: 14px 20px;
          }

          .info-header-content {
            flex-direction: column;
            gap: 12px;
          }

          .progress-container {
            padding: 0 10px;
          }

          .recalibrate-btn {
            padding: 12px 20px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .modal-overlay {
            padding: 10px;
            align-items: flex-start;
            padding-top: 20px;
          }

          .modal-content {
            border-radius: 12px;
            max-height: 90vh;
          }

          .modal-header, .info-modal-header {
            padding: 20px 16px 16px;
          }

          .modal-body, .info-modal-body {
            padding: 16px;
          }

          .modal-footer, .info-modal-footer {
            padding: 12px 16px;
          }
        }
      `}</style>
    </>
  );
};