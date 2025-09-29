const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const PYTHON_API_URL = 'http://localhost:8000';

async function testFaceMatchingAccuracy() {
    console.log('=== TESTING FACE MATCHING ACCURACY ===\n');
    
    try {
        // 1. Check if Python backend is running
        console.log('1. Checking Python backend status...');
        try {
            const healthCheck = await axios.get(`${PYTHON_API_URL}/`);
            console.log(`✅ Python backend is running: ${healthCheck.data.message}`);
        } catch (error) {
            console.log('❌ Python backend is not accessible');
            console.log('Please ensure the Python backend is running on port 8000');
            return;
        }
        
        // 2. Get current enrollments
        console.log('\n2. Getting current face enrollments...');
        const enrollmentsResponse = await axios.get(`${PYTHON_API_URL}/api/face/enrollments`);
        const enrollments = enrollmentsResponse.data.enrollments;
        
        console.log(`Found ${enrollments.length} face enrollments:`);
        enrollments.forEach(enrollment => {
            console.log(`  ${enrollment.student_id}: confidence=${enrollment.face_confidence}, quality=${enrollment.photo_quality_score}`);
        });
        
        // 3. Check for duplicate enrollments
        console.log('\n3. Checking for duplicate enrollments...');
        const studentCounts = {};
        enrollments.forEach(enrollment => {
            studentCounts[enrollment.student_id] = (studentCounts[enrollment.student_id] || 0) + 1;
        });
        
        const duplicates = Object.entries(studentCounts).filter(([id, count]) => count > 1);
        if (duplicates.length > 0) {
            console.log('⚠️  WARNING: Found duplicate enrollments:');
            duplicates.forEach(([studentId, count]) => {
                console.log(`  ${studentId}: ${count} enrollments`);
            });
            console.log('This could cause matching confusion!');
        } else {
            console.log('✅ No duplicate enrollments found');
        }
        
        // 4. Test face verification with a sample image (if available)
        console.log('\n4. Testing face verification system...');
        
        // Look for sample images in uploads directory
        const uploadsDir = '../python-backend/uploads/photos';
        const absoluteUploadsDir = path.resolve(__dirname, uploadsDir);
        
        if (fs.existsSync(absoluteUploadsDir)) {
            const files = fs.readdirSync(absoluteUploadsDir);
            const imageFiles = files.filter(file => 
                file.toLowerCase().endsWith('.jpg') || 
                file.toLowerCase().endsWith('.jpeg') || 
                file.toLowerCase().endsWith('.png')
            );
            
            if (imageFiles.length > 0) {
                console.log(`Found ${imageFiles.length} sample images for testing`);
                
                // Test with the first few images
                const testImages = imageFiles.slice(0, 3);
                
                for (const imageFile of testImages) {
                    console.log(`\\n  Testing with: ${imageFile}`);
                    
                    try {
                        const imagePath = path.join(absoluteUploadsDir, imageFile);
                        const formData = new FormData();
                        formData.append('photo', fs.createReadStream(imagePath));
                        
                        const verifyResponse = await axios.post(
                            `${PYTHON_API_URL}/api/face/verify`,
                            formData,
                            {
                                headers: {
                                    ...formData.getHeaders(),
                                },
                                timeout: 10000
                            }
                        );
                        
                        const result = verifyResponse.data;
                        
                        if (result.success && result.verified) {
                            console.log(`    ✅ Matched: ${result.student_id} (confidence: ${result.confidence_score})`);
                            console.log(`    📊 Threshold used: ${result.threshold_used}`);
                            
                            // Check if the match makes sense based on filename
                            if (imageFile.includes(result.student_id)) {
                                console.log(`    ✅ Match appears correct (filename contains student ID)`);
                            } else {
                                console.log(`    ⚠️  Potential mismatch: filename doesn't contain ${result.student_id}`);
                            }
                        } else if (result.success && !result.verified) {
                            console.log(`    ❌ No match found (best similarity: ${result.best_similarity})`);
                        } else {
                            console.log(`    ❌ Verification failed: ${result.error}`);
                        }
                        
                    } catch (error) {
                        console.log(`    ❌ Error testing ${imageFile}: ${error.message}`);
                    }
                }
            } else {
                console.log('No sample images found for testing');
            }
        } else {
            console.log('Uploads directory not found');
        }
        
        // 5. Recommendations
        console.log('\\n5. RECOMMENDATIONS FOR ACCURACY:');
        
        if (duplicates.length > 0) {
            console.log('🔧 CRITICAL: Remove duplicate enrollments');
            console.log('   - This is likely causing the incorrect matches');
            console.log('   - Keep only the best quality enrollment per student');
        }
        
        console.log('🔧 Consider increasing SIMILARITY_THRESHOLD from 0.85 to 0.90+');
        console.log('   - Current threshold: 85% similarity');
        console.log('   - Recommended: 90%+ for higher accuracy');
        
        console.log('🔧 Add confidence score logging to attendance records');
        console.log('   - This will help debug future matching issues');
        
        console.log('🔧 Implement face verification logging');
        console.log('   - Log all verification attempts with confidence scores');
        console.log('   - This will help track false positives');
        
        // 6. Current system status
        console.log('\\n6. CURRENT SYSTEM STATUS:');
        console.log(`📊 Total enrollments: ${enrollments.length}`);
        console.log(`📊 Unique students: ${Object.keys(studentCounts).length}`);
        console.log(`📊 Similarity threshold: 85%`);
        console.log(`📊 Face detection confidence: 80%`);
        
        if (duplicates.length > 0) {
            console.log('\\n❌ LIKELY CAUSE OF STU04 ISSUE:');
            console.log('The duplicate enrollments for STU06 may be causing');
            console.log('cross-matching where one person\'s face matches multiple');
            console.log('enrolled identities, leading to incorrect attendance marking.');
        }
        
    } catch (error) {
        console.error('Error testing face matching accuracy:', error.message);
    }
}

testFaceMatchingAccuracy().catch(console.error);