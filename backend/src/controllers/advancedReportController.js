const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');

class AdvancedReportController {

  // ============= TEST ENDPOINT =============
  static async testConnection(req, res) {
    try {
      // Simple test query
      const result = await DatabaseService.execute('SELECT COUNT(*) as student_count FROM Students');
      const topicResult = await DatabaseService.execute('SELECT COUNT(*) as topic_count FROM Topics');
      const examResult = await DatabaseService.execute('SELECT COUNT(*) as exam_count FROM Exams');
      
      return ResponseHelper.success(res, {
        message: 'Connection successful',
        data: {
          students: result[0]?.student_count || 0,
          topics: topicResult[0]?.topic_count || 0,
          exams: examResult[0]?.exam_count || 0
        }
      });
    } catch (error) {
      console.error('Test connection error:', error);
      return ResponseHelper.error(res, 'Database connection failed: ' + error.message, 500);
    }
  }

  // ============= DASHBOARD OVERVIEW REPORTS =============
  
  static async getDashboardOverview(req, res) {
    try {
      const { timeRange = '30' } = req.query; // days
      
      // Key Metrics Cards
      const [
        totalStudents,
        participationStats,
        passRateStats,
        averageScore
      ] = await Promise.all([
        DatabaseService.execute(`
          SELECT COUNT(*) as total 
          FROM Students s 
          JOIN Users u ON s.user_id = u.id 
          WHERE u.role = 'STUDENT'
        `),
        
        DatabaseService.execute(`
          SELECT 
            COUNT(DISTINCT s.id) as total_students,
            COUNT(DISTINCT e.student_id) as participated_students,
            ROUND((COUNT(DISTINCT e.student_id) * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0)), 2) as participation_rate
          FROM Students s
          JOIN Users u ON s.user_id = u.id
          LEFT JOIN Exams e ON s.id = e.student_id 
            AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND e.status = 'SUBMITTED'
          WHERE u.role = 'STUDENT'
        `, [timeRange]),
        
        DatabaseService.execute(`
          SELECT 
            COUNT(*) as total_exams,
            SUM(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) as passed_exams,
            ROUND((SUM(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) as pass_rate
          FROM Exams e
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.status = 'SUBMITTED' 
            AND e.score IS NOT NULL
            AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [timeRange]),
        
        DatabaseService.execute(`
          SELECT 
            ROUND(AVG(e.score), 2) as average_score,
            ROUND(MIN(e.score), 2) as min_score,
            ROUND(MAX(e.score), 2) as max_score
          FROM Exams e
          WHERE e.status = 'SUBMITTED' 
            AND e.score IS NOT NULL
            AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [timeRange])
      ]);

      // Trend data for charts
      const trendData = await DatabaseService.execute(`
        SELECT 
          DATE(e.start_time) as exam_date,
          COUNT(*) as total_exams,
          COUNT(DISTINCT e.student_id) as unique_students,
          ROUND(AVG(e.score), 2) as avg_score,
          SUM(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) as passed_exams,
          SUM(CASE WHEN e.score < t.pass_score THEN 1 ELSE 0 END) as failed_exams,
          ROUND((SUM(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) as pass_rate
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND e.status = 'SUBMITTED'
          AND e.score IS NOT NULL
        GROUP BY DATE(e.start_time)
        ORDER BY exam_date DESC
        LIMIT 30
      `, [timeRange]);

      return ResponseHelper.success(res, {
        keyMetrics: {
          totalStudents: totalStudents[0]?.total || 0,
          participationRate: participationStats[0]?.participation_rate || 0,
          participatedStudents: participationStats[0]?.participated_students || 0,
          passRate: passRateStats[0]?.pass_rate || 0,
          averageScore: averageScore[0]?.average_score || 0,
          scoreRange: {
            min: averageScore[0]?.min_score || 0,
            max: averageScore[0]?.max_score || 0
          }
        },
        trendData: trendData || []
      });

    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      return ResponseHelper.error(res, 'Không thể lấy dữ liệu tổng quan', 500);
    }
  }

  // ============= ORGANIZATIONAL BREAKDOWN REPORTS =============
  
