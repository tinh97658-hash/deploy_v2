const connection = require('../config/database');
const ResponseHelper = require('../utils/ResponseHelper');

class DepartmentController {
  // Lấy tất cả khoa
  static async getAllDepartments(req, res) {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let query = `
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT m.id) as major_count,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
      `;
      
      let countQuery = 'SELECT COUNT(*) as total FROM Departments d';
      let params = [];
      
      if (search.trim()) {
        query += ' WHERE d.name LIKE ?';
        countQuery += ' WHERE d.name LIKE ?';
        params.push(`%${search.trim()}%`);
      }
      
      query += ' GROUP BY d.id, d.name ORDER BY d.name ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [departments] = await connection.promise().query(query, params);
      const [countResult] = await connection.promise().query(countQuery, search.trim() ? [`%${search.trim()}%`] : []);
      
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.json({
        success: true,
        data: departments,
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
      console.error('Error fetching departments:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy danh sách khoa', error.message);
    }
  }

  // Lấy chi tiết một khoa
  static async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      
      const [departments] = await connection.promise().query(`
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT m.id) as major_count,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE d.id = ?
        GROUP BY d.id, d.name
      `, [id]);

      if (departments.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy khoa');
      }

      // Lấy danh sách ngành thuộc khoa này
      const [majors] = await connection.promise().query(`
        SELECT 
          m.id,
          m.name,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Majors m
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        WHERE m.department_id = ?
        GROUP BY m.id, m.name
        ORDER BY m.name ASC
      `, [id]);

      res.json({
        success: true,
        data: {
          ...departments[0],
          majors
        }
      });
    } catch (error) {
      console.error('Error fetching department details:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy thông tin khoa', error.message);
    }
  }

  // Tạo khoa mới
  static async createDepartment(req, res) {
    try {
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return ResponseHelper.badRequest(res, 'Tên khoa không được để trống');
      }

      // Kiểm tra tên khoa đã tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id FROM Departments WHERE name = ?',
        [name.trim()]
      );

      if (existing.length > 0) {
        return ResponseHelper.badRequest(res, 'Tên khoa đã tồn tại');
      }

      const [result] = await connection.promise().query(
        'INSERT INTO Departments (name) VALUES (?)',
        [name.trim()]
      );

      const [newDepartment] = await connection.promise().query(
        'SELECT id, name FROM Departments WHERE id = ?',
        [result.insertId]
      );

      ResponseHelper.created(res, newDepartment[0], 'Tạo khoa thành công');
    } catch (error) {
      console.error('Error creating department:', error);
      ResponseHelper.error(res, 'Lỗi khi tạo khoa', error.message);
    }
  }

  // Cập nhật khoa
  static async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return ResponseHelper.badRequest(res, 'Tên khoa không được để trống');
      }

      // Kiểm tra khoa có tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy khoa');
      }

      // Kiểm tra tên khoa đã tồn tại (trừ khoa hiện tại)
      const [duplicate] = await connection.promise().query(
        'SELECT id FROM Departments WHERE name = ? AND id != ?',
        [name.trim(), id]
      );

      if (duplicate.length > 0) {
        return ResponseHelper.badRequest(res, 'Tên khoa đã tồn tại');
      }

      await connection.promise().query(
        'UPDATE Departments SET name = ? WHERE id = ?',
        [name.trim(), id]
      );

      const [updatedDepartment] = await connection.promise().query(
        'SELECT id, name FROM Departments WHERE id = ?',
        [id]
      );

      ResponseHelper.success(res, updatedDepartment[0], 'Cập nhật khoa thành công');
    } catch (error) {
      console.error('Error updating department:', error);
      ResponseHelper.error(res, 'Lỗi khi cập nhật khoa', error.message);
    }
  }

  // Xóa khoa
  static async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      
      // Kiểm tra khoa có tồn tại
      const [existing] = await connection.promise().query(
        'SELECT id, name FROM Departments WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return ResponseHelper.notFound(res, 'Không tìm thấy khoa');
      }

      // Kiểm tra khoa có ngành nào không
      const [majors] = await connection.promise().query(
        'SELECT COUNT(*) as major_count FROM Majors WHERE department_id = ?',
        [id]
      );

      const majorCount = majors[0]?.major_count || 0;
      if (majorCount > 0) {
        return ResponseHelper.badRequest(res, `Không thể xóa khoa "${existing[0].name}" vì khoa này hiện có ${majorCount} ngành. Vui lòng chuyển hoặc xóa tất cả ngành trước khi xóa khoa.`);
      }

      await connection.promise().query('DELETE FROM Departments WHERE id = ?', [id]);
      
      ResponseHelper.success(res, null, 'Xóa khoa thành công');
    } catch (error) {
      console.error('Error deleting department:', error);
      ResponseHelper.error(res, 'Lỗi khi xóa khoa', error.message);
    }
  }

  // Xóa nhiều khoa
  static async bulkDeleteDepartments(req, res) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return ResponseHelper.badRequest(res, 'Danh sách ID không hợp lệ');
      }

      // Kiểm tra các khoa có ngành nào không
      const placeholders = ids.map(() => '?').join(',');
      const [departmentsWithMajors] = await connection.promise().query(
        `SELECT 
          d.id, 
          d.name, 
          COUNT(m.id) as major_count 
        FROM Departments d 
        LEFT JOIN Majors m ON d.id = m.department_id 
        WHERE d.id IN (${placeholders}) AND m.id IS NOT NULL
        GROUP BY d.id, d.name`,
        ids
      );

      if (departmentsWithMajors.length > 0) {
        const departmentDetails = departmentsWithMajors.map(dept => `"${dept.name}" (${dept.major_count} ngành)`);
        return ResponseHelper.badRequest(res, `Không thể xóa các khoa sau vì còn có ngành: ${departmentDetails.join(', ')}. Vui lòng chuyển hoặc xóa tất cả ngành trước khi xóa khoa.`);
      }

      const [result] = await connection.promise().query(
        `DELETE FROM Departments WHERE id IN (${placeholders})`,
        ids
      );

      ResponseHelper.success(res, { deleted: result.affectedRows }, `Đã xóa ${result.affectedRows} khoa thành công`);
    } catch (error) {
      console.error('Error bulk deleting departments:', error);
      ResponseHelper.error(res, 'Lỗi khi xóa khoa', error.message);
    }
  }

  // Lấy thống kê khoa
  static async getDepartmentStats(req, res) {
    try {
      const [stats] = await connection.promise().query(`
        SELECT 
          COUNT(DISTINCT d.id) as total_departments,
          COUNT(DISTINCT m.id) as total_majors,
          COUNT(DISTINCT c.id) as total_classes,
          COUNT(DISTINCT s.id) as total_students
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
      `);

      const [departmentStats] = await connection.promise().query(`
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT m.id) as major_count,
          COUNT(DISTINCT c.id) as class_count,
          COUNT(DISTINCT s.id) as student_count
        FROM Departments d
        LEFT JOIN Majors m ON d.id = m.department_id
        LEFT JOIN Classes c ON m.id = c.major_id
        LEFT JOIN Students s ON c.id = s.class_id
        GROUP BY d.id, d.name
        ORDER BY student_count DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          overview: stats[0],
          topDepartments: departmentStats
        }
      });
    } catch (error) {
      console.error('Error fetching department stats:', error);
      ResponseHelper.error(res, 'Lỗi khi lấy thống kê khoa', error.message);
    }
  }
}

module.exports = DepartmentController;
