import React, { useState, useRef } from 'react';
import './PhotoFaceVerification.css';

const PhotoFaceVerification = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    handleFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
      setVerificationResult(null);
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleVerify = async () => {
    if (!selectedFile) {
      setError('Please select a photo first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('model_name', 'Facenet512');

      const response = await fetch('http://localhost:5000/api/students/verify-photo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setVerificationResult(result.verification);
      } else {
        setError(result.details?.detail || result.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Network error. Please ensure the Node.js backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setVerificationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="photo-verification-container">
      <div className="verification-header">
        <h2>Photo Face Verification</h2>
        <p>Upload a photo to verify against enrolled faces</p>
      </div>

      <div className="verification-form">
        {/* Photo Upload Section */}
        <div className="photo-upload-section">
          <div
            className={`photo-upload-zone ${selectedFile ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="photo-preview">
                <img src={previewUrl} alt="Selected" />
                <div className="photo-overlay">
                  <span>Click to change photo</span>
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>
                <p>Click to select or drag & drop a photo</p>
                <small>Supported formats: JPG, PNG, JPEG</small>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Photo Requirements */}
        <div className="photo-requirements">
          <h4>Photo Requirements:</h4>
          <ul>
            <li>Clear, well-lit face photo</li>
            <li>Face should be clearly visible and centered</li>
            <li>No sunglasses or face coverings</li>
            <li>Supported formats: JPG, PNG, JPEG</li>
            <li>Maximum file size: 10MB</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="verify-btn"
            onClick={handleVerify}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify Face'}
          </button>
          <button
            className="clear-btn"
            onClick={clearSelection}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>

        {/* Results Section */}
        {verificationResult && (
          <div className="verification-results">
            <h3>Verification Results</h3>
            {verificationResult.matches && verificationResult.matches.length > 0 ? (
              <div className="matches-found">
                <div className="result-status success">
                  ✅ Face Matched!
                </div>
                {verificationResult.matches.map((match, index) => (
                  <div key={index} className="match-item">
                    <div className="match-info">
                      <p><strong>Student ID:</strong> {match.student_id}</p>
                      <p><strong>Confidence:</strong> {(match.confidence * 100).toFixed(2)}%</p>
                      <p><strong>Distance:</strong> {match.distance.toFixed(4)}</p>
                    </div>
                  </div>
                ))}
                <div className="verification-details">
                  <p><strong>Model:</strong> {verificationResult.model_name}</p>
                  <p><strong>Threshold:</strong> {verificationResult.threshold}</p>
                  <p><strong>Processing Time:</strong> {verificationResult.processing_time_ms}ms</p>
                </div>
              </div>
            ) : (
              <div className="no-matches">
                <div className="result-status failure">
                  ❌ No Matching Face Found
                </div>
                <p>The uploaded photo does not match any enrolled faces in the system.</p>
                <div className="verification-details">
                  <p><strong>Model:</strong> {verificationResult.model_name}</p>
                  <p><strong>Threshold:</strong> {verificationResult.threshold}</p>
                  <p><strong>Processing Time:</strong> {verificationResult.processing_time_ms}ms</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <h4>Error</h4>
            <pre>{error}</pre>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions">
          <h4>How to use:</h4>
          <ol>
            <li>Upload a clear photo of the person you want to verify</li>
            <li>Click "Verify Face" to check against enrolled faces</li>
            <li>Review the verification results</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PhotoFaceVerification;