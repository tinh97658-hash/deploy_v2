const connection = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async findByUsername(username) {
    try {
      const [rows] = await connection.promise().query(
        "SELECT * FROM Users WHERE username = ?", 
        [username]
      );
      console.log('Database query result:', rows[0]); // Debug log
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const [rows] = await connection.promise().query(
        "SELECT * FROM Users WHERE id = ?", 
        [id]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const [rows] = await connection.promise().query(
        "SELECT * FROM Users WHERE email = ?", 
        [email]
      );
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async updateLastLogin(id) {
    try {
      // Vì bảng không có cột last_login, ta bỏ qua function này
      // Hoặc có thể thêm cột last_login vào database nếu cần
      console.log(`User ${id} logged in successfully`);
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getAllUsers() {
    try {
      const [rows] = await connection.promise().query(
        "SELECT id, username, email, full_name, role FROM Users"
      );
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async updatePassword(id, newPassword) {
    try {
      // Hash with bcrypt if possible, but keep legacy password column for compatibility
      const saltRounds = parseInt(process.env.PASSWORD_HASH_ROUNDS || '10', 10);
      let passwordHash = null;
      try {
        passwordHash = await bcrypt.hash(newPassword, saltRounds);
      } catch (e) {
        // hashing failed; proceed to store plain (not ideal, but keeps legacy behavior)
        passwordHash = null;
      }

      // Try to update both columns (password_hash may not exist in some DBs)
      try {
        const [result] = await connection.promise().query(
          'UPDATE Users SET password = ?, password_hash = ? WHERE id = ?',
          [newPassword, passwordHash, id]
        );
        return result && result.affectedRows > 0;
      } catch (err) {
        // Fallback if password_hash column doesn't exist
        const [result] = await connection.promise().query(
          'UPDATE Users SET password = ? WHERE id = ?',
          [newPassword, id]
        );
        return result && result.affectedRows > 0;
      }
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = User;