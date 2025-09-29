const { dbAdapter } = require('./config/database-adapter');

async function testFaceMatching() {
  try {
    console.log('=== Face Matching Algorithm Test ===\n');
    
    // Get all face encodings
    const [encodings] = await dbAdapter.execute(`
      SELECT 
        fe.student_id, 
        fe.face_descriptor,
        s.name
      FROM face_encodings fe
      JOIN students s ON fe.student_id = s.student_id
    `);

    console.log('Available face encodings:');
    encodings.forEach((enc, index) => {
      const descriptor = JSON.parse(enc.face_descriptor);
      console.log(`${index + 1}. ${enc.name} (${enc.student_id}): ${descriptor.length} features`);
      console.log(`   First 5 values: [${descriptor.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    });
    console.log('');

    // Test face matching between the two enrolled faces
    if (encodings.length >= 2) {
      const face1 = JSON.parse(encodings[0].face_descriptor);
      const face2 = JSON.parse(encodings[1].face_descriptor);
      
      // Calculate Euclidean distance
      let distance = 0;
      for (let i = 0; i < face1.length; i++) {
        distance += Math.pow(face1[i] - face2[i], 2);
      }
      distance = Math.sqrt(distance);
      
      console.log(`Distance between ${encodings[0].name} and ${encodings[1].name}: ${distance.toFixed(4)}`);
      console.log(`Threshold: 3.5`);
      console.log(`Would match: ${distance < 3.5 ? 'YES' : 'NO'}`);
      console.log('');
    }

    // Simulate face verification with David's face
    const davidEncoding = encodings.find(e => e.student_id === 'Student1647788');
    if (davidEncoding) {
      console.log('Testing David\'s face against all encodings:');
      const davidDescriptor = JSON.parse(davidEncoding.face_descriptor);
      
      const threshold = 3.5;
      let bestMatch = null;
      let bestDistance = Infinity;

      for (const encoding of encodings) {
        const storedDescriptor = JSON.parse(encoding.face_descriptor);
        
        // Calculate Euclidean distance
        let distance = 0;
        for (let i = 0; i < davidDescriptor.length; i++) {
          distance += Math.pow(davidDescriptor[i] - storedDescriptor[i], 2);
        }
        distance = Math.sqrt(distance);

        console.log(`  vs ${encoding.name} (${encoding.student_id}): distance = ${distance.toFixed(4)}`);

        if (distance < bestDistance && distance < threshold) {
          bestDistance = distance;
          bestMatch = {
            student_id: encoding.student_id,
            name: encoding.name,
            confidence: 1 - distance
          };
        }
      }

      console.log('\nBest match result:');
      if (bestMatch) {
        console.log(`  Matched: ${bestMatch.name} (${bestMatch.student_id})`);
        console.log(`  Confidence: ${bestMatch.confidence.toFixed(4)}`);
        console.log(`  Distance: ${bestDistance.toFixed(4)}`);
      } else {
        console.log('  No match found');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testFaceMatching();