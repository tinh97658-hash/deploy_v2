const axios = require('axios');

async function testStudentAPI() {
  try {
    // First login as a student
    console.log('=== Testing Student Login ===');
    const loginResponse = await axios.post('http://localhost:8081/api/login', {
      username: 'student1', // Assuming this user exists
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful, token received');
    
    // Now call the student subjects API
    console.log('=== Testing /api/student/subjects API ===');
    const subjectsResponse = await axios.get('http://localhost:8081/api/student/subjects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API Response Status:', subjectsResponse.status);
    console.log('API Response Data:', JSON.stringify(subjectsResponse.data, null, 2));
    
    const data = subjectsResponse.data.data;
    console.log('\n=== Analysis ===');
    console.log('Subjects count:', data.subjects ? data.subjects.length : 'null');
    console.log('Error reason:', data.metadata ? data.metadata.reason : 'no metadata');
    console.log('Student info:', data.studentInfo);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testStudentAPI();
