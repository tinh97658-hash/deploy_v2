require('dotenv').config();
const connection = require('./src/config/database');

async function checkSchedules() {
  try {
    const [schedules] = await connection.promise().query('SELECT COUNT(*) as count FROM Schedules');
    console.log('Số lịch thi trong database:', schedules[0].count);
    
    if (schedules[0].count > 0) {
      const [activeSchedules] = await connection.promise().query(`
        SELECT id, topic_id, department_id, major_id, start, end, 
               NOW() as current_time,
               (NOW() BETWEEN start AND end) as is_active
        FROM Schedules 
        ORDER BY start DESC 
        LIMIT 5
      `);
      
      console.log('\nCác lịch thi (5 mới nhất):');
      activeSchedules.forEach((s, i) => {
        console.log(`${i+1}. ID: ${s.id}, Topic: ${s.topic_id}, Dept: ${s.department_id}, Major: ${s.major_id}`);
        console.log(`   Từ: ${s.start} -> Đến: ${s.end}`);
        console.log(`   Hiện tại: ${s.current_time}, Đang hoạt động: ${s.is_active ? 'CÓ' : 'KHÔNG'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error.message);
    process.exit(1);
  }
}

checkSchedules();