  static async getOrganizationalReport(req, res) {
    try {
      const { level = 'department', timeRange = '30' } = req.query;
      
      let query;
      
      switch (level) {
        case 'department':
          query = `
            SELECT 
              d.id as dept_id,
              d.name as dept_name,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT student_status.student_id) as participated_students,
              COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) as passed_students,
              COUNT(DISTINCT student_status.total_exams) as total_exams,
              ROUND(AVG(student_status.best_score), 2) as avg_score
            FROM Departments d
            JOIN Majors m ON d.id = m.department_id
            JOIN Classes c ON m.id = c.major_id
            JOIN Students s ON c.id = s.class_id
            LEFT JOIN (
              SELECT 
                e.student_id,
                COUNT(e.id) as total_exams,
                MAX(e.score) as best_score,
                -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
                CASE 
                  WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                       AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
                  THEN 'PASSED'
                  ELSE 'FAILED'
                END as final_status
              FROM Exams e
              JOIN Topics t ON e.topic_id = t.id
              WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND e.status = 'SUBMITTED'
                AND e.score IS NOT NULL
              GROUP BY e.student_id
            ) student_status ON s.id = student_status.student_id
            GROUP BY d.id, d.name
            ORDER BY avg_score DESC, total_students DESC
          `;
          break;
          
        case 'major':
          query = `
            SELECT 
              m.id as major_id,
              m.name as major_name,
              d.name as dept_name,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT student_status.student_id) as participated_students,
              COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) as passed_students,
              SUM(COALESCE(student_status.total_exams, 0)) as total_exams,
              ROUND(AVG(student_status.best_score), 2) as avg_score
            FROM Majors m
            JOIN Departments d ON m.department_id = d.id
            JOIN Classes c ON m.id = c.major_id
            JOIN Students s ON c.id = s.class_id
            LEFT JOIN (
              SELECT 
                e.student_id,
                COUNT(e.id) as total_exams,
                MAX(e.score) as best_score,
                -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
                CASE 
                  WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                       AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
                  THEN 'PASSED'
                  ELSE 'FAILED'
                END as final_status
              FROM Exams e
              JOIN Topics t ON e.topic_id = t.id
              WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND e.status = 'SUBMITTED'
                AND e.score IS NOT NULL
              GROUP BY e.student_id
            ) student_status ON s.id = student_status.student_id
            GROUP BY m.id, m.name, d.name
            ORDER BY avg_score DESC, total_students DESC
          `;
          break;
          
        case 'class':
          query = `
            SELECT 
              c.id as class_id,
              c.name as class_name,
              m.name as major_name,
              d.name as dept_name,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT student_status.student_id) as participated_students,
              COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) as passed_students,
              SUM(COALESCE(student_status.total_exams, 0)) as total_exams,
              ROUND(AVG(student_status.best_score), 2) as avg_score
            FROM Classes c
            JOIN Majors m ON c.major_id = m.id
            JOIN Departments d ON m.department_id = d.id
            JOIN Students s ON c.id = s.class_id
            LEFT JOIN (
              SELECT 
                e.student_id,
                COUNT(e.id) as total_exams,
                MAX(e.score) as best_score,
                -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
                CASE 
                  WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                       AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
                  THEN 'PASSED'
                  ELSE 'FAILED'
                END as final_status
              FROM Exams e
              JOIN Topics t ON e.topic_id = t.id
              WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND e.status = 'SUBMITTED'
                AND e.score IS NOT NULL
              GROUP BY e.student_id
            ) student_status ON s.id = student_status.student_id
            GROUP BY c.id, c.name, m.name, d.name
            ORDER BY avg_score DESC, total_students DESC
          `;
          break;
          
        default:
          return ResponseHelper.error(res, 'Invalid level parameter', 400);
      }

      const results = await DatabaseService.execute(query, [timeRange]);
      
      // Calculate participation and pass rates based on students, not exams
      const processedResults = results.map(row => ({
        ...row,
        participation_rate: row.total_students > 0 
          ? Math.round((row.participated_students / row.total_students) * 100 * 100) / 100 
          : 0,
        pass_rate: row.participated_students > 0 
          ? Math.round((row.passed_students / row.participated_students) * 100 * 100) / 100 
          : 0
      }));

      return ResponseHelper.success(res, {
        level,
        data: processedResults,
        summary: {
          totalUnits: processedResults.length,
          avgParticipation: processedResults.length > 0 
            ? Math.round(processedResults.reduce((sum, item) => sum + item.participation_rate, 0) / processedResults.length * 100) / 100
            : 0,
          avgPassRate: processedResults.length > 0 
            ? Math.round(processedResults.reduce((sum, item) => sum + item.pass_rate, 0) / processedResults.length * 100) / 100
            : 0
        }
      });

    } catch (error) {
      console.error('Error getting organizational report:', error);
      return ResponseHelper.error(res, 'Không thể lấy báo cáo theo tổ chức', 500);
    }
  }

  // ============= TOPIC ANALYSIS REPORTS =============
  
