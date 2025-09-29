import React, { useEffect, useState } from 'react';
import { enrollmentDebugger } from '../debug/enrollmentDebugger';

const DebugTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🔍 Debug Test Component Loaded');
    enrollmentDebugger.log('DEBUG_TEST_COMPONENT_LOADED', { timestamp: new Date().toISOString() });
  }, []);

  const runConnectivityTest = async () => {
    setIsLoading(true);
    console.log('🧪 Running connectivity test...');
    
    try {
      const healthTest = await enrollmentDebugger.testConnectivity();
      const enrollmentTest = await enrollmentDebugger.testEnrollmentEndpoint();
      
      const results = {
        health: healthTest,
        enrollment: enrollmentTest,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(results);
      console.log('✅ Test results:', results);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkFaceApiStatus = () => {
    enrollmentDebugger.checkFaceApiStatus();
  };

  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: '2px solid #007bff',
      borderRadius: '10px',
      backgroundColor: '#f8f9fa'
    }}>
      <h2 style={{ color: '#007bff', marginBottom: '20px' }}>🔍 Debug Test Panel</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Console Output:</h3>
        <p>Check the browser console (F12) for detailed debug logs.</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runConnectivityTest}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? '🔄 Testing...' : '🧪 Test Backend Connectivity'}
        </button>

        <button 
          onClick={checkFaceApiStatus}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🤖 Check Face-API Status
        </button>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div style={{
          padding: '15px',
          backgroundColor: testResults.error ? '#f8d7da' : '#d4edda',
          border: `1px solid ${testResults.error ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '5px',
          marginTop: '20px'
        }}>
          <h4>Test Results:</h4>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Open browser console (F12 → Console tab)</li>
          <li>Click "Test Backend Connectivity" to verify connection</li>
          <li>Check console for detailed debug logs</li>
          <li>Look for logs starting with "🔍 [ENROLLMENT DEBUG]"</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugTest;