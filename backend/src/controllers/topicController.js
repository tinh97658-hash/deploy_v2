const ResponseHelper = require('../utils/ResponseHelper');
const CacheService = require('../services/CacheService');

class TopicController {
  // Lấy danh sách tất cả topics
  static async getTopics(req, res) {
    console.log('=== TopicController.getTopics CALLED ===');
    console.log('Request URL:', req.originalUrl);
    console.log('User:', req.user?.username, 'Role:', req.user?.role);
    console.log('============================================');
    
    try {
      const DatabaseService = require('../services/DatabaseService');
      
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const offset = (page - 1) * limit;
      
      // Build where clause for search
      let whereClause = '';
      let queryParams = [];
      
      if (search) {
        whereClause = 'WHERE t.name LIKE ? OR t.description LIKE ?';
        queryParams = [`%${search}%`, `%${search}%`];
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM Topics t ${whereClause}`;
      const countResult = await DatabaseService.execute(countQuery, queryParams);
      const total = countResult[0]?.total || 0;
      
      // Get paginated topics
      const query = `
        SELECT 
          t.id,
          t.name,
          t.description,
          t.duration_minutes,
          t.pass_score
        FROM Topics t
        ${whereClause}
        ORDER BY t.id ASC
        LIMIT ? OFFSET ?
      `;
      
      const topics = await DatabaseService.execute(query, [...queryParams, limit, offset]);
      
      // Đếm lại số lượng câu hỏi cho từng chuyên đề
      for (const topic of topics) {
        const countRows = await DatabaseService.execute('SELECT COUNT(*) as count FROM Questions WHERE topic_id = ?', [topic.id]);
        topic.totalQuestions = countRows[0]?.count ?? 0;
      }
      
      const totalPages = Math.ceil(total / limit);
      
      return ResponseHelper.success(res, {
        topics,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }, 'Lấy danh sách chuyên đề thành công');
    } catch (error) {
      console.error('Get topics error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy danh sách chuyên đề', 500);
    }
  }

  // Lấy thông tin chi tiết một topic
  static async getTopicById(req, res) {
    try {
      const { id } = req.params;
      const DatabaseService = require('../services/DatabaseService');
      const query = `
        SELECT 
          t.id,
          t.name,
          t.description,
          t.duration_minutes,
          t.pass_score,
          t.question_count as totalQuestions
        FROM Topics t
        WHERE t.id = ?
        LIMIT 1
      `;
      const rows = await DatabaseService.execute(query, [id]);
      if (!rows.length) {
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề', 404);
      }
      return ResponseHelper.success(res, {
        topic: rows[0]
      }, 'Lấy thông tin chuyên đề thành công');
    } catch (error) {
      console.error('Get topic by ID error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy thông tin chuyên đề', 500);
    }
  }

  // Lấy câu hỏi của một topic
  static async getTopicQuestions(req, res) {
    try {
      const { id } = req.params;
      const DatabaseService = require('../services/DatabaseService');
      // Lấy danh sách câu hỏi của chuyên đề
      const query = `
        SELECT 
          q.id,
          q.content as question,
          q.is_multiple_choice as type
        FROM Questions q
        WHERE q.topic_id = ?
        ORDER BY q.id ASC
      `;
      const questions = await DatabaseService.execute(query, [id]);
      // Lấy đáp án cho từng câu hỏi (chỉ lấy đáp án active)
      for (const question of questions) {
        const answersQuery = `SELECT id, content, is_correct FROM Answers WHERE question_id = ? AND (is_active IS NULL OR is_active = TRUE)`;
        const answers = await DatabaseService.execute(answersQuery, [question.id]);
        question.options = answers.map((ans, idx) => ({
          id: String.fromCharCode(65 + idx),
          text: ans.content,
          isCorrect: !!ans.is_correct
        }));
        question.correctAnswer = question.options.find(opt => opt.isCorrect)?.id || null;
        question.type = question.type ? 'multiple_choice' : 'single_choice';
      }
      return ResponseHelper.success(res, {
        questions,
        total: questions.length
      }, 'Lấy câu hỏi thành công');
    } catch (error) {
      console.error('Get topic questions error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy câu hỏi', 500);
    }
  }

  // (Removed duplicate updateTopic – consolidated version is below)

  // Import câu hỏi từ file Excel
  static async importQuestionsExcel(req, res) {
    try {
      const { id } = req.params;
      const xlsx = require('xlsx');
      const fs = require('fs');
      
      if (!req.file) {
        return ResponseHelper.error(res, 'Không có file được upload', 400);
      }

      // Kiểm tra xem topic có tồn tại không
      const DatabaseService = require('../services/DatabaseService');
      const topicExists = await DatabaseService.execute('SELECT id FROM Topics WHERE id = ?', [id]);
      if (!topicExists.length) {
        fs.unlinkSync(req.file.path); // Cleanup file
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề', 404);
      }

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      let inserted = 0;
      let errors = [];
      let skipped = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const rowNum = rowIndex + 2; // Excel rows start from 2 (after header)
        
        // Đọc dữ liệu từ file Excel
        const questionText = row['question'] || row['Câu hỏi'] || row['Question'] || row['content'];
        const type = row['type'] || row['Loại'] || row['Type'] || 'single_choice';
        const optionA = row['optionA'] || row['option_a'] || row['Đáp án A'] || row['A'];
        const optionB = row['optionB'] || row['option_b'] || row['Đáp án B'] || row['B'];
        const optionC = row['optionC'] || row['option_c'] || row['Đáp án C'] || row['C'];
        const optionD = row['optionD'] || row['option_d'] || row['Đáp án D'] || row['D'];
        const correctAnswer = row['correctAnswer'] || row['correct'] || row['Đáp án đúng'] || row['Correct'];

        // Validate dữ liệu bắt buộc - Chuyển questionText về string trước
        const questionTextStr = questionText !== undefined && questionText !== null ? String(questionText).trim() : '';
        
        if (!questionTextStr) {
          errors.push(`Dòng ${rowNum}: Thiếu nội dung câu hỏi`);
          skipped++;
          continue;
        }

        if (!optionA || !optionB) {
          errors.push(`Dòng ${rowNum}: Cần ít nhất 2 đáp án (A và B)`);
          skipped++;
          continue;
        }

        if (!correctAnswer) {
          errors.push(`Dòng ${rowNum}: Thiếu thông tin đáp án đúng`);
          skipped++;
          continue;
        }

        try {
          // Tạo danh sách options từ Excel - Chuyển tất cả về string trước
          const options = [];
          
          // Chuyển tất cả options về string trước khi xử lý
          const optionAStr = optionA !== undefined && optionA !== null ? String(optionA).trim() : '';
          const optionBStr = optionB !== undefined && optionB !== null ? String(optionB).trim() : '';
          const optionCStr = optionC !== undefined && optionC !== null ? String(optionC).trim() : '';
          const optionDStr = optionD !== undefined && optionD !== null ? String(optionD).trim() : '';
          
          if (optionAStr) {
            options.push({
              text: optionAStr,
              isCorrect: correctAnswer.toString().toLowerCase().includes('a')
            });
          }
          
          if (optionBStr) {
            options.push({
              text: optionBStr,
              isCorrect: correctAnswer.toString().toLowerCase().includes('b')
            });
          }
          
          if (optionCStr) {
            options.push({
              text: optionCStr,
              isCorrect: correctAnswer.toString().toLowerCase().includes('c')
            });
          }
          
          if (optionDStr) {
            options.push({
              text: optionDStr,
              isCorrect: correctAnswer.toString().toLowerCase().includes('d')
            });
          }

          // Kiểm tra có ít nhất 1 đáp án đúng
          const hasCorrectAnswer = options.some(opt => opt.isCorrect);
          if (!hasCorrectAnswer) {
            errors.push(`Dòng ${rowNum}: Không có đáp án nào được đánh dấu đúng`);
            skipped++;
            continue;
          }

          // Thêm câu hỏi vào database
          const isMultipleChoice = type.toLowerCase().includes('multiple') || correctAnswer.toString().toLowerCase().split('').filter(char => ['a', 'b', 'c', 'd'].includes(char)).length > 1;
          
          const questionResult = await DatabaseService.execute(
            'INSERT INTO Questions (topic_id, content, is_multiple_choice) VALUES (?, ?, ?)',
            [id, questionTextStr, isMultipleChoice ? 1 : 0]
          );
          
          const questionId = questionResult.insertId;

          // Thêm các đáp án
          let answersInserted = 0;
          for (const option of options) {
            try {
              await DatabaseService.execute(
                'INSERT INTO Answers (question_id, content, is_correct, is_active) VALUES (?, ?, ?, TRUE)',
                [questionId, option.text, option.isCorrect ? 1 : 0]
              );
              answersInserted++;
            } catch (answerError) {
              console.error(`Failed to insert answer "${option.text}":`, answerError);
            }
          }

          if (answersInserted === 0) {
            // Xóa câu hỏi nếu không có đáp án nào được thêm
            await DatabaseService.execute('DELETE FROM Questions WHERE id = ?', [questionId]);
            errors.push(`Dòng ${rowNum}: Không thể thêm đáp án nào, câu hỏi đã bị xóa`);
            skipped++;
            continue;
          }

          inserted++;
        } catch (err) {
          console.error(`Error processing row ${rowNum}:`, err);
          errors.push(`Dòng ${rowNum}: Lỗi database - ${err.message}`);
          skipped++;
        }
      }

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      // Cập nhật số lượng câu hỏi cho chuyên đề
      if (inserted > 0) {
        await DatabaseService.execute('UPDATE Topics SET question_count = question_count + ? WHERE id = ?', [inserted, id]);
        
        // Invalidate cache
        try {
          const CacheService = require('../services/CacheService');
          await CacheService.invalidateTopicCache(id);
          await CacheService.invalidateQuestionPools(id);
        } catch (e) {
          console.warn('Failed to invalidate cache after import:', e.message);
        }
      }

      // Prepare response
      const result = {
        total: rows.length,
        inserted: inserted,
        skipped: skipped,
        success: inserted > 0,
        errors: errors.length > 0 ? errors : null
      };

      let message = `Import hoàn thành: ${inserted}/${rows.length} câu hỏi được thêm thành công`;
      if (skipped > 0) {
        message += `, ${skipped} câu hỏi bị bỏ qua`;
      }

      return ResponseHelper.success(res, result, message);
    } catch (error) {
      console.error('Import questions Excel error:', error);
      // Cleanup file if exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return ResponseHelper.error(res, 'Lỗi import câu hỏi: ' + error.message, 500);
    }
  }

    // Thêm hàm importQuestions vào TopicController để xử lý import câu hỏi từ file Excel.
  static async importQuestions(req, res) {
    try {
      const { id } = req.params;
      
      console.log('-------------------');
      console.log('IMPORT QUESTIONS REQUEST');
      console.log('Topic ID:', id);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Check if request body is valid
      if (!req.body || typeof req.body !== 'object') {
        console.error('Invalid request body format');
        return ResponseHelper.error(res, 'Dữ liệu yêu cầu không hợp lệ', 400);
      }
      
      const { questions } = req.body;
      
      console.log('Questions extracted from request:', questions ? questions.length : 'none');
      
      if (!questions || !Array.isArray(questions)) {
        console.error('Invalid questions data format - questions must be an array');
        return ResponseHelper.error(res, 'Dữ liệu câu hỏi không hợp lệ, phải là mảng các câu hỏi', 400);
      }
      
      if (questions.length === 0) {
        console.error('Empty questions array');
        return ResponseHelper.error(res, 'Không có câu hỏi nào để import', 400);
      }
      
      // Kiểm tra xem topic có tồn tại không
      const DatabaseService = require('../services/DatabaseService');
      const topicExists = await DatabaseService.execute('SELECT id FROM Topics WHERE id = ?', [id]);
      if (!topicExists.length) {
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề', 404);
      }
      
      let inserted = 0;
      let errors = [];
      let skipped = 0;
      
      // Thêm từng câu hỏi vào database
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionNum = i + 1;
        
        if (!q.question) {
          errors.push(`Câu hỏi ${questionNum}: Thiếu nội dung câu hỏi`);
          skipped++;
          continue;
        }
        
        console.log('Processing question:', q.question);
        console.log('Options:', JSON.stringify(q.options));
        
        // Kiểm tra định dạng câu hỏi
        if (!q.options || !Array.isArray(q.options)) {
          errors.push(`Câu hỏi ${questionNum}: Không có đáp án hoặc đáp án không đúng định dạng`);
          skipped++;
          continue;
        }
        
        if (q.options.length < 2) {
          errors.push(`Câu hỏi ${questionNum}: Cần ít nhất 2 đáp án`);
          skipped++;
          continue;
        }
        
          // Kiểm tra và sửa các đáp án để đảm bảo định dạng đúng
          if (q.options && Array.isArray(q.options)) {
            // Clean up options - Chuyển tất cả dữ liệu về string và loại bỏ các option rỗng
            q.options = q.options.filter(opt => {
              if (opt && typeof opt === 'object') {
                // Chuyển tất cả giá trị về string, không quan tâm kiểu dữ liệu gốc
                if (opt.text !== undefined && opt.text !== null) {
                  return String(opt.text).trim() !== '';
                }
              }
              return false;
            });          // Make sure options have proper structure - Đơn giản hóa bằng cách chuyển tất cả về string
          q.options = q.options.map(opt => {
            // Chuyển mọi giá trị về string, không quan tâm kiểu dữ liệu gốc
            const optionText = opt.text !== undefined && opt.text !== null 
              ? String(opt.text).trim() 
              : '';
            
            return {
              text: optionText,
              isCorrect: !!opt.isCorrect
            };
          });
          
          // Check if there's at least one correct answer
          let hasCorrectAnswer = q.options.some(opt => opt.isCorrect);
          
          // If no correct answer, mark the first one as correct
          if (!hasCorrectAnswer && q.options.length > 0) {
            console.log(`No correct answer for "${q.question}". Setting first option as correct.`);
            q.options[0].isCorrect = true;
          }
        }
        
        // Validate we have at least 2 valid options
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`Câu hỏi ${questionNum}: Số lượng đáp án hợp lệ không đủ (cần ít nhất 2)`);
          skipped++;
          continue;
        }
        
        try {
          // Thêm câu hỏi vào database
          const isMultipleChoice = q.type === 'multiple_choice';
          
          console.log(`--- INSERTING QUESTION ---`);
          console.log(`Content: "${q.question}"`);
          console.log(`Type: ${isMultipleChoice ? 'multiple_choice' : 'single_choice'}`);
          console.log(`Options count: ${q.options.length}`);
          
          // Validate question text
          if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
            errors.push(`Câu hỏi ${questionNum}: Nội dung câu hỏi trống`);
            skipped++;
            continue;
          }
          
          // Insert the question
          const questionResult = await DatabaseService.execute(
            'INSERT INTO Questions (topic_id, content, is_multiple_choice) VALUES (?, ?, ?)',
            [id, q.question.trim(), isMultipleChoice ? 1 : 0]
          );
          
          const questionId = questionResult.insertId;
          console.log('Successfully inserted question with ID:', questionId);
          
          // Log all options
          console.log('Question options:');
          q.options.forEach((opt, idx) => {
            // Ensure safe string representation for logging
            const optionText = opt.text !== undefined && opt.text !== null 
              ? String(opt.text) 
              : '[EMPTY]';
            console.log(`  ${idx+1}. "${optionText}" (${opt.isCorrect ? 'CORRECT' : 'incorrect'})`);
          });
          
          // Thêm các đáp án cho câu hỏi
          let answersInserted = 0;
          for (const opt of q.options) {
            // Ensure opt.text is a string and handle null/undefined values
            const optionText = opt.text !== undefined && opt.text !== null 
              ? String(opt.text) 
              : '';
            
            // Skip empty options
            if (optionText.trim() === '') {
              console.warn('Skipping empty option');
              continue;
            }
            
            const isCorrect = opt.isCorrect ? 1 : 0;
            
            try {
              await DatabaseService.execute(
                'INSERT INTO Answers (question_id, content, is_correct, is_active) VALUES (?, ?, ?, TRUE)',
                [questionId, optionText.trim(), isCorrect]
              );
              console.log(`Added answer: "${optionText}" (${isCorrect ? 'CORRECT' : 'incorrect'})`);
              answersInserted++;
            } catch (answerError) {
              console.error(`Failed to insert answer "${optionText}":`, answerError);
            }
          }
          
          console.log(`Successfully inserted ${answersInserted} answers for question ID ${questionId}`);
          
          if (answersInserted === 0) {
            // No answers were inserted, delete the orphaned question
            console.warn('No answers were inserted, deleting orphaned question');
            await DatabaseService.execute('DELETE FROM Questions WHERE id = ?', [questionId]);
            errors.push(`Câu hỏi ${questionNum}: Không thể thêm đáp án nào, câu hỏi đã bị xóa`);
            skipped++;
            continue;
          }
          
          inserted++;
        } catch (err) {
          console.error(`Error inserting question "${q.question}":`, err);
          errors.push(`Câu hỏi ${questionNum}: Lỗi database - ${err.message}`);
          skipped++;
        }
      }
      
      // Cập nhật lại số lượng câu hỏi cho chuyên đề
      await DatabaseService.execute('UPDATE Topics SET question_count = question_count + ? WHERE id = ?', [inserted, id]);
      
      console.log(`Successfully imported ${inserted} questions for topic ID ${id}`);
      // Invalidate cache để đảm bảo lấy dữ liệu mới
      try {
        await CacheService.invalidateTopicCache(id);
  await CacheService.invalidateQuestionPools(id);
        console.log(`Invalidated cache for topic ${id} after importing questions`);
      } catch (e) {
        console.warn('Failed to invalidate cache after import:', e.message);
      }
      
      // Verify the import by checking the database
      if (inserted > 0) {
        try {
          console.log(`\n--- VERIFYING IMPORT RESULTS ---`);
          const questions = await DatabaseService.execute(
            'SELECT id, content, is_multiple_choice FROM Questions WHERE topic_id = ? ORDER BY id DESC LIMIT ?',
            [id, inserted]
          );
          
          console.log(`Found ${questions.length} recently imported questions`);
          
          // Check answers for each question
          for (const question of questions) {
            const answers = await DatabaseService.execute(
              'SELECT id, content, is_correct FROM Answers WHERE question_id = ? AND (is_active IS NULL OR is_active = TRUE)',
              [question.id]
            );
            
            console.log(`Question ID ${question.id}: "${question.content}" has ${answers.length} answers`);
            answers.forEach(a => console.log(`  - "${a.content}" (${a.is_correct ? 'CORRECT' : 'incorrect'})`));
          }
          
          console.log(`--- END VERIFICATION ---\n`);
        } catch (verifyError) {
          console.error('Error verifying import:', verifyError);
        }
      }
      
      return ResponseHelper.success(res, { 
        total: questions.length,
        inserted,
        skipped,
        success: inserted > 0,
        errors: errors.length > 0 ? errors : null,
        message: `Đã import ${inserted}/${questions.length} câu hỏi thành công` + (skipped > 0 ? `, ${skipped} câu hỏi bị bỏ qua` : '')
      }, `Đã import ${inserted}/${questions.length} câu hỏi thành công`);
    } catch (error) {
      console.error('Import questions error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi import câu hỏi: ' + error.message, 500);
    }
  }

  // Thêm hàm xóa câu hỏi
  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const DatabaseService = require('../services/DatabaseService');
      
      console.log('Attempting to delete question:', id);
      
      // Lấy topic_id của câu hỏi
      const rows = await DatabaseService.execute('SELECT topic_id FROM Questions WHERE id = ?', [id]);
      if (!rows.length) {
        console.log('Question not found:', id);
        return ResponseHelper.error(res, 'Không tìm thấy câu hỏi', 404);
      }
      
      const topicId = rows[0].topic_id;
      console.log('Found question belongs to topic:', topicId);
      
      // Với CASCADE DELETE, chỉ cần xóa Question là tự động xóa Answers
      await DatabaseService.execute('DELETE FROM Questions WHERE id = ?', [id]);
      
      // Đếm lại số lượng câu hỏi thực tế
      const countRows = await DatabaseService.execute('SELECT COUNT(*) as count FROM Questions WHERE topic_id = ?', [topicId]);
      const newCount = countRows[0]?.count ?? 0;
      
      console.log('Updating topic question count:', { topicId, newCount });
      await DatabaseService.execute('UPDATE Topics SET question_count = ? WHERE id = ?', [newCount, topicId]);
      
      // Invalidate cache để phản ánh số lượng câu hỏi mới
      try {
        const CacheService = require('../services/CacheService');
        await CacheService.invalidateTopicCache(topicId);
        await CacheService.invalidateQuestionPools(topicId);
        console.log(`Invalidated cache for topic ${topicId} after deleting question`);
      } catch (e) {
        console.warn('Failed to invalidate cache after delete:', e.message);
      }
      
      console.log('Successfully deleted question with CASCADE DELETE:', id);
      return ResponseHelper.success(res, { question_count: newCount }, 'Đã xóa câu hỏi và answers thành công (CASCADE DELETE)');
      
    } catch (error) {
      console.error('Delete question error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi xóa câu hỏi: ' + error.message, 500);
    }
  }

  // Thêm hàm updateQuestion vào TopicController để xử lý cập nhật nội dung và đáp án câu hỏi.
  static async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const { content, answers } = req.body;
      if (!content || !answers || !Array.isArray(answers) || answers.length === 0) {
        return ResponseHelper.error(res, 'Thiếu dữ liệu câu hỏi hoặc đáp án', 400);
      }
      const DatabaseService = require('../services/DatabaseService');
      
      // Lấy topicId để invalidate cache
      const questionInfo = await DatabaseService.execute('SELECT topic_id FROM Questions WHERE id = ?', [id]);
      const topicId = questionInfo.length > 0 ? questionInfo[0].topic_id : null;
      
      // Đếm số đáp án đúng để xác định loại câu hỏi
      const correctAnswersCount = answers.filter(ans => ans.isCorrect).length;
      const isMultipleChoice = correctAnswersCount > 1;
      
      // Cập nhật nội dung câu hỏi và loại câu hỏi
      await DatabaseService.execute(
        'UPDATE Questions SET content = ?, is_multiple_choice = ? WHERE id = ?', 
        [content, isMultipleChoice, id]
      );
      
      // Với CASCADE DELETE, xóa question sẽ tự động xóa answers cũ
      // Nhưng ở đây ta chỉ xóa answers, không xóa question
      await DatabaseService.execute('DELETE FROM Answers WHERE question_id = ?', [id]);
      
      // Thêm đáp án mới
      for (const ans of answers) {
        await DatabaseService.execute(
          'INSERT INTO Answers (question_id, content, is_correct, is_active) VALUES (?, ?, ?, TRUE)', 
          [id, ans.text, ans.isCorrect ? 1 : 0]
        );
      }
      
      // Invalidate cache cho topic này
      if (topicId) {
        await CacheService.invalidateTopicCache(topicId);
        await CacheService.invalidateQuestionPools(topicId);
        console.log(`Invalidated cache for topic ${topicId} after question update`);
      }
      
      return ResponseHelper.success(res, {}, 'Cập nhật câu hỏi thành công');
    } catch (error) {
      console.error('Update question error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi cập nhật câu hỏi', 500);
    }
  }  // Thêm chuyên đề mới
  static async createTopic(req, res) {
    try {
      const { name, description, duration_minutes, pass_score } = req.body;
      
      // Validate input
      if (!name || !name.trim()) {
        return ResponseHelper.error(res, 'Tên chuyên đề không được để trống', 400);
      }
      
      if (!duration_minutes || duration_minutes < 1) {
        return ResponseHelper.error(res, 'Thời gian làm bài phải lớn hơn 0', 400);
      }
      
      if (pass_score === undefined || pass_score < 0 || pass_score > 100) {
        return ResponseHelper.error(res, 'Điểm đạt phải từ 0 đến 100', 400);
      }
      
      const DatabaseService = require('../services/DatabaseService');
      
      // Kiểm tra tên chuyên đề đã tồn tại chưa
      const existingTopic = await DatabaseService.execute(
        'SELECT id FROM Topics WHERE name = ?',
        [name.trim()]
      );
      
      if (existingTopic.length > 0) {
        return ResponseHelper.error(res, 'Tên chuyên đề đã tồn tại', 400);
      }
      
      // Thêm chuyên đề mới
      const result = await DatabaseService.execute(
        'INSERT INTO Topics (name, description, duration_minutes, pass_score, question_count) VALUES (?, ?, ?, ?, 0)',
        [name.trim(), description || '', duration_minutes, pass_score]
      );
      
      const newTopic = {
        id: result.insertId,
        name: name.trim(),
        description: description || '',
        duration_minutes: parseInt(duration_minutes),
        pass_score: parseInt(pass_score),
        totalQuestions: 0
      };
      
      console.log('Created new topic:', newTopic);
      
      return ResponseHelper.success(res, newTopic, 'Thêm chuyên đề thành công');
    } catch (error) {
      console.error('Create topic error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi thêm chuyên đề', 500);
    }
  }

  // Cập nhật chuyên đề
  static async updateTopic(req, res) {
    try {
      const { id } = req.params;
      const { name, description, duration_minutes, pass_score } = req.body;
      
      // Validate input
      if (!name || !name.trim()) {
        return ResponseHelper.error(res, 'Tên chuyên đề không được để trống', 400);
      }
      
      if (!duration_minutes || duration_minutes < 1) {
        return ResponseHelper.error(res, 'Thời gian làm bài phải lớn hơn 0', 400);
      }
      
      if (pass_score === undefined || pass_score < 0 || pass_score > 100) {
        return ResponseHelper.error(res, 'Điểm đạt phải từ 0 đến 100', 400);
      }
      
      const DatabaseService = require('../services/DatabaseService');
      
      // Kiểm tra chuyên đề có tồn tại không
      const existingTopic = await DatabaseService.execute(
        'SELECT id FROM Topics WHERE id = ?',
        [id]
      );
      
      if (existingTopic.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề', 404);
      }
      
      // Kiểm tra tên chuyên đề đã tồn tại ở chuyên đề khác chưa
      const duplicateName = await DatabaseService.execute(
        'SELECT id FROM Topics WHERE name = ? AND id != ?',
        [name.trim(), id]
      );
      
      if (duplicateName.length > 0) {
        return ResponseHelper.error(res, 'Tên chuyên đề đã tồn tại', 400);
      }
      
      // Cập nhật chuyên đề
      await DatabaseService.execute(
        'UPDATE Topics SET name = ?, description = ?, duration_minutes = ?, pass_score = ? WHERE id = ?',
        [name.trim(), description || '', duration_minutes, pass_score, id]
      );
      
      // Lấy thông tin chuyên đề sau khi cập nhật
      const updatedTopic = await DatabaseService.execute(
        'SELECT id, name, description, duration_minutes, pass_score, question_count as totalQuestions FROM Topics WHERE id = ?',
        [id]
      );
      
      // Invalidate cache
      try {
        await CacheService.invalidateTopicCache(id);
        console.log(`Invalidated cache for updated topic ${id}`);
      } catch (e) {
        console.warn('Cache invalidate failed for topic', id, e.message);
      }
      
      console.log('Updated topic:', updatedTopic[0]);
      
      return ResponseHelper.success(res, updatedTopic[0], 'Cập nhật chuyên đề thành công');
    } catch (error) {
      console.error('Update topic error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi cập nhật chuyên đề', 500);
    }
  }

  // Xóa chuyên đề
  static async deleteTopic(req, res) {
    try {
      const { id } = req.params;
      const DatabaseService = require('../services/DatabaseService');
      const force = (req.query.force === 'true') || (req.body && req.body.force === true);
      
      // Kiểm tra chuyên đề có tồn tại không
      const existingTopic = await DatabaseService.execute(
        'SELECT id, name FROM Topics WHERE id = ?',
        [id]
      );
      
      if (existingTopic.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề', 404);
      }
      
      // Kiểm tra có bài thi nào đang sử dụng chuyên đề này không
      const examCount = await DatabaseService.execute(
        'SELECT COUNT(*) as count FROM Exams WHERE topic_id = ?',
        [id]
      );
      
      const examsUsing = examCount[0].count;
      // Kiểm tra có lịch thi nào tham chiếu tới chuyên đề không
      const scheduleCount = await DatabaseService.execute(
        'SELECT COUNT(*) as count FROM Schedules WHERE topic_id = ?',
        [id]
      );
      const schedulesUsing = scheduleCount[0].count;

      if ((examsUsing > 0 || schedulesUsing > 0) && !force) {
        return ResponseHelper.error(
          res,
          `Không thể xóa chuyên đề này vì đang được sử dụng: ${examsUsing} bài thi, ${schedulesUsing} lịch thi. Thêm ?force=true để xóa cưỡng bức (cascade).`,
          400
        );
      }
      
      if ((examsUsing > 0 || schedulesUsing > 0) && !force) {
        return ResponseHelper.error(
          res,
          `Không thể xóa chuyên đề này vì đang được sử dụng: ${examsUsing} bài thi, ${schedulesUsing} lịch thi. Thêm ?force=true để xóa cưỡng bức (cascade).`,
          400
        );
      }
      
      // Với CASCADE DELETE, chỉ cần xóa Topic là tự động xóa tất cả liên quan
      try {
        await DatabaseService.execute('DELETE FROM Topics WHERE id = ?', [id]);
        
        // Invalidate cache
        try {
          await CacheService.invalidateTopicCache(id);
          await CacheService.invalidateQuestionPools(id);
          console.log(`Invalidated cache for deleted topic ${id}`);
        } catch (e) {
          console.warn('Cache invalidate failed for topic', id, e.message);
        }
        
        console.log(`Deleted topic: ${existingTopic[0].name} (ID: ${id}) with CASCADE DELETE`);
        
        return ResponseHelper.success(res, {
          force,
          message: 'Topic và tất cả dữ liệu liên quan đã được xóa tự động bởi CASCADE DELETE'
        }, 'Xóa chuyên đề thành công');
        
      } catch (deleteError) {
        console.error('Error deleting topic with cascade:', deleteError);
        return ResponseHelper.error(res, 'Không thể xóa chuyên đề: ' + deleteError.message, 500);
      }
    } catch (error) {
      console.error('Delete topic error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi xóa chuyên đề: ' + error.message, 500);
    }
  }

  // Đồng bộ lại question_count của tất cả topics với dữ liệu thực tế trong bảng Questions
  static async syncQuestionCounts(req, res) {
    try {
      const DatabaseService = require('../services/DatabaseService');
      const topics = await DatabaseService.execute('SELECT id, question_count FROM Topics');
      const result = [];
      let updated = 0;
      for (const t of topics) {
        const rows = await DatabaseService.execute('SELECT COUNT(*) as cnt FROM Questions WHERE topic_id = ?', [t.id]);
        const realCount = rows[0]?.cnt ?? 0;
        if (realCount !== t.question_count) {
          await DatabaseService.execute('UPDATE Topics SET question_count = ? WHERE id = ?', [realCount, t.id]);
          try {
            await CacheService.invalidateTopicCache(t.id);
            await CacheService.invalidateQuestionPools(t.id);
          } catch (e) {
            console.warn('Cache invalidate failed for topic', t.id, e.message);
          }
          updated++;
          result.push({ topic_id: t.id, old: t.question_count, new: realCount });
        }
      }
      return ResponseHelper.success(res, {
        totalTopics: topics.length,
        updated,
        details: result
      }, 'Đồng bộ question_count hoàn tất');
    } catch (error) {
      console.error('Sync question counts error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi đồng bộ question_count', 500);
    }
  }

  // Bulk delete questions
  static async bulkDeleteQuestions(req, res) {
    try {
      const { questionIds } = req.body;
      
      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return ResponseHelper.error(res, 'Danh sách ID câu hỏi không hợp lệ', 400);
      }

      const DatabaseService = require('../services/DatabaseService');
      
      // Get topic IDs for cache invalidation
      const topicIds = new Set();
      for (const questionId of questionIds) {
        const rows = await DatabaseService.execute('SELECT topic_id FROM Questions WHERE id = ?', [questionId]);
        if (rows.length > 0) {
          topicIds.add(rows[0].topic_id);
        }
      }

      // Delete questions
      let deletedCount = 0;
      for (const questionId of questionIds) {
        try {
          await DatabaseService.execute('DELETE FROM Questions WHERE id = ?', [questionId]);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting question ${questionId}:`, err);
        }
      }

