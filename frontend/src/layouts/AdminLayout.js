import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import vmuLogo from '../assets/vmu-logo.png';
import './AdminLayout.css';

const AdminLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-header">
          <h3>TRƯỜNG ĐẠI HỌC HÀNG HẢI VIỆT NAM</h3>
          <small>VIETNAM MARITIME UNIVERSITY</small>
        </div>
        
        <div className="sidebar-content">
          <Link 
            to="/admin" 
            className={`menu-item ${isActive('/admin') ? 'active' : ''}`}
          >
            <span className="menu-icon">♦</span>
            <span className="menu-text">Dashboard</span>
          </Link>

          <div className="menu-section">
            <div className="section-title">QUẢN LÝ TRẮC NGHIỆM</div>
            <Link 
              to="/admin/subjects" 
              className={`menu-item ${isActive('/admin/subjects') ? 'active' : ''}`}
            >
              <span className="menu-icon">🗓️</span>
              <span className="menu-text">Quản lý chuyên đề</span>
            </Link>
            <Link 
              to="/admin/schedules" 
              className={`menu-item ${isActive('/admin/schedules') ? 'active' : ''}`}
            >
              <span className="menu-icon">🗓️</span>
              <span className="menu-text">Quản lý lịch thi</span>
            </Link>
          </div>

          <div className="menu-section">
            <div className="section-title">QUẢN LÝ DANH MỤC</div>
            <Link 
              to="/admin/students" 
              className={`menu-item ${isActive('/admin/students') ? 'active' : ''}`}
            >
              <span className="menu-icon">👥</span>
              <span className="menu-text">Quản lý sinh viên</span>
            </Link>
            <Link 
              to="/admin/departments" 
              className={`menu-item ${isActive('/admin/departments') ? 'active' : ''}`}
            >
              <span className="menu-icon">🏢</span>
              <span className="menu-text">Quản lý khoa</span>
            </Link>
            <Link 
              to="/admin/majors" 
              className={`menu-item ${isActive('/admin/majors') ? 'active' : ''}`}
            >
              <span className="menu-icon">🎓</span>
              <span className="menu-text">Quản lý ngành</span>
            </Link>
            <Link 
              to="/admin/classes" 
              className={`menu-item ${isActive('/admin/classes') ? 'active' : ''}`}
            >
              <span className="menu-icon">🎓</span>
              <span className="menu-text">Quản lý lớp</span>
            </Link>
          </div>

          <div className="menu-section">
            <div className="section-title">BÁO CÁO</div>
            <Link 
              to="/admin/advanced-reports" 
              className={`menu-item ${isActive('/admin/advanced-reports') ? 'active' : ''}`}
            >
              <span className="menu-icon">📊</span>
              <span className="menu-text">Báo cáo thống kê</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}

      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-left">
            {/* Mobile menu button */}
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Mở menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              ☰
            </button>
            <div className="university-logo">
              <img src={vmuLogo} alt="VMU Logo" className="logo-image" />
              <div className="university-info">
                <h1>Dashboard</h1>
                <p>Hệ thống Quản lý Trắc nghiệm Sinh hoạt Công dân</p>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.full_name || user?.username}</span>
              <span className="user-id">Quản trị viên</span>
              <button onClick={handleLogout} className="logout-btn">
                Đăng xuất
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
