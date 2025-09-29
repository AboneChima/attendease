const axios = require('axios');

console.log('🔍 Checking Python Backend Face Enrollments');
console.log('==========================================');

async function checkEnrollments() {
    try {
        const response = await axios.get('http://localhost:8000/api/face/enrollments');
        
        console.log('✅ Python Backend Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.enrollments) {
            console.log('\n📋 Active Face Enrollments in Python Backend:');
            response.data.enrollments.forEach((enrollment, index) => {
                console.log(`\n🎭 Enrollment #${index + 1}:`);
                console.log(`   👤 Student ID: ${enrollment.student_id}`);
                console.log(`   📊 Face Confidence: ${enrollment.face_confidence}`);
                console.log(`   🎯 Photo Quality: ${enrollment.photo_quality_score}`);
                console.log(`   🤖 Model: ${enrollment.model_name}`);
                console.log(`   📅 Enrolled: ${enrollment.enrollment_date}`);
                console.log(`   ✅ Active: ${enrollment.is_active}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking enrollments:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

checkEnrollments();