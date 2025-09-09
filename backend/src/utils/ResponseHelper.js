// Response utilities for consistent API responses

class ResponseHelper {
  // Success response
  static success(res, data = null, message = "Thành công", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Error response
  static error(res, message = "Có lỗi xảy ra", statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString()
    });
  }

  // Validation error response
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString()
    });
  }

  // Unauthorized response
  static unauthorized(res, message = "Không có quyền truy cập") {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Forbidden response
  static forbidden(res, message = "Truy cập bị từ chối") {
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Bad request helper (400)
  static badRequest(res, message = "Yêu cầu không hợp lệ", errors = null) {
    return this.error(res, message, 400, errors);
  }

  // Not found response
  static notFound(res, message = "Không tìm thấy dữ liệu") {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Server error response
  static serverError(res, message = "Lỗi máy chủ", error = null) {
    console.error('Server Error:', error);
    
    return res.status(500).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && error && { 
        error: error.message,
        stack: error.stack 
      }),
      timestamp: new Date().toISOString()
    });
  }

  // Paginated response
  static paginated(res, data, pagination, message = "Thành công") {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    });
  }

  // Created response
  static created(res, data, message = "Tạo mới thành công") {
    return this.success(res, data, message, 201);
  }

  // Updated response
  static updated(res, data, message = "Cập nhật thành công") {
    return this.success(res, data, message, 200);
  }

  // Deleted response
  static deleted(res, message = "Xóa thành công") {
    return this.success(res, null, message, 200);
  }

  // No content response
  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ResponseHelper;
