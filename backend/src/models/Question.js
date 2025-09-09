const connection = require('../config/database');

class Question {
  static async getByTopicId(topicId) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT q.*, 
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', a.id,
                   'content', a.content,
                   'is_correct', a.is_correct
                 )
               ) as answers
        FROM Questions q
        LEFT JOIN Answers a ON q.id = a.question_id AND (a.is_active IS NULL OR a.is_active = TRUE)
        WHERE q.topic_id = ?
        GROUP BY q.id
        ORDER BY q.id
      `, [topicId]);
      
      // Parse JSON answers
      return rows.map(row => ({
        ...row,
        answers: row.answers ? JSON.parse(row.answers).filter(a => a.id !== null) : []
      }));
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getById(id) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT q.*, 
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', a.id,
                   'content', a.content,
                   'is_correct', a.is_correct
                 )
               ) as answers
        FROM Questions q
        LEFT JOIN Answers a ON q.id = a.question_id AND (a.is_active IS NULL OR a.is_active = TRUE)
        WHERE q.id = ?
        GROUP BY q.id
      `, [id]);
      
      if (rows.length === 0) return null;
      
      const question = rows[0];
      question.answers = question.answers ? JSON.parse(question.answers).filter(a => a.id !== null) : [];
      return question;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async create(topicId, content, answers) {
    const conn = await connection.promise();
    
    try {
      await conn.beginTransaction();

      // Đếm số đáp án đúng để xác định loại câu hỏi
      const correctAnswersCount = answers.filter(ans => ans.is_correct).length;
      const isMultipleChoice = correctAnswersCount > 1;

      // Tạo câu hỏi
      const [questionResult] = await conn.query(
        "INSERT INTO Questions (topic_id, content, is_multiple_choice) VALUES (?, ?, ?)",
        [topicId, content, isMultipleChoice]
      );

      const questionId = questionResult.insertId;

      // Tạo các đáp án
      for (const answer of answers) {
        await conn.query(
          "INSERT INTO Answers (question_id, content, is_correct, is_active) VALUES (?, ?, ?, TRUE)",
          [questionId, answer.content, answer.is_correct]
        );
      }

      await conn.commit();
      return questionId;
    } catch (error) {
      await conn.rollback();
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async update(id, content, answers) {
    const conn = await connection.promise();
    
    try {
      await conn.beginTransaction();

      // Đếm số đáp án đúng để xác định loại câu hỏi
      const correctAnswersCount = answers.filter(ans => ans.is_correct).length;
      const isMultipleChoice = correctAnswersCount > 1;

      // Update câu hỏi và loại câu hỏi
      await conn.query(
        "UPDATE Questions SET content = ?, is_multiple_choice = ? WHERE id =  ?",
        [content, isMultipleChoice, id]
      );

      // Lấy danh sách đáp án cũ
      const oldAnswers = await conn.query('SELECT id FROM Answers WHERE question_id = ?', [id]);
      
      // Removed ExamAnswers reference check - table deleted
      const referencedAnswers = []; // Empty since ExamAnswers doesn't exist
      
      // Xóa các đáp án không được tham chiếu
      if (oldAnswers.length > 0) {
        const safeToDelete = oldAnswers.filter(a => !referencedAnswers.includes(a.id));
        if (safeToDelete.length > 0) {
          const deleteIds = safeToDelete.map(a => a.id);
          const deleteQuery = `DELETE FROM Answers WHERE id IN (${deleteIds.map(() => '?').join(',')})`;
          await conn.query(deleteQuery, deleteIds);
        }
      }
      
      // Cập nhật các đáp án đã được tham chiếu (đánh dấu là inactive)
      if (referencedAnswers.length > 0) {
        const updateQuery = `UPDATE Answers SET is_active = FALSE WHERE id IN (${referencedAnswers.map(() => '?').join(',')})`;
        await conn.query(updateQuery, referencedAnswers);
      }

      // Tạo đáp án mới
      for (const answer of answers) {
        await conn.query(
          "INSERT INTO Answers (question_id, content, is_correct, is_active) VALUES (?, ?, ?, TRUE)",
          [id, answer.content, answer.is_correct]
        );
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async delete(id) {
    const conn = await connection.promise();
    
    try {
      await conn.beginTransaction();

      // Xóa đáp án trước
      await conn.query("DELETE FROM Answers WHERE question_id = ?", [id]);
      
      // Xóa câu hỏi
      await conn.query("DELETE FROM Questions WHERE id = ?", [id]);

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Question;
