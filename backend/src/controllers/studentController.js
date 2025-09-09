const DatabaseService = require('../services/DatabaseService');
const ResponseHelper = require('../utils/ResponseHelper');
const xlsx = require('xlsx'); // Thêm thư viện đọc excel
const fs = require('fs');

class StudentController {
  // Helper function để kiểm tra dữ liệu liên quan trước khi xóa
  static async checkStudentDependencies(studentId) {
    try {
      const dependencies = {};
      
      // Kiểm tra Exams
      const exams = await DatabaseService.execute(
        'SELECT COUNT(*) as count FROM Exams WHERE student_id = ?',
        [studentId]
      );
      dependencies.exams = exams[0].count;
      
      // Có thể thêm kiểm tra các bảng khác
      // const userProgress = await DatabaseService.execute(
      //   'SELECT COUNT(*) as count FROM UserProgress WHERE student_id = ?',
      //   [studentId]
      // );
      // dependencies.userProgress = userProgress[0].count;
      
      return dependencies;
    } catch (error) {
      console.error(`Error checking dependencies for student ${studentId}:`, error);
      return {};
    }
  }

  // Helper function để xóa tất cả dữ liệu liên quan đến sinh viên
  static async deleteStudentRelatedData(studentId) {
    try {
      // Xóa theo thứ tự để tránh foreign key constraint
      // 1. Xóa Exams (có FK student_id -> Students.id)
      await DatabaseService.execute('DELETE FROM Exams WHERE student_id = ?', [studentId]);
      
      // 2. Xóa các bảng khác nếu có (ví dụ: UserProgress, StudentSubjects, etc.)
      // Kiểm tra và thêm các bảng khác nếu cần
      
      // 3. Cuối cùng mới xóa Student
      await DatabaseService.execute('DELETE FROM Students WHERE id = ?', [studentId]);
      
      return true;
    } catch (error) {
      console.error(`Error deleting related data for student ${studentId}:`, error);
      throw error;
    }
  }

