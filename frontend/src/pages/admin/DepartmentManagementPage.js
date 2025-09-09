import React, { useState, useEffect } from 'react';
import { 
  FaBuilding, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaSpinner, 
  FaExclamationCircle, 
  FaChevronLeft, 
  FaChevronRight,
  FaSearch,
  FaUsers,
  FaGraduationCap,
  FaTimes
} from 'react-icons/fa';
import styles from './DepartmentManagementPage.module.css';
import { departmentService } from '../../services/academicStructureService';

const DepartmentManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  // Data states
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'view'
  const [currentDepartment, setCurrentDepartment] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load data
  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm
      });
      
      if (response.success) {
        setDepartments(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
      } else {
        setError('Không thể tải danh sách khoa');
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      setError('Có lỗi xảy ra khi tải danh sách khoa');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await departmentService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadStats();
  }, [currentPage, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal handlers
  const openModal = (type, department = null) => {
    setModalType(type);
    setCurrentDepartment(department);
    
    if (type === 'add') {
      setFormData({ name: '' });
    } else if (type === 'edit' && department) {
      setFormData({ name: department.name });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setCurrentDepartment(null);
    setFormData({ name: '' });
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Tên khoa không được để trống');
      return;
    }

    try {
      setSaving(true);
      let response;
      
      if (modalType === 'add') {
        response = await departmentService.create(formData);
      } else if (modalType === 'edit') {
        response = await departmentService.update(currentDepartment.id, formData);
      }

      if (response.success) {
        await loadDepartments();
        await loadStats();
        closeModal();
        setError(null);
      } else {
        setError(response.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving department:', error);
      setError('Có lỗi xảy ra khi lưu thông tin khoa');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khoa này?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await departmentService.delete(id);
      
      if (response.success) {
        await loadDepartments();
        await loadStats();
        setError(null);
      } else {
        // Hiển thị thông báo lỗi cụ thể từ backend
        setError(response.message || 'Không thể xóa khoa');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      // Hiển thị thông báo lỗi chi tiết từ backend
      setError(error.message || 'Có lỗi xảy ra khi xóa khoa');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDepartments.length === 0) {
      setError('Vui lòng chọn ít nhất một khoa để xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedDepartments.length} khoa đã chọn?`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await departmentService.bulkDelete(selectedDepartments);
      
      if (response.success) {
        await loadDepartments();
        await loadStats();
        setSelectedDepartments([]);
        setError(null);
      } else {
        // Hiển thị thông báo lỗi cụ thể từ backend
        setError(response.message || 'Không thể xóa các khoa đã chọn');
      }
    } catch (error) {
      console.error('Error bulk deleting departments:', error);
      // Hiển thị thông báo lỗi chi tiết từ backend
      setError(error.message || 'Có lỗi xảy ra khi xóa các khoa');
    } finally {
      setSaving(false);
    }
  };

  // Selection handlers
  const handleSelectDepartment = (id) => {
    setSelectedDepartments(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map(dept => dept.id));
    }
  };

  // Search handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className={styles.departmentManagement}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>
            <FaBuilding />
            Quản lý Khoa
          </h1>
          <p>Quản lý thông tin các khoa trong trường</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.addBtn}
            onClick={() => openModal('add')}
            disabled={saving}
          >
            <FaPlus /> Thêm khoa mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBuilding />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats?.overview?.total_departments || 0}</h3>
            <p>Tổng số khoa</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaGraduationCap />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats?.overview?.total_majors || 0}</h3>
            <p>Tổng số ngành</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUsers />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats?.overview?.total_students || 0}</h3>
            <p>Tổng số sinh viên</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaSearch />
          </div>
          <div className={styles.statInfo}>
            <h3>{departments.length}</h3>
            <p>Kết quả tìm kiếm</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <FaSearch />
          <input
            type="text"
            placeholder="Tìm kiếm khoa..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        {selectedDepartments.length > 0 && (
          <button 
            className={styles.bulkDeleteBtn}
            onClick={handleBulkDelete}
            disabled={saving}
          >
            <FaTrash />
            Xóa ({selectedDepartments.length})
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <FaExclamationCircle />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>
            <FaSpinner className={styles.spinner} />
            <span>Đang tải...</span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedDepartments.length === departments.length && departments.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Tên khoa</th>
                <th>Số ngành</th>
                <th>Số lớp</th>
                <th>Số sinh viên</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className={styles.noData}>
                      <FaBuilding />
                      <p>Chưa có khoa nào được tạo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                departments.map(department => (
                  <tr key={department.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(department.id)}
                        onChange={() => handleSelectDepartment(department.id)}
                      />
                    </td>
                    <td>
                      <div className={styles.departmentInfo}>
                        <div>
                          <div className={styles.departmentName}>{department.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{department.major_count || 0}</td>
                    <td>{department.class_count || 0}</td>
                    <td>{department.student_count || 0}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => openModal('view', department)}
                          title="Xem chi tiết"
                          disabled={saving}
                        >
                          <FaEye />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => openModal('edit', department)}
                          title="Chỉnh sửa"
                          disabled={saving}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(department.id)}
                          title="Xóa"
                          disabled={saving}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <FaChevronLeft />
          </button>
          
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={currentPage === index + 1 ? styles.active : ''}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {modalType === 'add' && 'Thêm khoa mới'}
                {modalType === 'edit' && 'Chỉnh sửa khoa'}
                {modalType === 'view' && 'Chi tiết khoa'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {modalType === 'view' ? (
                <div className={styles.departmentDetails}>
                  <div className={styles.detailRow}>
                    <label>Tên khoa:</label>
                    <span>{currentDepartment?.name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Số ngành:</label>
                    <span>{currentDepartment?.major_count || 0}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Số lớp:</label>
                    <span>{currentDepartment?.class_count || 0}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Số sinh viên:</label>
                    <span>{currentDepartment?.student_count || 0}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Tên khoa *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nhập tên khoa"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className={styles.modalActions}>
                    <button 
                      type="submit" 
                      className={styles.saveBtn}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <FaSpinner className="fa-spin" style={{ marginRight: '8px' }} />
                          {modalType === 'add' ? 'Đang thêm...' : 'Đang cập nhật...'}
                        </>
                      ) : (
                        modalType === 'add' ? 'Thêm khoa' : 'Cập nhật'
                      )}
                    </button>
                    <button 
                      type="button" 
                      onClick={closeModal}
                      className={styles.cancelBtn}
                      disabled={saving}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagementPage;
