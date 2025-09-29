const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPIHealth() {
    console.log('🏥 Testing API health...');
    
    try {
        // Test basic API endpoint
        console.log('📡 Testing basic students endpoint...');
        const studentsResponse = await fetch('http://localhost:3000/api/students');
        console.log('   Status:', studentsResponse.status);
        
        if (studentsResponse.ok) {
            const students = await studentsResponse.json();
            console.log('   ✅ Students endpoint working, found', students.length, 'students');
            
            // Look for TEST0493
            const test0493 = students.find(s => s.student_id === 'TEST0493');
            if (test0493) {
                console.log('   ✅ TEST0493 found in students list');
            } else {
                console.log('   ❌ TEST0493 not found in students list');
            }
        } else {
            console.log('   ❌ Students endpoint failed');
        }
        
        // Test specific student endpoint
        console.log('\n📡 Testing specific student endpoint...');
        const studentResponse = await fetch('http://localhost:3000/api/students/TEST0493');
        console.log('   Status:', studentResponse.status);
        
        if (studentResponse.ok) {
            const student = await studentResponse.json();
            console.log('   ✅ Student endpoint working:', student.student_id);
        } else {
            console.log('   ❌ Student endpoint failed');
        }
        
        // Test verify-live endpoint with GET (should fail but show if route exists)
        console.log('\n📡 Testing verify-live endpoint availability...');
        const verifyResponse = await fetch('http://localhost:3000/api/students/verify-live');
        console.log('   Status:', verifyResponse.status);
        console.log('   Status text:', verifyResponse.statusText);
        
        if (verifyResponse.status === 405) {
            console.log('   ✅ verify-live endpoint exists (Method Not Allowed is expected for GET)');
        } else if (verifyResponse.status === 404) {
            console.log('   ❌ verify-live endpoint not found');
        } else {
            console.log('   ⚠️ Unexpected response for verify-live endpoint');
        }
        
    } catch (error) {
        console.error('❌ Error testing API health:', error.message);
    }
}

testAPIHealth().catch(console.error);