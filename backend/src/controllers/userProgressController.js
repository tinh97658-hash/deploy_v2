const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');

class UserProgressController {
  // Lấy tiến độ học tập của user
  static async getUserProgress(req, res) {
    try {
      const userId = req.user.id;
      console.log('Getting user progress for user:', userId);
      
      // Lấy danh sách chuyên đề đã làm và tiến độ từ bảng Exams
      const query = `
        SELECT 
          e.topic_id,
          MAX(e.score) as bestScore,
          COUNT(e.id) as attempts,
          MAX(e.end_time) as lastAttempt,
          MAX(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) as passed
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.student_id = ?
        GROUP BY e.topic_id
      `;
      const rows = await DatabaseService.execute(query, [userId]);
      // Đưa về dạng object { [topicId]: { ...progress } }
      const progress = {};
      rows.forEach(row => {
        progress[row.topic_id] = {
          attempts: row.attempts,
          bestScore: row.bestScore || 0,
          passed: !!row.passed,
          lastAttempt: row.lastAttempt
        };
      });
      return ResponseHelper.success(res, { progress }, 'Lấy tiến độ học tập thành công');

    } catch (error) {
      console.error('Get user progress error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy tiến độ học tập', 500);
    }
  }

  // Lấy lịch sử thi của student
  static async getExamHistory(req, res) {
    try {
      const userId = req.user.id;
      console.log('Getting exam history for user:', userId);
      
      // Mock data cho exam history
      const mockHistory = [
        {
          id: 1,
          topicId: 1,
          topicName: 'Chuyên đề 1: Tư tưởng Hồ Chí Minh',
          score: 85,
          totalQuestions: 20,
          correctAnswers: 17,
          duration: 45,
          status: 'passed',
          completedAt: new Date().toISOString()
        },
        {
          id: 2,
          topicId: 2,
          topicName: 'Chuyên đề 2: Đường lối cách mạng',
          score: 65,
          totalQuestions: 15,
          correctAnswers: 10,
          duration: 30,
          status: 'failed',
          completedAt: new Date().toISOString()
        }
      ];

      return ResponseHelper.success(res, {
        history: mockHistory,
        total: mockHistory.length
      }, 'Lấy lịch sử thi thành công');

    } catch (error) {
      console.error('Get exam history error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy lịch sử thi', 500);
    }
  }
}

module.exports = UserProgressController;