  static async getTopicAnalysisReport(req, res) {
    try {
      const { timeRange = '30' } = req.query;
      
      const topicStats = await DatabaseService.execute(`
        SELECT 
          t.id as topic_id,
          t.name as topic_name,
          t.duration_minutes as allocated_duration,
          t.pass_score,
          t.question_count,
          COUNT(DISTINCT e.student_id) as total_participants,
          COUNT(e.id) as total_attempts,
          ROUND(AVG(e.score), 2) as avg_score,
          ROUND(MIN(e.score), 2) as min_score,
          ROUND(MAX(e.score), 2) as max_score,
          SUM(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) as passed_count,
          ROUND(AVG(
            CASE 
              WHEN TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time) > 0 
                AND TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time) <= (t.duration_minutes * 2)
              THEN TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time)
              ELSE NULL 
            END
          ), 1) as avg_duration_minutes,
          COUNT(
            CASE 
              WHEN TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time) > 0 
                AND TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time) <= (t.duration_minutes * 2)
              THEN 1 
              ELSE NULL 
            END
          ) as valid_duration_count
        FROM Topics t
        LEFT JOIN Exams e ON t.id = e.topic_id 
          AND e.start_time >= DATE_SUB(NOW(), INTERVAL ${timeRange} DAY)
          AND e.status = 'SUBMITTED'
          AND e.score IS NOT NULL
          AND e.end_time IS NOT NULL
        GROUP BY t.id, t.name, t.duration_minutes, t.pass_score, t.question_count
        ORDER BY total_participants DESC, avg_score DESC
      `);

      // Calculate difficulty levels and pass rates
      const processedTopics = topicStats.map(topic => {
        const passRate = topic.total_attempts > 0 
          ? Math.round((topic.passed_count / topic.total_attempts) * 100 * 100) / 100 
          : 0;
        
        let difficulty = 'Chưa có dữ liệu';
        if (passRate >= 80) difficulty = 'Dễ';
        else if (passRate >= 60) difficulty = 'Trung bình';
        else if (passRate >= 40) difficulty = 'Khó';
        else if (passRate > 0) difficulty = 'Rất khó';

        return {
          ...topic,
          pass_rate: passRate,
          difficulty,
          participation_rate: topic.total_participants || 0
        };
      });

      // Question-level analysis for most difficult questions
      // Removed question analysis - ExamAnswers table deleted
      const questionAnalysis = []; // Empty since we're using localStorage only

      return ResponseHelper.success(res, {
        topicStats: processedTopics,
        questionAnalysis: questionAnalysis || [],
        summary: {
          totalTopics: processedTopics.length,
          avgPassRate: processedTopics.length > 0 
            ? Math.round(processedTopics.reduce((sum, topic) => sum + topic.pass_rate, 0) / processedTopics.length * 100) / 100
            : 0,
          mostDifficultTopic: processedTopics.find(t => t.pass_rate > 0 && t.pass_rate === Math.min(...processedTopics.filter(t => t.pass_rate > 0).map(t => t.pass_rate))),
          easiestTopic: processedTopics.find(t => t.pass_rate === Math.max(...processedTopics.map(t => t.pass_rate)))
        }
      });

    } catch (error) {
      console.error('Error getting topic analysis:', error);
      return ResponseHelper.error(res, 'Không thể lấy phân tích chuyên đề', 500);
    }
  }

  // ============= STUDENT DETAIL REPORTS =============
  
