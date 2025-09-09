const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '123456',
    database: 'examination_db'
  });

  try {
    console.log('=== Checking Users in Database ===');
    
    const users = await connection.execute('SELECT id, username, role FROM Users LIMIT 10');
    console.log('Users found:', users[0]);
    
    // Check for students specifically
    const students = await connection.execute(`
      SELECT u.id, u.username, u.role, s.student_code 
      FROM Users u 
      JOIN Students s ON u.id = s.user_id 
      LIMIT 5
    `);
    console.log('Students found:', students[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkUsers();
