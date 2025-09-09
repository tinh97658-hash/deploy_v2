const mysql = require('mysql2/promise');

async function checkDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '123456',
      database: 'examination_db'
    });

    console.log('=== KIỂM TRA DATABASE ===');
    
    // 1. Kiểm tra có Topics không
    const topics = await connection.execute('SELECT COUNT(*) as count FROM Topics');
    console.log('Số Topics trong database:', topics[0][0].count);
    
    if (topics[0][0].count > 0) {
      const topicList = await connection.execute('SELECT id, name, description FROM Topics LIMIT 10');
      console.log('Danh sách Topics:');
      topicList[0].forEach(topic => {
        console.log(`- ID: ${topic.id}, Name: ${topic.name}`);
      });
    }
    
    // 2. Kiểm tra có Questions không
    const questions = await connection.execute('SELECT COUNT(*) as count FROM Questions');
    console.log('Số Questions trong database:', questions[0][0].count);
    
    // 3. Kiểm tra có Schedules không
    const schedules = await connection.execute('SELECT COUNT(*) as count FROM Schedules');
    console.log('Số Schedules trong database:', schedules[0][0].count);
    
    // 4. Kiểm tra có Users không
    const users = await connection.execute('SELECT COUNT(*) as count FROM Users');
    console.log('Số Users trong database:', users[0][0].count);
    
    // 5. Kiểm tra cấu trúc bảng Topics
    const topicStructure = await connection.execute('DESCRIBE Topics');
    console.log('\nCấu trúc bảng Topics:');
    topicStructure[0].forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('Lỗi khi kiểm tra database:', error.message);
  }
}

checkDatabase();
