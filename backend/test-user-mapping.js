require('dotenv').config();
const connection = require('./src/config/database');

async function checkUserMapping() {
  try {
    const [users] = await connection.promise().query(`
      SELECT u.id as user_id, u.username, s.id as student_id, s.student_code,
             c.name as class_name, m.name as major_name, d.name as dept_name
      FROM Users u
      LEFT JOIN Students s ON u.id = s.user_id
      LEFT JOIN Classes c ON s.class_id = c.id
      LEFT JOIN Majors m ON c.major_id = m.id
      LEFT JOIN Departments d ON m.department_id = d.id
      WHERE u.username = '66'
    `);
    
    console.log('Mapping user 66:', users[0]);
    
    if (users[0] && users[0].user_id) {
      const testUserId = users[0].user_id;
      
      // Test với user ID đúng
      const StudentSubjectsController = require('./src/controllers/studentSubjectsController');
      
      const mockReq = {
        params: { topicId: '1' },
        user: { 
          id: testUserId,
          username: '66',
          role: 'student' 
        }
      };

      const mockRes = {
        status: (code) => {
          console.log(`\nStatus: ${code}`);
          return mockRes;
        },
        json: (data) => {
          console.log('Response:', JSON.stringify(data, null, 2));
          return mockRes;
        }
      };

      console.log(`\n=== TEST VỚI USER ID ĐÚNG: ${testUserId} ===`);
      await StudentSubjectsController.getExamQuestions(mockReq, mockRes);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error.message);
    process.exit(1);
  }
}

checkUserMapping();
