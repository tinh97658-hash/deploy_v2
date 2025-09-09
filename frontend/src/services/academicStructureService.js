import { apiRequest } from './apiService';

// ============= DEPARTMENT SERVICES =============

export const departmentService = {
  // Lấy tất cả khoa với pagination và search
  async getAll(params = {}) {
    const searchParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 50,
      search: params.search || ''
    });
    return await apiRequest(`/admin/departments?${searchParams}`);
  },

  // Lấy chi tiết một khoa
  async getById(id) {
    return await apiRequest(`/admin/departments/${id}`);
  },

  // Tạo khoa mới
  async create(data) {
    return await apiRequest('/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Cập nhật khoa
  async update(id, data) {
    return await apiRequest(`/admin/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Xóa khoa
  async delete(id) {
    return await apiRequest(`/admin/departments/${id}`, {
      method: 'DELETE'
    });
  },

  // Xóa nhiều khoa
  async bulkDelete(ids) {
    return await apiRequest('/admin/departments/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  },

  // Lấy thống kê khoa
  async getStats() {
    return await apiRequest('/admin/departments/stats');
  }
};

// ============= MAJOR SERVICES =============

export const majorService = {
  // Lấy tất cả ngành với pagination và search
  async getAll(params = {}) {
    const searchParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 50,
      search: params.search || '',
      ...(params.departmentId && { departmentId: params.departmentId })
    });
    return await apiRequest(`/admin/majors?${searchParams}`);
  },

  // Lấy ngành theo khoa
  async getByDepartment(departmentId) {
    return await apiRequest(`/admin/majors/department/${departmentId}`);
  },

  // Lấy chi tiết một ngành
  async getById(id) {
    return await apiRequest(`/admin/majors/${id}`);
  },

  // Tạo ngành mới
  async create(data) {
    return await apiRequest('/admin/majors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Cập nhật ngành
  async update(id, data) {
    return await apiRequest(`/admin/majors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Xóa ngành
  async delete(id) {
    return await apiRequest(`/admin/majors/${id}`, {
      method: 'DELETE'
    });
  },

  // Xóa nhiều ngành
  async bulkDelete(ids) {
    return await apiRequest('/admin/majors/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  },

  // Lấy thống kê ngành
  async getStats() {
    return await apiRequest('/admin/majors/stats');
  }
};

// ============= CLASS SERVICES =============

export const classService = {
  // Lấy tất cả lớp với pagination và search
  async getAll(params = {}) {
    const searchParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 50,
      search: params.search || '',
      ...(params.majorId && { majorId: params.majorId }),
      ...(params.departmentId && { departmentId: params.departmentId })
    });
    return await apiRequest(`/admin/classes?${searchParams}`);
  },

  // Lấy lớp theo ngành
  async getByMajor(majorId) {
    return await apiRequest(`/admin/classes/major/${majorId}`);
  },

  // Lấy chi tiết một lớp
  async getById(id) {
    return await apiRequest(`/admin/classes/${id}`);
  },

  // Tạo lớp mới
  async create(data) {
    return await apiRequest('/admin/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Cập nhật lớp
  async update(id, data) {
    return await apiRequest(`/admin/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Xóa lớp
  async delete(id) {
    return await apiRequest(`/admin/classes/${id}`, {
      method: 'DELETE'
    });
  },

  // Xóa nhiều lớp
  async bulkDelete(ids) {
    return await apiRequest('/admin/classes/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  },

  // Chuyển sinh viên giữa các lớp
  async transferStudents(data) {
    return await apiRequest('/admin/classes/transfer-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Lấy thống kê lớp
  async getStats() {
    return await apiRequest('/admin/classes/stats');
  }
};

// ============= BACKWARD COMPATIBILITY =============
// Maintain compatibility with existing code

export const getDepartments = departmentService.getAll;
export const createDepartment = departmentService.create;
export const updateDepartment = departmentService.update;
export const deleteDepartment = departmentService.delete;

export const getMajorsByDepartment = majorService.getByDepartment;
export const createMajor = majorService.create;
export const updateMajor = majorService.update;
export const deleteMajor = majorService.delete;

export const getClassesByMajor = classService.getByMajor;
export const createClass = classService.create;
export const updateClass = classService.update;
export const deleteClass = classService.delete;
