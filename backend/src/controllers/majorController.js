const connection = require('../config/database');
const ResponseHelper = require('../utils/ResponseHelper');

class MajorController {
  // Lấy tất cả ngành hoặc theo khoa
  static async getAllMajors(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '', 
        departmentId = '' 
      } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let query = `
        SELECT 
          m.id,
          m.name,
          m.department_id,
          d.name as department_name,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Majors m
        LEFT JOIN Departments d ON m.department_id = d.id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
      `;
      
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM Majors m
        LEFT JOIN Departments d ON m.department_id = d.id
      `;
      
      let whereConditions = [];
      let params = [];
      
      if (search.trim()) {
        whereConditions.push('(m.name LIKE ? OR d.name LIKE ?)');
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }
      
      if (departmentId) {
        whereConditions.push('m.department_id = ?');
        params.push(departmentId);
      }
      
      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }
      
      query += ' GROUP BY m.id, m.name, m.department_id, d.name ORDER BY d.name ASC, m.name ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [majors] = await connection.promise().query(query, params);
      
      // Count query with same conditions
      const countParams = params.slice(0, -2); // Remove limit and offset
      const [countResult] = await connection.promise().query(countQuery, countParams);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.json({
        success: true,
        data: majors,
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
      console.error('Error fetching majors:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy danh sách ngành', error.message);
    }
  }

  // Lấy ngành theo khoa
  static async getMajorsByDepartment(req, res) {
    try {
      const { departmentId } = req.params;
      
      const [majors] = await connection.promise().query(`
        SELECT 
          m.id,
          m.name,
          m.department_id,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Majors m
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE m.department_id = ?
        GROUP BY m.id, m.name, m.department_id
        ORDER BY m.name ASC
      `, [departmentId]);

      res.json({
        success: true,
        data: majors
      });
    } catch (error) {
      console.error('Error fetching majors by department:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy danh sách ngành theo khoa', error.message);
    }
  }

  // Lấy chi tiết một ngành
  static async getMajorById(req, res) {
    try {
      const { id } = req.params;
      
      const [majors] = await connection.promise().query(`
        SELECT 
          m.id,
          m.name,
          m.department_id,
          d.name as department_name,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Majors m
        LEFT JOIN Departments d ON m.department_id = d.id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE m.id = ?
        GROUP BY m.id, m.name, m.department_id, d.name
      `, [id]);

      if (majors.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy ngành');
      }

      // Lấy danh sách lớp thuộc ngành này
      const [classes] = await connection.promise().query(`
        SELECT 
          c.id,
          c.name,
          COUNT(DISTINCT s.id) as student_count
        FROM Classes c
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE c.major_id = ?
        GROUP BY c.id, c.name
        ORDER BY c.name ASC
      `, [id]);

      res.json({
        success: true,
        data: {
          ...majors[0],
          classes
        }
      });
    } catch (error) {
      console.error('Error fetching major details:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy thông tin ngành', error.message);
    }
  }

  // Tạo ngành mới
  static async createMajor(req, res) {
    try {
      const { name, department_id } = req.body;
      
      if (!name || !name.trim()) {
        return ResponseHelper.badRequest(res, 'Tên ngành không được để trống');
      }

      if (!department_id) {
        return ResponseHelper.badRequest(res, 'Khoa không được để trống');
      }

      // Kiểm tra khoa có tồn tại
      const [department] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [department_id]
      );

      if (department.length === 0) {
        return ResponseHelper.badRequest(res, 'Khoa không tồn tại');
      }

      // Kiểm tra tên ngành đã tồn tại trong khoa
      const [existing] = await connection.promise().query(
        'SELECT id FROM Majors WHERE name = ? AND department_id = ?',
        [name.trim(), department_id]
      );

      if (existing.length > 0) {
        return ResponseHelper.badRequest(res, 'Tên ngành đã tồn tại trong khoa này');
      }

      const [result] = await connection.promise().query(
        'INSERT INTO Majors (name, department_id) VALUES (?, ?)',
        [name.trim(), department_id]
      );

      const [newMajor] = await connection.promise().query(`
        SELECT 
          m.id,
          m.name,
          m.department_id,
          d.name as department_name
        FROM Majors m
        LEFT JOIN Departments d ON m.department_id = d.id
        WHERE m.id = ?
      `, [result.insertId]);

      ResponseHelper.created(res, newMajor[0], 'Tạo ngành thành công');
    } catch (error) {
      console.error('Error creating major:', error);
      ResponseHelper.error(res, 'Lỗi khi tạo ngành', error.message);
    }
  }

  // Cập nhật ngành
  static async updateMajor(req, res) {
    try {
      const { id } = req.params;
      const { name, department_id } = req.body;
      
      if (!name || !name.trim()) {
        return ResponseHelper.badRequest(res, 'Tên ngành không được để trống');
      }

      if (!department_id) {
        return ResponseHelper.badRequest(res, 'Khoa không được để trống');
      }

      // Kiểm tra ngành có tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy ngành');
      }

      // Kiểm tra khoa có tồn tại
      const [department] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [department_id]
      );

      if (department.length === 0) {
        return ResponseHelper.badRequest(res, 'Khoa không tồn tại');
      }

      // Kiểm tra tên ngành đã tồn tại trong khoa (trừ ngành hiện tại)
      const [duplicate] = await connection.promise().query(
        'SELECT id FROM Majors WHERE name = ? AND department_id = ? AND id != ?',
        [name.trim(), department_id, id]
      );

      if (duplicate.length > 0) {
        return ResponseHelper.badRequest(res, 'Tên ngành đã tồn tại trong khoa này');
      }

      await connection.promise().query(
        'UPDATE Majors SET name = ?, department_id = ? WHERE id = ?',
        [name.trim(), department_id, id]
      );

      const [updatedMajor] = await connection.promise().query(`
        SELECT 
          m.id,
          m.name,
          m.department_id,
          d.name as department_name
        FROM Majors m
        LEFT JOIN Departments d ON m.department_id = d.id
        WHERE m.id = ?
      `, [id]);

      ResponseHelper.success(res, updatedMajor[0], 'Cập nhật ngành thành công');
    } catch (error) {
      console.error('Error updating major:', error);
      ResponseHelper.error(res, 'Lỗi khi cập nhật ngành', error.message);
    }
  }

  // Xóa ngành
  static async deleteMajor(req, res) {
    try {
      const { id } = req.params;
      
      // Kiểm tra ngành có tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id, name FROM Majors WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy ngành');
      }

      // Kiểm tra ngành có lớp nào không
      const [classes] = await connection.promise().query(
        'SELECT id FROM Classes WHERE major_id = ?',
        [id]
      );

      if (classes.length > 0) {
        return ResponseHelper.badRequest(res, 'Không thể xóa ngành đã có lớp. Vui lòng xóa tất cả lớp trước.');
      }

      await connection.promise().query('DELETE FROM Majors WHERE id = ?', [id]);
      
      ResponseHelper.success(res, null, 'Xóa ngành thành công');
    } catch (error) {
      console.error('Error deleting major:', error);
      ResponseHelper.error(res, 'Lỗi khi xóa ngành', error.message);
    }
  }

  // Xóa nhiều ngành
  static async bulkDeleteMajors(req, res) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return ResponseHelper.badRequest(res, 'Danh sách ID không hợp lệ');
      }

      // Kiểm tra các ngành có lớp nào không
      const placeholders = ids.map(() => '?').join(',');
      const [classes] = await connection.promise().query(
        `SELECT DISTINCT major_id FROM Classes WHERE major_id IN (${placeholders})`,
        ids
      );

      if (classes.length > 0) {
        const majorIds = classes.map(c => c.major_id);
        return ResponseHelper.badRequest(res, `Không thể xóa các ngành có ID: ${majorIds.join(', ')} vì đã có lớp`);
      }

      const [result] = await connection.promise().query(
        `DELETE FROM Majors WHERE id IN (${placeholders})`,
        ids
      );

      ResponseHelper.success(res, { deleted: result.affectedRows }, `Đã xóa ${result.affectedRows} ngành thành công`);
    } catch (error) {
      console.error('Error bulk deleting majors:', error);
      ResponseHelper.error(res, 'Lỗi khi xóa ngành', error.message);
    }
  }

  // Lấy thống kê ngành
  static async getMajorStats(req, res) {
    try {
      const [stats] = await connection.promise().query(`
        SELECT 
          COUNT(DISTINCT m.id) as total_majors,
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT s.id) as total_students,
          AVG(class_counts.class_count) as avg_classes_per_major
        FROM Majors m
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        LEFT JOIN (
          SELECT major_id, COUNT(*) as class_count
          FROM Classes
          GROUP BY major_id
        ) class_counts ON m.id = class_counts.major_id
      `);

      const [majorStats] = await connection.promise().query(`
        SELECT 
          m.id,
          m.name,
          d.name as department_name,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Majors m
        LEFT JOIN Departments d ON m.department_id = d.id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        GROUP BY m.id, m.name, d.name
        ORDER BY student_count DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          overview: stats[0],
          topMajors: majorStats
        }
      });
    } catch (error) {
      console.error('Error fetching major stats:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy thống kê ngành', error.message);
    }
  }
}

module.exports = MajorController;
