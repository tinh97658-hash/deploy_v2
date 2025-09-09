import React from 'react';
import './MainLayout.css';

const MainLayout = ({ children, title, showNavigation = true }) => {
  return (
    <div className="main-layout">
      {showNavigation && (
        <header className="main-header">
          <div className="container">
            <h1 className="app-title">
              {title || 'VMU Quiz - Hệ thống thi trắc nghiệm'}
            </h1>
          </div>
        </header>
      )}
      
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
      
      <footer className="main-footer">
        <div className="container">
          <p>&copy; 2025 VMU Quiz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