  // Helper function để xóa hàng loạt dữ liệu liên quan
  static async bulkDeleteStudentRelatedData(studentIds) {
    try {
      const placeholders = studentIds.map(() => '?').join(',');
      
      // 1. Xóa Exams
      await DatabaseService.execute(
        `DELETE FROM Exams WHERE student_id IN (${placeholders})`,
        studentIds
      );
      
      // 2. Xóa các bảng khác nếu có
      
      // 3. Cuối cùng xóa Students
      await DatabaseService.execute(
        `DELETE FROM Students WHERE id IN (${placeholders})`,
        studentIds
      );
      
      return true;
    } catch (error) {
      console.error('Error bulk deleting student related data:', error);
      throw error;
    }
  }
  // Helper function to generate default password from date of birth
  static generateDefaultPassword(dateOfBirth) {
    if (!dateOfBirth) return '123456'; // fallback
    
    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) return '123456'; // fallback if invalid date
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  // Helper function to format date for display (dd/mm/yyyy)
  static formatDateForDisplay(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) return null;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  // API lấy danh sách chuyên đề cho sinh viên theo lịch của khoa/ngành
  static async getStudentSubjects(req, res) {
    try {
      // Log complete user object for debugging
      console.log('[getStudentSubjects] Complete user object from token:', req.user);
      
      // Lấy userId từ token (giả sử đã có middleware xác thực)
      let userId = req.user?.id;
      console.log('[getStudentSubjects] userId nhận được từ token:', userId, '| typeof:', typeof userId);
      // Kiểm tra userId null/undefined trước khi query
      if (userId === undefined || userId === null || userId === '') {
        console.error('[getStudentSubjects] userId bị null/undefined hoặc rỗng:', userId);
        return ResponseHelper.error(res, 'Không xác định được sinh viên', 401);
      }
      // Luôn convert userId sang số nguyên
      userId = Number(userId);
      if (isNaN(userId) || userId <= 0) {
        console.error('[getStudentSubjects] userId không hợp lệ (sau khi convert):', userId);
        return ResponseHelper.error(res, 'userId không hợp lệ', 401);
      }
      try {
        // 1. Lấy thông tin sinh viên: studentId, majorId, departmentId
        const studentQuery = `
          SELECT s.id as studentId, c.major_id as majorId, m.department_id as departmentId
          FROM Students s
          JOIN Classes c ON s.class_id = c.id
          JOIN Majors m ON c.major_id = m.id
          WHERE s.user_id = ?
        `;
        // In ra câu SQL đã thay thế param
        const debugStudentQuery = studentQuery.replace('?', userId);
        console.log('[getStudentSubjects] SQL studentQuery:', debugStudentQuery);
        const studentRows = await DatabaseService.execute(studentQuery, [userId]);
        if (!studentRows || studentRows.length === 0) {
          console.log('[getStudentSubjects] Không tìm thấy sinh viên với userId:', userId);
          return res.json({ success: true, subjects: [] });
        }
        const { studentId, majorId, departmentId } = studentRows[0];
        console.log(`[getStudentSubjects] userId: ${userId}, studentId: ${studentId}, majorId: ${majorId}, departmentId: ${departmentId}`);

        // 2. Lấy schedule theo major_id
        let topicIds = [];
        let fallbackUsed = false;
        
        // Check if the Schedules table exists and has the expected structure
        try {
          const scheduleTableCheck = await DatabaseService.getTableStructure('Schedules');
          console.log('[getStudentSubjects] Schedules table structure:', scheduleTableCheck);
        } catch (tableErr) {
          console.error('[getStudentSubjects] Error checking Schedules table:', tableErr);
        }
        
        const majorScheduleQuery = `SELECT topic_id FROM Schedules WHERE major_id = ?`;
        const debugMajorScheduleQuery = majorScheduleQuery.replace('?', majorId);
        console.log('[getStudentSubjects] SQL majorScheduleQuery:', debugMajorScheduleQuery);
        const majorSchedules = await DatabaseService.execute(majorScheduleQuery, [majorId]);
        console.log(`[getStudentSubjects] majorSchedules:`, majorSchedules);
        console.log(`[getStudentSubjects] Số chuyên đề theo majorId (${majorId}): ${majorSchedules.length}`);
        if (majorSchedules && majorSchedules.length > 0) {
          topicIds = majorSchedules.map(row => row.topic_id);
          console.log(`[getStudentSubjects] Dùng schedule theo majorId, topicIds:`, topicIds);
        } else {
          // 3. Nếu không có schedule theo major, kiểm tra schedule của khoa (chỉ khi major_id IS NULL)
          const deptScheduleQuery = `SELECT topic_id FROM Schedules WHERE department_id = ? AND major_id IS NULL`;
          const debugDeptScheduleQuery = deptScheduleQuery.replace('?', departmentId);
          console.log('[getStudentSubjects] SQL deptScheduleQuery:', debugDeptScheduleQuery);
          const deptSchedules = await DatabaseService.execute(deptScheduleQuery, [departmentId]);
          console.log(`[getStudentSubjects] deptSchedules:`, deptSchedules);
          console.log(`[getStudentSubjects] Số chuyên đề theo departmentId (${departmentId}): ${deptSchedules.length}`);
          if (deptSchedules && deptSchedules.length > 0) {
            topicIds = deptSchedules.map(row => row.topic_id);
            fallbackUsed = true;
            console.log(`[getStudentSubjects] Fallback sang departmentId vì không có schedule cho majorId. topicIds:`, topicIds);
          } else {
            console.log(`[getStudentSubjects] Không có schedule cho majorId (${majorId}) hoặc departmentId (${departmentId}). Không có chuyên đề.`);
          }
        }

        // 4. Nếu không có chuyên đề nào
        if (!topicIds || topicIds.length === 0) {
          console.log(`[getStudentSubjects] Không có chuyên đề cho sinh viên. userId: ${userId}, studentId: ${studentId}, majorId: ${majorId}, departmentId: ${departmentId}`);
          return res.json({ success: true, subjects: [] });
        }

        // 5. Truy vấn danh sách chuyên đề
        console.log(`[getStudentSubjects] topicIds cuối cùng trước khi truy vấn Topics:`, topicIds);
        const topicsQuery = `
          SELECT id, name, question_count as totalQuestions, pass_score, 3 as maxAttempts
          FROM Topics
          WHERE id IN (${topicIds.map(() => '?').join(',')})
        `;
        // In ra câu SQL đã thay thế param cho topicsQuery
        let debugTopicsQuery = topicsQuery;
        topicIds.forEach((id, idx) => {
          debugTopicsQuery = debugTopicsQuery.replace('?', id);
        });
        console.log('[getStudentSubjects] SQL topicsQuery:', debugTopicsQuery);
        const topics = await DatabaseService.execute(topicsQuery, topicIds);
        console.log(`[getStudentSubjects] Số chuyên đề trả về: ${topics.length}, id:`, topics.map(t => t.id));
        return res.json({ success: true, subjects: topics });
      } catch (err) {
        console.error('[getStudentSubjects] Error:', err);
        return res.json({ success: true, subjects: [] });
      }
    } catch (error) {
      console.error('Error in getStudentSubjects:', error);
      return ResponseHelper.error(res, 'Không thể lấy danh sách chuyên đề: ' + error.message, 500);
    }
  }
  static passwordColumn = null;
  
  static async resolvePasswordColumn() {
    if (this.passwordColumn) return this.passwordColumn;
    try {
      const structure = await DatabaseService.getTableStructure('Users');
      if (structure.some(col => col.Field === 'password_hash')) {
        this.passwordColumn = 'password_hash';
      } else if (structure.some(col => col.Field === 'password')) {
        this.passwordColumn = 'password';
      } else {
        throw new Error('Không tìm thấy cột password / password_hash trong bảng Users');
      }
      return this.passwordColumn;
    } catch (err) {
      console.error('Cannot determine password column:', err);
      this.passwordColumn = 'password_hash';
      return this.passwordColumn;
    }
  }

