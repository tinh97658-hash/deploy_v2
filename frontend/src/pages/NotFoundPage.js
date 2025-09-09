import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();
  
  const handleGoHome = () => {
    // Kiểm tra authentication status thực tế từ localStorage
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        if (user.type === 'admin') {
          navigate('/admin');
        } else {
          navigate('/student/subjects');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="text-center">
        <div className="mb-4">
          <h1 className="display-1 fw-bold text-primary">404</h1>
          <h2 className="h3 text-secondary mb-3">Trang không tồn tại</h2>
          <p className="text-muted mb-4">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
          </p>
        </div>
        
        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
          <button 
            onClick={handleGoHome}
            className="btn btn-primary btn-lg px-4"
          >
            <i className="bi bi-house-door me-2"></i>
            Về trang chủ
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary btn-lg px-4"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Quay lại
          </button>
        </div>
        
        <div className="mt-5">
          <p className="text-muted small">
            Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ với quản trị viên.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;