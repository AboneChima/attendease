const axios = require('axios');
const { initDatabase } = require('./config/sqlite-database');
const { dbAdapter } = require('./config/database-adapter');

async function testCompletePipeline() {
    console.log('🔍 Testing Complete Face Recognition Pipeline');
    console.log('=' .repeat(60));
    
    try {
        // Initialize database
        await initDatabase();
        await dbAdapter.initialize();
        console.log('✅ Database initialized');
        
        // Step 1: Check current database state
        console.log('\n📊 STEP 1: Current Database State');
        console.log('-'.repeat(40));
        
        const [currentEncodings] = await dbAdapter.execute(`
            SELECT 
                fe.student_id, 
                fe.face_descriptor,
                fe.sample_count,
                fe.enrollment_date,
                s.name
            FROM face_encodings fe
            JOIN students s ON fe.student_id = s.student_id
        `);
        
        console.log(`Found ${currentEncodings.length} enrolled faces:`);
        currentEncodings.forEach((encoding, index) => {
            const descriptor = JSON.parse(encoding.face_descriptor);
            console.log(`  ${index + 1}. ${encoding.name} (${encoding.student_id})`);
            console.log(`     - Descriptor length: ${descriptor.length}`);
            console.log(`     - Sample count: ${encoding.sample_count}`);
            console.log(`     - Enrolled: ${encoding.enrollment_date}`);
            console.log(`     - First 5 values: [${descriptor.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
        });
        
        // Step 2: Create test student
        console.log('\n👤 STEP 2: Creating Test Student');
        console.log('-'.repeat(40));
        
        // First, check if test student exists, if not create it
        try {
            await dbAdapter.execute(
                'INSERT OR IGNORE INTO students (student_id, name, email, phone, qr_code) VALUES (?, ?, ?, ?, ?)',
                ['TEST001', 'Test Student', 'test@example.com', '1234567890', 'QR_TEST001']
            );
            console.log('✅ Test student created/verified: TEST001');
        } catch (error) {
            console.log('⚠️ Error creating test student:', error.message);
        }
        
        // Step 3: Test enrollment with a new face descriptor
        console.log('\n📤 STEP 3: Testing Enrollment');
        console.log('-'.repeat(40));
        
        // Generate a realistic face descriptor (similar to face-api.js output)
        const testDescriptor = Array(128).fill(0).map(() => (Math.random() - 0.5) * 2); // Range: -1 to 1
        
        console.log('Generated test descriptor:');
        console.log(`  - Length: ${testDescriptor.length}`);
        console.log(`  - Min: ${Math.min(...testDescriptor).toFixed(4)}`);
        console.log(`  - Max: ${Math.max(...testDescriptor).toFixed(4)}`);
        console.log(`  - Average: ${(testDescriptor.reduce((a, b) => a + b, 0) / testDescriptor.length).toFixed(4)}`);
        console.log(`  - First 5: [${testDescriptor.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
        
        const enrollmentData = {
            studentId: 'TEST001',
            faceDescriptor: testDescriptor,
            sampleCount: 1
        };
        
        console.log('\n📡 Sending enrollment request...');
        const enrollResponse = await axios.post('http://localhost:5000/api/students/enroll-face', enrollmentData, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✅ Enrollment response: ${enrollResponse.status}`);
        console.log(`   Message: ${enrollResponse.data.message}`);
        
        // Step 4: Verify enrollment was saved correctly
        console.log('\n💾 STEP 4: Verifying Enrollment Storage');
        console.log('-'.repeat(40));
        
        const [savedEncodings] = await dbAdapter.execute(
            'SELECT face_descriptor, sample_count FROM face_encodings WHERE student_id = ?',
            ['TEST001']
        );
        
        if (savedEncodings.length === 0) {
            console.error('❌ No enrollment found in database!');
            return;
        }
        
        const savedDescriptor = JSON.parse(savedEncodings[0].face_descriptor);
        console.log('✅ Enrollment found in database:');
        console.log(`  - Saved descriptor length: ${savedDescriptor.length}`);
        console.log(`  - Sample count: ${savedEncodings[0].sample_count}`);
        console.log(`  - First 5 saved values: [${savedDescriptor.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
        
        // Compare original vs saved
        const originalFirst5 = testDescriptor.slice(0, 5);
        const savedFirst5 = savedDescriptor.slice(0, 5);
        console.log('\n🔍 Comparing original vs saved:');
        console.log(`  - Original: [${originalFirst5.map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  - Saved:    [${savedFirst5.map(v => v.toFixed(4)).join(', ')}]`);
        
        // Check if they match (accounting for normalization)
        const isExactMatch = originalFirst5.every((val, i) => Math.abs(val - savedFirst5[i]) < 0.0001);
        console.log(`  - Exact match: ${isExactMatch}`);
        
        if (!isExactMatch) {
            console.log('  ⚠️ Values don\'t match exactly - normalization was applied');
        }
        
        // Step 5: Test verification with the same descriptor
        console.log('\n🔍 STEP 5: Testing Verification (Same Descriptor)');
        console.log('-'.repeat(40));
        
        const verificationData = {
            faceDescriptor: testDescriptor
        };
        
        console.log('📡 Sending verification request with original descriptor...');
        const verifyResponse = await axios.post('http://localhost:5000/api/students/verify-face', verificationData, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✅ Verification response: ${verifyResponse.status}`);
        console.log(`   Valid: ${verifyResponse.data.valid}`);
        console.log(`   Student: ${verifyResponse.data.student ? verifyResponse.data.student.name + ' (' + verifyResponse.data.student.student_id + ')' : 'None'}`);
        console.log(`   Distance: ${verifyResponse.data.distance || 'N/A'}`);
        console.log(`   Best Distance: ${verifyResponse.data.bestDistance || 'N/A'}`);
        console.log(`   Message: ${verifyResponse.data.message || 'N/A'}`);
        
        // Step 6: Test verification with slightly modified descriptor
        console.log('\n🔍 STEP 6: Testing Verification (Slightly Modified Descriptor)');
        console.log('-'.repeat(40));
        
        // Add small noise to the descriptor
        const noisyDescriptor = testDescriptor.map(val => val + (Math.random() - 0.5) * 0.1);
        
        const noisyVerificationData = {
            faceDescriptor: noisyDescriptor
        };
        
        console.log('📡 Sending verification request with noisy descriptor...');
        const noisyVerifyResponse = await axios.post('http://localhost:5000/api/students/verify-face', noisyVerificationData, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✅ Noisy verification response: ${noisyVerifyResponse.status}`);
        console.log(`   Valid: ${noisyVerifyResponse.data.valid}`);
        console.log(`   Student: ${noisyVerifyResponse.data.student ? noisyVerifyResponse.data.student.name + ' (' + noisyVerifyResponse.data.student.student_id + ')' : 'None'}`);
        console.log(`   Distance: ${noisyVerifyResponse.data.distance || 'N/A'}`);
        console.log(`   Best Distance: ${noisyVerifyResponse.data.bestDistance || 'N/A'}`);
        
        // Step 7: Clean up test data
        console.log('\n🧹 STEP 7: Cleaning Up Test Data');
        console.log('-'.repeat(40));
        
        await dbAdapter.execute('DELETE FROM face_encodings WHERE student_id = ?', ['TEST001']);
        console.log('✅ Test data cleaned up');
        
        // Summary
        console.log('\n📋 PIPELINE TEST SUMMARY');
        console.log('=' .repeat(60));
        console.log(`✅ Enrollment: ${enrollResponse.status === 201 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Storage: ${savedEncodings.length > 0 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Exact Verification: ${verifyResponse.data.valid ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Noisy Verification: ${noisyVerifyResponse.data.valid ? 'SUCCESS' : 'FAILED'}`);
        
        if (!verifyResponse.data.valid) {
            console.log('\n❌ ISSUE IDENTIFIED: Verification failed even with exact same descriptor!');
            console.log('   This indicates a problem in the verification pipeline.');
        }
        
    } catch (error) {
        console.error('❌ Pipeline test error:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
    }
}

testCompletePipeline();