      // Update question counts for affected topics
      for (const topicId of topicIds) {
        try {
          const countRows = await DatabaseService.execute('SELECT COUNT(*) as count FROM Questions WHERE topic_id = ?', [topicId]);
          const newCount = countRows[0]?.count ?? 0;
          await DatabaseService.execute('UPDATE Topics SET question_count = ? WHERE id = ?', [newCount, topicId]);
          
          // Invalidate cache
          const CacheService = require('../services/CacheService');
          await CacheService.invalidateTopicCache(topicId);
          await CacheService.invalidateQuestionPools(topicId);
        } catch (err) {
          console.error(`Error updating topic ${topicId} after bulk delete:`, err);
        }
      }

      return ResponseHelper.success(res, { 
        deletedCount,
        totalRequested: questionIds.length,
        affectedTopics: Array.from(topicIds)
      }, `Đã xóa ${deletedCount}/${questionIds.length} câu hỏi thành công`);
    } catch (error) {
      console.error('Bulk delete questions error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi xóa nhiều câu hỏi: ' + error.message, 500);
    }
  }

  // Delete all questions of a topic
  static async deleteAllTopicQuestions(req, res) {
    try {
      const { id } = req.params;
      const DatabaseService = require('../services/DatabaseService');
      
      // Check if topic exists
      const topicExists = await DatabaseService.execute('SELECT id, name FROM Topics WHERE id = ?', [id]);
      if (topicExists.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy chuyên đề', 404);
      }

      // Get current question count
      const countRows = await DatabaseService.execute('SELECT COUNT(*) as count FROM Questions WHERE topic_id = ?', [id]);
      const currentCount = countRows[0]?.count ?? 0;

      if (currentCount === 0) {
        return ResponseHelper.success(res, { deletedCount: 0 }, 'Chuyên đề này không có câu hỏi nào để xóa');
      }

      // Delete all questions for this topic
      await DatabaseService.execute('DELETE FROM Questions WHERE topic_id = ?', [id]);

      // Update topic question count to 0
      await DatabaseService.execute('UPDATE Topics SET question_count = 0 WHERE id = ?', [id]);

      // Invalidate cache
      try {
        const CacheService = require('../services/CacheService');
        await CacheService.invalidateTopicCache(id);
        await CacheService.invalidateQuestionPools(id);
      } catch (e) {
        console.warn('Cache invalidate failed for topic', id, e.message);
      }

      return ResponseHelper.success(res, { 
        deletedCount: currentCount,
        topicName: topicExists[0].name
      }, `Đã xóa tất cả ${currentCount} câu hỏi của chuyên đề "${topicExists[0].name}"`);
    } catch (error) {
      console.error('Delete all topic questions error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi xóa tất cả câu hỏi: ' + error.message, 500);
    }
  }
}

module.exports = TopicController;
