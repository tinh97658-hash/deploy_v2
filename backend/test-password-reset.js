const axios = require('axios');

async function testPasswordReset() {
  try {
    console.log('=== Testing Password Reset Flow ===');
    
    // Step 1: Request reset
    console.log('Step 1: Requesting password reset...');
    const resetResponse = await axios.post('http://localhost:8081/api/auth/request-reset', {
      username: '1113',
      email: 'tt2b@vmu.edu.vn'
    });
    
    console.log('Reset request response:', resetResponse.status, resetResponse.data);
    
    if (resetResponse.data.success) {
      console.log('✅ Reset request successful');
      console.log('🔔 OTP should be sent to email: tt2b@vmu.edu.vn');
      console.log('📧 Check email or backend logs for OTP');
    } else {
      console.log('❌ Reset request failed:', resetResponse.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testPasswordReset();
