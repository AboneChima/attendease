const axios = require('axios');

async function testDeleteEndpoint() {
    console.log('🧪 Testing DELETE endpoint...\n');
    
    try {
        // First, let's test with TEST0493 since it's a test student
        const studentId = 'TEST0493';
        console.log(`🎯 Testing delete for student: ${studentId}`);
        
        // Test without authentication first
        console.log('\n1. Testing without authentication...');
        try {
            const response = await axios.delete(`http://localhost:5000/api/students/${studentId}`);
            console.log('✅ Delete without auth succeeded:', response.status);
        } catch (error) {
            console.log('❌ Delete without auth failed:', error.response?.status, error.response?.data?.error || error.message);
        }
        
        // Test with authentication
        console.log('\n2. Testing with authentication...');
        
        // First login to get a token
        console.log('   🔐 Logging in to get token...');
        const loginResponse = await axios.post('http://localhost:5000/api/teachers/login', {
            email: 'test@teacher.com',
            password: 'password123'
        });
        
        const token = loginResponse.data.token;
        console.log('   ✅ Login successful, token obtained');
        
        // Now test delete with token
        console.log(`   🗑️ Attempting to delete student ${studentId}...`);
        try {
            const deleteResponse = await axios.delete(`http://localhost:5000/api/students/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Delete successful!');
            console.log('   Status:', deleteResponse.status);
            console.log('   Response:', deleteResponse.data);
            
        } catch (deleteError) {
            console.log('❌ Delete failed:');
            console.log('   Status:', deleteError.response?.status);
            console.log('   Error:', deleteError.response?.data?.error || deleteError.message);
            console.log('   Full response:', deleteError.response?.data);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testDeleteEndpoint();