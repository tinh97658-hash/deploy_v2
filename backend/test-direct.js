// Test bằng cách mô phỏng request trực tiếp
const StudentSubjectsController = require('./src/controllers/studentSubjectsController');
const ResponseHelper = require('./src/utils/ResponseHelper');

// Mock request và response
const mockReq = {
  params: { topicId: '1' },
  user: { 
    id: 1, // student user ID (giả sử user 66 có ID = 1)
    username: '66',
    role: 'student' 
  }
};

const mockRes = {
  status: (code) => {
    console.log(`Status: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return mockRes;
  }
};

console.log('=== DIRECT CONTROLLER TEST ===');
console.log('Testing với sinh viên 66, topic ID 1, KHÔNG có lịch thi...\n');

StudentSubjectsController.getExamQuestions(mockReq, mockRes)
  .then(() => {
    console.log('\nTest hoàn thành');
    process.exit(0);
  })
  .catch(error => {
    console.error('Lỗi:', error.message);
    process.exit(1);
  });
