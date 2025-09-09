const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');
const CacheService = require('../services/CacheService');

class ExamOptimizationService {
  // Biến static cho cả class để tránh lỗi undefined
  static useUserIdFallback = false;
  
  /**
   * Tạo pool câu hỏi random với Redis cache
   */
  static async generateRandomQuestionPool(topicId, questionCount = null) {
    try {
      // Kiểm tra cache trước
  const cacheKey = `topic_questions_${topicId}_${questionCount || 'all'}`;
  // CacheService.getQuestionPool hiện nhận topicId như key logic đơn giản; ta chuyển sang dùng key thống nhất
  const cachedQuestions = await CacheService.getQuestionPool(cacheKey);
      
      if (cachedQuestions) {
        console.log(`Cache HIT: Using cached question pool for topic ${topicId}`);
        return cachedQuestions;
      }
      
      console.log(`Cache MISS: Generating new question pool for topic ${topicId}`);
      
      // Lấy question_count từ Topics để giới hạn nếu cần
      const topicMeta = await DatabaseService.execute('SELECT question_count FROM Topics WHERE id = ?', [topicId]);
      const configuredCount = topicMeta.length ? topicMeta[0].question_count : null;
      // Lấy tất cả ID câu hỏi của topic
      const allQuestionIds = await DatabaseService.execute(
        'SELECT id FROM Questions WHERE topic_id = ? ORDER BY id ASC',
        [topicId]
      );
      
      if (!allQuestionIds.length) return [];
      
      // Shuffle array bằng Fisher-Yates algorithm
      const shuffled = [...allQuestionIds];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Lấy số lượng câu hỏi cần thiết
  const limit = questionCount || configuredCount || null;
  const selectedIds = limit ? shuffled.slice(0, limit) : shuffled;
  console.log(`[ExamOptimization] topic ${topicId} totalQuestions=${allQuestionIds.length}, configured=${configuredCount}, requested=${questionCount}, used=${selectedIds.length}`);
      
      // Lấy full data câu hỏi theo thứ tự đã random
      const questionIdsString = selectedIds.map(q => q.id).join(',');
      const questionsQuery = `
        SELECT q.id, q.content as question, q.is_multiple_choice
        FROM Questions q
        WHERE q.id IN (${questionIdsString})
        ORDER BY FIELD(q.id, ${questionIdsString})
      `;
      
      const questions = await DatabaseService.execute(questionsQuery);
      
      // Cache kết quả với TTL 1 hour
  await CacheService.cacheQuestionPool(cacheKey, questions);
      
      return questions;
    } catch (error) {
      console.error('Error generating random question pool:', error);
      throw error;
    }
  }

