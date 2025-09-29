import React, { useState, useRef } from 'react';
import './PhotoFaceEnrollment.css';

const PhotoFaceEnrollment = () => {
  // State for three different angle photos
  const [photos, setPhotos] = useState({
    front: { file: null, preview: null },
    leftProfile: { file: null, preview: null },
    rightProfile: { file: null, preview: null }
  });
  const [currentPhotoType, setCurrentPhotoType] = useState('front');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      const newPhotos = { ...photos };
      // Clean up previous preview URL if exists
      if (newPhotos[currentPhotoType].preview) {
        URL.revokeObjectURL(newPhotos[currentPhotoType].preview);
      }
      newPhotos[currentPhotoType] = {
        file: file,
        preview: URL.createObjectURL(file)
      };
      setPhotos(newPhotos);
      setError(null);
      setEnrollmentResult(null);
    } else {
      setError('Please select a valid image file (JPG, PNG, etc.)');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleEnrollment = async () => {
    // Check if all three photos are provided
    const hasAllPhotos = photos.front.file && photos.leftProfile.file && photos.rightProfile.file;
    if (!hasAllPhotos || !studentId.trim()) {
      setError('Please provide student ID and all three photos (front, left profile, right profile)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEnrollmentResult(null);

    try {
      const formData = new FormData();
      formData.append('student_id', studentId.trim());
      formData.append('front_photo', photos.front.file);
      formData.append('left_profile_photo', photos.leftProfile.file);
      formData.append('right_profile_photo', photos.rightProfile.file);
      formData.append('model_name', 'Facenet512'); // Default model

      const response = await fetch('http://localhost:5000/api/students/enroll-multi-photo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEnrollmentResult({
          success: true,
          message: result.message,
          enrollmentId: result.enrollment?.enrollment_id,
          faceConfidence: result.enrollment?.face_confidence,
          photoQualityScore: result.enrollment?.photo_quality_score,
          modelName: result.enrollment?.model_name,
          embeddingSize: result.enrollment?.embedding_size,
          photosProcessed: result.enrollment?.photos_processed
        });
        
        // Clear form after successful enrollment
        clearAllPhotos();
        setStudentId('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Handle different error types
        if (response.status === 409 && result.details?.error_code === 'ALREADY_ENROLLED') {
          // Student already enrolled - provide helpful message
          setError(`${result.details.error}\n\n💡 ${result.details.suggestion}`);
        } else if (result.quality_assessment) {
          // Photo quality issues
          setError(`${result.error}\n\nQuality Issues:\n${result.quality_assessment.issues.join('\n')}`);
        } else {
          // General error
          setError(result.details?.detail || result.error || 'Enrollment failed');
        }
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError('Network error. Please ensure the Node.js backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCurrentPhoto = () => {
    const newPhotos = { ...photos };
    if (newPhotos[currentPhotoType].preview) {
      URL.revokeObjectURL(newPhotos[currentPhotoType].preview);
    }
    newPhotos[currentPhotoType] = { file: null, preview: null };
    setPhotos(newPhotos);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllPhotos = () => {
    // Clean up all preview URLs
    Object.values(photos).forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setPhotos({
      front: { file: null, preview: null },
      leftProfile: { file: null, preview: null },
      rightProfile: { file: null, preview: null }
    });
    setError(null);
    setEnrollmentResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearSelection = clearCurrentPhoto;

  return (
    <div className="photo-face-enrollment">
      <div className="enrollment-header">
        <h2>📸 Multi-Angle Face Enrollment</h2>
        <p>Upload three photos from different angles for enhanced face recognition accuracy</p>
      </div>

      <div className="enrollment-form">
        {/* Student ID Input */}
        <div className="form-group">
          <label htmlFor="studentId">Student ID:</label>
          <input
            type="text"
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter student ID (e.g., STU001)"
            className="student-id-input"
            disabled={isLoading}
          />
        </div>

        {/* Photo Type Selector */}
        <div className="photo-type-selector">
          <h3>Select Photo Type to Upload:</h3>
          <div className="photo-type-buttons">
            <button
              type="button"
              className={`photo-type-btn ${currentPhotoType === 'front' ? 'active' : ''}`}
              onClick={() => setCurrentPhotoType('front')}
              disabled={isLoading}
            >
              📷 Front View
              {photos.front.file && <span className="check-mark">✓</span>}
            </button>
            <button
              type="button"
              className={`photo-type-btn ${currentPhotoType === 'leftProfile' ? 'active' : ''}`}
              onClick={() => setCurrentPhotoType('leftProfile')}
              disabled={isLoading}
            >
              👈 Left Profile
              {photos.leftProfile.file && <span className="check-mark">✓</span>}
            </button>
            <button
              type="button"
              className={`photo-type-btn ${currentPhotoType === 'rightProfile' ? 'active' : ''}`}
              onClick={() => setCurrentPhotoType('rightProfile')}
              disabled={isLoading}
            >
              👉 Right Profile
              {photos.rightProfile.file && <span className="check-mark">✓</span>}
            </button>
          </div>
        </div>

        {/* Current Photo Upload Area */}
        <div className="photo-upload-section">
          <h4>
            {currentPhotoType === 'front' && '📷 Upload Front View Photo'}
            {currentPhotoType === 'leftProfile' && '👈 Upload Left Profile Photo'}
            {currentPhotoType === 'rightProfile' && '👉 Upload Right Profile Photo'}
          </h4>
          <div
            className={`photo-drop-zone ${dragActive ? 'drag-active' : ''} ${photos[currentPhotoType].file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {photos[currentPhotoType].preview ? (
              <div className="photo-preview">
                <img src={photos[currentPhotoType].preview} alt={`${currentPhotoType} photo`} className="preview-image" />
                <div className="photo-info">
                  <p className="file-name">{photos[currentPhotoType].file.name}</p>
                  <p className="file-size">{(photos[currentPhotoType].file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  className="clear-photo-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCurrentPhoto();
                  }}
                  disabled={isLoading}
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">
                  {currentPhotoType === 'front' && '📷'}
                  {currentPhotoType === 'leftProfile' && '👈'}
                  {currentPhotoType === 'rightProfile' && '👉'}
                </div>
                <h3>
                  {currentPhotoType === 'front' && 'Upload Front View Photo'}
                  {currentPhotoType === 'leftProfile' && 'Upload Left Profile Photo'}
                  {currentPhotoType === 'rightProfile' && 'Upload Right Profile Photo'}
                </h3>
                <p>Drag and drop your photo here, or click to browse</p>
                <div className="upload-requirements">
                  <h4>Photo Requirements:</h4>
                  <ul>
                    <li>Clear, well-lit photo</li>
                    <li>Face should be clearly visible and centered</li>
                    <li>No sunglasses or face coverings</li>
                    <li>Neutral expression preferred</li>
                    <li>JPG, PNG, or similar format</li>
                    <li>Minimum 400x400 pixels</li>
                    {currentPhotoType === 'front' && <li><strong>Face directly towards camera</strong></li>}
                    {currentPhotoType === 'leftProfile' && <li><strong>Face turned 90° to the left</strong></li>}
                    {currentPhotoType === 'rightProfile' && <li><strong>Face turned 90° to the right</strong></li>}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden-file-input"
            disabled={isLoading}
          />
        </div>

        {/* Photo Progress Indicator */}
        <div className="photo-progress">
          <h4>Enrollment Progress:</h4>
          <div className="progress-indicators">
            <div className={`progress-item ${photos.front.file ? 'completed' : ''}`}>
              📷 Front View {photos.front.file && '✓'}
            </div>
            <div className={`progress-item ${photos.leftProfile.file ? 'completed' : ''}`}>
              👈 Left Profile {photos.leftProfile.file && '✓'}
            </div>
            <div className={`progress-item ${photos.rightProfile.file ? 'completed' : ''}`}>
              👉 Right Profile {photos.rightProfile.file && '✓'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={handleEnrollment}
            disabled={!(photos.front.file && photos.leftProfile.file && photos.rightProfile.file) || !studentId.trim() || isLoading}
            className="enroll-btn"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Processing 3 Photos...
              </>
            ) : (
              '🔐 Enroll Student (3 Photos)'
            )}
          </button>

          {(photos.front.file || photos.leftProfile.file || photos.rightProfile.file || studentId) && (
            <button
              onClick={() => {
                clearAllPhotos();
                setStudentId('');
              }}
              disabled={isLoading}
              className="clear-btn"
            >
              🗑️ Clear All Photos
            </button>
          )}
        </div>

        {/* Results and Errors */}
        {error && (
          <div className="error-message">
            <h4>❌ Enrollment Failed</h4>
            <pre>{error}</pre>
          </div>
        )}

        {enrollmentResult && enrollmentResult.success && (
          <div className="success-message">
            <h4>✅ Multi-Angle Enrollment Successful!</h4>
            <div className="enrollment-details">
              <p><strong>Message:</strong> {enrollmentResult.message}</p>
              <p><strong>Enrollment ID:</strong> {enrollmentResult.enrollmentId}</p>
              <p><strong>Photos Processed:</strong> {enrollmentResult.photosProcessed || 3} angles</p>
              <p><strong>Average Face Confidence:</strong> {(enrollmentResult.faceConfidence * 100).toFixed(1)}%</p>
              <p><strong>Average Photo Quality:</strong> {(enrollmentResult.photoQualityScore * 100).toFixed(1)}%</p>
              <p><strong>Model Used:</strong> {enrollmentResult.modelName}</p>
              <p><strong>Embedding Size:</strong> {enrollmentResult.embeddingSize} dimensions</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="enrollment-instructions">
        <h3>📋 Multi-Angle Enrollment Instructions</h3>
        <ol>
          <li>Enter the student's unique ID</li>
          <li><strong>Upload Front View Photo:</strong> Face directly towards camera</li>
          <li><strong>Upload Left Profile Photo:</strong> Face turned 90° to the left</li>
          <li><strong>Upload Right Profile Photo:</strong> Face turned 90° to the right</li>
          <li>Ensure all photos meet quality requirements</li>
          <li>Click "Enroll Student (3 Photos)" to process all angles</li>
          <li>Wait for confirmation of successful enrollment</li>
        </ol>
        
        <div className="tech-info">
          <h4>🔬 Enhanced Technical Features</h4>
          <ul>
            <li>Multi-angle face recognition for superior accuracy</li>
            <li>Uses DeepFace with Facenet512 model</li>
            <li>Automatic photo quality assessment for all angles</li>
            <li>Face detection confidence scoring</li>
            <li>Multiple embedding storage for robust verification</li>
            <li>Enhanced matching against 3 reference points</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhotoFaceEnrollment;