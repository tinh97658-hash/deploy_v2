import React, { useState, useEffect } from 'react';
import { 
  FaGraduationCap, 
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
  FaBuilding,
  FaTimes
} from 'react-icons/fa';
import styles from './MajorManagementPage.module.css';
import { majorService, departmentService } from '../../services/academicStructureService';

const MajorManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMajors, setSelectedMajors] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState('');

  // Data states
  const [majors, setMajors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'view'
  const [currentMajor, setCurrentMajor] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department_id: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load data
  const loadMajors = async () => {
    try {
      setLoading(true);
      const response = await majorService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        departmentId: filterDepartment
      });
      
      if (response.success) {
        setMajors(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
      } else {
        setError('Không thể tải danh sách ngành');
      }
    } catch (error) {
      console.error('Error loading majors:', error);
      setError('Có lỗi xảy ra khi tải danh sách ngành');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getAll({ limit: 100 });
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await majorService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadMajors();
  }, [currentPage, searchTerm, filterDepartment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadDepartments();
    loadStats();
  }, []);

  // Modal handlers
  const openModal = (type, major = null) => {
    setModalType(type);
    setCurrentMajor(major);
    
    if (type === 'add') {
      setFormData({ name: '', department_id: '' });
    } else if (type === 'edit' && major) {
      setFormData({ 
        name: major.name,
        department_id: major.department_id 
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setCurrentMajor(null);
    setFormData({ name: '', department_id: '' });
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Tên ngành không được để trống');
      return;
    }

    if (!formData.department_id) {
      setError('Vui lòng chọn khoa');
      return;
    }

    try {
      setSaving(true);
      let response;
      
      if (modalType === 'add') {
        response = await majorService.create(formData);
      } else if (modalType === 'edit') {
        response = await majorService.update(currentMajor.id, formData);
      }

      if (response.success) {
        await loadMajors();
        await loadStats();
        closeModal();
        setError(null);
      } else {
        setError(response.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving major:', error);
      setError('Có lỗi xảy ra khi lưu thông tin ngành');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ngành này?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await majorService.delete(id);
      
      if (response.success) {
        await loadMajors();
        await loadStats();
        setError(null);
      } else {
        // Hiển thị thông báo lỗi cụ thể từ backend
        setError(response.message || 'Không thể xóa ngành');
      }
    } catch (error) {
      console.error('Error deleting major:', error);
      // Hiển thị thông báo lỗi chi tiết từ backend
      setError(error.message || 'Có lỗi xảy ra khi xóa ngành');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMajors.length === 0) {
      setError('Vui lòng chọn ít nhất một ngành để xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedMajors.length} ngành đã chọn?`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await majorService.bulkDelete(selectedMajors);
      
      if (response.success) {
        await loadMajors();
        await loadStats();
        setSelectedMajors([]);
        setError(null);
      } else {
        // Hiển thị thông báo lỗi cụ thể từ backend
        setError(response.message || 'Không thể xóa các ngành đã chọn');
      }
    } catch (error) {
      console.error('Error bulk deleting majors:', error);
      // Hiển thị thông báo lỗi chi tiết từ backend
      setError(error.message || 'Có lỗi xảy ra khi xóa các ngành');
    } finally {
      setSaving(false);
    }
  };

  // Selection handlers
  const handleSelectMajor = (id) => {
    setSelectedMajors(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMajors.length === majors.length) {
      setSelectedMajors([]);
    } else {
      setSelectedMajors(majors.map(major => major.id));
    }
  };

  // Search and filter handlers
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (e) => {
    setFilterDepartment(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>
            <FaGraduationCap />
            Quản lý ngành
          </h1>
          <p>Quản lý thông tin các ngành học trong trường</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.addBtn}
            onClick={() => openModal('add')}
            disabled={saving}
          >
            <FaPlus />
            Thêm ngành mới
          </button>
        </div>
      </div>

      {/* Saving overlay */}
      {saving && (
        <div className={styles.savingOverlay}>
          <div className={styles.savingContent}>
            <FaSpinner className="fa-spin" />
            <p>Đang lưu dữ liệu...</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.stats}>
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
            <FaBuilding />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats?.overview?.total_classes || 0}</h3>
            <p>Tổng số lớp</p>
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
            <h3>{majors.length}</h3>
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
            placeholder="Tìm kiếm ngành..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <select
          value={filterDepartment}
          onChange={handleDepartmentFilter}
          className={styles.filterSelect}
        >
          <option value="">Tất cả khoa</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        
        {selectedMajors.length > 0 && (
          <button 
            className={styles.bulkDeleteBtn}
            onClick={handleBulkDelete}
            disabled={saving}
          >
            <FaTrash />
            Xóa ({selectedMajors.length})
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
            <FaSpinner className="fa-spin" />
            <p>Đang tải danh sách ngành...</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedMajors.length === majors.length && majors.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Tên ngành</th>
                <th>Khoa</th>
                <th>Số lớp</th>
                <th>Số sinh viên</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {majors.map(major => (
                <tr key={major.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedMajors.includes(major.id)}
                      onChange={() => handleSelectMajor(major.id)}
                    />
                  </td>
                  <td>
                    <div className={styles.majorInfo}>
                      <div>
                        <div className={styles.majorName}>{major.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{major.department_name}</td>
                  <td>{major.class_count || 0}</td>
                  <td>{major.student_count || 0}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${styles.viewBtn}`}
                        onClick={() => openModal('view', major)}
                        title="Xem chi tiết"
                        disabled={saving}
                      >
                        <FaEye />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => openModal('edit', major)}
                        title="Chỉnh sửa"
                        disabled={saving}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDelete(major.id)}
                        title="Xóa"
                        disabled={saving}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && majors.length === 0 && (
          <div className={styles.noData}>
            <FaGraduationCap />
            <p>Chưa có ngành nào được tạo</p>
          </div>
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
                {modalType === 'add' && 'Thêm ngành mới'}
                {modalType === 'edit' && 'Chỉnh sửa ngành'}
                {modalType === 'view' && 'Chi tiết ngành'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {modalType === 'view' ? (
                <div className={styles.majorDetails}>
                  <div className={styles.detailRow}>
                    <label>Tên ngành:</label>
                    <span>{currentMajor?.name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Khoa:</label>
                    <span>{currentMajor?.department_name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Số lớp:</label>
                    <span>{currentMajor?.class_count || 0}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Số sinh viên:</label>
                    <span>{currentMajor?.student_count || 0}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Tên ngành *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nhập tên ngành"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="department_id">Khoa *</label>
                    <select
                      id="department_id"
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleFormChange}
                      required
                      disabled={saving}
                    >
                      <option value="">Chọn khoa</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
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
                        modalType === 'add' ? 'Thêm ngành' : 'Cập nhật'
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

export default MajorManagementPage;
