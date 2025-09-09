import React from 'react';

const Loading = ({ message = "Đang tải...", size = "medium", fullScreen = false }) => {
  const sizeClasses = {
    small: "spinner-border-sm",
    medium: "",
    large: "spinner-border-lg"
  };

  const containerClasses = fullScreen 
    ? "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light bg-opacity-75"
    : "d-flex flex-column align-items-center justify-content-center p-4";

  return (
    <div className={containerClasses} style={{ zIndex: fullScreen ? 9999 : 'auto' }}>
      <div className={`spinner-border text-primary ${sizeClasses[size]}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && (
        <p className="mt-3 text-muted mb-0">{message}</p>
      )}
    </div>
  );
};

// Spinner chỉ hiển thị icon
export const Spinner = ({ size = "medium", color = "primary" }) => {
  const sizeClasses = {
    small: "spinner-border-sm",
    medium: "",
    large: "spinner-border-lg"
  };

  return (
    <div className={`spinner-border text-${color} ${sizeClasses[size]}`} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

// Loading overlay
export const LoadingOverlay = ({ show, message = "Đang xử lý..." }) => {
  if (!show) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        zIndex: 9999 
      }}
    >
      <div className="bg-white rounded-3 p-4 text-center shadow">
        <Spinner size="large" />
        <p className="mt-3 mb-0 text-muted">{message}</p>
      </div>
    </div>
  );
};

// Button with loading state
export const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  onClick,
  className = "btn btn-primary",
  loadingText = "Đang xử lý...",
  ...props 
}) => {
  return (
    <button
      className={className}
      disabled={loading || disabled}
      onClick={onClick}
      {...props}
    >
      {loading && <Spinner size="small" color="light" />}
      <span className={loading ? "ms-2" : ""}>
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

export default Loading;
