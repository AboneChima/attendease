const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testVerificationAPI() {
    console.log('🧪 Testing verification API directly...');
    
    const photoPath = path.join(__dirname, '..', 'python-backend', 'uploads', 'photos', 'TEST0493_front_20250929_122157_a0701408.jpg');
    
    if (!fs.existsSync(photoPath)) {
        console.log('❌ Photo file not found:', photoPath);
        return;
    }
    
    console.log('✅ Photo file found, size:', fs.statSync(photoPath).size, 'bytes');
    
    try {
        const formData = new FormData();
        formData.append('student_id', 'TEST0493');
        formData.append('photo', fs.createReadStream(photoPath), {
            filename: 'test_photo.jpg',
            contentType: 'image/jpeg'
        });
        
        console.log('📤 Sending verification request...');
        
        const response = await fetch('http://localhost:5000/api/students/verify-live', {
            method: 'POST',
            body: formData
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseData = await response.json();
        console.log('📊 Response data:');
        console.log(JSON.stringify(responseData, null, 2));
        
        // Check specific fields
        console.log('\n🔍 Key response fields:');
        console.log('   - success:', responseData.success);
        console.log('   - verified:', responseData.verified);
        console.log('   - confidence:', responseData.confidence);
        console.log('   - attendanceMarked:', responseData.attendanceMarked);
        console.log('   - message:', responseData.message);
        
        if (responseData.verification) {
            console.log('\n🔍 Verification details:');
            console.log('   - verified:', responseData.verification.verified);
            console.log('   - confidence_score:', responseData.verification.confidence_score);
        }
        
    } catch (error) {
        console.error('❌ Error testing verification API:', error.message);
    }
}

testVerificationAPI().catch(console.error);