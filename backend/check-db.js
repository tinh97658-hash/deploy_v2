require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDB() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    const [result] = await conn.execute('DESCRIBE Exams');
    console.log('Cấu trúc bảng Exams:');
    result.forEach(col => console.log('- ' + col.Field + ': ' + col.Type));
    
    await conn.end();
  } catch (e) {
    console.error('Lỗi:', e.message);
  }
}

checkDB();
