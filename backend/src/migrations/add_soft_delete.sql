-- SOFT DELETE APPROACH - An toàn hơn cho production
-- Thêm cột deleted_at cho các bảng quan trọng

ALTER TABLE Users ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE Students ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE Exams ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE Topics ADD COLUMN deleted_at TIMESTAMP NULL;

-- Tạo indexes cho soft delete
CREATE INDEX idx_users_deleted_at ON Users(deleted_at);
CREATE INDEX idx_students_deleted_at ON Students(deleted_at);
CREATE INDEX idx_exams_deleted_at ON Exams(deleted_at);
CREATE INDEX idx_topics_deleted_at ON Topics(deleted_at);

-- Soft Delete Logic Example:
/*
// Soft Delete Student
static async softDeleteStudent(req, res) {
  const { id } = req.params;
  
  await DatabaseService.execute('START TRANSACTION');
  try {
    // Soft delete student
    await DatabaseService.execute(
      'UPDATE Students SET deleted_at = NOW() WHERE id = ?', [id]
    );
    
    // Soft delete associated user
    const student = await DatabaseService.execute(
      'SELECT user_id FROM Students WHERE id = ?', [id]
    );
    await DatabaseService.execute(
      'UPDATE Users SET deleted_at = NOW() WHERE id = ?', 
      [student[0].user_id]
    );
    
    await DatabaseService.execute('COMMIT');
    return ResponseHelper.success(res, null, 'Đã vô hiệu hóa sinh viên');
  } catch (error) {
    await DatabaseService.execute('ROLLBACK');
    throw error;
  }
}

// Update all queries to exclude deleted records
static async getAllStudents(req, res) {
  const query = `
    SELECT ... FROM Students s
    JOIN Users u ON s.user_id = u.id
    WHERE s.deleted_at IS NULL AND u.deleted_at IS NULL
    ...
  `;
}
*/
