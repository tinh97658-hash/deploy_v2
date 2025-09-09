import React, { useState, useEffect } from 'react';

// Alert component
export const Alert = ({ 
  type = 'info', 
  message, 
  show = true, 
  dismissible = false, 
  onDismiss,
  autoHide = false,
  delay = 5000
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (autoHide && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, visible, delay, onDismiss]);

  if (!visible) return null;

  const alertClasses = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info'
  };

  const iconClasses = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className={`alert ${alertClasses[type]} ${dismissible ? 'alert-dismissible' : ''} d-flex align-items-center`}>
      <i className={`bi ${iconClasses[type]} me-2`}></i>
      <div className="flex-grow-1">
        {message}
      </div>
      {dismissible && (
        <button 
          type="button" 
          className="btn-close" 
          onClick={handleDismiss}
          aria-label="Close"
        ></button>
      )}
    </div>
  );
};

// Toast component
export const Toast = ({ 
  show = false, 
  onClose, 
  title, 
  message, 
  type = 'info',
  autoHide = true,
  delay = 3000,
  position = 'top-end'
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (autoHide && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, visible, delay, onClose]);

  if (!visible) return null;

  const bgClasses = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-info'
  };

  const iconClasses = {
    success: 'bi-check-circle-fill text-white',
    error: 'bi-exclamation-triangle-fill text-white',
    warning: 'bi-exclamation-triangle-fill text-dark',
    info: 'bi-info-circle-fill text-white'
  };

  const positionClasses = {
    'top-start': 'position-fixed top-0 start-0 m-3',
    'top-center': 'position-fixed top-0 start-50 translate-middle-x mt-3',
    'top-end': 'position-fixed top-0 end-0 m-3',
    'bottom-start': 'position-fixed bottom-0 start-0 m-3',
    'bottom-center': 'position-fixed bottom-0 start-50 translate-middle-x mb-3',
    'bottom-end': 'position-fixed bottom-0 end-0 m-3'
  };

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  return (
    <div className={`toast show ${positionClasses[position]}`} style={{ zIndex: 9999 }}>
      <div className={`toast-header ${bgClasses[type]} text-white`}>
        <i className={`bi ${iconClasses[type]} me-2`}></i>
        <strong className="me-auto">{title || 'Thông báo'}</strong>
        <button 
          type="button" 
          className="btn-close btn-close-white" 
          onClick={handleClose}
        ></button>
      </div>
      {message && (
        <div className="toast-body">
          {message}
        </div>
      )}
    </div>
  );
};

// Toast container để quản lý multiple toasts
export const ToastContainer = ({ toasts = [], onRemoveToast }) => {
  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          show={true}
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemoveToast && onRemoveToast(toast.id || index)}
          autoHide={toast.autoHide !== false}
          delay={toast.delay || 3000}
        />
      ))}
    </div>
  );
};

// Hook để sử dụng toast
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message, title = 'Thành công') => {
    addToast({ type: 'success', title, message });
  };

  const showError = (message, title = 'Lỗi') => {
    addToast({ type: 'error', title, message });
  };

  const showWarning = (message, title = 'Cảnh báo') => {
    addToast({ type: 'warning', title, message });
  };

  const showInfo = (message, title = 'Thông tin') => {
    addToast({ type: 'info', title, message });
  };

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default Alert;
