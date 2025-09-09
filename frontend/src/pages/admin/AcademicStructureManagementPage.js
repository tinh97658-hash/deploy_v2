import React, { useState, useEffect } from 'react';
import { FaBuilding, FaGraduationCap, FaUsers, FaPlus, FaEdit, FaTrash, FaEye, FaSpinner, FaExclamationCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './AcademicStructureManagementPage.module.css';
import { 
  getDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  getMajorsByDepartment,
  createMajor,
  updateMajor,
  deleteMajor,
  getClassesByMajor,
  createClass,
  updateClass,
  deleteClass
} from '../../services/apiService';

const AcademicStructureManagementPage = () => {
  const [activeTab, setActiveTab] = useState('departments'); // 'departments', 'majors', 'classes'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [majors, setMajors] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Selected states for filtering
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'view'
  const [currentItem, setCurrentItem] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    major_id: '',
    course_year: new Date().getFullYear()
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Load majors when department is selected
  useEffect(() => {
    if (selectedDepartment && activeTab === 'majors') {
      const loadMajorsData = async () => {
        try {
          setLoading(true);
          const data = await getMajorsByDepartment(selectedDepartment);
          setMajors(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error loading majors:', error);
          setError('Không thể tải danh sách ngành');
          setMajors([]);
        } finally {
          setLoading(false);
        }
      };
      loadMajorsData();
    }
  }, [selectedDepartment, activeTab]);

  // Load classes when major is selected
  useEffect(() => {
    if (selectedMajor && activeTab === 'classes') {
      const loadClassesData = async () => {
        try {
          setLoading(true);
          const data = await getClassesByMajor(selectedMajor);
          setClasses(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error loading classes:', error);
          setError('Không thể tải danh sách lớp');
          setClasses([]);
        } finally {
          setLoading(false);
        }
      };
      loadClassesData();
    }
  }, [selectedMajor, activeTab]);

  // API Functions
  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading departments:', error);
      setError('Không thể tải danh sách khoa');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const handleAdd = () => {
    setCurrentItem(null);
    setFormData({
      name: '',
      department_id: activeTab === 'majors' ? selectedDepartment : '',
      major_id: activeTab === 'classes' ? selectedMajor : '',
      course_year: new Date().getFullYear()
    });
    setModalType('add');
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setCurrentItem(item);
    setFormData({
      name: item.name || '',
      department_id: item.department_id || selectedDepartment,
      major_id: item.major_id || selectedMajor,
      course_year: item.course_year || new Date().getFullYear()
    });
    setModalType('edit');
    setShowModal(true);
  };

  const handleView = (item) => {
    setCurrentItem(item);
    setModalType('view');
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (activeTab === 'departments') {
        if (modalType === 'add') {
          await createDepartment(formData);
          // Reload departments after adding
          loadDepartments();
        } else {
          await updateDepartment(currentItem.id, formData);
          // Reload departments after updating
          loadDepartments();
        }
      } else if (activeTab === 'majors') {
        const majorData = {
          ...formData,
          department_id: selectedDepartment
        };
        if (modalType === 'add') {
          await createMajor(majorData);
          // Reload majors after adding
          if (selectedDepartment) {
            const data = await getMajorsByDepartment(selectedDepartment);
            setMajors(Array.isArray(data) ? data : []);
          }
        } else {
          await updateMajor(currentItem.id, majorData);
          // Reload majors after updating
          if (selectedDepartment) {
            const data = await getMajorsByDepartment(selectedDepartment);
            setMajors(Array.isArray(data) ? data : []);
          }
        }
      } else if (activeTab === 'classes') {
        const classData = {
          ...formData,
          major_id: selectedMajor
        };
        if (modalType === 'add') {
          await createClass(classData);
          // Reload classes after adding
          if (selectedMajor) {
            const data = await getClassesByMajor(selectedMajor);
            setClasses(Array.isArray(data) ? data : []);
          }
        } else {
          await updateClass(currentItem.id, classData);
          // Reload classes after updating
          if (selectedMajor) {
            const data = await getClassesByMajor(selectedMajor);
            setClasses(Array.isArray(data) ? data : []);
          }
        }
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving:', error);
      setError('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) return;

    try {
      if (activeTab === 'departments') {
        await deleteDepartment(id);
        // Reload departments after deleting
        loadDepartments();
      } else if (activeTab === 'majors') {
        await deleteMajor(id);
        // Reload majors after deleting
        if (selectedDepartment) {
          const data = await getMajorsByDepartment(selectedDepartment);
          setMajors(Array.isArray(data) ? data : []);
        }
      } else if (activeTab === 'classes') {
        await deleteClass(id);
        // Reload classes after deleting
        if (selectedMajor) {
          const data = await getClassesByMajor(selectedMajor);
          setClasses(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      setError('Có lỗi xảy ra khi xóa dữ liệu');
    }
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'departments':
        return departments;
      case 'majors':
        return majors;
      case 'classes':
        return classes;
      default:
        return [];
    }
  };

  // Filter data based on search term
  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchTerm) return data;
    
    return data.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.course_year?.toString().includes(searchTerm)
    );
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = getFilteredData().slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(getFilteredData().length / itemsPerPage);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'departments':
        return 'Quản lý Khoa';
      case 'majors':
        return 'Quản lý Ngành';
      case 'classes':
        return 'Quản lý Lớp';
      default:
        return 'Quản lý Cấu trúc Học thuật';
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'departments':
        return <FaBuilding />;
      case 'majors':
        return <FaGraduationCap />;
      case 'classes':
        return <FaUsers />;
      default:
        return <FaBuilding />;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>{getTabIcon()} {getTabTitle()}</h1>
          <p>Quản lý cấu trúc tổ chức học thuật của trường</p>
        </div>
        <div className={styles.headerRight}>
          <button onClick={handleAdd} className={styles.addBtn}>
            <FaPlus /> Thêm mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'departments' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('departments');
              setCurrentPage(1);
              setSearchTerm('');
            }}
          >
            <FaBuilding /> Khoa
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'majors' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('majors');
              setCurrentPage(1);
              setSearchTerm('');
            }}
          >
            <FaGraduationCap /> Ngành
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'classes' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('classes');
              setCurrentPage(1);
              setSearchTerm('');
            }}
          >
            <FaUsers /> Lớp
          </button>
        </div>
      </div>

      {/* Filters */}
      {(activeTab === 'majors' || activeTab === 'classes') && (
        <div className={styles.filtersContainer}>
          {activeTab === 'majors' && (
            <div className={styles.filterGroup}>
              <label>Chọn Khoa:</label>
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">-- Chọn khoa --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {activeTab === 'classes' && (
            <>
              <div className={styles.filterGroup}>
                <label>Chọn Khoa:</label>
                <select 
                  value={selectedDepartment} 
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedMajor('');
                  }}
                  className={styles.filterSelect}
                >
                  <option value="">-- Chọn khoa --</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Chọn Ngành:</label>
                <select 
                  value={selectedMajor} 
                  onChange={(e) => setSelectedMajor(e.target.value)}
                  className={styles.filterSelect}
                  disabled={!selectedDepartment}
                >
                  <option value="">-- Chọn ngành --</option>
                  {majors.map(major => (
                    <option key={major.id} value={major.id}>{major.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search and Controls */}
      <div className={styles.controlsContainer}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder={`Tìm kiếm ${activeTab === 'departments' ? 'khoa' : activeTab === 'majors' ? 'ngành' : 'lớp'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorContainer}>
          <FaExclamationCircle />
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  {activeTab === 'majors' && <th>Khoa</th>}
                  {activeTab === 'classes' && (
                    <>
                      <th>Ngành</th>
                      <th>Khóa</th>
                    </>
                  )}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    {activeTab === 'majors' && <td>{item.department_name}</td>}
                    {activeTab === 'classes' && (
                      <>
                        <td>{item.major_name}</td>
                        <td>{item.course_year}</td>
                      </>
                    )}
                    <td>
                      <div className={styles.actionButtons}>
                        <button 
                          onClick={() => handleView(item)}
                          className={styles.viewBtn}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </button>
                        <button 
                          onClick={() => handleEdit(item)}
                          className={styles.editBtn}
                          title="Chỉnh sửa"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className={styles.deleteBtn}
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentItems.length === 0 && (
              <div className={styles.emptyState}>
                <p>Không có dữ liệu để hiển thị</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={styles.paginationBtn}
              >
                <FaChevronLeft />
              </button>
              
              <span className={styles.paginationInfo}>
                Trang {currentPage} / {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={styles.paginationBtn}
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {modalType === 'add' ? 'Thêm mới' : modalType === 'edit' ? 'Chỉnh sửa' : 'Chi tiết'} {
                  activeTab === 'departments' ? 'Khoa' : 
                  activeTab === 'majors' ? 'Ngành' : 'Lớp'
                }
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className={styles.closeBtn}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Tên {activeTab === 'departments' ? 'Khoa' : activeTab === 'majors' ? 'Ngành' : 'Lớp'}:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={modalType === 'view'}
                  className={styles.formInput}
                />
              </div>

              {activeTab === 'classes' && (
                <div className={styles.formGroup}>
                  <label>Khóa:</label>
                  <input
                    type="number"
                    value={formData.course_year}
                    onChange={(e) => setFormData({...formData, course_year: parseInt(e.target.value)})}
                    disabled={modalType === 'view'}
                    className={styles.formInput}
                    min="2000"
                    max="2030"
                  />
                </div>
              )}
            </div>
            
            {modalType !== 'view' && (
              <div className={styles.modalFooter}>
                <button 
                  onClick={() => setShowModal(false)}
                  className={styles.cancelBtn}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSave}
                  className={styles.saveBtn}
                  disabled={saving || !formData.name.trim()}
                >
                  {saving ? <FaSpinner className={styles.spinner} /> : null}
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicStructureManagementPage;
