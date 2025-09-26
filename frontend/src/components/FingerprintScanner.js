import React, { useState, useEffect } from 'react';

const FingerprintScanner = ({ isScanning, onScanComplete, showSuccess, showError }) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (isScanning) {
      setScanProgress(0);
      setPulseAnimation(true);
      
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setPulseAnimation(false);
            if (onScanComplete) {
              onScanComplete();
            }
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => {
        clearInterval(interval);
        setPulseAnimation(false);
      };
    } else {
      setScanProgress(0);
      setPulseAnimation(false);
    }
  }, [isScanning, onScanComplete]);

  const getStatusColor = () => {
    if (showError) return 'text-red-500';
    if (showSuccess) return 'text-green-500';
    if (isScanning) return 'text-blue-500';
    return 'text-gray-400';
  };

  const getBackgroundColor = () => {
    if (showError) return 'bg-red-50 border-red-200';
    if (showSuccess) return 'bg-green-50 border-green-200';
    if (isScanning) return 'bg-blue-50 border-blue-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="fingerprint-scanner-container flex flex-col items-center">
      {/* Main Scanner Circle */}
      <div className={`relative w-32 h-32 rounded-full border-4 ${getBackgroundColor()} flex items-center justify-center transition-all duration-300 ${pulseAnimation ? 'animate-pulse' : ''}`}>
        
        {/* Fingerprint SVG Icon */}
        <svg 
          className={`w-16 h-16 ${getStatusColor()} transition-colors duration-300`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"/>
        </svg>

        {/* Scanning Progress Ring */}
        {isScanning && (
          <div className="absolute inset-0 rounded-full">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-200"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-blue-500"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - scanProgress / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
              />
            </svg>
          </div>
        )}

        {/* Success Checkmark */}
        {showSuccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Error X */}
        {showError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="mt-4 text-center">
        {isScanning && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-600">Scanning fingerprint...</p>
            <div className="w-32 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-100 ease-out" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">{Math.round(scanProgress)}% complete</p>
          </div>
        )}
        
        {showSuccess && (
          <p className="text-sm font-medium text-green-600">Fingerprint verified successfully!</p>
        )}
        
        {showError && (
          <p className="text-sm font-medium text-red-600">Fingerprint verification failed</p>
        )}
        
        {!isScanning && !showSuccess && !showError && (
          <p className="text-sm text-gray-500">Place your finger on the scanner</p>
        )}
      </div>

      {/* Scanning Animation Dots */}
      {isScanning && (
        <div className="flex space-x-1 mt-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      )}
    </div>
  );
};

export default FingerprintScanner;