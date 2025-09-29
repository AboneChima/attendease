const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const PYTHON_BACKEND_URL = 'http://localhost:8000';

async function testFaceVerificationDetailed() {
    console.log('🔍 Detailed Face Verification Analysis');
    console.log('=====================================');

    try {
        // 1. Get current enrollments from Python backend
        console.log('\n📋 Step 1: Getting current enrollments...');
        console.log(`🔗 Connecting to: ${PYTHON_BACKEND_URL}/api/face/enrollments`);
        
        const enrollmentsResponse = await axios.get(`${PYTHON_BACKEND_URL}/api/face/enrollments`, {
            timeout: 10000
        });
        console.log('✅ Current enrollments:', JSON.stringify(enrollmentsResponse.data, null, 2));

        // 2. Test verification with the exact enrolled photos
        console.log('\n🧪 Step 2: Testing verification with enrolled photos...');
        
        const photosDir = path.join(__dirname, '..', 'python-backend', 'uploads', 'photos');
        
        // Get STU04 and STU06 photos
        const allPhotos = fs.readdirSync(photosDir);
        const stu04Photos = allPhotos.filter(photo => photo.startsWith('STU04_'));
        const stu06Photos = allPhotos.filter(photo => photo.startsWith('STU06_'));
        
        console.log(`📸 Found ${stu04Photos.length} STU04 photos:`, stu04Photos);
        console.log(`📸 Found ${stu06Photos.length} STU06 photos:`, stu06Photos);

        // Test the most recent photos for each student
        const latestSTU04 = stu04Photos.sort().pop();
        const latestSTU06 = stu06Photos.sort().pop();

        if (latestSTU04) {
            console.log(`\n🔬 Testing latest STU04 photo: ${latestSTU04}`);
            await testPhotoVerification(path.join(photosDir, latestSTU04), 'STU04');
        }

        if (latestSTU06) {
            console.log(`\n🔬 Testing latest STU06 photo: ${latestSTU06}`);
            await testPhotoVerification(path.join(photosDir, latestSTU06), 'STU06');
        }

        // 3. Test with photos that have the suspicious identical hash
        console.log('\n🚨 Step 3: Testing photos with identical hash suffix...');
        const suspiciousPhotos = allPhotos.filter(photo => photo.includes('0a65b99f'));
        console.log('🔍 Photos with identical hash suffix:', suspiciousPhotos);

        for (const photo of suspiciousPhotos) {
            console.log(`\n🧪 Testing suspicious photo: ${photo}`);
            await testPhotoVerification(path.join(photosDir, photo), photo.startsWith('STU04') ? 'STU04' : 'STU06');
        }

        // 4. Get face embeddings for comparison
        console.log('\n🧬 Step 4: Getting face embeddings...');
        await getFaceEmbeddings();

    } catch (error) {
        console.error('❌ Error in detailed verification test:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        if (error.code) {
            console.error('Error code:', error.code);
        }
        console.error('Full error:', error);
    }
}

async function testPhotoVerification(photoPath, expectedStudent) {
    try {
        if (!fs.existsSync(photoPath)) {
            console.log(`❌ Photo not found: ${photoPath}`);
            return;
        }

        const formData = new FormData();
        formData.append('photo', fs.createReadStream(photoPath));

        const response = await axios.post(`${PYTHON_BACKEND_URL}/api/face/verify`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        console.log(`📊 Verification result for ${path.basename(photoPath)}:`);
        console.log(`   Expected: ${expectedStudent}`);
        console.log(`   Result:`, JSON.stringify(response.data, null, 2));

        if (response.data.student_id && response.data.student_id !== expectedStudent) {
            console.log(`🚨 MISMATCH DETECTED! Photo ${path.basename(photoPath)} expected ${expectedStudent} but got ${response.data.student_id}`);
        }

    } catch (error) {
        console.error(`❌ Error verifying ${path.basename(photoPath)}:`, error.response?.data || error.message);
    }
}

async function getFaceEmbeddings() {
    try {
        const response = await axios.get(`${PYTHON_BACKEND_URL}/api/face/embeddings`);
        console.log('🧬 Face embeddings summary:');
        
        if (response.data.embeddings) {
            for (const [studentId, embedding] of Object.entries(response.data.embeddings)) {
                console.log(`   ${studentId}: ${embedding.length} dimensions, first 5 values: [${embedding.slice(0, 5).join(', ')}...]`);
            }
        } else {
            console.log('   No embeddings data available');
        }
    } catch (error) {
        console.log('ℹ️ Embeddings endpoint not available:', error.response?.status || error.message);
    }
}

// Run the test
testFaceVerificationDetailed();