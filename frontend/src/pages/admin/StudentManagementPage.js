import React, { useState, useEffect } from 'react';
import { FaUsers, FaPlus, FaFileImport, FaSearch, FaSpinner, FaExclamationCircle, FaEye, FaEdit, FaTrash, FaSyncAlt, FaLock, FaUnlock, FaTimes, FaChevronLeft, FaChevronRight, FaUsersSlash, FaUserCheck, FaUserTimes } from 'react-icons/fa';
import styles from './StudentManagementPage.module.css';
import SafeDropdown from '../../components/SafeDropdown';
import { 
  getStudents, 
  addStudent, 
  updateStudent, 
  deleteStudent, 
  bulkDeleteStudents,
  getDepartments,
  getMajorsByDepartment,
  getClassesByMajor,
  importStudentsExcel // Thêm hàm gọi API import
} from '../../services/apiService';

const AdminStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMajor, setFilterMajor] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'add', 'edit', 'view'
  const [currentStudent, setCurrentStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10);

  // Academic structure state
  const [departments, setDepartments] = useState([]);
  const [majors, setMajors] = useState([]);
  const [classes, setClasses] = useState([]);

  // Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Debug departments state
  useEffect(() => {
    console.log('Departments state updated:', departments);
    console.log('Number of departments:', departments.length);
  }, [departments]);

  // Form state
  const [formData, setFormData] = useState({
    studentCode: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    departmentId: '',
    majorId: '',
    classId: '',
    dateOfBirth: '',
    status: 'active'
  });

  // Fetch students data and academic structure
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Đảm bảo có token trước khi call API
        const token = localStorage.getItem('token');
        if (!token) {
          // Tạo mock token để test hoặc redirect to login
          const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbjEiLCJyb2xlIjoiQURNSU4iLCJ0eXBlIjoiYWRtaW4iLCJpYXQiOjE3NTU4NTkzNTksImV4cCI6MTc1NTk0NTc1OX0.JdLA-SRe77_cBvBG3MxCvO2M2870bJJ5RnvI0iWx66E';
          localStorage.setItem('token', mockToken);
        }
        
        // Load departments trước để test
        const departmentsData = await getDepartments();
        console.log('Final departments data:', departmentsData);
        console.log('Departments array length:', departmentsData.length);
        setDepartments(departmentsData);
        
        // Load students data
        try {
          const studentsData = await getStudents();
          console.log('Raw student data received:', studentsData);
          
          // Handle different API response structures
          let studentsList = Array.isArray(studentsData) ? studentsData : 
                            studentsData?.students ? studentsData.students : 
                            studentsData?.data?.students ? studentsData.data.students : [];
          
          console.log('Processed students list:', studentsList);
          setStudents(studentsList || []);
          setFilteredStudents(studentsList || []);
        } catch (studentError) {
          console.error('Error loading students:', studentError);
          setStudents([]);
          setFilteredStudents([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Filter students based on search and filters
  useEffect(() => {
    let filtered = students.filter(student => {
      const matchesSearch = 
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
      const matchesMajor = filterMajor === 'all' || student.major === filterMajor;
      
      return matchesSearch && matchesStatus && matchesMajor;
    });
    
    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [students, searchTerm, filterStatus, filterMajor]);

  // Get unique majors for filter from the students data
  const availableMajors = [...new Set((students || []).map(student => student.major).filter(Boolean))];

  // Pagination
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === currentStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(currentStudents.map(student => student.id));
    }
  };

  const openModal = (type, student = null) => {
    setModalType(type);
    setCurrentStudent(student);
    
    if (type === 'add') {
      setFormData({
        studentCode: '',
        fullName: '',
        email: '',
        phoneNumber: '',
        departmentId: '',
        majorId: '',
        classId: '',
        dateOfBirth: '',
        status: 'active'
      });
      // Reset dependent dropdowns
      setMajors([]);
      setClasses([]);
    } else if (type === 'edit' && student) {
      setFormData({
        studentCode: student.studentId,
        fullName: student.fullName,
        email: student.email,
        phoneNumber: student.phone,
        departmentId: '', // Will need to find from student data
        majorId: '',     // Will need to find from student data
        classId: '',      // Will need to find from student data
        dateOfBirth: student.dateOfBirth || ''
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStudent(null);
    setFormData({
      studentCode: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      departmentId: '',
      majorId: '',
      classId: '',
      dateOfBirth: '',
      status: 'active'
    });
    // Reset dependent dropdowns
    setMajors([]);
    setClasses([]);
  };

  // Handle department change with better error handling and object parsing
  const handleDepartmentChange = async (e) => {
    try {
      const departmentId = e.target.value;
      console.log('handleDepartmentChange called with raw value:', departmentId);
      
      // Clear dependent fields
      setFormData(prev => ({
        ...prev,
        departmentId,
        majorId: '',
        classId: ''
      }));
      
      setMajors([]);
      setClasses([]);
      
      if (!departmentId) return;
      
      // Try to parse JSON if the value starts with { or [
      let parsedId = departmentId;
      try {
        if (typeof departmentId === 'string' && 
           (departmentId.startsWith('{') || departmentId.startsWith('['))) {
          parsedId = JSON.parse(departmentId);
          console.log('Parsed department ID from JSON:', parsedId);
        }
      } catch (parseError) {
        console.warn('Failed to parse department ID:', parseError);
      }
      
      console.log('Loading majors for department:', parsedId);
      const majorsData = await getMajorsByDepartment(parsedId);
      console.log('Loaded majors data:', majorsData);
      
      // Ensure majors are in correct format
      const processedMajors = Array.isArray(majorsData) ? majorsData.map(major => ({
        id: major.id || major._id || String(Math.random()),
        name: major.name || 'Unnamed Major'
      })) : [];
      
      console.log('Processed majors:', processedMajors);
      setMajors(processedMajors);
    } catch (error) {
      console.error('Error in handleDepartmentChange:', error);
    }
  };

  // Handle major change with similar improvements
  const handleMajorChange = async (e) => {
    try {
      const majorId = e.target.value;
      console.log('handleMajorChange called with raw value:', majorId);
      
      // Clear dependent fields
      setFormData(prev => ({
        ...prev,
        majorId,
        classId: ''
      }));
      
      setClasses([]);
      
      if (!majorId) return;
      
      // Try to parse JSON if the value starts with { or [
      let parsedId = majorId;
      try {
        if (typeof majorId === 'string' && 
           (majorId.startsWith('{') || majorId.startsWith('['))) {
          parsedId = JSON.parse(majorId);
          console.log('Parsed major ID from JSON:', parsedId);
        }
      } catch (parseError) {
        console.warn('Failed to parse major ID:', parseError);
      }
      
      const classesData = await getClassesByMajor(parsedId);
      console.log('Loaded classes data:', classesData);
      
      // Ensure classes are in correct format
      const processedClasses = Array.isArray(classesData) ? classesData.map(cls => ({
        id: cls.id || cls._id || String(Math.random()),
        name: cls.name || cls.className || 'Unnamed Class'
      })) : [];
      
      console.log('Processed classes:', processedClasses);
      setClasses(processedClasses);
    } catch (error) {
      console.error('Error in handleMajorChange:', error);
    }
  };

  // Handle class change
  const handleClassChange = (e) => {
    try {
      const classId = e.target.value;
      console.log('handleClassChange called with raw value:', classId);
      
      // Convert classId to number if it's a string containing only digits
      let processedClassId = classId;
      if (typeof classId === 'string' && /^\d+$/.test(classId)) {
        processedClassId = parseInt(classId, 10);
        console.log('Converted classId to number:', processedClassId);
      }
      
      // Update form data with the class ID
      setFormData(prev => ({
        ...prev,
        classId: processedClassId
      }));
      
    } catch (error) {
      console.error('Error in handleClassChange:', error);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (modalType === 'add') {
        // Validate required fields (phoneNumber is now optional)
        if (!formData.fullName || !formData.email || !formData.classId || !formData.dateOfBirth) {
          alert('Vui lòng điền đầy đủ thông tin bắt buộc: Họ tên, Email, Lớp, Ngày sinh!');
          setSaving(false);
          return;
        }

        // Ensure classId is properly parsed as a number
        const classId = parseInt(formData.classId, 10);
        if (isNaN(classId)) {
          alert('ID lớp không hợp lệ!');
          setSaving(false);
          return;
        }

        // Gửi dữ liệu để tạo sinh viên mới
        const studentData = {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          classId: classId,  // Send as a number
          dateOfBirth: formData.dateOfBirth,
          studentCode: formData.studentCode || undefined // Optional
        };
        
        console.log('Sending student data to server:', studentData);
        
        // Gọi API thêm sinh viên
        try {
          const newStudent = await addStudent(studentData);
          console.log('Successfully added student:', newStudent);
          
          // Cập nhật danh sách local với dữ liệu từ server
          setStudents(prev => [...prev, newStudent]);
          alert('Thêm sinh viên thành công!');
          closeModal();
        } catch (apiError) {
          console.error('API error when adding student:', apiError);
          alert(`Lỗi khi thêm sinh viên: ${apiError.message}`);
        }
      } else if (modalType === 'edit') {
        // Validate required fields (phoneNumber is now optional)
        if (!formData.fullName || !formData.email || !formData.classId || !formData.dateOfBirth) {
          alert('Vui lòng điền đầy đủ thông tin bắt buộc: Họ tên, Email, Lớp, Ngày sinh!');
          return;
        }

        const updatedStudent = {
          id: currentStudent.id,
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          classId: formData.classId,
          dateOfBirth: formData.dateOfBirth
        };
        
        // Gọi API cập nhật sinh viên
        const updatedData = await updateStudent(updatedStudent);
        
        // Cập nhật danh sách local với dữ liệu từ server
        setStudents(prev => prev.map(student => 
          student.id === currentStudent.id 
            ? updatedData
            : student
        ));
        alert('Cập nhật thông tin sinh viên thành công!');
      }
      
      closeModal();
    } catch (err) {
      console.error('Error in form submit:', err);
      alert(`Lỗi: ${err.message || 'Có lỗi xảy ra'}. Vui lòng thử lại sau.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) {
      setSaving(true);
      try {
        // Delete from db.json
        await deleteStudent(studentId);
        
        // Update local state
        setStudents(prev => prev.filter(student => student.id !== studentId));
        setSelectedStudents(prev => prev.filter(id => id !== studentId));
        
        alert('Xóa sinh viên thành công!');
      } catch (err) {
        alert(`Lỗi: ${err.message}. Vui lòng thử lại sau.`);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedStudents.length} sinh viên đã chọn?`)) {
      setSaving(true);
      try {
        // Delete multiple students from db.json
        await bulkDeleteStudents(selectedStudents);
        
        // Update local state
        setStudents(prev => prev.filter(student => !selectedStudents.includes(student.id)));
        setSelectedStudents([]);
        
        alert('Xóa sinh viên thành công!');
      } catch (err) {
        alert(`Lỗi: ${err.message}. Vui lòng thử lại sau.`);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleStatusChange = async (studentId, newStatus) => {
    setSaving(true);
    try {
      // Find the student
      const studentToUpdate = students.find(student => student.id === studentId);
      if (!studentToUpdate) throw new Error('Sinh viên không tồn tại');
      
      // Call the API with the new status (backend maps this to is_locked)
      const response = await fetch(`/api/admin/students/${studentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể cập nhật trạng thái');
      }
      
      // Update local state
      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, status: newStatus }
          : student
      ));
      
      alert(`Trạng thái sinh viên đã được ${newStatus === 'active' ? 'kích hoạt' : 'tạm khóa'}!`);
    } catch (err) {
      alert(`Lỗi: ${err.message}. Vui lòng thử lại sau.`);
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (studentId) => {
    if (window.confirm('Bạn có chắc chắn muốn reset mật khẩu cho sinh viên này? Mật khẩu sẽ được đặt lại thành ngày tháng năm sinh (dd/mm/yyyy).')) {
      setSaving(true);
      try {
        const response = await fetch(`/api/admin/students/${studentId}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Không thể reset mật khẩu');
        }
        
        const result = await response.json();
        if (result.success) {
          alert(`Mật khẩu đã được reset thành công! Mật khẩu mới: ${result.data.newPassword}`);
        }
      } catch (err) {
        alert(`Lỗi reset mật khẩu: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }
  };

  // (Đã bỏ nút quay lại theo yêu cầu)

  // Xử lý upload file Excel - Đơn giản hóa
  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Vui lòng chọn file Excel!');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Import sinh viên từ file Excel
      const imported = await importStudentsExcel(formData);
      
      // Luôn tải lại toàn bộ danh sách sinh viên sau khi import
      try {
        const studentsData = await getStudents();
        let studentsList = [];
        
        // Xử lý nhiều định dạng phản hồi API có thể có
        if (Array.isArray(studentsData)) {
          studentsList = studentsData;
        } else if (studentsData && typeof studentsData === 'object') {
          studentsList = studentsData.students || studentsData.data?.students || [];
        }
        
        setStudents(studentsList);
      } catch (error) {
        // Nếu không thể tải lại, thêm sinh viên mới vào danh sách hiện tại
        setStudents(prev => [...prev, ...imported]);
      }
      
      alert('Import sinh viên thành công!');
      setShowImportModal(false);
      setImportFile(null);
    } catch (err) {
      alert(`Lỗi import: ${err.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FaSpinner className="fa-spin" />
          <p>Đang tải danh sách sinh viên...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <FaExclamationCircle />
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>
            <FaUsers />
            Quản lý sinh viên
          </h1>
          <p>Quản lý thông tin và tài khoản sinh viên</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.addBtn}
            onClick={() => openModal('add')}
            disabled={saving}
          >
            <FaPlus />
            Thêm sinh viên
          </button>
          <button
            className={styles.addBtn}
            onClick={() => setShowImportModal(true)}
            disabled={saving}
          >
            <FaFileImport />
            Import Excel
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

      {/* Stats (moved above filters to tighten layout and avoid right gap) */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUsers />
          </div>
          <div className={styles.statInfo}>
            <h3>{students.length}</h3>
            <p>Tổng sinh viên</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUserCheck />
          </div>
          <div className={styles.statInfo}>
            <h3>{students.filter(s => s.status === 'active').length}</h3>
            <p>Đang hoạt động</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUserTimes />
          </div>
          <div className={styles.statInfo}>
            <h3>{students.filter(s => s.status === 'inactive').length}</h3>
            <p>Tạm khóa</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaSearch />
          </div>
          <div className={styles.statInfo}>
            <h3>{filteredStudents.length}</h3>
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
            placeholder="Tìm kiếm theo tên, mã SV, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm khóa</option>
        </select>
        
        <select 
          value={filterMajor} 
          onChange={(e) => setFilterMajor(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Tất cả ngành</option>
          {availableMajors.map((major, index) => (
            <option key={index} value={major}>{major}</option>
          ))}
        </select>

        {selectedStudents.length > 0 && (
          <button 
            className={styles.bulkDeleteBtn}
            onClick={handleBulkDelete}
            disabled={saving}
          >
            <FaTrash />
            Xóa ({selectedStudents.length})
          </button>
        )}
      </div>

      

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedStudents.length === currentStudents.length && currentStudents.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Mã SV</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Lớp</th>
              <th>Ngành</th>
              <th>Trạng thái</th>
              <th>Ngày sinh</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.map(student => (
              <tr key={student.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleSelectStudent(student.id)}
                  />
                </td>
                    <td>
                      <div className={styles.studentId}>
                        {student.studentId || student.id || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className={styles.studentInfo}>
                        <div>
                          <div className={styles.name}>{student.fullName || 'Chưa có tên'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{student.email || 'Chưa có email'}</td>
                    <td>{student.phone || 'Chưa có SĐT'}</td>
                    <td>{student.class || 'Chưa có lớp'}</td>
                    <td>{student.major || 'Chưa có ngành'}</td>
                    <td>
                      <span className={`${styles.status} ${styles[student.status || 'active']}`}>
                        {student.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td>
                      {student.dateOfBirth || 'Chưa có ngày sinh'}
                    </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionBtn} ${styles.viewBtn}`}
                      onClick={() => openModal('view', student)}
                      title="Xem chi tiết"
                      disabled={saving}
                    >
                      <FaEye />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.editBtn}`}
                      onClick={() => openModal('edit', student)}
                      title="Chỉnh sửa"
                      disabled={saving}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.resetBtn}`}
                      onClick={() => resetPassword(student.id)}
                      title="Reset mật khẩu"
                      disabled={saving}
                    >
                      <FaSyncAlt />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.statusBtn}`}
                      onClick={() => handleStatusChange(
                        student.id, 
                        student.status === 'active' ? 'inactive' : 'active'
                      )}
                      title={student.status === 'active' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
                      disabled={saving}
                    >
                      {student.status === 'active' ? <FaLock /> : <FaUnlock />}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDeleteStudent(student.id)}
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

        {filteredStudents.length === 0 && (
          <div className={styles.noData}>
            <FaUsersSlash />
            <p>Không tìm thấy sinh viên nào</p>
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
                {modalType === 'add' && 'Thêm sinh viên mới'}
                {modalType === 'edit' && 'Chỉnh sửa thông tin sinh viên'}
                {modalType === 'view' && 'Thông tin chi tiết sinh viên'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal} disabled={saving}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {modalType === 'view' ? (
                <div className={styles.studentDetails}>
                  <div className={styles.detailRow}>
                    <label>Mã sinh viên:</label>
                    <span>{currentStudent.studentId}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Họ tên:</label>
                    <span>{currentStudent.fullName}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Email:</label>
                    <span>{currentStudent.email}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Số điện thoại:</label>
                    <span>{currentStudent.phone}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Lớp:</label>
                    <span>{currentStudent.class}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Ngành:</label>
                    <span>{currentStudent.major}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Trạng thái:</label>
                    <span className={`${styles.status} ${styles[currentStudent.status]}`}>
                      {currentStudent.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Ngày tham gia:</label>
                    <span>{new Date(currentStudent.joinDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <label>Ngày sinh:</label>
                    <span>{currentStudent.dateOfBirth || 'Chưa có ngày sinh'}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Mã sinh viên *</label>
                    <input
                      type="text"
                      value={formData.studentCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setFormData({...formData, studentCode: val});
                        }
                      }}
                      disabled={saving}
                      required
                      placeholder="Chỉ nhập số"
                      inputMode="numeric"
                      pattern="[0-9]+"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Họ tên *</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Số điện thoại</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      disabled={saving}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Ngày sinh *</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label style={{textAlign:'left'}}>Khoa *</label>
                      <SafeDropdown
                        value={formData.departmentId}
                        onChange={(e) => handleDepartmentChange(e)}
                        options={departments}
                        placeholder="Chọn khoa"
                        required
                        disabled={saving}
                        emptyMessage={departments.length === 0 ? "Đang tải khoa..." : "Không có khoa nào"}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label style={{textAlign:'left'}}>Ngành *</label>
                      <SafeDropdown
                        value={formData.majorId}
                        onChange={(e) => handleMajorChange(e)}
                        options={majors}
                        placeholder="Chọn ngành"
                        required
                        disabled={saving || !formData.departmentId}
                        emptyMessage={formData.departmentId ? (majors.length === 0 ? "Đang tải ngành..." : "Không có ngành nào") : "Vui lòng chọn khoa trước"}
                      />
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Lớp *</label>
                    <SafeDropdown
                      value={formData.classId}
                      onChange={(e) => handleClassChange(e)}
                      options={classes}
                      placeholder="Chọn lớp"
                      required
                      disabled={saving || !formData.majorId}
                      emptyMessage={formData.majorId ? (classes.length === 0 ? "Đang tải lớp..." : "Không có lớp nào") : "Vui lòng chọn ngành trước"}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label style={{textAlign:'left'}}>Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      disabled={saving}
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Tạm khóa</option>
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
                          <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                          {modalType === 'add' ? 'Đang thêm...' : 'Đang cập nhật...'}
                        </>
                      ) : (
                        modalType === 'add' ? 'Thêm sinh viên' : 'Cập nhật'
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

      {/* Modal Import Excel */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Import sinh viên từ Excel</h2>
              <button className={styles.closeBtn} onClick={() => setShowImportModal(false)} disabled={saving}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleImportExcel}>
                <div className={styles.formGroup}>
                  <label>Chọn file Excel (.xlsx, .xls)</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={e => setImportFile(e.target.files[0])}
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
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        Đang import...
                      </>
                    ) : (
                      'Import'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className={styles.cancelBtn}
                    disabled={saving}
                  >
                    Hủy
                  </button>
                </div>
              </form>
              <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.95rem' }}>
                File Excel cần có các cột: Họ tên, Email, Số điện thoại, Mã lớp, Mã sinh viên (tùy chọn).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentsPage;