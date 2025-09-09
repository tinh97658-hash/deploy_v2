const mysql = require('mysql2/promise');

// Test the API endpoint that frontend calls
async function testStudentSubjectsAPI() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '123456',
    database: 'examination_db'
  });

  try {
    console.log('=== Testing Student Subjects API Response ===');
    
    // Check if there are any active schedules
    const schedules = await connection.execute(
      'SELECT COUNT(*) as count FROM Schedules WHERE NOW() BETWEEN start AND end'
    );
    console.log('Active schedules count:', schedules[0][0].count);
    
    // Get a sample student user
    const students = await connection.execute(`
      SELECT u.id, u.username, s.id as student_id
      FROM Users u 
      JOIN Students s ON u.id = s.user_id 
      LIMIT 1
    `);
    
    if (students[0].length === 0) {
      console.log('No students found in database');
      return;
    }
    
    const student = students[0][0];
    console.log('Testing with student:', student.username, '(ID:', student.id, ')');
    
    // Simulate the getStudentSubjects logic
    const studentQuery = `
      SELECT 
        u.id            AS user_id,
        u.username,
        u.email,
        u.role          AS user_role,
        u.full_name,
        s.id            AS student_id,
        s.student_code,
        s.class_id,
        c.name          AS class_name,
        m.id            AS major_id,
        m.name          AS major_name,
        d.id            AS department_id,
        d.name          AS department_name
      FROM Users u
        INNER JOIN Students   s ON s.user_id = u.id
        INNER JOIN Classes    c ON s.class_id = c.id
        INNER JOIN Majors     m ON c.major_id = m.id
        INNER JOIN Departments d ON m.department_id = d.id
      WHERE u.id = ?
    `;
    
    const studentInfo = await connection.execute(studentQuery, [student.id]);
    
    if (studentInfo[0].length === 0) {
      console.log('Student not properly linked to class/major/department');
      return;
    }
    
    const info = studentInfo[0][0];
    console.log('Student academic info:', {
      department: info.department_name,
      major: info.major_name,
      class: info.class_name
    });
    
    // Check for active schedules for this student's department/major
    const activeScheduleQuery = `
      SELECT DISTINCT s.topic_id, t.name AS topic_name, s.start, s.end
      FROM Schedules s
      INNER JOIN Topics t ON t.id = s.topic_id
      WHERE (
        (s.department_id = ? AND s.major_id = ?)
        OR (s.department_id = ? AND s.major_id IS NULL)
        OR (s.department_id IS NULL AND s.major_id IS NULL)
      )
      AND NOW() BETWEEN s.start AND s.end
    `;
    
    const scheduleRows = await connection.execute(activeScheduleQuery, [
      info.department_id, 
      info.major_id, 
      info.department_id
    ]);
    
    console.log('Active schedules for student:', scheduleRows[0].length);
    
    if (scheduleRows[0].length === 0) {
      console.log('=== API RESPONSE WHEN NO ACTIVE SCHEDULES ===');
      console.log('Response would be:');
      console.log({
        subjects: [],
        studentInfo: {
          name: info.full_name || info.username,
          studentCode: info.student_code,
          class: info.class_name,
          major: info.major_name,
          department: info.department_name
        },
        metadata: {
          reason: 'no_active_schedule',
          departmentId: info.department_id,
          majorId: info.major_id
        }
      });
      console.log('Frontend should show: "Hiện tại chưa có lịch thi nào trong hệ thống..."');
    } else {
      console.log('Active schedules found, topics would be returned');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testStudentSubjectsAPI();
