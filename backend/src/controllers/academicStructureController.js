const connection = require('../config/database');

class AcademicStructureController {
  // ============= DEPARTMENT METHODS =============
  
  static async getAllDepartments(req, res) {
    try {
      const [departments] = await connection.promise().query(
        'SELECT id, name FROM Departments ORDER BY name ASC'
      );
      
      res.json({
        success: true,
        data: departments
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách khoa',
        error: error.message
      });
    }
  }

  static async createDepartment(req, res) {
    try {
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên khoa không được để trống'
        });
      }

      // Check if department name already exists
      const [existing] = await connection.promise().query(
        'SELECT id FROM Departments WHERE name = ?',
        [name.trim()]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tên khoa đã tồn tại'
        });
      }

      const [result] = await connection.promise().query(
        'INSERT INTO Departments (name) VALUES (?)',
        [name.trim()]
      );

      const [newDepartment] = await connection.promise().query(
        'SELECT id, name FROM Departments WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Tạo khoa thành công',
        data: newDepartment[0]
      });
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo khoa',
        error: error.message
      });
    }
  }

  static async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên khoa không được để trống'
        });
      }

      // Check if department exists
      const [existing] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khoa'
        });
      }

      // Check if name already exists (excluding current department)
      const [nameExists] = await connection.promise().query(
        'SELECT id FROM Departments WHERE name = ? AND id != ?',
        [name.trim(), id]
      );

      if (nameExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tên khoa đã tồn tại'
        });
      }

      await connection.promise().query(
        'UPDATE Departments SET name = ? WHERE id = ?',
        [name.trim(), id]
      );

      const [updatedDepartment] = await connection.promise().query(
        'SELECT id, name FROM Departments WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Cập nhật khoa thành công',
        data: updatedDepartment[0]
      });
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật khoa',
        error: error.message
      });
    }
  }

  static async deleteDepartment(req, res) {
    try {
      const { id } = req.params;

      // Check if department exists
      const [existing] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khoa'
        });
      }

      // Check if department has majors
      const [majors] = await connection.promise().query(
        'SELECT id FROM Majors WHERE department_id = ?',
        [id]
      );

      if (majors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa khoa đã có ngành học'
        });
      }

      await connection.promise().query(
        'DELETE FROM Departments WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Xóa khoa thành công'
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa khoa',
        error: error.message
      });
    }
  }

  // ============= MAJOR METHODS =============
  
  static async getMajorsByDepartment(req, res) {
    try {
      const { departmentId } = req.params;
      
      const [majors] = await connection.promise().query(`
        SELECT m.id, m.name, m.department_id, d.name as department_name
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        WHERE m.department_id = ?
        ORDER BY m.name ASC
      `, [departmentId]);
      
      res.json({
        success: true,
        data: majors
      });
    } catch (error) {
      console.error('Error fetching majors:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách ngành',
        error: error.message
      });
    }
  }

  static async getAllMajors(req, res) {
    try {
      const [majors] = await connection.promise().query(`
        SELECT m.id, m.name, m.department_id, d.name as department_name
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        ORDER BY d.name ASC, m.name ASC
      `);
      
      res.json({
        success: true,
        data: majors
      });
    } catch (error) {
      console.error('Error fetching majors:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách ngành',
        error: error.message
      });
    }
  }

  static async createMajor(req, res) {
    try {
      const { name, department_id } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên ngành không được để trống'
        });
      }

      if (!department_id) {
        return res.status(400).json({
          success: false,
          message: 'Phải chọn khoa'
        });
      }

      // Check if department exists
      const [department] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [department_id]
      );

      if (department.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Khoa không tồn tại'
        });
      }

      // Check if major name already exists in the department
      const [existing] = await connection.promise().query(
        'SELECT id FROM Majors WHERE name = ? AND department_id = ?',
        [name.trim(), department_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tên ngành đã tồn tại trong khoa này'
        });
      }

      const [result] = await connection.promise().query(
        'INSERT INTO Majors (name, department_id) VALUES (?, ?)',
        [name.trim(), department_id]
      );

      const [newMajor] = await connection.promise().query(`
        SELECT m.id, m.name, m.department_id, d.name as department_name
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        WHERE m.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Tạo ngành thành công',
        data: newMajor[0]
      });
    } catch (error) {
      console.error('Error creating major:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo ngành',
        error: error.message
      });
    }
  }

  static async updateMajor(req, res) {
    try {
      const { id } = req.params;
      const { name, department_id } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên ngành không được để trống'
        });
      }

      if (!department_id) {
        return res.status(400).json({
          success: false,
          message: 'Phải chọn khoa'
        });
      }

      // Check if major exists
      const [existing] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ngành'
        });
      }

      // Check if department exists
      const [department] = await connection.promise().query(
        'SELECT id FROM Departments WHERE id = ?',
        [department_id]
      );

      if (department.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Khoa không tồn tại'
        });
      }

      // Check if name already exists (excluding current major)
      const [nameExists] = await connection.promise().query(
        'SELECT id FROM Majors WHERE name = ? AND department_id = ? AND id != ?',
        [name.trim(), department_id, id]
      );

      if (nameExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tên ngành đã tồn tại trong khoa này'
        });
      }

      await connection.promise().query(
        'UPDATE Majors SET name = ?, department_id = ? WHERE id = ?',
        [name.trim(), department_id, id]
      );

      const [updatedMajor] = await connection.promise().query(`
        SELECT m.id, m.name, m.department_id, d.name as department_name
        FROM Majors m
        JOIN Departments d ON m.department_id = d.id
        WHERE m.id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Cập nhật ngành thành công',
        data: updatedMajor[0]
      });
    } catch (error) {
      console.error('Error updating major:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật ngành',
        error: error.message
      });
    }
  }

  static async deleteMajor(req, res) {
    try {
      const { id } = req.params;

      // Check if major exists
      const [existing] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ngành'
        });
      }

      // Check if major has classes
      const [classes] = await connection.promise().query(
        'SELECT id FROM Classes WHERE major_id = ?',
        [id]
      );

      if (classes.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa ngành đã có lớp học'
        });
      }

      await connection.promise().query(
        'DELETE FROM Majors WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Xóa ngành thành công'
      });
    } catch (error) {
      console.error('Error deleting major:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa ngành',
        error: error.message
      });
    }
  }

  // ============= CLASS METHODS =============
  
  static async getClassesByMajor(req, res) {
    try {
      const { majorId } = req.params;
      
      const [classes] = await connection.promise().query(`
        SELECT c.id, c.name, c.major_id, 
               m.name as major_name, d.name as department_name
        FROM Classes c
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE c.major_id = ?
        ORDER BY c.name ASC
      `, [majorId]);
      
      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách lớp',
        error: error.message
      });
    }
  }

  static async getAllClasses(req, res) {
    try {
      const [classes] = await connection.promise().query(`
        SELECT c.id, c.name, c.major_id,
               m.name as major_name, d.name as department_name
        FROM Classes c
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        ORDER BY d.name ASC, m.name ASC, c.name ASC
      `);
      
      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách lớp',
        error: error.message
      });
    }
  }

  static async createClass(req, res) {
    try {
      const { name, major_id } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên lớp không được để trống'
        });
      }

      if (!major_id) {
        return res.status(400).json({
          success: false,
          message: 'Phải chọn ngành'
        });
      }

      // Check if major exists
      const [major] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [major_id]
      );

      if (major.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ngành không tồn tại'
        });
      }

      // Check if class name already exists in the major
      const [existing] = await connection.promise().query(
        'SELECT id FROM Classes WHERE name = ? AND major_id = ?',
        [name.trim(), major_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tên lớp đã tồn tại trong ngành này'
        });
      }

      const [result] = await connection.promise().query(
        'INSERT INTO Classes (name, major_id) VALUES (?, ?)',
        [name.trim(), major_id]
      );

      const [newClass] = await connection.promise().query(`
        SELECT c.id, c.name, c.major_id,
               m.name as major_name, d.name as department_name
        FROM Classes c
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE c.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Tạo lớp thành công',
        data: newClass[0]
      });
    } catch (error) {
      console.error('Error creating class:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo lớp',
        error: error.message
      });
    }
  }

  static async updateClass(req, res) {
    try {
      const { id } = req.params;
      const { name, major_id } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên lớp không được để trống'
        });
      }

      if (!major_id) {
        return res.status(400).json({
          success: false,
          message: 'Phải chọn ngành'
        });
      }

      // Check if class exists
      const [existing] = await connection.promise().query(
        'SELECT id FROM Classes WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lớp'
        });
      }

      // Check if major exists
      const [major] = await connection.promise().query(
        'SELECT id FROM Majors WHERE id = ?',
        [major_id]
      );

      if (major.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ngành không tồn tại'
        });
      }

      // Check if name already exists (excluding current class)
      const [nameExists] = await connection.promise().query(
        'SELECT id FROM Classes WHERE name = ? AND major_id = ? AND id != ?',
        [name.trim(), major_id, id]
      );

      if (nameExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tên lớp đã tồn tại trong ngành này'
        });
      }

      await connection.promise().query(
        'UPDATE Classes SET name = ?, major_id = ? WHERE id = ?',
        [name.trim(), major_id, id]
      );

      const [updatedClass] = await connection.promise().query(`
        SELECT c.id, c.name, c.major_id,
               m.name as major_name, d.name as department_name
        FROM Classes c
        JOIN Majors m ON c.major_id = m.id
        JOIN Departments d ON m.department_id = d.id
        WHERE c.id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Cập nhật lớp thành công',
        data: updatedClass[0]
      });
    } catch (error) {
      console.error('Error updating class:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật lớp',
        error: error.message
      });
    }
  }

  static async deleteClass(req, res) {
    try {
      const { id } = req.params;

      // Check if class exists
      const [existing] = await connection.promise().query(
        'SELECT id, name FROM Classes WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lớp'
        });
      }

      // Check if class has students
      const [students] = await connection.promise().query(
        'SELECT COUNT(*) as student_count FROM Students WHERE class_id = ?',
        [id]
      );

      const studentCount = students[0]?.student_count || 0;
      if (studentCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa lớp "${existing[0].name}" vì còn ${studentCount} sinh viên đang học. Vui lòng chuyển các sinh viên sang lớp khác hoặc xóa sinh viên trước khi xóa lớp.`
        });
      }

      await connection.promise().query(
        'DELETE FROM Classes WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Xóa lớp thành công'
      });
    } catch (error) {
      console.error('Error deleting class:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa lớp',
        error: error.message
      });
    }
  }
}

module.exports = AcademicStructureController;
