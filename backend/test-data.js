require('dotenv').config();
const connection = require('./src/config/database');

async function checkTestData() {
  try {
    // Kiểm tra sinh viên
    const [students] = await connection.promise().query(`
      SELECT s.id, s.student_code, u.username, u.full_name 
      FROM Students s 
      JOIN Users u ON s.user_id = u.id 
      LIMIT 3
    `);
    
    console.log('Sinh viên trong hệ thống:');
    students.forEach((s, i) => {
      console.log(`${i+1}. ${s.student_code} - ${s.full_name} (username: ${s.username})`);
    });
    
    // Kiểm tra topics có câu hỏi
    const [topics] = await connection.promise().query(`
      SELECT t.id, t.name, COUNT(q.id) as question_count
      FROM Topics t
      LEFT JOIN Questions q ON t.id = q.topic_id
      GROUP BY t.id, t.name
      HAVING question_count > 0
      LIMIT 3
    `);
    
    console.log('\nTopics có câu hỏi:');
    topics.forEach((t, i) => {
      console.log(`${i+1}. Topic ID: ${t.id} - ${t.name} (${t.question_count} câu hỏi)`);
    });
    
    // Test với student đầu tiên và topic đầu tiên
    if (students.length > 0 && topics.length > 0) {
      const testStudent = students[0];
      const testTopic = topics[0];
      
      console.log(`\nTest case: Sinh viên ${testStudent.student_code} làm bài Topic ${testTopic.id}`);
      console.log('URL test: POST /api/topics/' + testTopic.id + '/questions');
      console.log('Authorization: Bearer <token_cua_sinh_vien>');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error.message);
    process.exit(1);
  }
}

checkTestData();
