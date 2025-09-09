require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:8081/api';

async function testScheduleCheck() {
  try {
    console.log('=== TEST KIỂM TRA LỊCH THI ===\n');
    
    // 1. Đăng nhập sinh viên
    console.log('1. Đăng nhập sinh viên...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: '66',  // từ data ở trên
      password: '123456'  // thử password mặc định
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Đăng nhập thành công');
      const token = loginResponse.data.data.token;
      
      // 2. Thử truy cập topic không có lịch thi
      console.log('\n2. Thử truy cập topic không có lịch thi...');
      
      try {
        const topicResponse = await axios.get(`${BASE_URL}/topics/1/exam-questions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('❌ LỖI: Sinh viên vẫn có thể truy cập topic!');
        console.log('Response:', topicResponse.data);
        
      } catch (error) {
        if (error.response && error.response.status === 403) {
          console.log('✅ ĐÚNG: Sinh viên bị chặn truy cập (403)');
          console.log('Message:', error.response.data.message);
        } else {
          console.log('❓ Lỗi khác:', error.response?.data || error.message);
        }
      }
      
    } else {
      console.log('❌ Đăng nhập thất bại:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.error('Lỗi test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testScheduleCheck();
