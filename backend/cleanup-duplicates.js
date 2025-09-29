const axios = require('axios');

async function cleanupDuplicateEnrollments() {
    console.log('🧹 Cleaning up duplicate enrollments...');
    console.log('=====================================');

    try {
        // 1. Get current enrollments
        console.log('\n📋 Getting current enrollments...');
        const response = await axios.get('http://localhost:8000/api/face/enrollments');
        const enrollments = response.data.enrollments;
        
        console.log(`Found ${enrollments.length} total enrollments`);

        // 2. Group by student_id
        const groupedEnrollments = {};
        enrollments.forEach(enrollment => {
            if (!groupedEnrollments[enrollment.student_id]) {
                groupedEnrollments[enrollment.student_id] = [];
            }
            groupedEnrollments[enrollment.student_id].push(enrollment);
        });

        // 3. Find duplicates and select best quality
        for (const [studentId, studentEnrollments] of Object.entries(groupedEnrollments)) {
            if (studentEnrollments.length > 1) {
                console.log(`\n🔍 Found ${studentEnrollments.length} enrollments for ${studentId}`);
                
                // Sort by photo quality (highest first)
                studentEnrollments.sort((a, b) => b.photo_quality_score - a.photo_quality_score);
                
                console.log('   Enrollments sorted by quality:');
                studentEnrollments.forEach((enrollment, index) => {
                    console.log(`   ${index + 1}. Quality: ${enrollment.photo_quality_score}, Confidence: ${enrollment.face_confidence}, Date: ${enrollment.enrollment_date}`);
                });

                // Keep the best quality enrollment, remove others
                const bestEnrollment = studentEnrollments[0];
                const toRemove = studentEnrollments.slice(1);

                console.log(`   ✅ Keeping best quality enrollment (${bestEnrollment.photo_quality_score})`);
                console.log(`   🗑️ Removing ${toRemove.length} duplicate(s)`);

                // Remove duplicates via Python backend
                for (const enrollment of toRemove) {
                    try {
                        console.log(`   🗑️ Removing enrollment from ${enrollment.enrollment_date}...`);
                        
                        // Call Python backend to remove specific enrollment
                        // Note: We'll need to implement this endpoint or use a direct database approach
                        const deleteResponse = await axios.delete(`http://localhost:8000/api/face/enrollment/${studentId}`, {
                            data: {
                                enrollment_date: enrollment.enrollment_date,
                                photo_quality_score: enrollment.photo_quality_score
                            }
                        });
                        
                        if (deleteResponse.data.success) {
                            console.log(`   ✅ Successfully removed duplicate enrollment`);
                        } else {
                            console.log(`   ❌ Failed to remove enrollment: ${deleteResponse.data.message}`);
                        }
                    } catch (error) {
                        console.log(`   ❌ Error removing enrollment: ${error.message}`);
                        
                        // If the delete endpoint doesn't exist, we'll need to use a different approach
                        if (error.response && error.response.status === 404) {
                            console.log(`   ℹ️ Delete endpoint not available. Will need manual cleanup.`);
                            console.log(`   📝 Manual cleanup needed for: ${studentId} - ${enrollment.enrollment_date}`);
                        }
                    }
                }
            } else {
                console.log(`✅ ${studentId}: Single enrollment (no duplicates)`);
            }
        }

        // 4. Verify cleanup
        console.log('\n🔍 Verifying cleanup...');
        const verifyResponse = await axios.get('http://localhost:8000/api/face/enrollments');
        const cleanedEnrollments = verifyResponse.data.enrollments;
        
        console.log(`\n📊 Final enrollment count: ${cleanedEnrollments.length}`);
        cleanedEnrollments.forEach((enrollment, index) => {
            console.log(`   ${index + 1}. ${enrollment.student_id} - Quality: ${enrollment.photo_quality_score}, Date: ${enrollment.enrollment_date}`);
        });

        // Check for remaining duplicates
        const finalCounts = {};
        cleanedEnrollments.forEach(enrollment => {
            finalCounts[enrollment.student_id] = (finalCounts[enrollment.student_id] || 0) + 1;
        });

        const remainingDuplicates = Object.entries(finalCounts).filter(([studentId, count]) => count > 1);
        if (remainingDuplicates.length === 0) {
            console.log('\n✅ All duplicates successfully removed!');
        } else {
            console.log('\n⚠️ Some duplicates remain:');
            remainingDuplicates.forEach(([studentId, count]) => {
                console.log(`   ${studentId}: ${count} enrollments`);
            });
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

cleanupDuplicateEnrollments();