  static async getAllStudents(req, res) {
    try {
      // Extract pagination parameters
      const { page = 1, limit = 50 } = req.query;
      
      const query = `
        SELECT 
          s.id,
          s.student_code,
          s.phone_number,
          s.is_locked,
          s.date_of_birth,
          u.username,
          u.email,
          u.full_name,
          NOW() as created_at,
          c.name as class_name,
          m.name as major_name,
          d.name as department_name,
          d.id as department_id,
          m.id as major_id,
          c.id as class_id
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE u.role = 'STUDENT'
        ORDER BY s.student_code ASC
        LIMIT ? OFFSET ?
      `;
      
      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        WHERE u.role = 'STUDENT'
      `;
      
      // Execute both queries in parallel
      const [students, countResult] = await Promise.all([
        DatabaseService.execute(query, [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]),
        DatabaseService.execute(countQuery)
      ]);
      
      const total = countResult[0] ? countResult[0].total : 0;
      
      // Format the results using the same formatter as searchStudents
      const formattedStudents = students.map(student => ({
        id: student.id,
        studentId: student.student_code,
        fullName: student.full_name || student.username,
        email: student.email,
        phone: student.phone_number,
        class: student.class_name,
        major: student.major_name,
        department: student.department_name,
        departmentId: student.department_id,
        majorId: student.major_id,
        classId: student.class_id,
        status: student.is_locked ? 'inactive' : 'active',
        dateOfBirth: StudentController.formatDateForDisplay(student.date_of_birth),
        joinDate: student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : null,
        avatar: null
      }));

      return ResponseHelper.success(res, {
        students: formattedStudents,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }, 'Lấy danh sách sinh viên thành công');
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      return ResponseHelper.error(res, 'Không thể lấy danh sách sinh viên: ' + error.message, 500);
    }
  }

  static async getStudentById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          s.id,
          s.student_code,
          s.phone_number,
          s.is_locked,
          s.date_of_birth,
          u.username,
          u.email,
          u.full_name,
          NOW() as created_at,
          c.name as class_name,
          m.name as major_name,
          d.name as department_name
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE s.id = ? AND u.role = 'STUDENT'
      `;
      
      const students = await DatabaseService.execute(query, [id]);
      
      if (students.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên', 404);
      }

      const student = students[0];
      const formattedStudent = {
        id: student.id,
        studentId: student.student_code,
        fullName: student.full_name || student.username,
        email: student.email,
        phone: student.phone_number,
        class: student.class_name,
        major: student.major_name,
        department: student.department_name,
        status: student.is_locked ? 'inactive' : 'active',
        dateOfBirth: StudentController.formatDateForDisplay(student.date_of_birth),
        joinDate: student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : null,
        avatar: null
      };

      return ResponseHelper.success(res, formattedStudent, 'Lấy thông tin sinh viên thành công');
    } catch (error) {
      console.error('Error in getStudentById:', error);
      return ResponseHelper.error(res, 'Không thể lấy thông tin sinh viên', 500);
    }
  }

  static async getDepartments(req, res) {
    try {
      const query = 'SELECT id, name FROM Departments ORDER BY name ASC';
      const departments = await DatabaseService.execute(query);
      
      return ResponseHelper.success(res, departments, 'Lấy danh sách khoa thành công');
    } catch (error) {
      console.error('Error in getDepartments:', error);
      return ResponseHelper.error(res, 'Không thể lấy danh sách khoa', 500);
    }
  }

  static async getMajorsByDepartment(req, res) {
    try {
      const { departmentId } = req.params;
      
      const query = `
        SELECT id, name 
        FROM Majors 
        WHERE department_id = ? 
        ORDER BY name ASC
      `;
      
      const majors = await DatabaseService.execute(query, [departmentId]);
      
      return ResponseHelper.success(res, majors, 'Lấy danh sách ngành thành công');
    } catch (error) {
      console.error('Error in getMajorsByDepartment:', error);
      return ResponseHelper.error(res, 'Không thể lấy danh sách ngành', 500);
    }
  }

  static async getClassesByMajor(req, res) {
    try {
      const { majorId } = req.params;
      
      const query = `
        SELECT id, name 
        FROM Classes 
        WHERE major_id = ? 
        ORDER BY name ASC
      `;
      
      const classes = await DatabaseService.execute(query, [majorId]);
      
      return ResponseHelper.success(res, classes, 'Lấy danh sách lớp thành công');
    } catch (error) {
      console.error('Error in getClassesByMajor:', error);
      return ResponseHelper.error(res, 'Không thể lấy danh sách lớp', 500);
    }
  }

  static async addStudent(req, res) {
    try {
      const { fullName, email, phoneNumber, classId, studentCode, dateOfBirth } = req.body;
      console.log('Add student request body:', req.body);

      // Bắt buộc phải nhập mã sinh viên
      if (!studentCode || typeof studentCode !== 'string' || studentCode.trim() === '') {
        return ResponseHelper.error(res, 'Mã sinh viên là bắt buộc', 400);
      }
      if (!/^\d+$/.test(studentCode)) {
        return ResponseHelper.error(res, 'Mã sinh viên chỉ được nhập số', 400);
      }
      if (!fullName || !email || !classId || !dateOfBirth) {
        return ResponseHelper.error(res, 'Các trường bắt buộc: họ tên, email, lớp, ngày sinh', 400);
      }

      // Validate dateOfBirth format
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return ResponseHelper.error(res, 'Ngày sinh không hợp lệ (yyyy-mm-dd)', 400);
      }

      // Check if the class exists
      try {
        const classCheck = await DatabaseService.execute(
          'SELECT id FROM Classes WHERE id = ?',
          [classId]
        );
        if (classCheck.length === 0) {
          return ResponseHelper.error(res, `Lớp với ID ${classId} không tồn tại trong hệ thống`, 400);
        }
      } catch (error) {
        console.error('Error checking class existence:', error);
      }

      // Kiểm tra trùng email
      const existingUser = await DatabaseService.execute(
        'SELECT id FROM Users WHERE email = ?',
        [email]
      );
      if (existingUser.length > 0) {
        return ResponseHelper.error(res, 'Email đã được sử dụng', 400);
      }

      // Kiểm tra trùng số điện thoại (chỉ khi có số điện thoại)
      if (phoneNumber && phoneNumber.trim()) {
        const existingPhone = await DatabaseService.execute(
          'SELECT id FROM Students WHERE phone_number = ?',
          [phoneNumber]
        );
        if (existingPhone.length > 0) {
          return ResponseHelper.error(res, 'Số điện thoại đã được sử dụng', 400);
        }
      }

      // Kiểm tra trùng mã sinh viên
      const existingCode = await DatabaseService.execute(
        'SELECT id FROM Students WHERE student_code = ?',
        [studentCode]
      );
      if (existingCode.length > 0) {
        return ResponseHelper.error(res, 'Mã sinh viên đã được sử dụng', 400);
      }

      // Generate default password from date of birth
      const defaultPassword = StudentController.generateDefaultPassword(dateOfBirth);

      await DatabaseService.execute('START TRANSACTION');
      try {
        // Lấy cấu trúc bảng Users để xác định cột password
        const usersStructure = await DatabaseService.getTableStructure('Users');
        const passwordCol = usersStructure.some(col => col.Field === 'password_hash')
          ? 'password_hash'
          : 'password';

        // Tạo user với username là mã sinh viên
        const userInsertSql = `
          INSERT INTO Users (username, ${passwordCol}, email, full_name, role)
          VALUES (?, ?, ?, ?, 'STUDENT')
        `;
        const userResult = await DatabaseService.execute(userInsertSql, [studentCode, defaultPassword, email, fullName]);
        const userId = userResult.insertId;

        // Thêm sinh viên
        const studentInsertSql = `
          INSERT INTO Students (user_id, student_code, phone_number, class_id, date_of_birth, is_locked)
          VALUES (?, ?, ?, ?, ?, 0)
        `;
        const studentResult = await DatabaseService.execute(
          studentInsertSql,
          [userId, studentCode, phoneNumber || null, classId, dob.toISOString().split('T')[0]]
        );

        await DatabaseService.execute('COMMIT');

        // Trả về thông tin sinh viên vừa thêm
        const newStudentQuery = `
          SELECT 
            s.id,
            s.student_code,
            s.phone_number,
            s.is_locked,
            s.date_of_birth,
            u.username,
            u.email,
            u.full_name,
            NOW() as created_at,
            c.name as class_name,
            m.name as major_name,
            d.name as department_name
          FROM Students s
          JOIN Users u ON s.user_id = u.id
          JOIN Classes c ON s.class_id = c.id
          JOIN Majors m ON c.major_id = m.id
          JOIN Departments d ON m.department_id = d.id
          WHERE s.id = ?
        `;
        const newStudentData = await DatabaseService.execute(newStudentQuery, [studentResult.insertId]);
        const student = newStudentData[0];
        const newStudent = {
          id: student.id,
          studentId: student.student_code,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone_number,
          class: student.class_name,
          major: student.major_name,
          department: student.department_name,
          status: student.is_locked ? 'inactive' : 'active',
          dateOfBirth: StudentController.formatDateForDisplay(student.date_of_birth),
          joinDate: new Date(student.created_at).toISOString().split('T')[0],
          avatar: null
        };
        return ResponseHelper.success(res, newStudent, 'Thêm sinh viên thành công');
      } catch (error) {
        await DatabaseService.execute('ROLLBACK');
        console.error('Detailed SQL error:', error);
        if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
          return ResponseHelper.error(res, 'Foreign key error: ClassID không tồn tại trong hệ thống', 400);
        }
        if (error && error.code === 'ER_BAD_FIELD_ERROR') {
          return ResponseHelper.error(res, `Database column error: ${error.message}`, 400);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error in addStudent:', error);
      return ResponseHelper.error(res, `Không thể thêm sinh viên: ${error.message}`, 500);
    }
  }