  static async getStudentDetailReport(req, res) {
    try {
      const { studentId, timeRange = '365' } = req.query;
      
      if (!studentId) {
        return ResponseHelper.error(res, 'Student ID is required', 400);
      }

      // Student basic info
      const studentInfo = await DatabaseService.execute(`
        SELECT 
          s.id, s.student_code, s.phone_number,
          u.username, u.email, u.full_name,
          c.name as class_name,
          m.name as major_name,
          d.name as department_name
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE s.id = ?
      `, [studentId]);

      if (!studentInfo.length) {
        return ResponseHelper.error(res, 'Student not found', 404);
      }

      // Student exam history
      const examHistory = await DatabaseService.execute(`
        SELECT 
          e.id as exam_id,
          e.start_time,
          e.end_time,
          e.score,
          e.status,
          t.id as topic_id,
          t.name as topic_name,
          t.pass_score,
          TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time) as duration_minutes,
          CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END as passed
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.student_id = ?
          AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY e.start_time DESC
      `, [studentId, timeRange]);

      // Performance metrics
      const performanceMetrics = await DatabaseService.execute(`
        SELECT 
          COUNT(*) as total_exams,
          ROUND(AVG(e.score), 2) as avg_score,
          MAX(e.score) as best_score,
          MIN(e.score) as worst_score,
          SUM(CASE WHEN e.score >= t.pass_score THEN 1 ELSE 0 END) as passed_exams,
          ROUND(AVG(TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time)), 2) as avg_duration
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.student_id = ?
          AND e.status = 'SUBMITTED'
          AND e.score IS NOT NULL
          AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [studentId, timeRange]);

      const metrics = performanceMetrics[0] || {};
      const passRate = metrics.total_exams > 0 
        ? Math.round((metrics.passed_exams / metrics.total_exams) * 100 * 100) / 100 
        : 0;

      // Risk assessment
      let riskLevel = 'Thấp';
      let riskColor = 'success';
      
      if (passRate < 50) {
        riskLevel = 'Cao';
        riskColor = 'danger';
      } else if (passRate < 70) {
        riskLevel = 'Trung bình';
        riskColor = 'warning';
      }

      return ResponseHelper.success(res, {
        studentInfo: studentInfo[0],
        examHistory,
        performanceMetrics: {
          ...metrics,
          pass_rate: passRate,
          risk_level: riskLevel,
          risk_color: riskColor
        },
        recommendations: this.generateStudentRecommendations(examHistory, metrics, passRate)
      });

    } catch (error) {
      console.error('Error getting student detail report:', error);
      return ResponseHelper.error(res, 'Không thể lấy báo cáo chi tiết sinh viên', 500);
    }
  }

  // ============= MAJOR DETAIL REPORTS =============
  
  static async getMajorDetailReport(req, res) {
    try {
      const { majorId, timeRange = '365' } = req.query;
      console.log('getMajorDetailReport called with:', { majorId, timeRange });
      
      if (!majorId) {
        console.log('Missing majorId');
        return ResponseHelper.error(res, 'Major ID is required', 400);
      }

      // Get major basic info
      const majorInfo = await DatabaseService.execute(`
        SELECT 
          m.id as major_id,
          m.name as major_name,
          d.name as dept_name,
          d.id as dept_id
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        WHERE m.id = ?
      `, [majorId]);

      if (!majorInfo.length) {
        return ResponseHelper.error(res, 'Major not found', 404);
      }

      // Get total topics first
      const totalTopicsResult = await DatabaseService.execute(`
        SELECT COUNT(*) as total_topics FROM Topics
      `);
      const totalTopics = totalTopicsResult[0]?.total_topics || 0;

      // Get students by class with exam results
      const studentsByClass = await DatabaseService.execute(`
        SELECT 
          c.id as class_id,
          c.name as class_name,
          s.id as student_id,
          s.student_code,
          u.full_name as student_name,
          u.email,
          s.phone_number,
          COALESCE(student_status.best_score, 0) as best_score,
          COALESCE(student_status.completed_topics, 0) as completed_topics,
          COALESCE(student_status.passed_topics, 0) as passed_topics,
          ? as total_topics,
          student_status.last_exam_date,
          CASE 
            WHEN student_status.final_status = 'PASSED' THEN 'ĐẠT'
            WHEN student_status.final_status = 'FAILED' THEN 'KHÔNG ĐẠT'
            ELSE 'CHƯA THI'
          END as status
        FROM Classes c
        JOIN Students s ON c.id = s.class_id
        JOIN Users u ON s.user_id = u.id
        LEFT JOIN (
          SELECT 
            e.student_id,
            MAX(e.score) as best_score,
            COUNT(DISTINCT e.topic_id) as completed_topics,
            COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) as passed_topics,
            MAX(DATE(e.start_time)) as last_exam_date,
            -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
            CASE 
              WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                   AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
              THEN 'PASSED'
              ELSE 'FAILED'
            END as final_status
          FROM Exams e
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.status = 'SUBMITTED'
            AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND e.score IS NOT NULL
          GROUP BY e.student_id
        ) student_status ON s.id = student_status.student_id
        WHERE c.major_id = ?
        ORDER BY c.name, u.full_name
      `, [totalTopics, timeRange, majorId]);

      // Group students by class and calculate statistics
      const classesData = {};
      const majorStats = {
        total_students: 0,
        passed_students: 0,
        failed_students: 0,
        not_participated: 0
      };

      studentsByClass.forEach(student => {
        const classId = student.class_id;
        
        if (!classesData[classId]) {
          classesData[classId] = {
            class_id: classId,
            class_name: student.class_name,
            students: [],
            stats: {
              total: 0,
              passed: 0,
              failed: 0,
              not_participated: 0,
              pass_rate: 0,
              avg_score: 0
            }
          };
        }

        // Use status from database query (đã tính theo tiêu chí mới)
        const status = student.status;

        classesData[classId].students.push({
          student_id: student.student_id,
          student_code: student.student_code,
          student_name: student.student_name,
          email: student.email,
          phone_number: student.phone_number,
          completed_topics: student.completed_topics || 0,
          total_topics: student.total_topics || totalTopics,
          passed_topics: student.passed_topics || 0,
          status: status,
          exam_date: student.last_exam_date
        });

        // Update class stats
        classesData[classId].stats.total++;
        majorStats.total_students++;

        if (status === 'ĐẠT') {
          classesData[classId].stats.passed++;
          majorStats.passed_students++;
        } else if (status === 'KHÔNG ĐẠT') {
          classesData[classId].stats.failed++;
          majorStats.failed_students++;
        } else {
          classesData[classId].stats.not_participated++;
          majorStats.not_participated++;
        }
      });

      // Calculate pass rates and average scores for each class
      Object.values(classesData).forEach(classData => {
        const { stats } = classData;
        stats.pass_rate = stats.total > 0 
          ? Math.round((stats.passed / stats.total) * 100 * 100) / 100 
          : 0;
        
        const scoresSum = classData.students
          .filter(s => s.completed_topics > 0)
          .reduce((sum, s) => sum + (s.completed_topics / Math.max(s.total_topics, 1)) * 100, 0);
        const scoresCount = classData.students.filter(s => s.completed_topics > 0).length;
        
        stats.avg_score = scoresCount > 0 
          ? Math.round((scoresSum / scoresCount) * 100) / 100 
          : 0;
      });

      // Calculate major overall stats
      majorStats.pass_rate = majorStats.total_students > 0 
        ? Math.round((majorStats.passed_students / majorStats.total_students) * 100 * 100) / 100 
        : 0;

      return ResponseHelper.success(res, {
        majorInfo: majorInfo[0],
        classes: Object.values(classesData),
        majorStats
      });

    } catch (error) {
      console.error('Error getting major detail report:', error);
      return ResponseHelper.error(res, 'Không thể lấy báo cáo chi tiết ngành', 500);
    }
  }

  // ============= EXCEL STATISTICS REPORTS =============
  
  static async getExcelStatisticsReport(req, res) {
    try {
      const { timeRange = '365' } = req.query;
      
      // Department-level statistics
      const departmentStats = await DatabaseService.execute(`
        SELECT 
          d.id as dept_id,
          d.name as dept_name,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT student_status.student_id) as participated_students,
          COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) as passed_students,
          COUNT(DISTINCT CASE WHEN student_status.final_status = 'FAILED' THEN student_status.student_id END) as failed_students,
          COUNT(DISTINCT CASE WHEN student_status.final_status IS NULL THEN s.id END) as not_participated,
          ROUND(
            (COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) * 100.0 / 
             NULLIF(COUNT(DISTINCT s.id), 0)), 2
          ) as pass_rate,
          ROUND(AVG(student_status.best_score), 2) as avg_score
        FROM Departments d
        JOIN Majors m ON d.id = m.department_id
        JOIN Classes c ON m.id = c.major_id
        JOIN Students s ON c.id = s.class_id
        LEFT JOIN (
          SELECT 
            e.student_id,
            MAX(e.score) as best_score,
            -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
            CASE 
              WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                   AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
              THEN 'PASSED'
              ELSE 'FAILED'
            END as final_status
          FROM Exams e
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND e.status = 'SUBMITTED'
            AND e.score IS NOT NULL
          GROUP BY e.student_id
        ) student_status ON s.id = student_status.student_id
        GROUP BY d.id, d.name
        ORDER BY d.name
      `, [timeRange]);

      // Major-level statistics  
      const majorStats = await DatabaseService.execute(`
        SELECT 
          m.id as major_id,
          m.name as major_name,
          d.name as dept_name,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT student_status.student_id) as participated_students,
          COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) as passed_students,
          COUNT(DISTINCT CASE WHEN student_status.final_status = 'FAILED' THEN student_status.student_id END) as failed_students,
          COUNT(DISTINCT CASE WHEN student_status.final_status IS NULL THEN s.id END) as not_participated,
          ROUND(
            (COUNT(DISTINCT CASE WHEN student_status.final_status = 'PASSED' THEN student_status.student_id END) * 100.0 / 
             NULLIF(COUNT(DISTINCT s.id), 0)), 2
          ) as pass_rate,
          ROUND(AVG(student_status.best_score), 2) as avg_score
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        JOIN Classes c ON m.id = c.major_id
        JOIN Students s ON c.id = s.class_id
        LEFT JOIN (
          SELECT 
            e.student_id,
            MAX(e.score) as best_score,
            -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
            CASE 
              WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                   AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
              THEN 'PASSED'
              ELSE 'FAILED'
            END as final_status
          FROM Exams e
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND e.status = 'SUBMITTED'
            AND e.score IS NOT NULL
          GROUP BY e.student_id
        ) student_status ON s.id = student_status.student_id
        GROUP BY m.id, m.name, d.name
        ORDER BY d.name, m.name
      `, [timeRange]);

      return ResponseHelper.success(res, {
        departmentStats,
        majorStats,
        summary: {
          totalDepartments: departmentStats.length,
          totalMajors: majorStats.length,
          avgDeptPassRate: departmentStats.length > 0 
            ? Math.round(departmentStats.reduce((sum, dept) => sum + (dept.pass_rate || 0), 0) / departmentStats.length * 100) / 100
            : 0,
          avgMajorPassRate: majorStats.length > 0
            ? Math.round(majorStats.reduce((sum, major) => sum + (major.pass_rate || 0), 0) / majorStats.length * 100) / 100
            : 0
        }
      });

    } catch (error) {
      console.error('Error getting excel statistics:', error);
      return ResponseHelper.error(res, 'Không thể lấy thống kê excel', 500);
    }
  }

  // ============= EXPORT STUDENT LISTS =============
  
  static async exportStudentList(req, res) {
    try {
      const { type, id, status, timeRange = '365' } = req.query;
      
      let query, params;
      let filename = 'danh-sach-sinh-vien';
      
      if (type === 'department') {
        const baseQuery = `
          SELECT 
            s.student_code,
            u.full_name,
            u.email,
            s.phone_number,
            c.name as class_name,
            m.name as major_name,
            d.name as dept_name,
            COALESCE(best_exam.score, 0) as best_score,
            COALESCE(best_exam.pass_score, 0) as pass_score,
            CASE 
              WHEN best_exam.score >= best_exam.pass_score THEN 'ĐẠT'
              WHEN best_exam.score IS NULL THEN 'CHƯA THI'
              ELSE 'KHÔNG ĐẠT'
            END as status,
            best_exam.exam_date
          FROM Students s
          JOIN Users u ON s.user_id = u.id
          JOIN Classes c ON s.class_id = c.id
          JOIN Majors m ON c.major_id = m.id
          JOIN Departments d ON m.department_id = d.id
          LEFT JOIN (
            SELECT 
              e.student_id,
              MAX(e.score) as score,
              t.pass_score,
              DATE(MAX(e.start_time)) as exam_date
            FROM Exams e
            JOIN Topics t ON e.topic_id = t.id
            WHERE e.status = 'SUBMITTED'
              AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY e.student_id, t.pass_score
          ) best_exam ON s.id = best_exam.student_id
          WHERE d.id = ?
        `;
        
        if (status === 'passed') {
          query = baseQuery + ` AND best_exam.score >= best_exam.pass_score`;
          filename = `sinh-vien-dat-khoa-${id}`;
        } else if (status === 'failed') {
          query = baseQuery + ` AND (best_exam.score < best_exam.pass_score OR best_exam.score IS NULL)`;
          filename = `sinh-vien-khong-dat-khoa-${id}`;
        } else {
          query = baseQuery;
          filename = `tat-ca-sinh-vien-khoa-${id}`;
        }
        
        query += ` ORDER BY m.name, c.name, u.full_name`;
        params = [timeRange, id];
        
      } else if (type === 'major') {
        const baseQuery = `
          SELECT 
            s.student_code,
            u.full_name,
            u.email,
            s.phone_number,
            c.name as class_name,
            m.name as major_name,
            d.name as dept_name,
            COALESCE(best_exam.score, 0) as best_score,
            COALESCE(best_exam.pass_score, 0) as pass_score,
            CASE 
              WHEN best_exam.score >= best_exam.pass_score THEN 'ĐẠT'
              WHEN best_exam.score IS NULL THEN 'CHƯA THI'
              ELSE 'KHÔNG ĐẠT'
            END as status,
            best_exam.exam_date
          FROM Students s
          JOIN Users u ON s.user_id = u.id
          JOIN Classes c ON s.class_id = c.id
          JOIN Majors m ON c.major_id = m.id
          JOIN Departments d ON m.department_id = d.id
          LEFT JOIN (
            SELECT 
              e.student_id,
              MAX(e.score) as score,
              t.pass_score,
              DATE(MAX(e.start_time)) as exam_date
            FROM Exams e
            JOIN Topics t ON e.topic_id = t.id
            WHERE e.status = 'SUBMITTED'
              AND e.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY e.student_id, t.pass_score
          ) best_exam ON s.id = best_exam.student_id
          WHERE m.id = ?
        `;
        
        if (status === 'passed') {
          query = baseQuery + ` AND best_exam.score >= best_exam.pass_score`;
          filename = `sinh-vien-dat-nganh-${id}`;
        } else if (status === 'failed') {
          query = baseQuery + ` AND (best_exam.score < best_exam.pass_score OR best_exam.score IS NULL)`;
          filename = `sinh-vien-khong-dat-nganh-${id}`;
        } else {
          query = baseQuery;
          filename = `tat-ca-sinh-vien-nganh-${id}`;
        }
        
        query += ` ORDER BY c.name, u.full_name`;
        params = [timeRange, id];
      }
      
      const students = await DatabaseService.execute(query, params);
      
      // Convert to Excel-like format
      const excelData = [
        // Header row
        ['STT', 'Mã SV', 'Họ tên', 'Email', 'SĐT', 'Lớp', 'Ngành', 'Khoa', 'Điểm', 'Điểm đạt', 'Kết quả', 'Ngày thi'],
        // Data rows
        ...students.map((student, index) => [
          index + 1,
          student.student_code,
          student.full_name,
          student.email,
          student.phone_number || '',
          student.class_name,
          student.major_name,
          student.dept_name,
          student.best_score,
          student.pass_score,
          student.status,
          student.exam_date || 'Chưa thi'
        ])
      ];

      return ResponseHelper.success(res, {
        data: excelData,
        filename: filename + `-${new Date().toISOString().split('T')[0]}.xlsx`,
        summary: {
          total: students.length,
          passed: students.filter(s => s.status === 'ĐẠT').length,
          failed: students.filter(s => s.status === 'KHÔNG ĐẠT').length,
          notTaken: students.filter(s => s.status === 'CHƯA THI').length
        }
      });

    } catch (error) {
      console.error('Error exporting student list:', error);
      return ResponseHelper.error(res, 'Không thể xuất danh sách sinh viên', 500);
    }
  }

  // ============= HELPER METHODS =============
  
  static generateStudentRecommendations(examHistory, metrics, passRate) {
    const recommendations = [];
    
    if (passRate < 50) {
      recommendations.push({
        type: 'critical',
        title: 'Cần can thiệp khẩn cấp',
        description: 'Sinh viên có tỷ lệ đạt thấp, cần hỗ trợ học tập ngay lập tức'
      });
    }
    
    if (metrics.avg_duration > 0 && metrics.avg_duration < 10) {
      recommendations.push({
        type: 'warning',
        title: 'Làm bài quá nhanh',
        description: 'Sinh viên hoàn thành bài thi quá nhanh, có thể không đọc kỹ câu hỏi'
      });
    }

    if (examHistory.length < 3) {
      recommendations.push({
        type: 'info',
        title: 'Ít tham gia',
        description: 'Sinh viên ít tham gia các bài kiểm tra, cần động viên tham gia nhiều hơn'
      });
    }

    return recommendations;
  }

  static generateRealTimeAlerts(activeExams, todayStats) {
    const alerts = [];
    
    if (activeExams.length > 10) {
      alerts.push({
        type: 'warning',
        message: `Có ${activeExams.length} bài thi đang diễn ra đồng thời`,
        timestamp: new Date()
      });
    }

    if (todayStats && todayStats.total_exams_today > 100) {
      alerts.push({
        type: 'info',
        message: `Hôm nay đã có ${todayStats.total_exams_today} lượt thi`,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  // ============= EXPORT REPORTS =============
  
  // ============= EXPORT STUDENT LIST =============
  
  static async exportStudentList(req, res) {
    try {
      const { majorId, format = 'excel', groupBy = 'class' } = req.query;
      
      console.log('Export request params:', { majorId, format, groupBy });
      
      if (!majorId || majorId === 'undefined' || majorId === 'null') {
        return ResponseHelper.error(res, 'majorId is required and must be valid', 400);
      }

      const majorIdInt = parseInt(majorId);
      if (isNaN(majorIdInt)) {
        return ResponseHelper.error(res, 'majorId must be a valid number', 400);
      }

      // Query to get students by major, grouped by class with consistent grading criteria
      const query = `
        SELECT 
          s.id as student_id,
          s.student_code,
          u.full_name,
          u.email,
          s.phone_number,
          c.id as class_id,
          c.name as class_name,
          m.name as major_name,
          d.name as dept_name,
          COALESCE(student_status.best_score, 0) as latest_score,
          student_status.latest_exam_date,
          CASE 
            WHEN student_status.final_status = 'PASSED' THEN 'Đạt'
            WHEN student_status.final_status = 'FAILED' THEN 'Không đạt'
            ELSE 'Chưa thi'
          END as exam_status,
          COALESCE(student_status.completed_topics, 0) as completed_topics,
          COALESCE(student_status.passed_topics, 0) as passed_topics,
          (SELECT COUNT(*) FROM Topics) as total_topics
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        LEFT JOIN (
          SELECT 
            e.student_id,
            MAX(e.score) as best_score,
            COUNT(DISTINCT e.topic_id) as completed_topics,
            COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) as passed_topics,
            MAX(DATE(e.start_time)) as latest_exam_date,
            -- Sinh viên chỉ được coi là ĐẠT nếu hoàn thành TẤT CẢ topics và đạt TẤT CẢ topics
            CASE 
              WHEN COUNT(DISTINCT e.topic_id) = (SELECT COUNT(*) FROM Topics) 
                   AND COUNT(CASE WHEN e.score >= t.pass_score THEN 1 END) = COUNT(DISTINCT e.topic_id)
              THEN 'PASSED'
              ELSE 'FAILED'
            END as final_status
          FROM Exams e
          JOIN Topics t ON e.topic_id = t.id
          WHERE e.status = 'SUBMITTED'
            AND e.score IS NOT NULL
          GROUP BY e.student_id
        ) student_status ON s.id = student_status.student_id
        WHERE m.id = ?
        ORDER BY c.name, s.student_code
      `;

      console.log('Executing query with majorId:', majorIdInt);
      const students = await DatabaseService.execute(query, [majorIdInt]);
      console.log('Found students:', students.length);

      if (students.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên nào trong ngành này', 404);
      }

      // Build a per-student list of topics not passed for the "Chi tiết" column
      const studentIds = students.map(s => s.student_id).filter(Boolean);
      let notPassedByStudent = {};
      if (studentIds.length > 0) {
        const placeholders = studentIds.map(() => '?').join(',');
        const topicOutcomeSql = `
          SELECT s.id AS student_id, t.id AS topic_id, t.name AS topic_name, t.pass_score,
                 MAX(e.score) AS best_score
          FROM Students s
          CROSS JOIN Topics t
          LEFT JOIN Exams e ON e.student_id = s.id 
                            AND e.topic_id = t.id 
                            AND e.status = 'SUBMITTED' 
                            AND e.score IS NOT NULL
          WHERE s.id IN (${placeholders})
          GROUP BY s.id, t.id, t.name, t.pass_score
        `;
        try {
          const rows = await DatabaseService.execute(topicOutcomeSql, studentIds);
          notPassedByStudent = rows.reduce((acc, r) => {
            if (!acc[r.student_id]) acc[r.student_id] = [];
            const best = r.best_score === null ? null : Number(r.best_score);
            const passScore = r.pass_score === null ? 0 : Number(r.pass_score);
            const passed = best !== null && best >= passScore;
            if (!passed) acc[r.student_id].push(r.topic_name);
            return acc;
          }, {});
        } catch (e) {
          console.warn('Chi tiết (not-passed topics) compute failed:', e.message);
        }
      }

      if (format === 'excel') {
        const XLSX = require('xlsx');
        
        // Group students by class
        const studentsByClass = students.reduce((acc, student) => {
          const className = student.class_name || 'Không có lớp';
          if (!acc[className]) {
            acc[className] = [];
          }
          // Compose Chi tiết based on status
          let detail = '';
          if ((student.exam_status || 'Chưa thi') === 'Chưa thi') {
            detail = 'Chưa tham gia';
          } else if (student.exam_status === 'Không đạt') {
            const list = notPassedByStudent[student.student_id] || [];
            detail = list.join(', ');
          }
          acc[className].push({
            'Mã sinh viên': student.student_code || '',
            'Họ và tên': student.full_name || '',
            'Email': student.email || '',
            'Số điện thoại': student.phone_number || '',
            'Lớp': student.class_name || '',
            'Điểm cao nhất': student.latest_score ? Number(student.latest_score).toFixed(2) : '',
            'Ngày thi gần nhất': student.latest_exam_date ? 
              new Date(student.latest_exam_date).toLocaleDateString('vi-VN') : '',
            'Topics đã làm': `${student.completed_topics || 0}/${student.total_topics || 0}`,
            'Topics đạt': `${student.passed_topics || 0}/${student.total_topics || 0}`,
            'Trạng thái': student.exam_status || 'Chưa thi',
            'Chi tiết': detail
          });
          return acc;
        }, {});

        console.log('Grouped by classes:', Object.keys(studentsByClass));

        // Create workbook with multiple sheets
        const workbook = XLSX.utils.book_new();
        
        // Add a summary sheet
        const summaryData = Object.keys(studentsByClass).map(className => ({
          'Lớp': className,
          'Số sinh viên': studentsByClass[className].length,
          'Đã thi': studentsByClass[className].filter(s => s['Trạng thái'] !== 'Chưa thi').length,
          'Đạt': studentsByClass[className].filter(s => s['Trạng thái'] === 'Đạt').length,
          'Không đạt': studentsByClass[className].filter(s => s['Trạng thái'] === 'Không đạt').length,
          'Chưa thi': studentsByClass[className].filter(s => s['Trạng thái'] === 'Chưa thi').length
        }));
        
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');

        // Add sheet for each class
        Object.keys(studentsByClass).forEach(className => {
          const classSheet = XLSX.utils.json_to_sheet(studentsByClass[className]);
          // Clean class name for sheet name (Excel has restrictions)
          const cleanClassName = className.replace(/[\\/*?[\]:]/g, '_').substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, classSheet, cleanClassName);
        });

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Set response headers
        const majorName = students[0]?.major_name || 'Unknown';
        const cleanMajorName = majorName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const fileName = `DanhSach_${cleanMajorName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        console.log('Sending Excel file:', fileName);
        return res.send(excelBuffer);
      }

      // Default JSON response
      return ResponseHelper.success(res, { students, groupBy });

    } catch (error) {
      console.error('Error exporting student list:', error);
      return ResponseHelper.error(res, `Không thể xuất danh sách sinh viên: ${error.message}`, 500);
    }
  }

  // ============= EXPORT REPORTS =============

  static async exportReport(req, res) {
    try {
      const { type, format = 'json', ...params } = req.query;
      
      let data;
      switch (type) {
        case 'dashboard':
          data = await this.getDashboardData(params);
          break;
        case 'organizational':
          data = await this.getOrganizationalData(params);
          break;
        case 'topic':
          data = await this.getTopicData(params);
          break;
        default:
          return ResponseHelper.error(res, 'Invalid report type', 400);
      }

      if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.csv`);
        return res.send(this.convertToCSV(data));
      }

      return ResponseHelper.success(res, data);

    } catch (error) {
      console.error('Error exporting report:', error);
      return ResponseHelper.error(res, 'Không thể xuất báo cáo', 500);
    }
  }

  static convertToCSV(data) {
    // Basic CSV conversion - would need more sophisticated implementation
    return JSON.stringify(data);
  }
}

module.exports = AdvancedReportController;