  /**
   * Tạo hoặc load exam session hiện có
   */
  static async createExamSession(studentId, topicId, userId = null) {
    try {
      // Kiểm tra exam hiện tại với student_id
      const existing = await DatabaseService.execute(
        'SELECT id, status FROM Exams WHERE student_id = ? AND topic_id = ? LIMIT 1',
        [studentId, topicId]
      );

      let examId;
      if (existing.length > 0) {
        examId = existing[0].id;
        const status = existing[0].status;
        console.log(`Found existing exam ${examId} status=${status} for student ${studentId}, topic ${topicId}`);
        
        // Logic thông minh: chỉ khóa exam đã PASS, cho phép làm lại exam FAILED
        if (status === 'SUBMITTED' || status === 'REVIEWED') {
          console.log(`Exam ${examId} already completed with status ${status}. Checking if passed...`);
          
          // Lấy thông tin exam và topic để kiểm tra điểm
          const examInfo = await DatabaseService.execute(
            'SELECT e.score, t.pass_score FROM Exams e JOIN Topics t ON e.topic_id = t.id WHERE e.id = ?',
            [examId]
          );
          
          if (examInfo && examInfo.length > 0) {
            const { score, pass_score } = examInfo[0];
            const passed = score !== null && pass_score !== null && Number(score) >= Number(pass_score);
            
            if (passed) {
              // Đã pass → không cho làm lại
              console.log(`Exam ${examId} already passed with score ${score}/${pass_score}. Access denied.`);
              throw new Error('Bài thi này đã hoàn thành và đạt điểm qua môn. Không thể làm lại.');
            } else {
              // Chưa pass → cho làm lại bằng cách reset
              console.log(`Exam ${examId} failed with score ${score}/${pass_score}. Allow retake by resetting.`);
              try {
                await DatabaseService.execute(
                  'UPDATE Exams SET start_time = NOW(), end_time = NULL, score = NULL, status = ? WHERE id = ?',
                  ['IN_PROGRESS', examId]
                );
              } catch (e) {
                if (e.message.includes('Unknown column')) {
                  await DatabaseService.execute(
                    'UPDATE Exams SET start_time = NOW(), end_time = NULL, score = NULL WHERE id = ?',
                    [examId]
                  );
                } else throw e;
              }
              console.log(`Reset failed exam ${examId} for retake`);
            }
          }
        } else if (status === 'IN_PROGRESS') {
          console.log(`Continuing exam ${examId} in progress`);
          // Không xóa đáp án, để sinh viên tiếp tục
        } else {
          // Status khác hoặc không có status - reset để làm lại
          console.log(`Resetting exam ${examId} with status ${status} for retake`);
          try {
            await DatabaseService.execute(
              'UPDATE Exams SET start_time = NOW(), end_time = NULL, score = NULL, status = ? WHERE id = ?',
              ['IN_PROGRESS', examId]
            );
          } catch (e) {
            if (e.message.includes('Unknown column')) {
              await DatabaseService.execute(
                'UPDATE Exams SET start_time = NOW(), end_time = NULL, score = NULL WHERE id = ?',
                [examId]
              );
            } else throw e;
          }
        }
      } else {
        console.log(`Creating new exam session for student ${studentId}, topic ${topicId}`);
        let examResult;
        try {
          if (!this.useUserIdFallback) {
            examResult = await DatabaseService.execute(
              'INSERT INTO Exams (student_id, topic_id, start_time, status) VALUES (?, ?, NOW(), ?)',
              [studentId, topicId, 'IN_PROGRESS']
            );
          } else {
            // Fallback schema với user_id
            examResult = await DatabaseService.execute(
              'INSERT INTO Exams (user_id, topic_id, start_time, status) VALUES (?, ?, NOW(), ?)',
              [userId, topicId, 'IN_PROGRESS']
            );
          }
        } catch (e) {
          if (e.message.includes('Unknown column') || e.message.includes('status')) {
            // Thử insert không có status
            // Sử dụng biến static của class
            if (!this.useUserIdFallback) {
              examResult = await DatabaseService.execute(
                'INSERT INTO Exams (student_id, topic_id, start_time) VALUES (?, ?, NOW())',
                [studentId, topicId]
              );
            } else {
              examResult = await DatabaseService.execute(
                'INSERT INTO Exams (user_id, topic_id, start_time) VALUES (?, ?, NOW())',
                [userId, topicId]
              );
            }
          } else throw e;
        }
        examId = examResult.insertId;
      }
      
      // Generate random questions
      // Lấy giới hạn từ topic.question_count để tránh mặc định 40 cứng
      let limit = null;
      try {
        const meta = await DatabaseService.execute('SELECT question_count FROM Topics WHERE id = ?', [topicId]);
        if (meta.length && meta[0].question_count) {
          limit = meta[0].question_count;
        }
      } catch (e) {
        console.warn('Could not fetch topic question_count, fallback to all questions:', e.message);
      }
      const questions = await this.generateRandomQuestionPool(topicId, limit);
      
      // Removed ExamAnswers pre-insert - using localStorage instead
      // Questions are now generated clean without database tracking
      
      return { examId, questions };
    } catch (error) {
      console.error('Error creating exam session:', error);
      throw error;
    }
  }

  // Removed batchUpdateAnswers method - using localStorage instead
}

module.exports = ExamOptimizationService;
