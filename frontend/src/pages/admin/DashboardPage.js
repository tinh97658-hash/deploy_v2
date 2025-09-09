import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../services/apiService';
import './DashboardPage.css';

const AdminDashBoard = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      setError(null);
      try {
  const data = await getDashboardData();
  const list = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
  setActivities(list.slice(0, 5));
      } catch (err) {
        setError('Không thể tải thông báo hoạt động');
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, []);

  const getIconByType = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Trang quản trị</h1>
      </div>

      {/* Hàng nút tác vụ chính */}
      <div className="action-row">
        <Link to="/admin/subjects" className="action-btn">
          <span className="action-icon" aria-hidden>📚</span>
          <span className="action-text">Quản lý chuyên đề</span>
        </Link>
        <Link to="/admin/schedules" className="action-btn">
          <span className="action-icon" aria-hidden>🗓️</span>
          <span className="action-text">Quản lý lịch thi</span>
        </Link>
        <Link to="/admin/advanced-reports" className="action-btn">
          <span className="action-icon" aria-hidden>📊</span>
          <span className="action-text">Báo cáo thống kê</span>
        </Link>
      </div>

      {/* Thông báo hoạt động */}
      <div className="activity-section">
        <h2 className="section-title">Thông báo hoạt động</h2>
        {loading && (
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">⏳</div>
              <div className="activity-content">
                <div className="activity-title">Đang tải dữ liệu...</div>
                <div className="activity-time">Vui lòng đợi</div>
              </div>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">❌</div>
              <div className="activity-content">
                <div className="activity-title">{error}</div>
                <div className="activity-time">—</div>
              </div>
            </div>
          </div>
        )}
        {!loading && !error && (
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="activity-item">
                <div className="activity-icon">�</div>
                <div className="activity-content">
                  <div className="activity-title">Chưa có hoạt động nào được ghi nhận</div>
                  <div className="activity-time">—</div>
                </div>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className={`activity-item`}>
                  <div className="activity-icon">{getIconByType(act.type)}</div>
                  <div className="activity-content">
                    <div className="activity-title">{act.student}: {act.action}</div>
                    <div className="activity-time">{act.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashBoard;