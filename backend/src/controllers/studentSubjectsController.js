const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');
const ExamOptimizationService = require('../services/ExamOptimizationService');
const CacheService = require('../services/CacheService');
const PerformanceMonitor = require('../services/PerformanceMonitor');

class StudentSubjectsController {
  // Thêm phương thức mới để lấy chi tiết câu hỏi cho bài thi của sinh viên
  static async getExamQuestions(req, res) {
    try {
      const { topicId } = req.params;
      const user = req.user;

      console.log(`Student ${user.username} (ID: ${user.id}) requesting questions for topic ID ${topicId}`);
      
      // KIỂM TRA LỊCH THI TRƯỚC KHI CHO PHÉP LÀM BÀI (trừ admin)
      const isAdmin = user.role && user.role.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        // Lấy thông tin khoa/ngành của sinh viên
        const academicQuery = `
          SELECT d.id as department_id, m.id as major_id, s.id as student_id
          FROM Students s
          JOIN Classes c ON s.class_id = c.id  
          JOIN Majors m ON c.major_id = m.id
          JOIN Departments d ON m.department_id = d.id
          WHERE s.user_id = ?
          LIMIT 1`;
        
        const academic = await DatabaseService.execute(academicQuery, [user.id]);
        if (!academic || academic.length === 0) {
          return ResponseHelper.error(res, 'Không tìm thấy thông tin khoa/ngành của sinh viên', 422);
        }
        const { department_id, major_id, student_id } = academic[0];

        // Kiểm tra có lịch thi đang diễn ra cho topic này không
        const scheduleCheck = await DatabaseService.execute(
          `SELECT 1 FROM Schedules 
           WHERE topic_id = ?
             AND (
                   (department_id = ? AND major_id = ?)
                OR (department_id = ? AND major_id IS NULL)
                OR (department_id IS NULL AND major_id IS NULL)
             )
             AND NOW() BETWEEN start AND end 
           LIMIT 1`,
          [topicId, department_id, major_id, department_id]
        );

        if (!scheduleCheck || scheduleCheck.length === 0) {
          return ResponseHelper.error(res, 'Chưa đến thời gian làm bài hoặc lịch thi đã kết thúc. Vui lòng kiểm tra lại lịch thi.', 403);
        }
        
        // Dùng student_id từ academic query
        var finalStudentId = student_id;
      } else {
        // Admin có thể bypass kiểm tra lịch thi
        console.log(`Admin user ${user.username} bypassing schedule check for topic ${topicId}`);
        
        // Lấy student_id từ user_id cho admin
        const studentQuery = await DatabaseService.execute(
          'SELECT id FROM Students WHERE user_id = ?',
          [user.id]
        );
        
        if (!studentQuery || studentQuery.length === 0) {
          return ResponseHelper.error(res, 'Không tìm thấy thông tin sinh viên', 404);
        }
        
        var finalStudentId = studentQuery[0].id;
      }
      
      // Kiểm tra xem topic có tồn tại không - với cache
      let topicCheck = null;
      try {
        // Thử lấy từ cache trước
        topicCheck = await CacheService.getTopicMetadata(topicId);
      } catch (cacheError) {
        // Bỏ qua lỗi cache, sẽ lấy từ database
        console.warn(`Cache error getting topic metadata: ${cacheError.message}`);
      }
      
      if (!topicCheck) {
        // Cache miss - lấy từ database
        console.log(`Cache MISS for topic ${topicId}, querying database`);
        const topicResult = await DatabaseService.execute(
          'SELECT id, name, duration_minutes, pass_score FROM Topics WHERE id = ?',
          [topicId]
        );
        
        if (!topicResult || topicResult.length === 0) {
          return ResponseHelper.error(res, 'Không tìm thấy chuyên đề này', 404);
        }
        
        topicCheck = topicResult[0];
        
        // Thử cache topic metadata nếu có thể
        try {
          await CacheService.cacheTopicMetadata(topicId, topicCheck);
          console.log(`Cache MISS: Cached topic ${topicId} metadata`);
        } catch (cacheError) {
          // Bỏ qua lỗi cache, đã có data từ DB
          console.warn(`Could not cache topic metadata: ${cacheError.message}`);
        }
      } else {
        console.log(`Cache HIT: Using cached topic ${topicId} metadata`);
      }

      // Sử dụng student_id từ academic query (đã có sẵn)
      // const studentId = student_id; // đã được declare ở trên

      // Sử dụng ExamOptimizationService để tạo exam session tối ưu
      console.log(`Starting exam session creation for student ${finalStudentId}, topic ${topicId}`);
      const startTime = Date.now();
      let examId, questions;
      try {
        const result = await ExamOptimizationService.createExamSession(finalStudentId, topicId, user.id);
        if (!result || !result.examId || !result.questions) {
          throw new Error('Kết quả tạo bài thi không hợp lệ');
        }
        examId = result.examId;
        questions = result.questions;
        console.log(`ExamSession created successfully: examId=${examId}, questionCount=${questions ? questions.length : 0}`);
      } catch (error) {
        console.error("Error creating exam session:", error);
        // Trả về lỗi dưới dạng success với trạng thái lỗi để frontend có thể hiển thị
        return ResponseHelper.success(res, { 
          error: true, 
          errorMessage: error.message,
          errorType: 'exam_creation_failed'
        }, 'Lỗi khi tạo bài thi: ' + error.message);
      }
      const duration = Date.now() - startTime;
      
      // Track performance
      PerformanceMonitor.trackExamStart(user.id, examId);
      PerformanceMonitor.trackQuery('createExamSession', duration);
      
      console.log(`Created optimized exam session ${examId} with ${questions.length} questions for topic ID ${topicId} in ${duration}ms`);

      if (!questions || questions.length === 0) {
        return ResponseHelper.success(
          res, 
          { questions: [], topic: topicCheck }, 
          'Chuyên đề này chưa có câu hỏi'
        );
      }

      // Removed saved answers loading - using localStorage instead
      // Questions now come clean without server-side progress tracking

      // Lấy đáp án cho từng câu hỏi
      for (const question of questions) {
        // Chuyển đổi is_multiple_choice thành kiểu dữ liệu 'single_choice' hoặc 'multiple_choice'
        question.type = question.is_multiple_choice ? 'multiple_choice' : 'single_choice';
        delete question.is_multiple_choice; // Xóa trường cũ

        const answersQuery = `
          SELECT id, content, is_correct 
          FROM Answers 
          WHERE question_id = ? AND (is_active IS NULL OR is_active = TRUE)
          ORDER BY id ASC
        `;
        
        const answers = await DatabaseService.execute(answersQuery, [question.id]);
        
        // Format đáp án để phù hợp với frontend
        question.options = answers.map((ans, idx) => ({
          id: String.fromCharCode(65 + idx), // Chuyển thành A, B, C, D
          answerId: ans.id, // Lưu ID thực tế để mapping
          text: ans.content,
          isCorrect: !!ans.is_correct
        }));

        // Lưu mapping từ A,B,C,D về ID thực tế 
        question.answerMapping = {};
        question.options.forEach(opt => {
          question.answerMapping[opt.id] = opt.answerId;
        });

        // Removed savedAnswers - frontend will load from localStorage

        // Lưu thông tin đáp án đúng để so sánh khi nộp bài
        question.correctOptions = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt.id);
      }

