const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PYTHON_BACKEND_URL = 'http://localhost:8000';

async function testFinalVerification() {
    console.log('🎯 Final Face Verification Test');
    console.log('==============================\n');

    try {
        // Test with the uploaded photos in the uploads directory
        const uploadsDir = path.join(__dirname, 'uploads');
        const photoFiles = fs.readdirSync(uploadsDir).filter(file => file.endsWith('.jpg'));
        
        console.log(`📸 Found ${photoFiles.length} photos to test:`);
        photoFiles.forEach(file => console.log(`   ${file}`));
        
        if (photoFiles.length === 0) {
            console.log('❌ No photos found to test');
            return;
        }

        // Test each photo
        for (const photoFile of photoFiles) {
            console.log(`\n🔬 Testing photo: ${photoFile}`);
            
            const photoPath = path.join(uploadsDir, photoFile);
            const photoBuffer = fs.readFileSync(photoPath);
            
            try {
                const formData = new FormData();
                const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
                formData.append('photo', blob, photoFile);

                const response = await axios.post(`${PYTHON_BACKEND_URL}/api/face/verify`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: 30000
                });

                console.log(`📊 Verification result:`);
                console.log(`   Verified: ${response.data.verified}`);
                if (response.data.verified) {
                    console.log(`   ✅ Student ID: ${response.data.student_id}`);
                    console.log(`   📈 Confidence: ${response.data.confidence_score}`);
                } else {
                    console.log(`   ❌ ${response.data.message}`);
                    console.log(`   📉 Best similarity: ${response.data.best_similarity}`);
                }
                
            } catch (error) {
                console.log(`❌ Verification failed: ${error.response?.data?.detail || error.message}`);
            }
        }

        // Show current enrollments
        console.log('\n📋 Current Python backend enrollments:');
        try {
            const enrollResponse = await axios.get(`${PYTHON_BACKEND_URL}/api/face/enrollments`);
            console.log(`Total: ${enrollResponse.data.total_count}`);
            enrollResponse.data.enrollments.forEach(enrollment => {
                console.log(`   ${enrollment.student_id}: confidence=${enrollment.face_confidence}, quality=${enrollment.photo_quality_score}`);
            });
        } catch (error) {
            console.log('❌ Failed to get enrollments:', error.message);
        }

        console.log('\n🎉 Final verification test completed!');

    } catch (error) {
        console.error('❌ Error in final verification test:', error.message);
    }
}

testFinalVerification();