import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './StudentMenu.css';

const StudentMenu = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const go = (path) => { setOpen(false); navigate(path); };

  return (
    <div className="student-menu" ref={ref}>
      <button className="menu-trigger" onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open}>
        <span className="avatar" aria-hidden>👤</span>
        <span className="name">{user?.fullName || user?.username || 'Sinh viên'}</span>
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="menu-dropdown" role="menu">
          <button className="menu-item" onClick={() => go('/student/subjects')}>
            <span className="icon">🏠</span> Dashboard
          </button>
          <button className="menu-item" onClick={() => go('/student/profile')}>
            <span className="icon">👤</span> Profile
          </button>
          <div className="menu-sep" />
          <button className="menu-item danger" onClick={async () => { await logout(); window.location.href = '/login'; }}>
            <span className="icon">🚪</span> Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentMenu;
