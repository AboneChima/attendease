const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Face Recognition with Actual Photos');
console.log('==============================================');

const PYTHON_API_URL = 'http://localhost:8000';
const PHOTOS_DIR = path.join(__dirname, '..', 'python-backend', 'uploads', 'photos');

// Test photos for STU04 and STU06
const testPhotos = [
    {
        student: 'STU04 (CHIDUBEM)',
        photos: [
            'STU04_20250928_202207_0a65b99f.jpg',
            'STU04_20250928_203459_f8c8ae3a.jpg'
        ]
    },
    {
        student: 'STU06 (CHIMA - YOU)',
        photos: [
            'STU06_20250928_222312_0a65b99f.jpg',
            'STU06_front_20250929_074349_a0701408.jpg',
            'STU06_left_profile_20250929_074352_4e04e274.jpg',
            'STU06_right_profile_20250929_074354_39fff0bd.jpg'
        ]
    }
];

async function testFaceVerification(photoPath, description) {
    try {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`📸 Photo: ${photoPath}`);
        
        const fullPath = path.join(PHOTOS_DIR, photoPath);
        
        if (!fs.existsSync(fullPath)) {
            console.log('❌ Photo file not found');
            return;
        }
        
        const formData = new FormData();
        formData.append('photo', fs.createReadStream(fullPath));
        
        const response = await axios.post(`${PYTHON_API_URL}/api/face/verify`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000
        });
        
        console.log('✅ Verification Response:');
        console.log(`   🎯 Match Found: ${response.data.match_found}`);
        if (response.data.match_found) {
            console.log(`   👤 Matched Student: ${response.data.student_id}`);
            console.log(`   📊 Confidence: ${response.data.confidence}`);
            console.log(`   🎭 Face ID: ${response.data.face_id}`);
        }
        console.log(`   ⚠️ Message: ${response.data.message}`);
        
        return response.data;
        
    } catch (error) {
        console.log('❌ Error during verification:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        return null;
    }
}

async function runTests() {
    console.log('\n🚨 CRITICAL ISSUE INVESTIGATION:');
    console.log('User reports: "I verified my face but Chidubem was marked present instead"');
    console.log('\n📋 Current Database Status:');
    console.log('   - STU06 (CHIMA): not_yet_here');
    console.log('   - STU04 (CHIDUBEM): present (marked via deepface at 07:53:29)');
    console.log('\n🎭 Active Face Enrollments:');
    console.log('   - STU06: STU06_left_profile_20250929_074352_4e04e274.jpg');
    console.log('   - STU04: STU04_20250928_203459_f8c8ae3a.jpg');
    
    console.log('\n🔍 TESTING ALL PHOTOS:');
    console.log('======================');
    
    for (const studentGroup of testPhotos) {
        console.log(`\n👤 ${studentGroup.student}:`);
        console.log('─'.repeat(50));
        
        for (const photo of studentGroup.photos) {
            await testFaceVerification(photo, `${studentGroup.student} - ${photo}`);
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log('\n🔍 ANALYSIS:');
    console.log('============');
    console.log('Look for patterns in the results:');
    console.log('1. Does STU06\'s photo match STU04 in the database?');
    console.log('2. Does STU04\'s photo match STU06 in the database?');
    console.log('3. Are there duplicate photos with same hash?');
    console.log('4. Which photo is actually enrolled for which student?');
    console.log('\nThis will help identify if photos were enrolled incorrectly!');
}

// Start the tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
});