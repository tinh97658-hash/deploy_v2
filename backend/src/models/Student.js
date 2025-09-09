const connection = require('../config/database');

class Student {
  static async findByUserId(userId) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT s.*, u.username, u.email, u.full_name, u.role,
               d.name as department_name, m.name as major_name
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        LEFT JOIN Departments d ON s.department_id = d.id
        LEFT JOIN Majors m ON s.major_id = m.id
        WHERE s.user_id = ?
      `, [userId]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findByStudentCode(studentCode) {
    try {
      const [rows] = await connection.promise().query(`
        SELECT s.*, u.username, u.email, u.full_name, u.role,
               d.name as department_name, m.name as major_name
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        LEFT JOIN Departments d ON s.department_id = d.id
        LEFT JOIN Majors m ON s.major_id = m.id
        WHERE s.student_code = ?
      `, [studentCode]);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getAllStudents() {
    try {
      const [rows] = await connection.promise().query(`
        SELECT s.*, u.username, u.email, u.full_name, u.role,
               d.name as department_name, m.name as major_name
        FROM Students s
        JOIN Users u ON s.user_id = u.id
        LEFT JOIN Departments d ON s.department_id = d.id
        LEFT JOIN Majors m ON s.major_id = m.id
        ORDER BY s.student_code
      `);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async create(userData, studentData) {
    const conn = await connection.promise();
    
    try {
      await conn.beginTransaction();

      // Tạo user trước
      const [userResult] = await conn.query(
        "INSERT INTO Users (username, password_hash, role, email, full_name) VALUES (?, ?, 'STUDENT', ?, ?)",
        [userData.username, userData.password, userData.email, userData.full_name]
      );

      // Tạo student
      const [studentResult] = await conn.query(
        "INSERT INTO Students (user_id, student_code, department_id, major_id) VALUES (?, ?, ?, ?)",
        [userResult.insertId, studentData.student_code, studentData.department_id, studentData.major_id]
      );

      await conn.commit();
      return { userId: userResult.insertId, studentId: studentResult.insertId };
    } catch (error) {
      await conn.rollback();
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = Student;
