// src/pages/admin/TopicManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaSpinner, 
  FaExclamationCircle, 
  FaEye, 
  FaEdit, 
  FaTrash,
  FaTimes, 
  FaClock,
  FaTrophy,
  FaQuestionCircle,
  FaBookOpen,
  FaCheck,
  FaSave,
  FaBook,
  FaFileImport,
  FaUpload,
  FaSearch
} from 'react-icons/fa';
import styles from './TopicManagementPage.module.css';
import { 
  getSubjects, 
  updateTopic,
  createTopic,
  deleteTopic,
  getTopicQuestions,
  importQuestionsExcel,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
  deleteAllTopicQuestions
} from '../../services/apiService';

const TopicManagementPage = () => {
  // State
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    duration_minutes: '',
    pass_score: '',
  });

  // Add Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    description: '',
    duration_minutes: '45',
    pass_score: '60',
  });

  // Questions Modal
  const [viewQuestionsModalOpen, setViewQuestionsModalOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [viewingSubject, setViewingSubject] = useState(null);
  
  // Bulk delete state
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectAllQuestions, setSelectAllQuestions] = useState(false);

  // Add Question Modal
  const [addQuestionModalOpen, setAddQuestionModalOpen] = useState(false);
  const [addQuestionForm, setAddQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctOptions: []
  });

  // Edit Question Modal
  const [editQuestionModalOpen, setEditQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editQuestionForm, setEditQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctOptions: []
  });

  // Import Questions
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Fetch data with pagination
  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await getSubjects({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm
      });
      
      setSubjects(data.subjects || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Không thể tải danh sách chuyên đề');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [currentPage, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search handler
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Add Subject Functions
  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddForm({
      name: '',
      description: '',
      duration_minutes: '45',
      pass_score: '60',
    });
  };

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm({ ...addForm, [name]: value });
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.duration_minutes || !addForm.pass_score) {
      alert('Vui lòng điền đầy đủ thông tin chuyên đề!');
      return;
    }
    
    setSaving(true);
    try {
      await createTopic(
        addForm.name,
        addForm.description,
        parseInt(addForm.duration_minutes),
        parseInt(addForm.pass_score)
      );
      alert('Thêm chuyên đề thành công!');
      closeAddModal();
      loadSubjects(); // Reload data after adding
    } catch (err) {
      alert('Lỗi khi thêm chuyên đề: ' + (err.message || 'Không thể thêm'));
    } finally {
      setSaving(false);
    }
  };

  // Edit Subject Functions
  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setEditForm({
      name: subject.name,
      description: subject.description || '',
      duration_minutes: subject.duration_minutes || '',
      pass_score: subject.pass_score || '',
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingSubject(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleSaveEditSubject = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.duration_minutes || !editForm.pass_score) {
      alert('Vui lòng điền đầy đủ thông tin chuyên đề!');
      return;
    }
    
    setSaving(true);
    try {
      await updateTopic(
        editingSubject.id,
        editForm.name,
        editForm.description,
        editForm.duration_minutes,
        editForm.pass_score
      );
      alert('Cập nhật chuyên đề thành công!');
      closeEditModal();
      loadSubjects(); // Reload data after updating
    } catch (err) {
      alert('Lỗi khi cập nhật chuyên đề: ' + (err.message || 'Không thể cập nhật'));
    } finally {
      setSaving(false);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chuyên đề này? Thao tác này không thể hoàn tác.')) {
      return;
    }

    setSaving(true);
    try {
      await deleteTopic(subjectId);
      alert('Xóa chuyên đề thành công!');
      loadSubjects();
    } catch (err) {
      // Nếu lỗi có gợi ý force
      if (err.message && err.message.includes('?force=true')) {
        const confirmForce = window.confirm('Chuyên đề đang được dùng (bài thi / lịch thi). Bạn có muốn xóa cưỡng bức?\nLưu ý: thao tác này sẽ xóa các bài thi, lịch thi và toàn bộ câu hỏi/đáp án của chuyên đề.');
        if (confirmForce) {
          try {
            const result = await deleteTopic(subjectId, { force: true });
            alert('Đã xóa cưỡng bức chuyên đề. Thống kê:\n' + JSON.stringify(result.data || result, null, 2));
            loadSubjects();
          } catch (forceErr) {
            alert('Xóa cưỡng bức thất bại: ' + (forceErr.message || 'Lỗi không xác định'));
          }
        }
      } else {
        alert('Lỗi khi xóa chuyên đề: ' + (err.message || 'Không thể xóa'));
      }
    } finally {
      setSaving(false);
    }
  };

  // Questions Functions
  const handleViewQuestions = async (subject) => {
    setViewingSubject(subject);
    setViewQuestionsModalOpen(true);
    try {
      const data = await getTopicQuestions(subject.id);
      setQuestions(data.questions || data || []);
      // Reset selection state when loading new questions
      setSelectedQuestions([]);
      setSelectAllQuestions(false);
    } catch (err) {
      setQuestions([]);
      // Reset selection state on error too
      setSelectedQuestions([]);
      setSelectAllQuestions(false);
      alert('Không thể tải câu hỏi: ' + (err.message || 'Lỗi server'));
    }
  };

  const closeViewQuestionsModal = () => {
    setViewQuestionsModalOpen(false);
    setViewingSubject(null);
    setQuestions([]);
    // Reset selection states
    setSelectedQuestions([]);
    setSelectAllQuestions(false);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      setSaving(true);
      try {
        await deleteQuestion(questionId);
        alert('Xóa câu hỏi thành công!');
        handleViewQuestions(viewingSubject); // Reload questions
        loadSubjects(); // Reload subjects to update question count
      } catch (err) {
        alert('Lỗi khi xóa câu hỏi: ' + (err.message || 'Không thể xóa'));
      } finally {
        setSaving(false);
      }
    }
  };

  // Bulk delete functions
  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev => {
      const newSelected = prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId];
      
      // Cập nhật trạng thái "Chọn tất cả" dựa trên số lượng câu hỏi được chọn
      const allSelected = newSelected.length === questions.length && questions.length > 0;
      setSelectAllQuestions(allSelected);
      
      return newSelected;
    });
  };

  const handleSelectAllQuestions = () => {
    if (selectAllQuestions) {
      // Nếu đang chọn tất cả, bỏ chọn tất cả
      setSelectedQuestions([]);
      setSelectAllQuestions(false);
    } else {
      // Nếu chưa chọn tất cả, chọn tất cả
      setSelectedQuestions(questions.map(q => q.id));
      setSelectAllQuestions(true);
    }
  };

  const handleBulkDeleteQuestions = async () => {
    if (selectedQuestions.length === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi để xóa');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedQuestions.length} câu hỏi đã chọn?`)) {
      setSaving(true);
      try {
        await bulkDeleteQuestions(selectedQuestions);
        alert(`Đã xóa ${selectedQuestions.length} câu hỏi thành công!`);
        setSelectedQuestions([]);
        setSelectAllQuestions(false);
        handleViewQuestions(viewingSubject); // Reload questions
        loadSubjects(); // Reload subjects to update question count
      } catch (err) {
        alert('Lỗi khi xóa câu hỏi: ' + (err.message || 'Không thể xóa'));
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (questions.length === 0) {
      alert('Không có câu hỏi nào để xóa');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa tất cả ${questions.length} câu hỏi của chuyên đề này?`)) {
      setSaving(true);
      try {
        await deleteAllTopicQuestions(viewingSubject.id);
        alert(`Đã xóa tất cả ${questions.length} câu hỏi thành công!`);
        setSelectedQuestions([]);
        setSelectAllQuestions(false);
        handleViewQuestions(viewingSubject); // Reload questions
        loadSubjects(); // Reload subjects to update question count
      } catch (err) {
        alert('Lỗi khi xóa câu hỏi: ' + (err.message || 'Không thể xóa'));
      } finally {
        setSaving(false);
      }
    }
  };

  // Add Question Functions
  const openAddQuestionModal = () => {
    setAddQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctOptions: []
    });
    setAddQuestionModalOpen(true);
  };

  const closeAddQuestionModal = () => {
    setAddQuestionModalOpen(false);
    setAddQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctOptions: []
    });
  };

  const handleAddQuestionFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('option_')) {
      const index = parseInt(name.split('_')[1]);
      const newOptions = [...addQuestionForm.options];
      newOptions[index] = value;
      setAddQuestionForm({ ...addQuestionForm, options: newOptions });
    } else {
      setAddQuestionForm({ ...addQuestionForm, [name]: value });
    }
  };

  const handleCorrectOptionChange = (index, isCorrect) => {
    const newCorrectOptions = isCorrect 
      ? [...addQuestionForm.correctOptions, index]
      : addQuestionForm.correctOptions.filter(i => i !== index);
    setAddQuestionForm({ ...addQuestionForm, correctOptions: newCorrectOptions });
  };

  // Edit Question Functions
  const openEditQuestionModal = (question) => {
    console.log('Opening edit modal for question:', question);
    setEditingQuestion(question);
    setEditQuestionForm({
      question: question.question,
      options: question.options?.map(opt => opt.text || opt) || ['', '', '', ''],
      correctOptions: question.options?.map((opt, idx) => opt.isCorrect ? idx : -1).filter(i => i !== -1) || []
    });
    setEditQuestionModalOpen(true);
  };

  const closeEditQuestionModal = () => {
    setEditQuestionModalOpen(false);
    setEditingQuestion(null);
    setEditQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctOptions: []
    });
  };

  const handleEditQuestionFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('option_')) {
      const index = parseInt(name.split('_')[1]);
      const newOptions = [...editQuestionForm.options];
      newOptions[index] = value;
      setEditQuestionForm({ ...editQuestionForm, options: newOptions });
    } else {
      setEditQuestionForm({ ...editQuestionForm, [name]: value });
    }
  };

  const handleEditCorrectOptionChange = (index, isCorrect) => {
    const newCorrectOptions = isCorrect 
      ? [...editQuestionForm.correctOptions, index]
      : editQuestionForm.correctOptions.filter(i => i !== index);
    setEditQuestionForm({ ...editQuestionForm, correctOptions: newCorrectOptions });
  };

  // Import Functions
  const openImportModal = () => {
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
  };

  const handleAddQuestion = async () => {
    if (!addQuestionForm.question || addQuestionForm.options.some(opt => !opt.trim()) || addQuestionForm.correctOptions.length === 0) {
      alert('Vui lòng điền đầy đủ câu hỏi, đáp án và chọn ít nhất 1 đáp án đúng!');
      return;
    }

    setSaving(true);
    try {
      // Prepare answers array for API
      const answers = addQuestionForm.options.map((option, index) => ({
        text: option,
        isCorrect: addQuestionForm.correctOptions.includes(index)
      }));

      // Call API with separate parameters as expected
      await createQuestion(viewingSubject.id, addQuestionForm.question, answers);
      alert('Thêm câu hỏi thành công!');
      closeAddQuestionModal();
      handleViewQuestions(viewingSubject); // Reload questions
      loadSubjects(); // Reload subjects to update question count
    } catch (err) {
      alert('Lỗi khi thêm câu hỏi: ' + (err.message || 'Không thể thêm'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editQuestionForm.question || editQuestionForm.options.some(opt => !opt.trim()) || editQuestionForm.correctOptions.length === 0) {
      alert('Vui lòng điền đầy đủ câu hỏi, đáp án và chọn ít nhất 1 đáp án đúng!');
      return;
    }

    console.log('Updating question with ID:', editingQuestion.id);
    console.log('Question form data:', editQuestionForm);

    setSaving(true);
    try {
      // Prepare answers array for API
      const answers = editQuestionForm.options.map((option, index) => ({
        text: option,
        isCorrect: editQuestionForm.correctOptions.includes(index)
      }));

      console.log('Sending to API:', {
        id: editingQuestion.id,
        question: editQuestionForm.question,
        answers: answers
      });

      // Call API with separate parameters as expected
      await updateQuestion(editingQuestion.id, editQuestionForm.question, answers);
      alert('Cập nhật câu hỏi thành công!');
      closeEditQuestionModal();
      handleViewQuestions(viewingSubject); // Reload questions
      loadSubjects(); // Reload subjects to update question count
    } catch (err) {
      console.error('Update question error:', err);
      alert('Lỗi khi cập nhật câu hỏi: ' + (err.message || 'Không thể cập nhật'));
    } finally {
      setSaving(false);
    }
  };

  // Import câu hỏi từ Excel
  const handleImportQuestionsExcel = async () => {
    if (!importFile || !viewingSubject) {
      alert('Vui lòng chọn file Excel');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const result = await importQuestionsExcel(viewingSubject.id, formData);
      
      // Hiển thị kết quả chi tiết
      let message = `Import hoàn thành: ${result.inserted}/${result.total} câu hỏi được thêm thành công`;
      if (result.skipped > 0) {
        message += `\n${result.skipped} câu hỏi bị bỏ qua`;
      }
      if (result.errors && result.errors.length > 0) {
        message += `\n\nChi tiết lỗi:\n` + result.errors.slice(0, 5).join('\n');
        if (result.errors.length > 5) {
          message += `\n... và ${result.errors.length - 5} lỗi khác`;
        }
      }
      
      alert(message);
      closeImportModal();
      handleViewQuestions(viewingSubject); // Reload questions
      loadSubjects(); // Reload subjects to update question count
    } catch (err) {
      console.error('Import Excel error:', err);
      alert('Lỗi import Excel: ' + (err.message || 'Không thể import'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FaSpinner className="fa-spin" />
          <p>Đang tải danh sách chuyên đề...</p>
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
            <FaBookOpen />
            Quản lý chuyên đề
          </h1>
          <p>Quản lý các chuyên đề thi và câu hỏi</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.addBtn}
            onClick={() => setAddModalOpen(true)}
            disabled={saving}
          >
            <FaPlus />
            Thêm chuyên đề
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBookOpen />
          </div>
          <div className={styles.statInfo}>
            <h3>{subjects.length}</h3>
            <p>Tổng chuyên đề</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaQuestionCircle />
          </div>
          <div className={styles.statInfo}>
            <h3>{subjects.reduce((total, subject) => total + (subject.totalQuestions ?? subject.question_count ?? 0), 0)}</h3>
            <p>Tổng câu hỏi</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaClock />
          </div>
          <div className={styles.statInfo}>
            <h3>{Math.round(subjects.reduce((total, subject) => total + (subject.duration_minutes || 45), 0) / (subjects.length || 1))}</h3>
            <p>Thời gian TB (phút)</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaTrophy />
          </div>
          <div className={styles.statInfo}>
            <h3>{Math.round(subjects.reduce((total, subject) => total + (subject.pass_score || 60), 0) / (subjects.length || 1))}</h3>
            <p>Điểm đạt TB (%)</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm kiếm chuyên đề..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>
        
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Chuyên đề</th>
              <th>Số câu hỏi</th>
              <th>Thời gian</th>
              <th>Điểm đạt</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length > 0 ? (
              subjects.map(subject => (
                <tr key={subject.id}>
                  <td>
                    <div className={styles.topicInfo}>
                      <div className={styles.topicIcon}>
                        <FaBook />
                      </div>
                      <div>
                        <div className={styles.topicName}>{subject.name}</div>
                        <div className={styles.topicDescription}>
                          {subject.description || 'Không có mô tả'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.questionCount}>
                      <FaQuestionCircle style={{marginRight: '0.3rem'}} />
                      {subject.totalQuestions ?? subject.question_count ?? 0} câu
                    </span>
                  </td>
                  <td>
                    <span className={styles.duration}>
                      <FaClock style={{marginRight: '0.3rem'}} />
                      {subject.duration_minutes || 45} phút
                    </span>
                  </td>
                  <td>
                    <span className={styles.passScore}>
                      <FaTrophy style={{marginRight: '0.3rem'}} />
                      {subject.pass_score || 60}%
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={`${styles.actionBtn} ${styles.viewBtn}`}
                        onClick={() => handleViewQuestions(subject)}
                        title="Xem câu hỏi"
                        disabled={saving}
                      >
                        <FaEye />
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEditSubject(subject)}
                        title="Sửa chuyên đề"
                        disabled={saving}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDeleteSubject(subject.id)}
                        title="Xóa chuyên đề"
                        disabled={saving}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">
                  <div className={styles.noData}>
                    <FaBookOpen />
                    <p>Chưa có chuyên đề nào</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={styles.paginationBtn}
          >
            «
          </button>
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.paginationBtn}
          >
            ‹
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              const distance = Math.abs(page - currentPage);
              return distance <= 2 || page === 1 || page === totalPages;
            })
            .map((page, index, array) => {
              const prevPage = array[index - 1];
              return (
                <React.Fragment key={page}>
                  {prevPage && page - prevPage > 1 && (
                    <span className={styles.paginationEllipsis}>...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`${styles.paginationBtn} ${currentPage === page ? styles.active : ''}`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.paginationBtn}
          >
            ›
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className={styles.paginationBtn}
          >
            »
          </button>
        </div>
      )}

      {/* Modal thêm chuyên đề */}
      {addModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaPlus />
                Thêm chuyên đề mới
              </h2>
              <button className={styles.closeBtn} onClick={closeAddModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAddSubject} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Tên chuyên đề:</label>
                <input 
                  type="text"
                  name="name"
                  value={addForm.name}
                  onChange={handleAddFormChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Mô tả:</label>
                <textarea
                  name="description"
                  value={addForm.description}
                  onChange={handleAddFormChange}
                  rows="3"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Thời gian (phút):</label>
                  <input 
                    type="number"
                    name="duration_minutes"
                    value={addForm.duration_minutes}
                    onChange={handleAddFormChange}
                    required
                    min="1"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Điểm đạt:</label>
                  <input 
                    type="number"
                    name="pass_score"
                    value={addForm.pass_score}
                    onChange={handleAddFormChange}
                    required
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? 'Đang thêm...' : 'Thêm'}
                </button>
                <button type="button" onClick={closeAddModal} className={styles.btnSecondary} disabled={saving}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sửa chuyên đề */}
      {editModalOpen && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaEdit />
                Sửa chuyên đề
              </h2>
              <button className={styles.closeBtn} onClick={closeEditModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSaveEditSubject} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Tên chuyên đề:</label>
                <input 
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Mô tả:</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  rows="3"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Thời gian (phút):</label>
                  <input 
                    type="number"
                    name="duration_minutes"
                    value={editForm.duration_minutes}
                    onChange={handleEditFormChange}
                    required
                    min="1"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Điểm đạt:</label>
                  <input 
                    type="number"
                    name="pass_score"
                    value={editForm.pass_score}
                    onChange={handleEditFormChange}
                    required
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  <FaSave />
                  Lưu
                </button>
                <button type="button" onClick={closeEditModal} className={styles.btnSecondary} disabled={saving}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal xem câu hỏi */}
      {viewQuestionsModalOpen && (
        <div className={styles.modalOverlay} onClick={closeViewQuestionsModal}>
          <div className={`${styles.modal} ${styles.questionsModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaQuestionCircle />
                Câu hỏi: {viewingSubject?.name}
              </h2>
              <div className={styles.headerActions}>
                <button className={styles.closeBtn} onClick={closeViewQuestionsModal}>
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className={styles.modalBody}>
              {/* Bulk actions toolbar */}
              {questions.length > 0 && (
                <div className={styles.bulkActionsToolbar}>
                  <div className={styles.bulkSelectAll}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectAllQuestions}
                        onChange={handleSelectAllQuestions}
                        disabled={saving}
                      />
                      Chọn tất cả ({questions.length} câu hỏi)
                    </label>
                    {/* Hiển thị số lượng đã chọn */}
                    {selectedQuestions.length > 0 && !selectAllQuestions && (
                      <span className={styles.selectionInfo}>
                        Đã chọn: {selectedQuestions.length}/{questions.length}
                      </span>
                    )}
                  </div>
                  <div className={styles.bulkActions}>
                    {/* Hiển thị nút xóa dựa trên trạng thái chọn */}
                    {selectAllQuestions ? (
                      // Khi chọn tất cả, hiển thị nút "Xóa tất cả"
                      <button 
                        className={`${styles.deleteAllBtn} ${styles.btnDanger}`}
                        onClick={handleDeleteAllQuestions}
                        disabled={saving}
                      >
                        <FaTrash />
                        Xóa tất cả ({questions.length})
                      </button>
                    ) : selectedQuestions.length > 0 ? (
                      // Khi chọn một số câu hỏi, hiển thị nút "Xóa đã chọn"
                      <button 
                        className={`${styles.bulkDeleteBtn} ${styles.btnDanger}`}
                        onClick={handleBulkDeleteQuestions}
                        disabled={saving}
                      >
                        <FaTrash />
                        Xóa đã chọn ({selectedQuestions.length})
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              
              <div className={styles.questionsList}>
                {questions.length > 0 ? (
                  <ul className={styles.questionList}>
                    {questions.map((q, idx) => (
                      <li key={q.id} className={styles.questionItem}>
                        <div className={styles.questionHeader}>
                          <div className={styles.questionSelectAndText}>
                            <label className={styles.questionCheckbox}>
                              <input
                                type="checkbox"
                                checked={selectedQuestions.includes(q.id)}
                                onChange={() => handleSelectQuestion(q.id)}
                                disabled={saving}
                              />
                            </label>
                            <div className={styles.questionText}>
                              <strong>Câu {idx + 1}:</strong> {q.question}
                            </div>
                          </div>
                          <div className={styles.questionActions}>
                            <button 
                              className={`${styles.actionBtn} ${styles.editBtn}`} 
                              onClick={() => openEditQuestionModal(q)}
                              title="Sửa câu hỏi"
                              disabled={saving}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                              onClick={() => handleDeleteQuestion(q.id)}
                              title="Xóa câu hỏi"
                              disabled={saving}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        <div className={styles.answersList}>
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.id || optIdx} className={`${styles.answerItem} ${opt.isCorrect ? 'correct' : ''}`}>
                              <div className={styles.answerLabel}>
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span>{opt.text || opt}</span>
                              {opt.isCorrect && (
                                <FaCheck style={{ color: 'var(--color-success)', marginLeft: '0.5rem' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.noData}>
                    <FaQuestionCircle />
                    <p>Chuyên đề này chưa có câu hỏi nào.</p>
                  </div>
                )}
              </div>
              <div className={styles.modalFooterActions}>
                <button 
                  className={styles.addBtn}
                  onClick={openAddQuestionModal}
                  disabled={saving}
                >
                  <FaPlus />
                  Thêm câu hỏi
                </button>
                <button 
                  className={styles.addBtn}
                  onClick={openImportModal}
                  disabled={saving}
                >
                  <FaFileImport />
                  Import Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm câu hỏi */}
      {addQuestionModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAddQuestionModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaPlus />
                Thêm câu hỏi mới
              </h2>
              <button className={styles.closeBtn} onClick={closeAddQuestionModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Câu hỏi:</label>
                <textarea
                  name="question"
                  value={addQuestionForm.question}
                  onChange={handleAddQuestionFormChange}
                  rows="3"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Các đáp án:</label>
                {addQuestionForm.options.map((option, index) => (
                  <div key={index} className={styles.optionRow}>
                    <input
                      type="text"
                      name={`option_${index}`}
                      value={option}
                      onChange={handleAddQuestionFormChange}
                      placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                      required
                    />
                    <label className={styles.correctCheckbox}>
                      <input
                        type="checkbox"
                        checked={addQuestionForm.correctOptions.includes(index)}
                        onChange={(e) => handleCorrectOptionChange(index, e.target.checked)}
                      />
                      Đúng
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnPrimary} onClick={handleAddQuestion} disabled={saving}>
                <FaSave />
                Thêm
              </button>
              <button type="button" onClick={closeAddQuestionModal} className={styles.btnSecondary} disabled={saving}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa câu hỏi */}
      {editQuestionModalOpen && (
        <div className={styles.modalOverlay} onClick={closeEditQuestionModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaEdit />
                Sửa câu hỏi
              </h2>
              <button className={styles.closeBtn} onClick={closeEditQuestionModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Câu hỏi:</label>
                <textarea
                  name="question"
                  value={editQuestionForm.question}
                  onChange={handleEditQuestionFormChange}
                  rows="3"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Các đáp án:</label>
                {editQuestionForm.options.map((option, index) => (
                  <div key={index} className={styles.optionRow}>
                    <input
                      type="text"
                      name={`option_${index}`}
                      value={option}
                      onChange={handleEditQuestionFormChange}
                      placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                      required
                    />
                    <label className={styles.correctCheckbox}>
                      <input
                        type="checkbox"
                        checked={editQuestionForm.correctOptions.includes(index)}
                        onChange={(e) => handleEditCorrectOptionChange(index, e.target.checked)}
                      />
                      Đúng
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnPrimary} onClick={handleUpdateQuestion} disabled={saving}>
                <FaSave />
                Lưu
              </button>
              <button type="button" onClick={closeEditQuestionModal} className={styles.btnSecondary} disabled={saving}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal import Excel */}
      {importModalOpen && (
        <div className={styles.modalOverlay} onClick={closeImportModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaFileImport />
                Import câu hỏi từ Excel
              </h2>
              <button className={styles.closeBtn} onClick={closeImportModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.importSection}>
                <h4>Tải lên file Excel</h4>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
                <div className={styles.importActions}>
                  <button
                    className={styles.importBtn}
                    onClick={handleImportQuestionsExcel}
                    disabled={!importFile || saving}
                    type="button"
                  >
                    <FaUpload />
                    Import Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saving overlay */}
      {saving && (
        <div className={styles.savingOverlay}>
          <div className={styles.savingContent}>
            <FaSpinner className="fa-spin" />
            <p>Đang lưu dữ liệu...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicManagementPage;
