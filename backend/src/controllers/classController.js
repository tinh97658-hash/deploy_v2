const connection = require('../config/database');
const ResponseHelper = require('../utils/ResponseHelper');

class ClassController {
  // Lấy tất cả lớp hoặc theo ngành
  static async getAllClasses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '', 
        majorId = '',
        departmentId = ''
      } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let query = `
        SELECT 
          c.id,
          c.name,
          c.major_id,
          m.name as major_name,
          d.name as department_name,
          d.id as department_id,
          COUNT(DISTINCT s.id) as student_count
        FROM Classes c
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Departments d ON m.department_id = d.id
        LEFT JOIN Students s ON c.id = s.class_id
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM Classes c
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Departments d ON m.department_id = d.id
      `;
      
      let whereConditions = [];
      let params = [];
      
      if (search.trim()) {
        whereConditions.push('(c.name LIKE ? OR m.name LIKE ? OR d.name LIKE ?)');
        params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
      }
      
      if (majorId) {
        whereConditions.push('c.major_id = ?');
        params.push(majorId);
      }
      
      if (departmentId) {
        whereConditions.push('d.id = ?');
        params.push(departmentId);
      }

      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }
      
      query += ' GROUP BY c.id, c.name, c.major_id, m.name, d.name, d.id ORDER BY d.name ASC, m.name ASC, c.name ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [classes] = await connection.promise().query(query, params);
      
      // Count query with same conditions
      const countParams = params.slice(0, -2); // Remove limit and offset
      const [countResult] = await connection.promise().query(countQuery, countParams);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.json({
        success: true,
        data: classes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Error fetching classes:', error);
  ResponseHelper.error(res, 'Lỗi khi lấy danh sách lớp', 500, error.message);
    }
  }

  // Lấy lớp theo ngành
  static async getClassesByMajor(req, res) {
    try {
      const { majorId } = req.params;
      
      const [classes] = await connection.promise().query(`
        SELECT 
          c.id,
          c.name,
          c.major_id,
          COUNT(DISTINCT s.id) as student_count
        FROM Classes c
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE c.major_id = ?
        GROUP BY c.id, c.name, c.major_id
        ORDER BY c.name ASC
      `, [majorId]);

      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      console.error('Error fetching classes by major:', error);
  ResponseHelper.error(res, 'Lỗi khi lấy danh sách lớp theo ngành', 500, error.message);
    }
  }

  // Lấy chi tiết một lớp
  static async getClassById(req, res) {
    try {
      const { id } = req.params;
      
      const [classes] = await connection.promise().query(`
        SELECT 
          c.id,
          c.name,
          c.major_id,
          m.name as major_name,
          d.name as department_name,
          d.id as department_id,
          COUNT(DISTINCT s.id) as student_count
        FROM Classes c
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Departments d ON m.department_id = d.id
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE c.id = ?
        GROUP BY c.id, c.name, c.major_id, m.name, d.name, d.id
      `, [id]);

      if (classes.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy lớp');
      }

      // Lấy danh sách sinh viên thuộc lớp này
      const [students] = await connection.promise().query(`
        SELECT 
          s.id,
          s.student_code,
          s.phone_number,
          u.full_name,
          u.email,
          u.username
        FROM Students s
        LEFT JOIN Users u ON s.user_id = u.id
        WHERE s.class_id = ?
        ORDER BY s.student_code ASC
      `, [id]);

      res.json({
        success: true,
        data: {
          ...classes[0],
          students
        }
      });
    } catch (error) {
      console.error('Error fetching class details:', error);
  ResponseHelper.error(res, 'Lỗi khi lấy thông tin lớp', 500, error.message);
    }
  }

  // Tạo lớp mới
  static async createClass(req, res) {
    try {
      const { name, major_id } = req.body;
      
      if (!name || !name.trim()) {
        return ResponseHelper.badRequest(res, 'Tên lớp không được để trống');
      }

      if (!major_id) {
        return ResponseHelper.badRequest(res, 'Ngành không được để trống');
      }

      // Kiểm tra ngành có tồn tại
      const [major] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [major_id]
      );

      if (major.length === 0) {
        return ResponseHelper.badRequest(res, 'Ngành không tồn tại');
      }

      // Kiểm tra tên lớp đã tồn tại trong ngành
      const [existing] = await connection.promise().query(
        'SELECT id FROM Classes WHERE name = ? AND major_id = ?',
        [name.trim(), major_id]
      );

      if (existing.length > 0) {
        return ResponseHelper.badRequest(res, 'Tên lớp đã tồn tại trong ngành này');
      }

      const [result] = await connection.promise().query(
        'INSERT INTO Classes (name, major_id) VALUES (?, ?)',
        [name.trim(), major_id]
      );

      const [newClass] = await connection.promise().query(`
        SELECT 
          c.id,
          c.name,
          c.major_id,
          m.name as major_name,
          d.name as department_name
        FROM Classes c
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Departments d ON m.department_id = d.id
        WHERE c.id = ?
      `, [result.insertId]);

  ResponseHelper.created(res, newClass[0], 'Tạo lớp thành công');
    } catch (error) {
      console.error('Error creating class:', error);
      // Nếu lỗi là mix collation, trả rõ thông điệp
      if (String(error.sqlMessage || '').includes('Illegal mix of collations')) {
        return ResponseHelper.error(res, 'Lỗi collation: hãy đảm bảo tất cả bảng và cột dùng utf8mb4_unicode_ci', 500, error.sqlMessage);
      }
      ResponseHelper.error(res, 'Lỗi khi tạo lớp', 500, error.message);
    }
  }

  // Cập nhật lớp
  static async updateClass(req, res) {
    try {
      const { id } = req.params;
      const { name, major_id } = req.body;
      
      if (!name || !name.trim()) {
        return ResponseHelper.badRequest(res, 'Tên lớp không được để trống');
      }

      if (!major_id) {
        return ResponseHelper.badRequest(res, 'Ngành không được để trống');
      }

      // Kiểm tra lớp có tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id FROM Classes WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy lớp');
      }

      // Kiểm tra ngành có tồn tại
      const [major] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [major_id]
      );

      if (major.length === 0) {
        return ResponseHelper.badRequest(res, 'Ngành không tồn tại');
      }

      // Kiểm tra tên lớp đã tồn tại trong ngành (trừ lớp hiện tại)
      const [duplicate] = await connection.promise().query(
        'SELECT id FROM Classes WHERE name = ? AND major_id = ? AND id != ?',
        [name.trim(), major_id, id]
      );

      if (duplicate.length > 0) {
        return ResponseHelper.badRequest(res, 'Tên lớp đã tồn tại trong ngành này');
      }

      await connection.promise().query(
        'UPDATE Classes SET name = ?, major_id = ? WHERE id = ?',
        [name.trim(), major_id, id]
      );

      const [updatedClass] = await connection.promise().query(`
        SELECT 
          c.id,
          c.name,
          c.major_id,
          m.name as major_name,
          d.name as department_name
        FROM Classes c
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Departments d ON m.department_id = d.id
        WHERE c.id = ?
      `, [id]);

  ResponseHelper.success(res, updatedClass[0], 'Cập nhật lớp thành công');
    } catch (error) {
      console.error('Error updating class:', error);
  ResponseHelper.error(res, 'Lỗi khi cập nhật lớp', 500, error.message);
    }
  }

  // Xóa lớp
  static async deleteClass(req, res) {
    try {
      const { id } = req.params;
      
      // Kiểm tra lớp có tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id, name FROM Classes WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy lớp');
      }

      // Kiểm tra lớp có sinh viên nào không
      const [students] = await connection.promise().query(
        'SELECT COUNT(*) as student_count FROM Students WHERE class_id = ?',
        [id]
      );

      const studentCount = students[0]?.student_count || 0;
      if (studentCount > 0) {
        return ResponseHelper.badRequest(res, `Không thể xóa lớp "${existing[0].name}" vì còn ${studentCount} sinh viên đang học. Vui lòng chuyển các sinh viên sang lớp khác hoặc xóa sinh viên trước khi xóa lớp.`);
      }

      await connection.promise().query('DELETE FROM Classes WHERE id = ?', [id]);
      
  ResponseHelper.success(res, null, 'Xóa lớp thành công');
    } catch (error) {
      console.error('Error deleting class:', error);
  ResponseHelper.error(res, 'Lỗi khi xóa lớp', 500, error.message);
    }
  }

  // Xóa nhiều lớp
  static async bulkDeleteClasses(req, res) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return ResponseHelper.badRequest(res, 'Danh sách ID không hợp lệ');
      }

      // Kiểm tra các lớp có sinh viên nào không
      const placeholders = ids.map(() => '?').join(',');
      const [classesWithStudents] = await connection.promise().query(
        `SELECT c.id, c.name, COUNT(s.id) as student_count 
         FROM Classes c 
         LEFT JOIN Students s ON c.id = s.class_id 
         WHERE c.id IN (${placeholders}) AND s.id IS NOT NULL
         GROUP BY c.id, c.name`,
        ids
      );

      if (classesWithStudents.length > 0) {
        const classDetails = classesWithStudents.map(c => `"${c.name}" (${c.student_count} sinh viên)`).join(', ');
        return ResponseHelper.badRequest(res, `Không thể xóa các lớp sau vì còn sinh viên: ${classDetails}. Vui lòng chuyển sinh viên sang lớp khác trước khi xóa.`);
      }

      const [result] = await connection.promise().query(
        `DELETE FROM Classes WHERE id IN (${placeholders})`,
        ids
      );

  ResponseHelper.success(res, { deleted: result.affectedRows }, `Đã xóa ${result.affectedRows} lớp thành công`);
    } catch (error) {
      console.error('Error bulk deleting classes:', error);
  ResponseHelper.error(res, 'Lỗi khi xóa lớp', 500, error.message);
    }
  }

  // Lấy thống kê lớp
  static async getClassStats(req, res) {
    try {
      const [stats] = await connection.promise().query(`
        SELECT 
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT s.id) as total_students,
          AVG(student_counts.student_count) as avg_students_per_class
        FROM Classes c
        LEFT JOIN Students s ON c.id = s.class_id
        LEFT JOIN (
          SELECT class_id, COUNT(*) as student_count
          FROM Students
          GROUP BY class_id
        ) student_counts ON c.id = student_counts.class_id
      `);

      const [classStats] = await connection.promise().query(`
        SELECT 
          c.id,
          c.name,
          m.name as major_name,
          d.name as department_name,
          COUNT(DISTINCT s.id) as student_count
        FROM Classes c
        LEFT JOIN Majors m ON c.major_id = m.id
        LEFT JOIN Departments d ON m.department_id = d.id
        LEFT JOIN Students s ON c.id = s.class_id
        GROUP BY c.id, c.name, m.name, d.name
        ORDER BY student_count DESC
        LIMIT 10
      `);

      const [departmentStats] = await connection.promise().query(`
        SELECT 
          d.name as department_name,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        GROUP BY d.id, d.name
        ORDER BY class_count DESC
      `);

      res.json({
        success: true,
        data: {
          overview: stats[0],
          topClasses: classStats,
          departmentDistribution: departmentStats
        }
      });
    } catch (error) {
      console.error('Error fetching class stats:', error);
  ResponseHelper.error(res, 'Lỗi khi lấy thống kê lớp', 500, error.message);
    }
  }

  // Chuyển sinh viên giữa các lớp
  static async transferStudents(req, res) {
    try {
      const { studentIds, fromClassId, toClassId } = req.body;
      
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return ResponseHelper.badRequest(res, 'Danh sách sinh viên không hợp lệ');
      }

      if (!toClassId) {
        return ResponseHelper.badRequest(res, 'Lớp đích không được để trống');
      }

      // Kiểm tra lớp đích có tồn tại
      const [toClass] = await connection.promise().query(
        'SELECT id, name FROM Classes WHERE id = ?',
        [toClassId]
      );

      if (toClass.length === 0) {
        return ResponseHelper.badRequest(res, 'Lớp đích không tồn tại');
      }

      // Cập nhật lớp cho các sinh viên
      const placeholders = studentIds.map(() => '?').join(',');
      const params = [toClassId, ...studentIds];
      
      if (fromClassId) {
        params.push(fromClassId);
        var query = `UPDATE Students SET class_id = ? WHERE id IN (${placeholders}) AND class_id = ?`;
      } else {
        var query = `UPDATE Students SET class_id = ? WHERE id IN (${placeholders})`;
      }

      const [result] = await connection.promise().query(query, params);

  ResponseHelper.success(res, { moved: result.affectedRows, toClass: toClass[0].name }, `Đã chuyển ${result.affectedRows} sinh viên sang lớp ${toClass[0].name}`);
    } catch (error) {
      console.error('Error transferring students:', error);
  ResponseHelper.error(res, 'Lỗi khi chuyển sinh viên', 500, error.message);
    }
  }
}

module.exports = ClassController;
