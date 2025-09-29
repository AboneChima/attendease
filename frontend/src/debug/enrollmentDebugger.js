// Frontend Enrollment Debugger
// Add this to your component to debug the enrollment process

export const enrollmentDebugger = {
    log: (step, data) => {
        console.log(`🔍 [ENROLLMENT DEBUG] ${step}:`, data);
    },
    
    error: (step, error) => {
        console.error(`❌ [ENROLLMENT ERROR] ${step}:`, error);
    },
    
    // Test network connectivity
    testConnectivity: async () => {
        console.log('🌐 Testing backend connectivity...');
        try {
            const response = await fetch('http://localhost:5000/api/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            console.log('✅ Backend connectivity test:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Backend connectivity failed:', error);
            return false;
        }
    },
    
    // Test enrollment endpoint specifically
    testEnrollmentEndpoint: async () => {
        console.log('🎯 Testing enrollment endpoint...');
        try {
            // First, create a test student
            console.log('📝 Creating test student...');
            const createStudentResponse = await fetch('http://localhost:5000/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId: 'DEBUG_TEST_' + Date.now(),
                    name: 'Debug Test Student',
                    email: 'debug@test.com',
                    course: 'Debug Course',
                    year: 1
                })
            });
            
            if (!createStudentResponse.ok) {
                console.log('⚠️ Could not create test student (might already exist)');
            }
            
            const studentData = await createStudentResponse.json();
            const testStudentId = studentData.studentId || 'DEBUG_TEST_' + Date.now();
            
            console.log('🧪 Testing face enrollment with student:', testStudentId);
            
            // Now test the enrollment endpoint
            const testDescriptor = Array.from({length: 128}, () => Math.random());
            const response = await fetch('http://localhost:5000/api/students/enroll-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId: testStudentId,
                    faceDescriptor: testDescriptor,
                    sampleCount: 1
                })
            });
            
            const result = await response.json();
            console.log('✅ Enrollment endpoint test:', {
                status: response.status,
                ok: response.ok,
                result: result
            });
            
            // Clean up - delete the test student
            try {
                await fetch(`http://localhost:5000/api/students/${testStudentId}`, {
                    method: 'DELETE'
                });
                console.log('🧹 Test student cleaned up');
            } catch (cleanupError) {
                console.log('⚠️ Could not clean up test student:', cleanupError.message);
            }
            
            return response.ok;
        } catch (error) {
            console.error('❌ Enrollment endpoint test failed:', error);
            return false;
        }
    },
    
    // Wrap the original enrollFace function
    wrapEnrollFace: (originalEnrollFace) => {
        return async (...args) => {
            console.log('🚀 [DEBUG] enrollFace called with args:', args);
            
            try {
                console.log('🔄 [DEBUG] Starting enrollment process...');
                const result = await originalEnrollFace(...args);
                console.log('✅ [DEBUG] enrollFace completed successfully:', result);
                return result;
            } catch (error) {
                console.error('❌ [DEBUG] enrollFace failed:', error);
                console.error('❌ [DEBUG] Error stack:', error.stack);
                throw error;
            }
        };
    },
    
    // Check face-api.js status
    checkFaceApiStatus: async () => {
        console.log('🤖 Checking face-api.js status...');
        try {
            // Try to import face-api.js dynamically to check if it's available
            const faceapi = await import('face-api.js');
            console.log('✅ face-api.js is loaded and available');
            
            // Check if models are loaded
            const modelsStatus = {
                tinyFaceDetector: !!faceapi.nets.tinyFaceDetector.params,
                faceLandmark68Net: !!faceapi.nets.faceLandmark68Net.params,
                faceRecognitionNet: !!faceapi.nets.faceRecognitionNet.params
            };
            
            console.log('📊 Models status:', modelsStatus);
            
            const allModelsLoaded = Object.values(modelsStatus).every(loaded => loaded);
            if (allModelsLoaded) {
                console.log('✅ All required face-api.js models are loaded');
            } else {
                console.log('⚠️ Some face-api.js models are not loaded yet');
                console.log('💡 Models may still be loading. Check the models directory at /models');
            }
            
            return { available: true, modelsLoaded: allModelsLoaded };
        } catch (error) {
            console.error('❌ face-api.js not loaded or not available:', error.message);
            return { available: false, modelsLoaded: false };
        }
    },
    
    // Check camera/video status
    checkVideoStatus: (videoElement) => {
        if (!videoElement) {
            console.error('❌ Video element not provided');
            return false;
        }
        
        console.log('📹 Video element status:', {
            readyState: videoElement.readyState,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            paused: videoElement.paused,
            ended: videoElement.ended,
            currentTime: videoElement.currentTime,
            duration: videoElement.duration
        });
        
        return videoElement.readyState >= 2; // HAVE_CURRENT_DATA
    }
};

// Auto-run basic checks when this module loads
if (typeof window !== 'undefined') {
    console.log('🔍 [ENROLLMENT DEBUGGER] Loaded');
    
    // Run connectivity test after a short delay
    setTimeout(async () => {
        enrollmentDebugger.testConnectivity();
        await enrollmentDebugger.checkFaceApiStatus();
    }, 1000);
}