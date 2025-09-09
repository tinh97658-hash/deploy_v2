import React, { useEffect, useState, useMemo } from 'react';
import {
  getBatchSchedules,
  createBatchSchedule,
  deleteBatchSchedule,
  updateBatchSchedule,
  getDepartments,
  getMajorsByDepartment,
  getSubjects
} from '../../services/apiService';
import styles from './SchedulesManagementPage.module.css';

// Page replicates original batch schedule UI (cards + modal) separated from topic management
const SchedulesManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [majors, setMajors] = useState([]);
  const [batchSchedules, setBatchSchedules] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editContext, setEditContext] = useState(null); // {mode:'edit-group'|'add', schedules:[...]} or single schedule
  // Removed groupView toggle: always grouped by department
  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterStart, setFilterStart] = useState(''); // date (yyyy-mm-dd)
  const [filterEnd, setFilterEnd] = useState('');
  const [batchForm, setBatchForm] = useState({
    department: '',
    major_id: '',
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '17:00',
    notes: ''
  });

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const [subjectsData, schedulesData, departmentsData] = await Promise.all([
          getSubjects(),
          getBatchSchedules(),
          getDepartments()
        ]);
        setSubjects(Array.isArray(subjectsData.subjects) ? subjectsData.subjects : []);
        setBatchSchedules(schedulesData || []);
        setDepartments(departmentsData || []);
      } catch (e) {
        console.error(e);
        setError('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Load majors based on department selection
  useEffect(() => {
    const loadMajors = async () => {
      // When choosing "All departments/majors", majors list is irrelevant
      if (!batchForm.department || batchForm.department === '__ALL__') { setMajors([]); return; }
      try {
        const majorsData = await getMajorsByDepartment(batchForm.department);
        setMajors(majorsData || []);
      } catch (e) { setMajors([]); }
    };
    loadMajors();
  }, [batchForm.department]);

  // Removed unused departmentNameMap (was creating lint warning)

  // Removed unused topicNameMap (creating lint warning)

  const openBatchModal = () => {
    setBatchForm({
      department: '',
      major_id: '',
      startDate: '',
      startTime: '08:00',
      endDate: '',
      endTime: '17:00',
      notes: ''
    });
  // Reset edit context to ensure modal is in add mode
  setEditContext({ mode: 'add' });
    setShowBatchModal(true);
  };

  const openBatchModalForDept = (deptId, schedulesInGroup = []) => {
    setBatchForm(prev => ({
      ...prev,
      department: deptId || '',
      major_id: '',
      startDate: '',
      startTime: '08:00',
      endDate: '',
      endTime: '17:00',
      notes: ''
    }));
    if (schedulesInGroup.length) {
      // preload from first schedule for edit
      try {
        const first = schedulesInGroup[0];
        const s = new Date(first.start);
        const e = new Date(first.end);
        setBatchForm(prev => ({
          ...prev,
          startDate: s.toISOString().slice(0,10),
          startTime: s.toISOString().slice(11,16),
          endDate: e.toISOString().slice(0,10),
          endTime: e.toISOString().slice(11,16),
          notes: first.notes || ''
        }));
        setEditContext({ mode:'edit-group', schedules: schedulesInGroup });
      } catch {}
    } else {
      setEditContext({ mode:'add' });
    }
    setShowBatchModal(true);
  };

  const closeBatchModal = () => setShowBatchModal(false);

  const handleBatchFormChange = (e) => {
    const { name, value } = e.target;
    // If switching to ALL departments, clear and disable major field
    if (name === 'department') {
      if (value === '__ALL__') {
        setBatchForm(prev => ({ ...prev, department: value, major_id: '' }));
        return;
      }
    }
    setBatchForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBatchSchedule = async (e) => {
    e.preventDefault();
    if (editContext?.mode === 'edit-group') {
      // In edit mode only need start/end fields
      if (!batchForm.startDate || !batchForm.endDate) {
        alert('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!');
        return;
      }
    } else {
      // Validation: allow missing major when department is ALL
      const isAllDept = batchForm.department === '__ALL__';
      if (!batchForm.department || (!isAllDept && !batchForm.major_id) || !batchForm.startDate || !batchForm.endDate) {
        alert('Vui lòng điền đầy đủ thông tin lịch thi!');
        return;
      }
    }
    try {
      if (subjects.length === 0) {
        alert('Không có chuyên đề nào!');
        return;
      }
      if (editContext?.mode === 'edit-group' && editContext.schedules?.length) {
        const newStart = `${batchForm.startDate}T${batchForm.startTime}:00`;
        const newEnd = `${batchForm.endDate}T${batchForm.endTime}:00`;
        for (const sc of editContext.schedules) {
          await updateBatchSchedule(sc.id, { start: newStart, end: newEnd, notes: batchForm.notes });
        }
        const batchData = await getBatchSchedules();
        setBatchSchedules(batchData || []);
        alert('Đã cập nhật nhóm lịch thi thành công!');
      } else {
        for (const topic of subjects) {
          const isAllDept = batchForm.department === '__ALL__';
          const newSchedule = {
            // Represent global schedule by null department/major to collapse into one card
            department_id: isAllDept ? null : batchForm.department,
            major_id: isAllDept ? null : batchForm.major_id,
            topic_id: topic.id,
            start: `${batchForm.startDate}T${batchForm.startTime}:00`,
            end: `${batchForm.endDate}T${batchForm.endTime}:00`,
            notes: batchForm.notes
          };
          await createBatchSchedule(newSchedule);
        }
        const batchData = await getBatchSchedules();
        setBatchSchedules(batchData || []);
        alert('Đã lên lịch thi cho tất cả chuyên đề thành công!');
      }
      closeBatchModal();
    } catch (err) {
      alert(`Lỗi: ${err.message || 'Không thể lưu lịch thi'}`);
    }
  };

  // (Removed unused handleDeleteBatchSchedule to clean warnings)

  // Removed unused handleDeleteSingleSchedule (lint warning)

  const handleDeleteGroup = async (departmentId, start, end) => {
    if (!window.confirm('Xóa toàn bộ lịch trong nhóm thời gian này?')) return;
    try {
      const toDelete = batchSchedules.filter(s => String(s.department_id) === String(departmentId) && s.start === start && s.end === end);
      for (const sc of toDelete) {
        await deleteBatchSchedule(sc.id);
      }
      setBatchSchedules(prev => prev.filter(s => !(String(s.department_id) === String(departmentId) && s.start === start && s.end === end)));
    } catch (err) {
      alert(err.message || 'Không thể xóa nhóm');
    }
  };

  const formatDateTime = (dt) => {
    try {
      if (!dt) return '';
      const d = new Date(dt.includes('T') ? dt : dt.replace(' ', 'T'));
      return d.toLocaleTimeString('vi-VN', { hour12: false }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch { return dt; }
  };

  const isScheduleActive = (schedule) => {
    if (!schedule?.start || !schedule?.end) return false;
    const start = new Date(schedule.start);
    const end = new Date(schedule.end);
    const now = new Date();
    return now >= start && now <= end;
  };

  // Filtered schedules before grouping
  const filteredSchedules = useMemo(() => {
    return batchSchedules.filter(s => {
      if (filterDept && String(s.department_id) !== String(filterDept)) return false;
      try {
        const sStart = new Date(s.start);
        const sEnd = new Date(s.end);
        if (filterStart) {
          const fs = new Date(filterStart + 'T00:00:00');
            if (sEnd < fs) return false; // schedule ends before filter window
        }
        if (filterEnd) {
          const fe = new Date(filterEnd + 'T23:59:59');
          if (sStart > fe) return false; // schedule starts after filter window
        }
      } catch {}
      return true;
    });
  }, [batchSchedules, filterDept, filterStart, filterEnd]);

  // Group counts (unique dept+start+end) for total and filtered stats
  const totalScheduleGroups = useMemo(() => {
    const map = new Set();
    batchSchedules.forEach(s => {
      if (!s) return;
      const key = `${s.department_id}|${s.start}|${s.end}`;
      map.add(key);
    });
    return map.size;
  }, [batchSchedules]);

  const filteredScheduleGroups = useMemo(() => {
    const map = new Set();
    filteredSchedules.forEach(s => {
      if (!s) return;
      const key = `${s.department_id}|${s.start}|${s.end}`;
      map.add(key);
    });
    return map.size;
  }, [filteredSchedules]);

  const resetFilters = () => {
    setFilterDept('');
    setFilterStart('');
    setFilterEnd('');
  };

  if (loading) return <div className={styles.scheduleLoading}>Đang tải...</div>;
  if (error) return <div className={styles.scheduleError}>{error}</div>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Quản lý lịch thi</h1>
          <p>Quản lý lịch thi cho tất cả chuyên đề</p>
        </div>
  <div className={styles.headerRight}>
          <button className={styles.addBtn} onClick={openBatchModal}>
            <span>+</span>
            Thêm lịch thi
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statInfo}>
            <h3>{totalScheduleGroups}</h3>
            <p>Tổng lịch thi (nhóm)</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🏢</div>
          <div className={styles.statInfo}>
            <h3>{departments.length}</h3>
            <p>Khoa</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statInfo}>
            <h3>{filteredScheduleGroups}</h3>
            <p>Kết quả lọc (nhóm)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
  <select 
          value={filterDept} 
          onChange={e => setFilterDept(e.target.value)} 
          className={styles.filterSelect}
        >
          <option value="">Tất cả khoa</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        
        <input 
          type="date" 
          value={filterStart} 
          onChange={e => setFilterStart(e.target.value)} 
          className={styles.filterSelect}
          placeholder="Từ ngày"
        />
        
        <input 
          type="date" 
          value={filterEnd} 
          onChange={e => setFilterEnd(e.target.value)} 
          className={styles.filterSelect}
          placeholder="Đến ngày"
        />
        
        <button onClick={resetFilters} type="button" className={styles.resetBtn}>
          Đặt lại
        </button>
      </div>

        {/* Table Container */}
        <div className={styles.tableContainer}>
          {filteredSchedules.length > 0 ? (
            (
              // Grouped view: show one card per department per identical time range (start+end)
              (() => {
                // Build groups: key = deptId|start|end
                const groups = {};
                filteredSchedules.forEach(s => {
                  const key = `${s.department_id}|${s.start}|${s.end}`;
                  if (!groups[key]) groups[key] = { deptId: s.department_id, start: s.start, end: s.end, schedules: [] };
                  groups[key].schedules.push(s);
                });
                let groupArray = Object.values(groups);
                if (filterDept) groupArray = groupArray.filter(g => String(g.deptId) === String(filterDept));
                // Sort by start ascending
                groupArray.sort((a,b) => new Date(a.start) - new Date(b.start));
    return groupArray.map(g => {
                  const dept = departments.find(d => String(d.id) === String(g.deptId));
                  const active = isScheduleActive({ start: g.start, end: g.end });
                  const upcoming = !active && new Date(g.start) > new Date();
                  // Lấy ghi chú (ưu tiên ghi chú đầu tiên không rỗng trong nhóm)
                  const groupNote = (g.schedules.find(s => s.notes && s.notes.trim()) || {}).notes;
                  const noNotes = !groupNote;
                  return (
                    <div key={`${g.deptId}-${g.start}-${g.end}`} className={`${styles.batchScheduleCard} ${active ? styles.activeBatchSchedule : ''} ${noNotes ? styles.noNotes : ''}`}>
                      <div className={styles.batchScheduleHeader}>
      <h3>{dept ? `Khoa ${dept.name}` : 'Tất cả khoa/ngành'}</h3>
                        <div className={styles.scheduleStatus}>
                          {active ? (
                            <span className={styles.activeStatus}>Đang diễn ra</span>
                          ) : upcoming ? (
                            <span className={styles.upcomingStatus}>Sắp diễn ra</span>
                          ) : (
                            <span className={styles.completedStatus}>Đã kết thúc</span>
                          )}
                        </div>
                      </div>
                      {groupNote && (
                        <div className={styles.groupNotes}>
                          <i className="fas fa-sticky-note" />
                          <span>{groupNote}</span>
                        </div>
                      )}
                      <div className={styles.batchScheduleInfo}>
                        <div className={styles.scheduleTime}>
                          <i className="fas fa-calendar-alt"></i>
                          <span>{formatDateTime(g.start)} - {formatDateTime(g.end)}</span>
                        </div>
                      </div>
                      <div className={styles.batchScheduleFooter}>
                        <span className={styles.subjectsIncluded}><i className="fas fa-layer-group"></i> {g.schedules.length} chuyên đề</span>
                        <div className={styles.footerActions}>
                          <button className={styles.addInlineBtn} onClick={() => openBatchModalForDept(g.deptId, g.schedules)}>Sửa</button>
                          <button className={styles.deleteBatchBtn} onClick={() => handleDeleteGroup(g.deptId, g.start, g.end)}>Xóa nhóm</button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )
          ) : (
            <div className={styles.emptySchedule}>
              <p>Không có lịch thi phù hợp bộ lọc</p>
              <button className={styles.addFirstBatchBtn} onClick={openBatchModal}><i className="fas fa-plus"></i> Tạo lịch thi đầu tiên</button>
            </div>
          )}
        </div>

      {showBatchModal && (
        <div className={styles.modalOverlay} onClick={closeBatchModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editContext?.mode === 'edit-group' ? 'Sửa nhóm lịch thi' : 'Lên lịch thi cho tất cả chuyên đề'}</h3>
              <button className={styles.closeBtn} onClick={closeBatchModal}><i className="fas fa-times"></i></button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleAddBatchSchedule}>
                {editContext?.mode !== 'edit-group' ? (
                  <>
                    <div className={styles.formGroup}>
                      <label>Khoa/Ngành: *</label>
                      <select name="department" value={batchForm.department} onChange={handleBatchFormChange} required className={styles.formControl}>
                        <option value="">-- Chọn khoa/ngành --</option>
                        <option value="__ALL__">Tất cả khoa/ngành</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Chuyên ngành: *</label>
                      <select name="major_id" value={batchForm.major_id} onChange={handleBatchFormChange} 
                        required={batchForm.department !== '__ALL__'} 
                        disabled={batchForm.department === '__ALL__'}
                        className={styles.formControl}>
                        <option value="">-- Chọn chuyên ngành --</option>
                        {majors.map(major => (
                          <option key={major.id} value={major.id}>{major.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className={styles.batchInfoText}>
                    <i className="fas fa-building"></i> Đang sửa thời gian cho nhóm lịch thi (không thay đổi khoa/chuyên ngành).
                  </div>
                )}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Ngày bắt đầu: *</label>
                    <input type="date" name="startDate" value={batchForm.startDate} onChange={handleBatchFormChange} required className={styles.formControl} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Giờ bắt đầu: *</label>
                    <input type="time" name="startTime" value={batchForm.startTime} onChange={handleBatchFormChange} required className={styles.formControl} />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Ngày kết thúc: *</label>
                    <input type="date" name="endDate" value={batchForm.endDate} onChange={handleBatchFormChange} required className={styles.formControl} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Giờ kết thúc: *</label>
                    <input type="time" name="endTime" value={batchForm.endTime} onChange={handleBatchFormChange} required className={styles.formControl} />
                  </div>
                </div>
                <div className={`${styles.formGroup} ${styles.notesGroup}`}>
                  <label className={styles.notesLabel}>Ghi chú:</label>
                  <textarea name="notes" value={batchForm.notes} onChange={handleBatchFormChange} className={`${styles.formControl} ${styles.notesTextarea}`} rows="5" placeholder="Thêm ghi chú về lịch thi (nếu cần)"></textarea>
                </div>
                <div className={styles.batchInfoText}>
                  <i className="fas fa-info-circle"></i>
                  {editContext?.mode === 'edit-group' ? 'Cập nhật thời gian và ghi chú cho toàn bộ chuyên đề trong nhóm.' : 'Lịch thi này sẽ áp dụng cho tất cả chuyên đề. Sinh viên thuộc khoa đã chọn sẽ có thể làm bài tất cả chuyên đề trong khoảng thời gian này.'}
                </div>
                <div className={styles.modalActions}>
                  <button type="submit" className={styles.saveBtn}><i className="fas fa-calendar-check"></i> {editContext?.mode === 'edit-group' ? 'Cập nhật' : 'Lên lịch'}</button>
                  <button type="button" onClick={closeBatchModal} className={styles.cancelBtn}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulesManagementPage;