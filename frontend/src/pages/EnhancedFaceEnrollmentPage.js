import React, { useState } from 'react';
import { ArrowLeft, User, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MultiSampleFaceEnrollment from '../components/MultiSampleFaceEnrollment';

const EnhancedFaceEnrollmentPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('input'); // input, enrollment, success, error
  const [studentId, setStudentId] = useState('');
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentIdSubmit = async (e) => {
    e.preventDefault();
    
    if (!studentId.trim()) {
      setError('Please enter a student ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify student exists
      const response = await fetch(`/api/students/${studentId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Student not found. Please check the student ID.');
        }
        throw new Error('Failed to verify student');
      }

      const studentData = await response.json();
      console.log('✅ Student verified:', studentData);
      
      setCurrentStep('enrollment');
    } catch (err) {
      console.error('❌ Student verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentComplete = (result) => {
    console.log('✅ Enrollment completed:', result);
    setEnrollmentResult(result);
    setCurrentStep('success');
  };

  const handleEnrollmentError = (err) => {
    console.error('❌ Enrollment error:', err);
    setError(err.message || 'Enrollment failed');
    setCurrentStep('error');
  };

  const handleRetry = () => {
    setError('');
    setCurrentStep('input');
    setStudentId('');
    setEnrollmentResult(null);
  };

  const handleGoBack = () => {
    if (currentStep === 'enrollment') {
      setCurrentStep('input');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="enhanced-enrollment-page">
      <style>{`
        .enhanced-enrollment-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .page-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          color: white;
        }

        .back-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          margin: 0;
        }

        .page-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin: 8px 0 0 0;
        }

        .input-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .input-header {
          margin-bottom: 32px;
        }

        .input-title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 8px;
        }

        .input-description {
          font-size: 16px;
          color: #7f8c8d;
          line-height: 1.6;
        }

        .student-form {
          max-width: 400px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 24px;
          text-align: left;
        }

        .form-label {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
        }

        .student-input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.3s ease;
          background: white;
        }

        .student-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .submit-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .success-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .success-icon {
          font-size: 64px;
          color: #4CAF50;
          margin-bottom: 24px;
        }

        .success-title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 16px;
        }

        .success-description {
          font-size: 16px;
          color: #7f8c8d;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .enrollment-details {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
          text-align: left;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 600;
          color: #495057;
        }

        .detail-value {
          color: #6c757d;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .action-button {
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .primary-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
        }

        .secondary-button {
          background: rgba(108, 117, 125, 0.1);
          color: #495057;
          border: 2px solid #dee2e6;
        }

        .action-button:hover {
          transform: translateY(-2px);
        }

        .error-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          text-align: center;
        }

        .error-icon {
          font-size: 64px;
          color: #ff6b6b;
          margin-bottom: 24px;
        }

        .error-title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 16px;
        }

        .error-description {
          font-size: 16px;
          color: #7f8c8d;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .enhanced-enrollment-page {
            padding: 16px;
          }

          .page-title {
            font-size: 24px;
          }

          .input-section,
          .success-section,
          .error-section {
            padding: 24px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="page-container">
        <div className="page-header">
          <button className="back-button" onClick={handleGoBack}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Enhanced Face Enrollment</h1>
            <p className="page-subtitle">Multi-angle face capture for improved recognition</p>
          </div>
        </div>

        {currentStep === 'input' && (
          <div className="input-section">
            <div className="input-header">
              <h2 className="input-title">Student Information</h2>
              <p className="input-description">
                Enter the student ID to begin the enhanced face enrollment process. 
                We'll capture multiple face angles for better recognition accuracy.
              </p>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            <form className="student-form" onSubmit={handleStudentIdSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="studentId">
                  Student ID
                </label>
                <input
                  id="studentId"
                  type="text"
                  className="student-input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter student ID (e.g., STU001)"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading || !studentId.trim()}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    Start Enrollment
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {currentStep === 'enrollment' && (
          <MultiSampleFaceEnrollment
            studentId={studentId}
            onEnrollmentComplete={handleEnrollmentComplete}
            onError={handleEnrollmentError}
          />
        )}

        {currentStep === 'success' && (
          <div className="success-section">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h2 className="success-title">Enrollment Successful!</h2>
            <p className="success-description">
              The face enrollment has been completed successfully. The student can now use 
              face recognition for attendance verification.
            </p>

            {enrollmentResult && (
              <div className="enrollment-details">
                <div className="detail-row">
                  <span className="detail-label">Student ID:</span>
                  <span className="detail-value">{studentId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Samples Captured:</span>
                  <span className="detail-value">{enrollmentResult.totalSamples || 3}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Session ID:</span>
                  <span className="detail-value">{enrollmentResult.sessionId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Enrollment Date:</span>
                  <span className="detail-value">
                    {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}

            <div className="action-buttons">
              <button
                className="action-button primary-button"
                onClick={() => navigate('/attendance')}
              >
                <Camera size={20} />
                Test Verification
              </button>
              <button
                className="action-button secondary-button"
                onClick={() => navigate('/')}
              >
                <User size={20} />
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {currentStep === 'error' && (
          <div className="error-section">
            <div className="error-icon">
              <AlertCircle size={64} />
            </div>
            <h2 className="error-title">Enrollment Failed</h2>
            <p className="error-description">
              {error || 'An unexpected error occurred during enrollment. Please try again.'}
            </p>

            <div className="action-buttons">
              <button
                className="action-button primary-button"
                onClick={handleRetry}
              >
                <Camera size={20} />
                Try Again
              </button>
              <button
                className="action-button secondary-button"
                onClick={() => navigate('/')}
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedFaceEnrollmentPage;