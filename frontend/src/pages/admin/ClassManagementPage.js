import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaSpinner, 
  FaExclamationCircle, 
  FaChevronLeft, 
  FaChevronRight,
  FaSearch,
  FaGraduationCap
} from 'react-icons/fa';
import styles from './ClassManagementPage.module.css';
import { classService, majorService, departmentService } from '../../services/academicStructureService';

const ClassManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [filterMajor, setFilterMajor] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  // Data states
  const [classes, setClasses] = useState([]);
  const [majors, setMajors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'view'
  const [currentClass, setCurrentClass] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    major_id: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load data
  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        majorId: filterMajor,
        departmentId: filterDepartment
      });
      
      if (response.success) {
        setClasses(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
      } else {
        setError('Không thể tải danh sách lớp');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('Có lỗi xảy ra khi tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  };

  const loadMajors = async () => {
    try {
      const response = await majorService.getAll({ limit: 100 });
      if (response.success) {
        setMajors(response.data || []);
      }
    } catch (error) {
      console.error('Error loading majors:', error);
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
      const response = await classService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [currentPage, searchTerm, filterMajor, filterDepartment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMajors();
    loadDepartments();
    loadStats();
  }, []);

  // Modal handlers
  const openModal = (type, classItem = null) => {
    setModalType(type);
    setCurrentClass(classItem);
    
    if (type === 'add') {
      setFormData({ 
        name: '', 
        major_id: ''
      });
    } else if (type === 'edit' && classItem) {
      setFormData({ 
        name: classItem.name,
        major_id: classItem.major_id
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setCurrentClass(null);
    setFormData({ name: '', major_id: '' });
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Tên lớp không được để trống');
      return;
    }

    if (!formData.major_id) {
      setError('Vui lòng chọn ngành');
      return;
    }

    try {
      setSaving(true);
      let response;
      
      if (modalType === 'add') {
        response = await classService.create(formData);
      } else if (modalType === 'edit') {
        response = await classService.update(currentClass.id, formData);
      }

      if (response.success) {
        await loadClasses();
        await loadStats();
        closeModal();
        setError(null);
      } else {
        setError(response.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving class:', error);
      setError('Có lỗi xảy ra khi lưu thông tin lớp');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lớp này?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await classService.delete(id);
      
      if (response.success) {
        await loadClasses();
        await loadStats();
        setError(null);
      } else {
        // Hiển thị thông báo lỗi chi tiết từ backend
        setError(response.message || 'Không thể xóa lớp');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      
      // Kiểm tra xem có thông báo lỗi từ server không
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError('Có lỗi xảy ra khi xóa lớp');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClasses.length === 0) {
      setError('Vui lòng chọn ít nhất một lớp để xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedClasses.length} lớp đã chọn?`)) {
      return;
    }

    try {
      setSaving(true);
      const response = await classService.bulkDelete(selectedClasses);
      
      if (response.success) {
        await loadClasses();
        await loadStats();
        setSelectedClasses([]);
        setError(null);
      } else {
        setError(response.message || 'Không thể xóa các lớp đã chọn');
      }
    } catch (error) {
      console.error('Error bulk deleting classes:', error);
      
      // Kiểm tra xem có thông báo lỗi từ server không
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError('Có lỗi xảy ra khi xóa các lớp');
      }
    } finally {
      setSaving(false);
    }
  };

  // Selection handlers
  const handleSelectClass = (id) => {
    setSelectedClasses(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map(cls => cls.id));
    }
  };

  // Filter handlers
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleMajorFilter = (e) => {
    setFilterMajor(e.target.value);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (e) => {
    setFilterDepartment(e.target.value);
    setFilterMajor(''); // Reset major filter when department changes
    setCurrentPage(1);
  };

  // Get filtered majors based on selected department
  const filteredMajors = filterDepartment 
    ? majors.filter(major => major.department_id === parseInt(filterDepartment))
    : majors;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>
            <FaUsers />
            Quản lý lớp
          </h1>
          <p>Quản lý thông tin các lớp học trong trường</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.addBtn}
            onClick={() => openModal('add')}
            disabled={saving}
          >
            <FaPlus />
            Thêm lớp mới
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
            <FaUsers />
          </div>
          <div className={styles.statInfo}>
            <h3>{stats?.overview?.total_classes || 0}</h3>
            <p>Tổng số lớp</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaGraduationCap />
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
            <h3>{classes.length}</h3>
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
            placeholder="Tìm kiếm lớp..."
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

        <select
          value={filterMajor}
          onChange={handleMajorFilter}
          className={styles.filterSelect}
          disabled={!filterDepartment}
        >
          <option value="">Tất cả ngành</option>
          {filteredMajors.map(major => (
            <option key={major.id} value={major.id}>
              {major.name}
            </option>
          ))}
        </select>
        
        {selectedClasses.length > 0 && (
          <button 
            className={styles.bulkDeleteBtn}
            onClick={handleBulkDelete}
            disabled={saving}
          >
            <FaTrash />
            Xóa ({selectedClasses.length})
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
                    checked={selectedClasses.length === classes.length && classes.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Tên lớp</th>
                <th>Ngành</th>
                <th>Khoa</th>
                <th>Số sinh viên</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>
                    <FaUsers className={styles.emptyIcon} />
                    <p>Chưa có lớp nào được tạo</p>
                    <button 
                      className={styles.addButton}
                      onClick={() => openModal('add')}
                    >
                      <FaPlus /> Thêm lớp đầu tiên
                    </button>
                  </td>
                </tr>
              ) : (
                classes.map(cls => (
                  <tr key={cls.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls.id)}
                        onChange={() => handleSelectClass(cls.id)}
                      />
                    </td>
                    <td className={styles.className}>
                      <strong>{cls.name}</strong>
                    </td>
                    <td className={styles.majorName}>
                      {cls.major_name}
                    </td>
                    <td className={styles.departmentName}>
                      {cls.department_name}
                    </td>
                    <td>{cls.student_count || 0}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => openModal('view', cls)}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => openModal('edit', cls)}
                          title="Chỉnh sửa"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(cls.id)}
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
                {modalType === 'add' && 'Thêm lớp mới'}
                {modalType === 'edit' && 'Chỉnh sửa lớp'}
                {modalType === 'view' && 'Chi tiết lớp'}
              </h2>
              {/* Corrected class name: CSS defines .closeBtn (not .closeButton) */}
              <button className={styles.closeBtn} onClick={closeModal}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              {modalType === 'view' ? (
                <div className={styles.viewContent}>
                  <div className={styles.viewItem}>
                    <label>Tên lớp:</label>
                    <span>{currentClass?.name}</span>
                  </div>
                  <div className={styles.viewItem}>
                    <label>Ngành:</label>
                    <span>{currentClass?.major_name}</span>
                  </div>
                  <div className={styles.viewItem}>
                    <label>Khoa:</label>
                    <span>{currentClass?.department_name}</span>
                  </div>
                  <div className={styles.viewItem}>
                    <label>Số sinh viên:</label>
                    <span>{currentClass?.student_count || 0}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Tên lớp *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nhập tên lớp"
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="major_id">Ngành *</label>
                    <select
                      id="major_id"
                      name="major_id"
                      value={formData.major_id}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Chọn ngành</option>
                      {majors.map(major => (
                        <option key={major.id} value={major.id}>
                          {major.name} ({major.department_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalActions}>
                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                      {saving ? <FaSpinner className={styles.spinner} /> : null}
                      {modalType === 'add' ? 'Thêm lớp' : 'Cập nhật'}
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={closeModal}>
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

export default ClassManagementPage;
