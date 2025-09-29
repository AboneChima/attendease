const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const PYTHON_BACKEND_URL = 'http://localhost:8000';

async function testEnrollmentFunctionality() {
    console.log('🔍 Testing Enrollment Picture Functionality\n');
    
    try {
        // Test 1: Check if backend is running
        console.log('1️⃣ Testing Backend Connectivity...');
        try {
            const backendResponse = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
            console.log('✅ Backend is running:', backendResponse.status);
        } catch (error) {
            console.log('❌ Backend connectivity failed:', error.message);
            return;
        }
        
        // Test 2: Check if Python backend is running
        console.log('\n2️⃣ Testing Python Backend Connectivity...');
        try {
            const pythonResponse = await axios.get(`${PYTHON_BACKEND_URL}/`, { timeout: 5000 });
            console.log('✅ Python backend is running:', pythonResponse.status);
            console.log('✅ Python backend message:', pythonResponse.data.message);
        } catch (error) {
            console.log('❌ Python backend connectivity failed:', error.message);
            return;
        }
        
        // Test 3: Check students in database
        console.log('\n3️⃣ Checking Available Students...');
        try {
            const studentsResponse = await axios.get(`${BACKEND_URL}/api/students`);
            const students = studentsResponse.data;
            console.log(`✅ Found ${students.length} students in database:`);
            students.forEach(student => {
                console.log(`   - ${student.student_id}: ${student.name}`);
            });
            
            if (students.length === 0) {
                console.log('❌ No students found. Cannot test enrollment.');
                return;
            }
        } catch (error) {
            console.log('❌ Failed to fetch students:', error.message);
            return;
        }
        
        // Test 4: Check photo upload directory
        console.log('\n4️⃣ Checking Photo Upload Directory...');
        const uploadsDir = path.join(__dirname, 'uploads');
        const photosDir = path.join(uploadsDir, 'photos');
        
        console.log('Upload directories:');
        console.log(`   - Main uploads: ${fs.existsSync(uploadsDir) ? '✅ Exists' : '❌ Missing'}`);
        console.log(`   - Photos folder: ${fs.existsSync(photosDir) ? '✅ Exists' : '❌ Missing'}`);
        
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            console.log(`   - Files in uploads: ${files.length}`);
            files.forEach(file => console.log(`     * ${file}`));
        }
        
        // Test 5: Check enrollment endpoints
        console.log('\n5️⃣ Testing Enrollment Endpoints...');
        
        // Test single photo enrollment endpoint
        try {
            const singlePhotoTest = await axios.post(`${BACKEND_URL}/api/students/enroll-photo`, 
                { student_id: 'TEST_ENDPOINT' }, 
                { 
                    timeout: 5000,
                    validateStatus: () => true // Accept any status code
                }
            );
            console.log(`✅ Single photo endpoint responds: ${singlePhotoTest.status}`);
        } catch (error) {
            console.log('❌ Single photo endpoint failed:', error.message);
        }
        
        // Test multi-photo enrollment endpoint
        try {
            const multiPhotoTest = await axios.post(`${BACKEND_URL}/api/students/enroll-multi-photo`, 
                { student_id: 'TEST_ENDPOINT' }, 
                { 
                    timeout: 5000,
                    validateStatus: () => true // Accept any status code
                }
            );
            console.log(`✅ Multi-photo endpoint responds: ${singlePhotoTest.status}`);
        } catch (error) {
            console.log('❌ Multi-photo endpoint failed:', error.message);
        }
        
        // Test 6: Check Python backend enrollment endpoints
        console.log('\n6️⃣ Testing Python Backend Enrollment Endpoints...');
        
        try {
            const pythonEnrollTest = await axios.post(`${PYTHON_BACKEND_URL}/api/face/enroll`, 
                { student_id: 'TEST_ENDPOINT' }, 
                { 
                    timeout: 5000,
                    validateStatus: () => true
                }
            );
            console.log(`✅ Python single enrollment endpoint responds: ${pythonEnrollTest.status}`);
        } catch (error) {
            console.log('❌ Python single enrollment endpoint failed:', error.message);
        }
        
        try {
            const pythonMultiEnrollTest = await axios.post(`${PYTHON_BACKEND_URL}/api/face/enroll-multi`, 
                { student_id: 'TEST_ENDPOINT' }, 
                { 
                    timeout: 5000,
                    validateStatus: () => true
                }
            );
            console.log(`✅ Python multi-enrollment endpoint responds: ${pythonMultiEnrollTest.status}`);
        } catch (error) {
            console.log('❌ Python multi-enrollment endpoint failed:', error.message);
        }
        
        // Test 7: Check current enrollments
        console.log('\n7️⃣ Checking Current Face Enrollments...');
        
        try {
            const enrollmentsResponse = await axios.get(`${PYTHON_BACKEND_URL}/api/face/enrollments`);
            const enrollments = enrollmentsResponse.data;
            console.log(`✅ Current enrollments: ${enrollments.total_count || 0}`);
            
            if (enrollments.enrollments && enrollments.enrollments.length > 0) {
                enrollments.enrollments.forEach(enrollment => {
                    console.log(`   - ${enrollment.student_id}: Confidence ${enrollment.face_confidence}, Quality ${enrollment.photo_quality_score}`);
                });
            }
        } catch (error) {
            console.log('❌ Failed to fetch enrollments:', error.message);
        }
        
        // Test 8: Check database face enrollment table
        console.log('\n8️⃣ Checking Database Face Enrollment Records...');
        
        try {
            const dbCheckScript = `
                const sqlite3 = require('sqlite3').verbose();
                const path = require('path');
                
                const dbPath = path.join(__dirname, 'database', 'attendance.db');
                const db = new sqlite3.Database(dbPath);
                
                db.all("SELECT student_id, face_confidence, photo_quality_score, enrollment_date, is_active FROM photo_face_enrollments ORDER BY enrollment_date DESC", (err, rows) => {
                    if (err) {
                        console.log('❌ Database query failed:', err.message);
                    } else {
                        console.log(\`✅ Database enrollments: \${rows.length}\`);
                        rows.forEach(row => {
                            console.log(\`   - \${row.student_id}: Active=\${row.is_active}, Confidence=\${row.face_confidence}, Date=\${row.enrollment_date}\`);
                        });
                    }
                    db.close();
                });
            `;
            
            // Write and execute the database check
            fs.writeFileSync(path.join(__dirname, 'temp_db_check.js'), dbCheckScript);
            const { exec } = require('child_process');
            
            exec('node temp_db_check.js', { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Database check failed:', error.message);
                } else {
                    console.log(stdout);
                }
                
                // Clean up temp file
                try {
                    fs.unlinkSync(path.join(__dirname, 'temp_db_check.js'));
                } catch (e) {}
            });
            
        } catch (error) {
            console.log('❌ Database check setup failed:', error.message);
        }
        
        console.log('\n🎯 Enrollment Functionality Test Complete!');
        console.log('\n📋 Summary:');
        console.log('   - Check the logs above for any ❌ errors');
        console.log('   - Ensure all endpoints are responding correctly');
        console.log('   - Verify photo upload directories exist');
        console.log('   - Check that enrollments are being stored properly');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testEnrollmentFunctionality();