      // Trả về danh sách câu hỏi và thông tin kỳ thi
      return ResponseHelper.success(res, {
        examId: examId,
        topic: {
          id: topicCheck.id,
          name: topicCheck.name,
          timeLimit: topicCheck.duration_minutes,
          passScore: topicCheck.pass_score
        },
        questions: questions
      }, 'Lấy danh sách câu hỏi thành công');
      
    } catch (error) {
      console.error('Get exam questions error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy câu hỏi bài thi: ' + error.message, 500);
    }
  }

  // Check if student can take quiz for a topic
  static async canTakeQuiz(req, res) {
    try {
      const { topicId } = req.params;
      const user = req.user;

      console.log(`Student ${user.username} (ID: ${user.id}) checking can-take for topic ID ${topicId}`);
      
      // Basic checks
      if (!topicId) {
        return ResponseHelper.error(res, 'Topic ID không hợp lệ', 400);
      }

      // Check if topic exists
      const topicQuery = await DatabaseService.execute(
        'SELECT id, name FROM Topics WHERE id = ?',
        [topicId]
      );
      
      if (!topicQuery || topicQuery.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề này', 404);
      }

      // Get student info
      const studentQuery = await DatabaseService.execute(
        'SELECT id FROM Students WHERE user_id = ?',
        [user.id]
      );
      
      if (!studentQuery || studentQuery.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin sinh viên', 404);
      }

      // Lấy thông tin học thuật (department/major) của sinh viên
      const academicQuery = `
        SELECT d.id as department_id, m.id as major_id
        FROM Students s
          INNER JOIN Classes c ON s.class_id = c.id
          INNER JOIN Majors m ON c.major_id = m.id
          INNER JOIN Departments d ON m.department_id = d.id
        WHERE s.user_id = ?
        LIMIT 1`;
      const academic = await DatabaseService.execute(academicQuery, [user.id]);
      if (!academic || academic.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin khoa/ngành của sinh viên', 422);
      }
      const { department_id, major_id } = academic[0];

      // Kiểm tra có lịch thi đang diễn ra cho topic này không
      const scheduleCheck = await DatabaseService.execute(
        `SELECT 1 FROM Schedules 
         WHERE topic_id = ?
           AND (
                 (department_id = ? AND major_id = ?)
              OR (department_id = ? AND major_id IS NULL)
              OR (department_id IS NULL AND major_id IS NULL)
           )
           AND NOW() BETWEEN start AND end 
         LIMIT 1`,
        [topicId, department_id, major_id, department_id]
      );

      if (!scheduleCheck || scheduleCheck.length === 0) {
        return ResponseHelper.success(res, {
          canTake: false,
          topicId,
          message: 'Chưa đến thời gian làm bài hoặc lịch thi đã kết thúc'
        }, 'Không có lịch thi đang diễn ra');
      }

      return ResponseHelper.success(res, {
        canTake: true,
        topicId,
        message: 'Có thể làm bài vì đang trong thời gian của lịch thi'
      }, 'Kiểm tra quyền truy cập thành công');
      
    } catch (error) {
      console.error('Can take quiz error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi kiểm tra quyền truy cập: ' + error.message, 500);
    }
  }

  static async getStudentSubjects(req, res) {
    console.log('=== getStudentSubjects CALLED ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    
    try {
      const user = req.user;
      
      console.log('=== USER DEBUG ===');
      console.log('User ID:', user?.id);
      console.log('User role:', user?.role);
      console.log('User username:', user?.username);
      console.log('==================');
      
      // Log để debug thông tin user
      console.log('=== AUTH DEBUG ===');
      console.log('User:', user);
      console.log('Is authenticated:', user && user.id ? true : false);
      console.log('User type:', user && user.role ? user.role.toLowerCase() : 'unknown');
      
      // Trước tiên, kiểm tra cấu trúc bảng Users để xem có các cột department, major, class không
      let hasExtendedUserColumns = false;
      try {
        const userColumnsCheck = await DatabaseService.execute(`
          SELECT COUNT(*) as count
          FROM information_schema.columns 
          WHERE table_name = 'Users' 
          AND column_name IN ('department', 'major', 'class')
        `);
        
        hasExtendedUserColumns = userColumnsCheck[0].count > 0;
        console.log(`User table has extended columns (department/major/class): ${hasExtendedUserColumns}`);
      } catch (err) {
        console.error('Error checking Users table structure:', err);
        hasExtendedUserColumns = false;
      }
      
      // Xây dựng truy vấn bắt buộc phải có đủ Students -> Classes -> Majors -> Departments
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
      
      console.log(`Looking up student information for user ID: ${user.id}`);
      
      let studentInfo;
      
      try {
        // Truy vấn đầy đủ bắt buộc có đủ chuỗi quan hệ; nếu không có bản ghi -> thiếu thông tin
        studentInfo = await DatabaseService.execute(studentQuery, [user.id]);

        if (!studentInfo || studentInfo.length === 0) {
          // Nếu là ADMIN thì cho qua, còn STUDENT thì báo lỗi rõ ràng
            if (user.role === 'ADMIN') {
              console.warn('No academic mapping for admin user, continuing as admin');
            } else {
              return ResponseHelper.error(
                res,
                'Sinh viên chưa được gán vào Lớp / Ngành / Khoa. Vui lòng liên hệ quản trị để cập nhật trước khi xem lịch thi.',
                422
              );
            }
        }
        
        console.log('Student query result:', studentInfo[0]);
      } catch (dbError) {
        console.error('Error executing student query:', dbError);
        
        // Tạo dữ liệu tối thiểu để tránh lỗi
        studentInfo = [{
          user_id: user.id,
          username: user.username || 'Unknown User',
          user_role: user.role || 'student',
          email: user.email || '',
          student_id: null,
          class_id: null,
          major_id: null,
          department_id: null,
          class_name: 'Chưa cập nhật',
          major_name: 'Chưa cập nhật',
          department_name: 'Chưa cập nhật'
        }];
        
        console.log('Using minimal fallback user data:', studentInfo[0]);
      }
      
      // Nếu có bản ghi, lấy hàng đầu tiên
      const info = studentInfo && studentInfo[0] ? studentInfo[0] : {};

      // Bắt buộc phải có đủ thông tin; nếu thiếu bất kỳ phần nào (trường hợp admin không có) thì xử lý riêng
      const studentName = info.full_name || info.username || user.username;
      const studentCode = info.student_code || null;
      const className = info.class_name || null;
      const majorName = info.major_name || null;
      const departmentName = info.department_name || null;

      const department = info.department_id || 0;
      const major = info.major_id || 0;

      if (user.role !== 'ADMIN') {
        if (!department || !major) {
          return ResponseHelper.error(
            res,
            'Thiếu thông tin khoa hoặc ngành của sinh viên. Liên hệ quản trị để cập nhật trước khi xem lịch thi.',
            422
          );
        }
      }

      console.log('[ACADEMIC] dept:', department, 'major:', major);

      // Truy vấn lịch thi: ưu tiên khớp CHÍNH XÁC department & major; bao gồm lịch theo khoa (major_id IS NULL)
      // và lịch toàn hệ thống (department_id IS NULL AND major_id IS NULL)
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

      let scheduleRows = [];
      try {
  scheduleRows = await DatabaseService.execute(activeScheduleQuery, [department, major, department]);
        console.log('Active schedules found:', scheduleRows.length);
      } catch (e) {
        console.error('Active schedule query error:', e);
      }
    // Nếu không có lịch đang diễn ra -> trả về rỗng (không hiển thị lịch sắp tới nữa)
    if (!scheduleRows || scheduleRows.length === 0) {
        return ResponseHelper.success(
          res,
          {
            subjects: [],
            studentInfo: {
              name: studentName,
              studentCode,
              class: className,
              major: majorName,
              department: departmentName
            },
            metadata: {
        reason: 'no_active_schedule',
              departmentId: department,
              majorId: major
            }
          },
      'Hiện tại không có lịch thi nào đang diễn ra.'
        );
      }

      // Lấy topic_id từ lịch thi hợp lệ
      const topicIds = scheduleRows.map(r => r.topic_id);
      if (topicIds.length === 0) {
        return ResponseHelper.success(res, { subjects: [] }, 'Không có chuyên đề tương ứng với lịch thi.');
      }

      // Truy vấn đơn giản lấy thông tin topic, không phụ thuộc question_count
      const topicsBase = await DatabaseService.execute(`
        SELECT 
          t.id,
          t.name,
          t.description,
          t.duration_minutes,
          t.pass_score
        FROM Topics t
        WHERE t.id IN (${topicIds.map(() => '?').join(',')})
        ORDER BY t.name ASC
      `, topicIds);

      // Đếm số câu hỏi thực tế từ bảng Questions cho từng topic
      const topics = [];
      for (const topic of topicsBase) {
        try {
          const countResult = await DatabaseService.execute('SELECT COUNT(*) as cnt FROM Questions WHERE topic_id = ?', [topic.id]);
          topic.totalQuestions = countResult[0].cnt || 0;
        } catch (countErr) {
          console.error('Error counting questions for topic', topic.id, countErr);
          topic.totalQuestions = 0;
        }
        topics.push(topic);
      }
      console.log(`Found ${topics.length} topics with real question counts`);
      
      // Kiểm tra xem bảng Exams có tồn tại không
      let hasExamsTable = true;
      try {
        const checkExamsTable = await DatabaseService.execute(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'Exams'"
        );
        
        hasExamsTable = checkExamsTable[0].count > 0;
        console.log(`Exams table exists: ${hasExamsTable}`);
      } catch (err) {
        console.error('Error checking Exams table:', err);
        hasExamsTable = false;
      }
      
      // Thêm trạng thái cho từng chuyên đề
      for (const topic of topics) {
        // Đảm bảo các trường bắt buộc
        if (!topic.description) topic.description = '';
        if (!topic.duration_minutes) topic.duration_minutes = 45;
        if (!topic.pass_score) topic.pass_score = 70;
        if (!topic.totalQuestions) topic.totalQuestions = 0;
        
        // Kiểm tra lịch sử làm bài chỉ khi bảng Exams tồn tại
        if (hasExamsTable) {
          try {
            // Lấy student_id trước
            const studentQuery = await DatabaseService.execute(
              'SELECT id FROM Students WHERE user_id = ?',
              [user.id]
            );
            
            if (studentQuery && studentQuery.length > 0) {
              const studentId = studentQuery[0].id;
              
              // Lấy exam với điểm cao nhất để hiển thị trạng thái (không phụ thuộc vào exam mới nhất)
              const bestExamQuery = await DatabaseService.execute(
                  `SELECT id, status, score, end_time, start_time, 
                          MAX(score) as best_score
                   FROM Exams 
                   WHERE student_id = ? AND topic_id = ? 
                     AND score IS NOT NULL 
                     AND status IN ('SUBMITTED', 'REVIEWED')
                   GROUP BY student_id, topic_id
                   ORDER BY score DESC, start_time DESC
                   LIMIT 1`,
                  [studentId, topic.id]
                );

              // Kiểm tra exam đang trong quá trình làm
              const inProgressExam = await DatabaseService.execute(
                  `SELECT id, status FROM Exams 
                   WHERE student_id = ? AND topic_id = ? 
                     AND status = 'IN_PROGRESS'
                   ORDER BY start_time DESC 
                   LIMIT 1`,
                  [studentId, topic.id]
                );
              
              // Lấy bài thi gần nhất của student cho topic này 
              const latestExam = await DatabaseService.execute(
                  `SELECT id, status, score, end_time, start_time FROM Exams 
                   WHERE student_id = ? AND topic_id = ? 
                   ORDER BY start_time DESC 
                   LIMIT 1`,
                  [studentId, topic.id]
                );
              
              if (latestExam && latestExam.length > 0) {
                const exam = latestExam[0];
                
                if (exam.status === 'IN_PROGRESS') {
                  // Bài thi đang làm dở - cho phép tiếp tục
                  topic.examStatus = {
                    taken: true,
                    passed: false,
                    inProgress: true,
                    examId: exam.id,
                    score: null
                  };
                } else if (exam.status === 'SUBMITTED' || exam.status === 'REVIEWED') {
                  // Bài thi đã hoàn thành - kiểm tra pass/fail
                  const examScore = exam.score;
                  const passScore = topic.pass_score;
                  
                  const passed = (
                    examScore !== null && 
                    passScore !== null && 
                    Number(examScore) >= Number(passScore)
                  );
                  
                  topic.examStatus = {
                    taken: true,
                    passed: passed,
                    inProgress: false,
                    score: examScore,
                    examId: exam.id,
                    locked: passed // Chỉ khóa nếu đã pass
                  };
                } else {
                  // Status khác - coi như chưa làm
                  topic.examStatus = { 
                    taken: false, 
                    passed: false,
                    inProgress: false,
                    score: null 
                  };
                }
              } else {
                // Chưa làm bài nào
                topic.examStatus = { 
                  taken: false, 
                  passed: false,
                  inProgress: false,
                  score: null 
                };
              }
            } else {
              topic.examStatus = { 
                taken: false, 
                passed: false,
                inProgress: false,
                score: null 
              };
            }
          } catch (err) {
            console.error(`Error checking exam history for topic ${topic.id}:`, err);
            topic.examStatus = { 
              taken: false, 
              passed: false,
              inProgress: false,
              error: true,
              score: null 
            };
          }
        } else {
          // Không có bảng Exams, đặt trạng thái mặc định
          topic.examStatus = { 
            taken: false, 
            passed: false,
            inProgress: false,
            score: null 
          };
        }
      }

      console.log(`Returning ${topics.length} subjects to student`);
      
        // Trả về đối tượng hợp lệ cho frontend với thông tin chi tiết về sinh viên và chuyên đề
        const responseData = {
          subjects: topics || [],
          studentInfo: {
            name: studentName,
            studentCode: studentCode,
            class: className,
            major: majorName,
            department: departmentName
          },
          metadata: {
            total: topics.length,
            departmentId: department,
            majorId: major,
            classId: info.class_id,
            retrievedWith: scheduleRows.length > 0 ? 'schedule' : 'fallback',
            status: topics.length > 0 ? 'success' : 'no_data'
          }
        };      return ResponseHelper.success(res, responseData, 
        topics.length > 0 
          ? 'Lấy danh sách chuyên đề cho sinh viên thành công' 
          : 'Không tìm thấy chuyên đề phù hợp cho sinh viên');
    } catch (error) {
      console.error('Get student subjects error:', error);
      
      // Không sử dụng emergency fallback - thay vào đó trả về thông báo lỗi thích hợp
      return ResponseHelper.error(res, 'Lỗi hệ thống khi kiểm tra lịch thi. Vui lòng thử lại sau.', 500);
    }
  }

  // Removed autosaveExam method - using localStorage instead

  // Thêm phương thức để lưu kết quả bài thi của sinh viên
  static async submitExam(req, res) {
    try {
      console.log("Submit exam request received:", {
        body: req.body,
        params: req.params,
        userId: req.user?.id
      });
      
      const { answers, topicId } = req.body;
      const examId = req.params.examId;
      const user = req.user;
      
      // Kiểm tra dữ liệu đầu vào
      if (!user || !user.id) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin người dùng', 401);
      }
      
      if (!topicId) {
        return ResponseHelper.error(res, 'Thiếu thông tin chuyên đề (topicId)', 400);
      }
      
      if (!answers) {
        return ResponseHelper.error(res, 'Thiếu dữ liệu bài làm (answers)', 400);
      }
      
      // Lấy student_id từ user_id
      const studentQuery = await DatabaseService.execute(
        'SELECT id FROM Students WHERE user_id = ?',
        [user.id]
      );
      if (!studentQuery || studentQuery.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin sinh viên', 404);
      }
      const studentId = studentQuery[0].id;
      
      // Kiểm tra exam id từ tham số có tồn tại không
      let examCheck = await DatabaseService.execute(
        'SELECT id, status FROM Exams WHERE id = ? AND student_id = ? LIMIT 1',
        [examId, studentId]
      );
      
      if (!examCheck || examCheck.length === 0) {
        // Fallback: Kiểm tra nếu có exam cho topic này
        examCheck = await DatabaseService.execute(
          'SELECT id, status FROM Exams WHERE student_id = ? AND topic_id = ? LIMIT 1',
          [studentId, topicId]
        );
        
        if (!examCheck || examCheck.length === 0) {
          return ResponseHelper.error(res, 'Chưa khởi tạo bài thi cho chuyên đề này', 400);
        }
      }
      const validExamId = examCheck[0].id;
      
      // Lấy thông tin về chuyên đề
      const topicInfo = await DatabaseService.execute(
        'SELECT id, name, pass_score FROM Topics WHERE id = ?',
        [topicId]
      );
      if (!topicInfo || topicInfo.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin chuyên đề', 404);
      }
      // Lấy danh sách câu hỏi và đáp án đúng
      const questionQuery = `
        SELECT 
          q.id,
          q.content,
          q.is_multiple_choice
        FROM Questions q
        WHERE q.topic_id = ?
      `;
      const questions = await DatabaseService.execute(questionQuery, [topicId]);
      
      // Tính điểm dựa trên câu trả lời
      let correctCount = 0;
      const questionResults = [];
      for (const question of questions) {
        // ...existing code...
        const allAnswersQuery = `
          SELECT id, content, is_correct
          FROM Answers 
          WHERE question_id = ?
          ORDER BY id ASC
        `;
        const allAnswers = await DatabaseService.execute(allAnswersQuery, [question.id]);
        const userSelectedOptions = answers[question.id] || [];
        let userAnswerIds = [];
        for (const selected of userSelectedOptions) {
          if (typeof selected === 'string' && selected.match(/^[A-Z]$/)) {
            const index = selected.charCodeAt(0) - 65;
            if (index >= 0 && index < allAnswers.length) {
              userAnswerIds.push(allAnswers[index].id);
            }
          } else {
            userAnswerIds.push(selected);
          }
        }
        const correctAnswers = allAnswers.filter(ans => ans.is_correct === 1);
        let questionScore = 0;
        if (question.is_multiple_choice) {
          const correctAnswerIds = correctAnswers.map(ans => ans.id);
          const totalCorrectAnswers = correctAnswerIds.length;
          if (totalCorrectAnswers > 0 && userAnswerIds.length > 0) {
            const correctlySelected = userAnswerIds.filter(id => correctAnswerIds.includes(id)).length;
            const wronglySelected = userAnswerIds.filter(id => !correctAnswerIds.includes(id)).length;
            questionScore = Math.max(0, (correctlySelected / totalCorrectAnswers) - (wronglySelected / totalCorrectAnswers));
          }
        } else {
          if (userAnswerIds.length === 1 && correctAnswers.length > 0) {
            const isCorrect = correctAnswers.some(ans => ans.id === userAnswerIds[0]);
            questionScore = isCorrect ? 1 : 0;
          }
        }
        correctCount += questionScore;
        questionResults.push({
          questionId: question.id,
          userAnswers: userAnswerIds,
          questionScore: questionScore
        });
      }
      
      // Tính điểm và xác định kết quả đạt/không đạt
      const score = questions.length > 0 
        ? Math.round((correctCount / questions.length) * 100) 
        : 0;
      const isPassed = (
        score > 0 &&
        topicInfo[0].pass_score !== null && Number(topicInfo[0].pass_score) > 0 &&
        score >= Number(topicInfo[0].pass_score)
      );
      // Cập nhật kết quả vào database
      await DatabaseService.execute(
        `UPDATE Exams 
         SET end_time = NOW(), 
             score = ?,
             status = ?
         WHERE id = ?`,
        [score, 'SUBMITTED', validExamId]
      );
      
      // Removed ExamProgress saving - only final submission matters
      // localStorage handles progress tracking during exam
      
      // Trả về kết quả cho sinh viên
      return ResponseHelper.success(res, {
        examId: validExamId,
        score: score,
        correctAnswers: Math.round(correctCount * 100) / 100,
        totalQuestions: questions.length,
        passScore: topicInfo[0].pass_score,
        passed: isPassed
      }, 'Nộp bài thi thành công');
      
    } catch (error) {
      console.error('Submit exam error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi nộp bài thi: ' + error.message, 500);
    }
  }
  
  // Thêm phương thức để xem kết quả bài thi mà không tạo exam mới
  static async getExamResult(req, res) {
    try {
      const { topicId } = req.params;
      const user = req.user;

      // Lấy student_id từ user_id
      const studentQuery = await DatabaseService.execute(
        'SELECT id FROM Students WHERE user_id = ?',
        [user.id]
      );
      
      if (!studentQuery || studentQuery.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin sinh viên', 404);
      }
      
      const studentId = studentQuery[0].id;

      // Lấy bài thi tốt nhất (điểm cao nhất) đã hoàn thành của student cho topic này
      const bestExam = await DatabaseService.execute(
        `SELECT e.id, e.score, e.start_time, e.end_time, e.status, t.name, t.pass_score
         FROM Exams e
         JOIN Topics t ON e.topic_id = t.id
         WHERE e.student_id = ? AND e.topic_id = ? 
           AND e.status IN ('SUBMITTED', 'REVIEWED')
           AND e.score IS NOT NULL
         ORDER BY e.score DESC, e.start_time DESC
         LIMIT 1`,
        [studentId, topicId]
      );

      if (!bestExam || bestExam.length === 0) {
        return ResponseHelper.error(res, 'Chưa có kết quả bài thi nào cho chuyên đề này', 404);
      }

      const exam = bestExam[0];
      const passed = exam.score >= exam.pass_score;

      return ResponseHelper.success(res, {
        examId: exam.id,
        topicName: exam.name,
        score: exam.score,
        passScore: exam.pass_score,
        passed: passed,
        startTime: exam.start_time,
        endTime: exam.end_time,
        duration: exam.end_time ? 
          Math.floor((new Date(exam.end_time) - new Date(exam.start_time)) / 60000) : 
          null
      }, 'Lấy kết quả bài thi thành công');
      
    } catch (error) {
      console.error('Get exam result error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy kết quả bài thi: ' + error.message, 500);
    }
  }
  
  // Thêm phương thức lấy lịch sử làm bài thi của sinh viên
  static async getExamHistory(req, res) {
    try {
      const user = req.user;
      
      // Lấy student_id từ user_id
      const studentQuery = await DatabaseService.execute(
        'SELECT id FROM Students WHERE user_id = ?',
        [user.id]
      );
      
      if (!studentQuery || studentQuery.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy thông tin sinh viên', 404);
      }
      
      const studentId = studentQuery[0].id;
      
      const historyQuery = `
        SELECT 
          e.id as exam_id,
          e.start_time,
          e.end_time,
          e.score,
          e.status,
          t.id as topic_id,
          t.name as topic_name,
          t.pass_score
        FROM Exams e
        JOIN Topics t ON e.topic_id = t.id
        WHERE e.student_id = ?
        ORDER BY e.start_time DESC
      `;
      
      const examHistory = await DatabaseService.execute(historyQuery, [studentId]);
      
      // Format kết quả cho dễ sử dụng ở frontend
      const formattedHistory = examHistory.map(exam => {
        const passed = (
          exam.score !== null && Number(exam.score) > 0 &&
          exam.pass_score !== null && Number(exam.pass_score) > 0 &&
          Number(exam.score) >= Number(exam.pass_score)
        );
        return {
          examId: exam.exam_id,
          topicId: exam.topic_id,
          topicName: exam.topic_name,
          startTime: exam.start_time,
          endTime: exam.end_time,
          duration: exam.end_time ? 
            Math.floor((new Date(exam.end_time) - new Date(exam.start_time)) / 60000) : 
            null,
          score: exam.score,
          passScore: exam.pass_score,
          passed: passed,
          status: exam.status || (exam.end_time ? 'SUBMITTED' : 'IN_PROGRESS')
        };
      });
      
      return ResponseHelper.success(res, {
        history: formattedHistory
      }, 'Lấy lịch sử làm bài thi thành công');
      
    } catch (error) {
      console.error('Get exam history error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy lịch sử làm bài: ' + error.message, 500);
    }
  }
}

module.exports = StudentSubjectsController;
