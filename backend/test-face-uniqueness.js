const axios = require('axios');
const { dbAdapter } = require('./config/database-adapter');

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to calculate Euclidean distance between two face descriptors
function calculateFaceDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

// Create test face descriptors
const mockFaceDescriptor1 = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
const mockFaceDescriptor2 = Array.from({ length: 128 }, () => Math.random() * 2 - 1);

// Create an almost identical face descriptor (should be detected as duplicate)
const mockFaceDescriptor1Identical = mockFaceDescriptor1.map(val => val + (Math.random() * 0.001 - 0.0005));

// Create a moderately similar face descriptor
const mockFaceDescriptor1Similar = mockFaceDescriptor1.map(val => val + (Math.random() * 0.3 - 0.15));

async function testFaceUniqueness() {
  console.log('🧪 Testing Face Uniqueness Validation...');
  console.log('=' .repeat(50));
  
  // Calculate distances for reference
  const distance1to1Identical = calculateFaceDistance(mockFaceDescriptor1, mockFaceDescriptor1Identical);
  const distance1to1Similar = calculateFaceDistance(mockFaceDescriptor1, mockFaceDescriptor1Similar);
  const distance1to2 = calculateFaceDistance(mockFaceDescriptor1, mockFaceDescriptor2);
  
  console.log('\n📊 Face Descriptor Distances:');
  console.log(`   Original vs Identical: ${distance1to1Identical.toFixed(4)}`);
  console.log(`   Original vs Similar: ${distance1to1Similar.toFixed(4)}`);
  console.log(`   Original vs Different: ${distance1to2.toFixed(4)}`);
  console.log(`   Threshold: 0.8`);
  
  try {
    // Test 1: Enroll first face for STU001
    console.log('\n📝 Test 1: Enrolling face for STU001...');
    const response1 = await axios.post(`${API_BASE_URL}/students/enroll-face`, {
      studentId: 'STU001',
      faceDescriptor: mockFaceDescriptor1,
      sampleCount: 1
    });
    console.log('✅ Success:', response1.data.message);
    
    // Test 2: Try to enroll nearly identical face for STU002 (should fail)
    console.log('\n📝 Test 2: Trying to enroll nearly identical face for STU002 (should fail)...');
    try {
      await axios.post(`${API_BASE_URL}/students/enroll-face`, {
        studentId: 'STU002',
        faceDescriptor: mockFaceDescriptor1Identical,
        sampleCount: 1
      });
      console.log('❌ ERROR: Nearly identical face was not detected!');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Success: Nearly identical face correctly detected!');
        console.log('   Message:', error.response.data.message);
        console.log('   Existing Student:', error.response.data.existingStudentId);
        console.log('   Similarity:', error.response.data.similarity);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Test 3: Try to enroll similar face for STU003 (should fail)
    console.log('\n📝 Test 3: Trying to enroll similar face for STU003 (should fail)...');
    try {
      await axios.post(`${API_BASE_URL}/students/enroll-face`, {
        studentId: 'STU003',
        faceDescriptor: mockFaceDescriptor1Similar,
        sampleCount: 1
      });
      console.log('❌ ERROR: Similar face was not detected!');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Success: Similar face correctly detected!');
        console.log('   Message:', error.response.data.message);
        console.log('   Existing Student:', error.response.data.existingStudentId);
        console.log('   Similarity:', error.response.data.similarity);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Test 4: Enroll completely different face for STU004 (should succeed)
    console.log('\n📝 Test 4: Enrolling completely different face for STU004 (should succeed)...');
    const response4 = await axios.post(`${API_BASE_URL}/students/enroll-face`, {
      studentId: 'STU004',
      faceDescriptor: mockFaceDescriptor2,
      sampleCount: 1
    });
    console.log('✅ Success:', response4.data.message);
    
    // Test 5: Update existing face for STU001 (should succeed)
    console.log('\n📝 Test 5: Updating face for STU001 (should succeed)...');
    const updatedDescriptor = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    const response5 = await axios.post(`${API_BASE_URL}/students/enroll-face`, {
      studentId: 'STU001',
      faceDescriptor: updatedDescriptor,
      sampleCount: 1
    });
    console.log('✅ Success:', response5.data.message);
    
    // Verify database state
    console.log('\n📊 Database State:');
    const [records] = await dbAdapter.execute(
      'SELECT student_id, sample_count, LENGTH(face_descriptor) as descriptor_length FROM face_encodings WHERE student_id LIKE "STU%" ORDER BY student_id'
    );
    
    records.forEach(record => {
      console.log(`   ${record.student_id}: ${record.sample_count} samples, ${record.descriptor_length} chars`);
    });
    
    console.log('\n🎉 Face uniqueness validation test completed!');
    console.log('\n🔒 Expected behavior:');
    console.log('   ✅ Prevents duplicate/similar face enrollment across different students');
    console.log('   ✅ Allows updating existing face enrollment for same student');
    console.log('   ✅ Allows completely different faces for different students');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  testFaceUniqueness().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testFaceUniqueness };