  static async updateStudent(req, res) {
    try {
      const { id } = req.params;
      const { fullName, email, phoneNumber, classId, dateOfBirth } = req.body;

      const existingStudent = await DatabaseService.execute(`
        SELECT s.id, s.user_id FROM Students s 
        JOIN Users u ON s.user_id = u.id 
        WHERE s.id = ?
      `, [id]);

      if (existingStudent.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên', 404);
      }

      const student = existingStudent[0];

      if (email) {
        const emailCheck = await DatabaseService.execute(
          'SELECT id FROM Users WHERE email = ? AND id != ?',
          [email, student.user_id]
        );

        if (emailCheck.length > 0) {
          return ResponseHelper.error(res, 'Email đã được sử dụng', 400);
        }
      }

      // Kiểm tra trùng số điện thoại (chỉ khi có số điện thoại và không rỗng)
      if (phoneNumber && phoneNumber.trim()) {
        const phoneCheck = await DatabaseService.execute(
          'SELECT id FROM Students WHERE phone_number = ? AND id != ?',
          [phoneNumber.trim(), id]
        );

        if (phoneCheck.length > 0) {
          return ResponseHelper.error(res, 'Số điện thoại đã được sử dụng', 400);
        }
      }

      await DatabaseService.execute('START TRANSACTION');

      try {
        if (fullName || email) {
          const updateUserQuery = `
            UPDATE Users 
            SET ${fullName ? 'full_name = ?' : ''} ${fullName && email ? ',' : ''} ${email ? 'email = ?' : ''}
            WHERE id = ?
          `;
          const userParams = [];
          if (fullName) userParams.push(fullName);
          if (email) userParams.push(email);
          userParams.push(student.user_id);

          await DatabaseService.execute(updateUserQuery, userParams);
        }

        // Kiểm tra nếu có ít nhất một field cần update cho Students table
        if (req.body.hasOwnProperty('phoneNumber') || classId || dateOfBirth) {
          const updateFields = [];
          const studentParams = [];
          
          // Xử lý phoneNumber (có thể set thành null nếu rỗng)
          if (req.body.hasOwnProperty('phoneNumber')) {
            updateFields.push('phone_number = ?');
            studentParams.push(phoneNumber && phoneNumber.trim() ? phoneNumber.trim() : null);
          }
          
          // Xử lý classId
          if (classId) {
            updateFields.push('class_id = ?');
            studentParams.push(classId);
          }
          
          // Xử lý dateOfBirth
          if (dateOfBirth) {
            const dob = new Date(dateOfBirth);
            if (isNaN(dob.getTime())) {
              return ResponseHelper.error(res, 'Ngày sinh không hợp lệ (yyyy-mm-dd)', 400);
            }
            updateFields.push('date_of_birth = ?');
            studentParams.push(dob.toISOString().split('T')[0]);
          }
          
          if (updateFields.length > 0) {
            const updateStudentQuery = `
              UPDATE Students 
              SET ${updateFields.join(', ')}
              WHERE id = ?
            `;
            studentParams.push(id);
            await DatabaseService.execute(updateStudentQuery, studentParams);
          }
        }

        await DatabaseService.execute('COMMIT');

        const updatedStudentQuery = `
          SELECT 
            s.id,
            s.student_code,
            s.phone_number,
            s.is_locked,
            s.date_of_birth,
            u.username,
            u.email,
            u.full_name,
            NOW() as created_at,
            c.name as class_name,
            m.name as major_name,
            d.name as department_name
          FROM Students s
          JOIN Users u ON s.user_id = u.id
          JOIN Classes c ON s.class_id = c.id
          JOIN Majors m ON c.major_id = m.id
          JOIN Departments d ON m.department_id = d.id
          WHERE s.id = ?
        `;

        const updatedData = await DatabaseService.execute(updatedStudentQuery, [id]);
        const updatedStudent = updatedData[0];

        const result = {
          id: updatedStudent.id,
          studentId: updatedStudent.student_code,
          fullName: updatedStudent.full_name,
          email: updatedStudent.email,
          phone: updatedStudent.phone_number,
          class: updatedStudent.class_name,
          major: updatedStudent.major_name,
          department: updatedStudent.department_name,
          status: updatedStudent.is_locked ? 'inactive' : 'active',
          dateOfBirth: StudentController.formatDateForDisplay(updatedStudent.date_of_birth),
          joinDate: new Date(updatedStudent.created_at).toISOString().split('T')[0],
          avatar: null
        };

        return ResponseHelper.success(res, result, 'Cập nhật thông tin sinh viên thành công');
      } catch (error) {
        await DatabaseService.execute('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error in updateStudent:', error);
      return ResponseHelper.error(res, 'Không thể cập nhật thông tin sinh viên', 500);
    }
  }

  static async deleteStudent(req, res) {
    try {
      const { id } = req.params;
      
      // Kiểm tra sinh viên có tồn tại
      const existingStudent = await DatabaseService.execute(`
        SELECT s.id, s.user_id, s.student_code FROM Students s 
        WHERE s.id = ?
      `, [id]);
      
      if (existingStudent.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên', 404);
      }
      
      const student = existingStudent[0];
      
      // Kiểm tra dữ liệu liên quan trước khi xóa
      const dependencies = await StudentController.checkStudentDependencies(id);
      console.log(`Deleting student ${student.student_code} with dependencies:`, dependencies);
      
      await DatabaseService.execute('START TRANSACTION');
      try {
        // Sử dụng helper function để xóa dữ liệu liên quan
        await StudentController.deleteStudentRelatedData(id);
        
        // Cuối cùng xóa User
        await DatabaseService.execute('DELETE FROM Users WHERE id = ?', [student.user_id]);
        
        await DatabaseService.execute('COMMIT');
        
        // Log kết quả
        const deletedInfo = {
          studentId: id,
          studentCode: student.student_code,
          deletedExams: dependencies.exams || 0
        };
        console.log('Successfully deleted student:', deletedInfo);
        
        return ResponseHelper.success(res, deletedInfo, 'Xóa sinh viên thành công');
      } catch (error) {
        await DatabaseService.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteStudent:', error);
      return ResponseHelper.error(res, 'Không thể xóa sinh viên: ' + error.message, 500);
    }
  }

  static async bulkDeleteStudents(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return ResponseHelper.error(res, 'Danh sách ID không hợp lệ', 400);
      }
      
      const placeholders = ids.map(() => '?').join(',');
      
      // Lấy thông tin user_id của các sinh viên
      const studentUsers = await DatabaseService.execute(
        `SELECT s.id, s.user_id, s.student_code FROM Students s WHERE id IN (${placeholders})`,
        ids
      );
      
      if (studentUsers.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên nào', 404);
      }
      
      const userIds = studentUsers.map(s => s.user_id);
      const userPlaceholders = userIds.map(() => '?').join(',');
      
      await DatabaseService.execute('START TRANSACTION');
      try {
        // Sử dụng helper function để xóa dữ liệu liên quan hàng loạt
        await StudentController.bulkDeleteStudentRelatedData(ids);
        
        // Cuối cùng xóa các Users
        await DatabaseService.execute(
          `DELETE FROM Users WHERE id IN (${userPlaceholders})`,
          userIds
        );
        
        await DatabaseService.execute('COMMIT');
        return ResponseHelper.success(
          res,
          { deletedCount: studentUsers.length },
          `Đã xóa ${studentUsers.length} sinh viên`
        );
      } catch (error) {
        await DatabaseService.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in bulkDeleteStudents:', error);
      return ResponseHelper.error(res, 'Không thể xóa sinh viên: ' + error.message, 500);
    }
  }

  static async searchStudents(req, res) {
    try {
      // Get search parameters from query string
      const { 
        q, 
        departmentId, 
        majorId, 
        classId, 
        status,
        sortBy = 'student_code',
        sortOrder = 'ASC',
        page = 1,
        limit = 50
      } = req.query;
      
      // Build the SQL query with proper joins based on the database schema
    let baseQuery = `
        SELECT 
          s.id,
          s.student_code,
          s.phone_number,
      s.is_locked,
      s.date_of_birth,
          u.username,
          u.email,
          u.full_name,
          NOW() as created_at,
          c.name as class_name,
          m.name as major_name,
          d.name as department_name,
          d.id as department_id,
          m.id as major_id,
          c.id as class_id
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE u.role = 'STUDENT'
      `;
      
      // Build the parameter array and WHERE conditions
      const params = [];
      const conditions = [];

      // Add search term condition if provided
if (q) {
  conditions.push(`(
    u.full_name LIKE ? OR 
    u.username LIKE ? OR 
    u.email LIKE ? OR
    s.student_code LIKE ? OR
    s.phone_number LIKE ?
  )`);
  const searchPattern = `%${q}%`;
  params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
}

// Add filters if provided
if (departmentId) {
  conditions.push('d.id = ?');
  params.push(departmentId);
}

if (majorId) {
  conditions.push('m.id = ?');
  params.push(majorId);
}

if (classId) {
  conditions.push('c.id = ?');
  params.push(classId);
}

if (status && ['active', 'inactive'].includes(status)) {
  // Map to Students.is_locked (inactive => 1, active => 0)
  conditions.push('s.is_locked = ?');
  params.push(status === 'inactive' ? 1 : 0);
}

// Combine conditions into the query
if (conditions.length > 0) {
  baseQuery += ' AND ' + conditions.join(' AND ');
}

      // Count query for total records
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as countTable`;

      // Execute the count query first to get the total number of records
      const countResult = await DatabaseService.execute(countQuery, params);
      const total = countResult[0] ? countResult[0].total : 0;

      // Determine sorting column and order
      const validSortColumns = ['student_code', 'full_name', 'email', 'created_at', 'class_name', 'major_name', 'department_name'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'student_code';
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Add sorting and pagination to the main query
      baseQuery += ` ORDER BY ${sortColumn} ${order}`;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      baseQuery += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      console.log('Executing search query:', baseQuery, params);
      // Execute final query      baseQuery += ` LIMIT ? OFFSET ?`;
      const students = await DatabaseService.execute(baseQuery, params);

// Format the results
const formattedStudents = students.map(student => ({
  id: student.id,
  studentId: student.student_code,
  fullName: student.full_name || student.username,
  email: student.email,
  phone: student.phone_number,
  class: student.class_name,
  major: student.major_name,
  department: student.department_name,
  departmentId: student.department_id,
  majorId: student.major_id,
  classId: student.class_id,
  status: student.is_locked ? 'inactive' : 'active',
  dateOfBirth: StudentController.formatDateForDisplay(student.date_of_birth),
  joinDate: student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : null,
  avatar: null
}));

// Return with pagination metadata
return ResponseHelper.success(res, {
  students: formattedStudents,
  pagination: {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit))
  }
}, 'Tìm kiếm sinh viên thành công');
    } catch (error) {
      console.error('Error in searchStudents:', error);
      return ResponseHelper.error(res, 'Không thể tìm kiếm sinh viên: ' + error.message, 500);
    }
  }

  static async updateStudentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['active', 'inactive'].includes(status)) {
        return ResponseHelper.error(res, 'Trạng thái không hợp lệ', 400);
      }
      const existingStudent = await DatabaseService.execute(
        'SELECT s.id, s.user_id FROM Students s WHERE s.id = ?',
        [id]
      );
      if (existingStudent.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên', 404);
      }
      // Map UI status to Students.is_locked
      const isLocked = status === 'inactive' ? 1 : 0;
      
      // Update only Students.is_locked since Users table doesn't have status column
      await DatabaseService.execute('UPDATE Students SET is_locked = ? WHERE id = ?', [isLocked, id]);
      return ResponseHelper.success(res, { id: parseInt(id), status }, 'Cập nhật trạng thái thành công');
    } catch (error) {
      console.error('Error in updateStudentStatus:', error);
      return ResponseHelper.error(res, 'Không thể cập nhật trạng thái', 500);
    }
  }

  // Get student statistics
  static async getStudentStats(req, res) {
    try {
      // Query to get statistics about students
      const statsQueries = [
        // Total students count
        `SELECT COUNT(*) as total FROM Students`,
        // Students by department
        `SELECT d.name as label, COUNT(s.id) as value
         FROM Departments d
         LEFT JOIN Majors m ON d.id = m.department_id
         LEFT JOIN Classes c ON m.id = c.major_id
         LEFT JOIN Students s ON c.id = s.class_id
         GROUP BY d.id, d.name
         ORDER BY value DESC`,
        // Students by class year
        `SELECT 'Tất cả' as label, COUNT(s.id) as value
         FROM Students s
         ORDER BY value DESC`
      ];
      // Execute all queries in parallel for better performance
      const [totalCount, departmentStats, yearStats] = await Promise.all([
        DatabaseService.execute(statsQueries[0]),
        DatabaseService.execute(statsQueries[1]),
        DatabaseService.execute(statsQueries[2])
      ]);
      // Format response data
      const stats = {
        totalStudents: totalCount[0]?.total || 0,
        byDepartment: departmentStats,
        byYear: yearStats
      };
      return ResponseHelper.success(res, stats, 'Lấy thống kê sinh viên thành công');
    } catch (error) {
      console.error('Error in getStudentStats:', error);
      return ResponseHelper.error(res, 'Không thể lấy thống kê sinh viên: ' + error.message, 500);
    }
  }

  static async importStudentsExcel(req, res) {
    try {
      if (!req.file) {
        return ResponseHelper.error(res, 'Không có file được upload', 400);
      }
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      let imported = [];
      let errors = [];
      let skipped = 0;
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const rowNum = rowIndex + 2; // Excel rows start from 2 (after header)
        
        // Đọc dữ liệu từ file
        const studentCode = row['studentCode'] || row['username'] || row['Mã sinh viên'] || row['Username'];
        const fullName = row['fullName'] || row['Họ tên'] || row['Full Name'] || row['name'];
        const email = row['email'] || row['Email'];
        const phoneNumber = row['phoneNumber'] || row['phone'] || row['Số điện thoại'] || row['Phone'];
        const dateOfBirth = row['dateOfBirth'] || row['birthDate'] || row['Ngày sinh'] || row['Birth Date'];
        const classId = row['classId'] || row['Mã lớp'] || row['Class ID'] || row['Lớp'];
        const username = row['username'] || studentCode;

        // Kiểm tra thông tin bắt buộc
        if (!studentCode || !fullName || !email || !classId || !dateOfBirth || !username) {
          errors.push(`Dòng ${rowNum}: Thiếu thông tin bắt buộc (mã SV, họ tên, email, lớp, ngày sinh)`);
          skipped++;
          continue;
        }

        try {
          // Đơn giản hóa: Chuyển đổi tất cả về string và sau đó phân tích
          let dob;
          
          try {
            // Chuyển tất cả về string trước
            const dateStr = String(dateOfBirth).trim();
            
            // Các định dạng ngày phổ biến
            if (dateStr.includes('/')) {
              // Định dạng DD/MM/YYYY hoặc MM/DD/YYYY
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                // Giả định định dạng là DD/MM/YYYY
                const [day, month, year] = parts;
                dob = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
              } else {
                dob = new Date(dateStr);
              }
            } else if (dateStr.includes('-')) {
              // Định dạng YYYY-MM-DD hoặc DD-MM-YYYY
              dob = new Date(dateStr);
            } else if (!isNaN(dateStr) && dateStr.length > 0) {
              // Có thể là số từ Excel
              const excelEpoch = new Date(1900, 0, 0);
              const dateNum = parseInt(dateStr);
              dob = new Date(excelEpoch.getTime() + dateNum * 24 * 60 * 60 * 1000);
            } else {
              // Thử phân tích theo định dạng chuẩn
              dob = new Date(dateStr);
            }
            
            // Kiểm tra nếu ngày hợp lệ
            if (isNaN(dob.getTime())) {
              errors.push(`Dòng ${rowNum}: Ngày sinh không hợp lệ "${dateOfBirth}"`);
              skipped++;
              continue;
            }
          } catch (dateError) {
            errors.push(`Dòng ${rowNum}: Ngày sinh không hợp lệ "${dateOfBirth}"`);
            skipped++;
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Dòng ${rowNum}: Email không hợp lệ "${email}"`);
            skipped++;
            continue;
          }

          // Kiểm tra classId có tồn tại
          const classExists = await DatabaseService.execute('SELECT id FROM Classes WHERE id = ?', [classId]);
          if (classExists.length === 0) {
            errors.push(`Dòng ${rowNum}: Lớp ID ${classId} không tồn tại trong hệ thống`);
            skipped++;
            continue;
          }

          // Generate default password from date of birth
          const defaultPassword = StudentController.generateDefaultPassword(dateOfBirth);

          // Kiểm tra trùng email
          const existEmail = await DatabaseService.execute('SELECT id FROM Users WHERE email = ?', [email]);
          if (existEmail.length > 0) {
            errors.push(`Dòng ${rowNum}: Email "${email}" đã tồn tại trong hệ thống`);
            skipped++;
            continue;
          }

          // Kiểm tra trùng username
          const existUsername = await DatabaseService.execute('SELECT id FROM Users WHERE username = ?', [username]);
          if (existUsername.length > 0) {
            errors.push(`Dòng ${rowNum}: Tài khoản "${username}" đã tồn tại trong hệ thống`);
            skipped++;
            continue;
          }

          // Kiểm tra trùng mã sinh viên
          const existStudentCode = await DatabaseService.execute('SELECT id FROM Students WHERE student_code = ?', [studentCode]);
          if (existStudentCode.length > 0) {
            errors.push(`Dòng ${rowNum}: Mã sinh viên "${studentCode}" đã tồn tại trong hệ thống`);
            skipped++;
            continue;
          }

          // Thêm vào bảng Users
          const usersStructure = await DatabaseService.getTableStructure('Users');
          const passwordCol = usersStructure.some(col => col.Field === 'password_hash') ? 'password_hash' : 'password';
          const userInsertSql = `
            INSERT INTO Users (username, ${passwordCol}, email, full_name, role)
            VALUES (?, ?, ?, ?, 'STUDENT')
          `;
          const userResult = await DatabaseService.execute(userInsertSql, [username, defaultPassword, email, fullName]);
          const userId = userResult.insertId;

          // Thêm vào bảng Students
          const studentInsertSql = `
            INSERT INTO Students (user_id, student_code, phone_number, class_id, date_of_birth, is_locked)
            VALUES (?, ?, ?, ?, ?, 0)
          `;
          await DatabaseService.execute(studentInsertSql, [userId, studentCode, phoneNumber || null, classId, dob.toISOString().split('T')[0]]);

          imported.push({
            row: rowNum,
            studentCode,
            fullName,
            email,
            phoneNumber: phoneNumber || null,
            classId,
            dateOfBirth: dob.toISOString().split('T')[0],
            username,
            password: defaultPassword
          });
        } catch (err) {
          console.error(`Error processing row ${rowNum}:`, err);
          errors.push(`Dòng ${rowNum}: Lỗi database - ${err.message}`);
          skipped++;
        }
      }
      
      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);
      
      // Prepare response with detailed results
      const result = {
        total: rows.length,
        imported: imported.length,
        skipped: skipped,
        students: imported,
        errors: errors.length > 0 ? errors : null
      };
      
      let message = `Import hoàn thành: ${imported.length}/${rows.length} sinh viên được thêm thành công`;
      if (skipped > 0) {
        message += `, ${skipped} dòng bị bỏ qua`;
      }
      
      return ResponseHelper.success(res, result, message);
    } catch (error) {
      console.error('Import students error:', error);
      // Cleanup file if exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return ResponseHelper.error(res, 'Lỗi import sinh viên: ' + error.message, 500);
    }
  }

  // Reset student password to default (based on date of birth)
  static async resetStudentPassword(req, res) {
    try {
      const { id } = req.params;

      // Get student info including date of birth
      const studentQuery = `
        SELECT s.id, s.user_id, s.date_of_birth, u.username
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        WHERE s.id = ?
      `;
      const students = await DatabaseService.execute(studentQuery, [id]);
      
      if (students.length === 0) {
        return ResponseHelper.error(res, 'Không tìm thấy sinh viên', 404);
      }

      const student = students[0];
      
      // Generate default password from date of birth
      const defaultPassword = StudentController.generateDefaultPassword(student.date_of_birth);

      // Get password column
      const passwordCol = await StudentController.resolvePasswordColumn();

      // Update password
      await DatabaseService.execute(
        `UPDATE Users SET ${passwordCol} = ? WHERE id = ?`,
        [defaultPassword, student.user_id]
      );

      return ResponseHelper.success(res, 
        { 
          id: parseInt(id), 
          username: student.username,
          newPassword: defaultPassword 
        }, 
        'Reset mật khẩu thành công'
      );
    } catch (error) {
      console.error('Error in resetStudentPassword:', error);
      return ResponseHelper.error(res, 'Không thể reset mật khẩu', 500);
    }
  }
}

module.exports = StudentController;
