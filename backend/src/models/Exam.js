const connection = require('../config/database');

class Exam {
  static async create(studentId, topicId) {
    try {
      // Sử dụng INSERT ... ON DUPLICATE KEY UPDATE để ghi đè bản ghi cũ
      const [result] = await connection.promise().query(`
        INSERT INTO Exams (student_id, topic_id, start_time, status, attempts_count, first_attempt_date, last_attempt_date) 
        VALUES (?, ?, NOW(), 'IN_PROGRESS', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          start_time = NOW(),
          status = 'IN_PROGRESS',
          attempts_count = attempts_count + 1,
          last_attempt_date = NOW(),
          updated_at = NOW()
      `, [studentId, topicId]);
      
      // Lấy exam ID (có thể là insert mới hoặc update)
      if (result.insertId > 0) {
        return result.insertId;
      } else {
        // Trường hợp update, lấy ID từ bản ghi đã tồn tại
        const [rows] = await connection.promise().query(
          "SELECT id FROM Exams WHERE student_id = ? AND topic_id = ?",
          [studentId, topicId]
        );
        return rows[0]?.id;
      }
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getById(id) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT e.*, t.name as topic_name, t.description as topic_description,
               s.student_code, u.full_name as student_name
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        JOIN Students s ON e.student_id = s.id
        JOIN Users u ON s.user_id = u.id
        WHERE e.id = ?
      `, [id]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getByStudentAndTopic(studentId, topicId) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT e.*, t.name as topic_name
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.student_id = ? AND e.topic_id = ?
        ORDER BY e.start_time DESC
        LIMIT 1
      `, [studentId, topicId]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getByStudentId(studentId) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT e.*, t.name as topic_name, t.description as topic_description
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.student_id = ?
        ORDER BY e.start_time DESC
      `, [studentId]);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async submitExam(examId, answers, score) {
    const conn = await connection.promise();
    
    try {
      await conn.beginTransaction();

      // Lấy thông tin exam để tính duration
      const [examInfo] = await conn.query(
        "SELECT student_id, topic_id, start_time FROM Exams WHERE id = ?", 
        [examId]
      );
      
      if (examInfo.length === 0) {
        throw new Error('Exam not found');
      }
      
      const exam = examInfo[0];
      const duration = Math.ceil((new Date() - new Date(exam.start_time)) / (1000 * 60)); // minutes

      // Sử dụng INSERT ... ON DUPLICATE KEY UPDATE để ghi đè kết quả
      await conn.query(`
        INSERT INTO Exams (student_id, topic_id, start_time, end_time, score, status, duration_minutes, attempts_count, first_attempt_date, last_attempt_date) 
        VALUES (?, ?, ?, NOW(), ?, 'SUBMITTED', ?, 1, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          end_time = NOW(),
          score = VALUES(score),
          status = 'SUBMITTED',
          duration_minutes = VALUES(duration_minutes),
          attempts_count = attempts_count + 1,
          last_attempt_date = NOW(),
          updated_at = NOW()
      `, [exam.student_id, exam.topic_id, exam.start_time, score, duration, exam.start_time]);

      // Lấy exam ID sau khi insert/update
      const [finalExam] = await conn.query(
        "SELECT id FROM Exams WHERE student_id = ? AND topic_id = ?",
        [exam.student_id, exam.topic_id]
      );
      const finalExamId = finalExam[0].id;

      // Removed ExamAnswers operations - using localStorage instead
      // Only keep exam record in database

      await conn.commit();
      return finalExamId;
    } catch (error) {
      await conn.rollback();
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Removed getExamAnswers method - using localStorage instead

  static async getAllExams() {
    try {
      const [rows] = await connection.promise().query(`
        SELECT e.*, t.name as topic_name, s.student_code, u.full_name as student_name
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        JOIN Students s ON e.student_id = s.id
        JOIN Users u ON s.user_id = u.id
        ORDER BY e.start_time DESC
      `);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Exam;
