import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AuthenticationPage.module.css';
import { useAuth } from '../hooks/useAuth';
import { requestPasswordReset, verifyResetAndSetPassword, verifyResetOtpOnly } from '../services/apiService';
// NOTE: Đặt file logo VMU vào đường dẫn: src/assets/vmu-logo.png
// Bạn có thể đổi tên file nhưng nhớ cập nhật đường dẫn import bên dưới.
import vmuLogo from '../assets/vmu-logo.png';

const AuthenticationPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });
    const currentYear = new Date().getFullYear();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // Forgot password UI state
    const [showForgot, setShowForgot] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [resetStep, setResetStep] = useState(1);
    
    const navigate = useNavigate();
    const { login } = useAuth();

    // Check if user is already logged in
    const { user, isAuthenticated } = useAuth();
    
    React.useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'ADMIN' || user.type === 'admin') {
                navigate('/admin');
            } else if (user.role === 'STUDENT' || user.type === 'student') {
                navigate('/student/subjects');
            }
        }
    }, [isAuthenticated, user, navigate]);


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear messages when user types
        setError('');
        setSuccess('');
    };

    // Đã loại bỏ tài khoản demo

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            setError('Vui lòng nhập đầy đủ thông tin!');
            return;
        }
        
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const data = await login(formData.username, formData.password);
            
            if (formData.rememberMe) {
                localStorage.setItem('rememberLogin', 'true');
            }
            
            setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
            
            // Navigate based on user role
            setTimeout(() => {
                if (data.user.role === 'ADMIN' || data.user.type === 'admin') {
                    navigate('/admin');
                } else if (data.user.role === 'STUDENT' || data.user.type === 'student') {
                    navigate('/student/subjects');
                } else {
                    navigate('/');
                }
            }, 1000);
            
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Tài khoản hoặc mật khẩu không đúng!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.background}>
                <div className={styles.wave}></div>
                <div className={styles.wave}></div>
            </div>
            
            <div className={styles.loginContainer}>
                <div className={styles.header}>
                    <div className={styles.logoContainer}>
                        <img src={vmuLogo} alt="VMU Logo" className={styles.logoImage} />
                    </div>
                    <h1 className={styles.title}>Hệ thống Trắc nghiệm</h1>
                    <p className={styles.subtitle}>Tuần Sinh hoạt Công dân - Sinh viên Hàng Hải</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className={styles.successMessage}>
                            <i className="fas fa-check-circle"></i>
                            <span>{success}</span>
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="username">Mã sinh viên / Tài khoản</label>
                        <div className={styles.inputWrapper}>
                            <i className="fas fa-user"></i>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder="Nhập mã sinh viên hoặc tài khoản"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Mật khẩu</label>
                        <div className={styles.inputWrapper}>
                            <i className="fas fa-lock"></i>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Nhập mật khẩu"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.options}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleInputChange}
                            />
                            <span className={styles.checkmark}></span>
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <button 
                            type="button"
                            className={styles.forgotPassword}
                            onClick={() => { setShowForgot(true); setResetStep(1); setError(''); setSuccess(''); }}
                        >
                            Quên mật khẩu?
                        </button>
                    </div>

                    <button type="submit" className={styles.loginButton} disabled={loading}>
                        {loading ? (
                            <>
                                <div className={styles.spinner}></div>
                                Đang đăng nhập...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt"></i>
                                Đăng nhập
                            </>
                        )}
                    </button>
                </form>

                {/* Đã xóa khu vực tài khoản demo */}

                <div className={styles.footer}>
                    <p>© {currentYear} Trường Đại học Hàng hải Việt Nam</p>
                </div>

                {showForgot && (
                    <div className={styles.modalBackdrop}>
                        <div className={styles.modalCard}>
                            <button className={styles.modalClose} aria-label="Đóng" onClick={() => setShowForgot(false)}>×</button>
                            <h3>Quên mật khẩu</h3>
                            {resetStep === 1 && (
                                <div className={styles.modalBody}>
                                    <label>Tài khoản (Mã sinh viên)</label>
                                    <input
                                        type="text"
                                        value={resetUsername}
                                        onChange={(e) => setResetUsername(e.target.value)}
                                        placeholder="VD: SV123456"
                                    />
                                    <label style={{ marginTop: 8 }}>Email sinh viên</label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="student@vmu.edu.vn"
                                    />
                                    <div className={styles.modalActions}>
                                        <button className={styles.primary} onClick={async () => {
                                            try {
                                                if (!resetUsername || !resetEmail) { alert('Vui lòng nhập tài khoản và email'); return; }
                                                const resp = await requestPasswordReset(resetUsername, resetEmail);
                                                alert(resp?.message || 'Đã gửi mã xác minh đến email');
                                                setResetStep(2);
                                            } catch (e) {
                                                alert(e.message || 'Không thể gửi mã xác minh');
                                            }
                                        }}>Gửi mã xác minh</button>
                                        <button className={styles.secondary} onClick={() => setShowForgot(false)}>Đóng</button>
                                    </div>
                                </div>
                            )}
                            {resetStep === 2 && (
                                <div className={styles.modalBody}>
                                    <label>Nhập mã xác minh (OTP)</label>
                                    <input
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="6 chữ số"
                                    />
                                    <small>
                                        Vui lòng nhập đúng mã gồm 6 chữ số đã gửi tới email của bạn.
                                    </small>
                                    <div className={styles.modalActions}>
                                        <button className={styles.primary}
                                            disabled={!/^\d{6}$/.test(otp)}
                                            onClick={async () => {
                                                try {
                                                    await verifyResetOtpOnly({ username: resetUsername, email: resetEmail, otp });
                                                    setResetStep(3);
                                                } catch (e) {
                                                    alert(e.message || 'Mã xác minh không hợp lệ hoặc đã hết hạn.');
                                                }
                                            }}
                                        >OK</button>
                                        <button className={styles.secondary} onClick={() => setShowForgot(false)}>Đóng</button>
                                    </div>
                                </div>
                            )}
                            {resetStep === 3 && (
                                <div className={styles.modalBody}>
                                    <label>Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={newPwd}
                                        onChange={(e) => setNewPwd(e.target.value)}
                                    />
                                    <label>Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={confirmPwd}
                                        onChange={(e) => setConfirmPwd(e.target.value)}
                                    />
                                    <div className={styles.modalActions}>
                                        <button className={styles.primary} onClick={async () => {
                                            try {
                                                if (!newPwd || !confirmPwd) { alert('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận.'); return; }
                                                if (newPwd !== confirmPwd) { alert('Mật khẩu xác nhận không khớp'); return; }
                                                await verifyResetAndSetPassword({ username: resetUsername, email: resetEmail, otp, mode: 'new', newPassword: newPwd, confirmNewPassword: confirmPwd });
                                                alert('Đặt lại mật khẩu thành công');
                                                setShowForgot(false);
                                            } catch (e) {
                                                alert(e.message || 'Không thể đặt lại mật khẩu');
                                            }
                                        }}>Xác nhận</button>
                                        <button className={styles.secondary} onClick={() => setShowForgot(false)}>Đóng</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthenticationPage;