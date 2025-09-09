const ResponseHelper = require('../utils/ResponseHelper');
const DatabaseService = require('../services/DatabaseService');

const formatDateTime = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  // Pad số
  const pad = n => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

class ScheduleController {
  // Lấy danh sách lịch thi
  static async getSchedules(req, res) {
    try {
      const query = 'SELECT * FROM Schedules ORDER BY start ASC';
      const schedules = await DatabaseService.execute(query);
      return ResponseHelper.success(res, schedules, 'Lấy danh sách lịch thi thành công');
    } catch (error) {
      console.error('Get schedules error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi lấy danh sách lịch thi', 500);
    }
  }

  // Tạo mới lịch thi
  static async createSchedule(req, res) {
    try {
      let schedules = Array.isArray(req.body) ? req.body : [req.body];
        for (const item of schedules) {
          // Coerce values and support global schedules (NULL dept/major)
          let { department_id, start, end, major_id, topic_id, notes } = item;
          // Accept various "ALL" markers or empty strings and convert to NULL
          const normalizeId = (val) => {
            if (val === undefined || val === null) return null;
            if (val === '' || val === 'null' || val === '__ALL__') return null;
            if (val === 0 || val === '0') return null; // treat 0 as ALL
            return val;
          };
          department_id = normalizeId(department_id);
          major_id = normalizeId(major_id);
          // Allow global schedules: department_id and major_id can be null
          if (!start || !end || !topic_id) {
            return ResponseHelper.error(res, 'Thiếu thông tin thời gian hoặc chuyên đề', 400);
          }
        // Kiểm tra topic_id có tồn tại trong bảng Topics
        const topicCheck = await DatabaseService.execute('SELECT id FROM Topics WHERE id = ?', [topic_id]);
        if (!topicCheck || topicCheck.length === 0) {
          return ResponseHelper.error(res, `Topic id ${topic_id} không tồn tại`, 400);
        }
        // Chuyển đổi thời gian về định dạng SQL
        const startSql = formatDateTime(start);
        const endSql = formatDateTime(end);
        if (!startSql || !endSql) {
          return ResponseHelper.error(res, 'Thời gian không hợp lệ', 400);
        }
          // Quote reserved column names just in case (e.g., `end`)
          const query = 'INSERT INTO `Schedules` (`department_id`, `start`, `end`, `major_id`, `topic_id`, `notes`) VALUES (?, ?, ?, ?, ?, ?)';
          const result = await DatabaseService.execute(query, [
            department_id,
            startSql,
            endSql,
            major_id,
            topic_id,
            notes || ''
          ]);
        console.log('Insert schedule result:', result);
        if (!result || (result.affectedRows !== undefined && result.affectedRows === 0)) {
          return ResponseHelper.error(res, 'Không thể lưu lịch thi vào database', 500);
        }
      }
      return ResponseHelper.success(res, {}, 'Tạo lịch thi thành công');
    } catch (error) {
      console.error('Create schedule error:', error);
      // Surface DB error details in development to help debugging
      const message = process.env.NODE_ENV === 'development' && error?.sqlMessage
        ? `Lỗi DB: ${error.sqlMessage}`
        : 'Lỗi server khi tạo lịch thi';
      return ResponseHelper.error(res, message, 500);
    }
  }

  // Xóa lịch thi
  static async deleteSchedule(req, res) {
    try {
      const { id } = req.params;
      const query = 'DELETE FROM Schedules WHERE id = ?';
      await DatabaseService.execute(query, [id]);
      return ResponseHelper.success(res, {}, 'Xóa lịch thi thành công');
    } catch (error) {
      console.error('Delete schedule error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi xóa lịch thi', 500);
    }
  }

  // Cập nhật lịch thi
  static async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { start, end, notes } = req.body || {};
      if (!start && !end && notes === undefined) {
        return ResponseHelper.error(res, 'Không có dữ liệu để cập nhật', 400);
      }
      let fields = [];
      let params = [];
      if (start) {
        const startSql = formatDateTime(start);
        if (!startSql) return ResponseHelper.error(res, 'Thời gian bắt đầu không hợp lệ', 400);
        fields.push('start = ?');
        params.push(startSql);
      }
      if (end) {
        const endSql = formatDateTime(end);
        if (!endSql) return ResponseHelper.error(res, 'Thời gian kết thúc không hợp lệ', 400);
        fields.push('end = ?');
        params.push(endSql);
      }
      if (notes !== undefined) {
        fields.push('notes = ?');
        params.push(notes);
      }
      if (fields.length === 0) return ResponseHelper.error(res, 'Không có trường hợp lệ để cập nhật', 400);
      params.push(id);
      const query = `UPDATE Schedules SET ${fields.join(', ')} WHERE id = ?`;
      const result = await DatabaseService.execute(query, params);
      if (result?.affectedRows === 0) return ResponseHelper.error(res, 'Lịch thi không tồn tại', 404);
      return ResponseHelper.success(res, {}, 'Cập nhật lịch thi thành công');
    } catch (error) {
      console.error('Update schedule error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi cập nhật lịch thi', 500);
    }
  }

  // Xóa tất cả lịch (toàn hệ thống hoặc theo khoa nếu truyền department_id)
  static async deleteAllSchedules(req, res) {
    try {
      const { department_id } = req.query; // optional
      let result;
      if (department_id) {
        result = await DatabaseService.execute('DELETE FROM Schedules WHERE department_id = ?', [department_id]);
      } else {
        result = await DatabaseService.execute('DELETE FROM Schedules');
      }
      return ResponseHelper.success(res, { affected: result?.affectedRows || 0 }, 'Đã xóa toàn bộ lịch thi');
    } catch (error) {
      console.error('Delete all schedules error:', error);
      return ResponseHelper.error(res, 'Lỗi server khi xóa tất cả lịch thi', 500);
    }
  }
}

module.exports = ScheduleController;
