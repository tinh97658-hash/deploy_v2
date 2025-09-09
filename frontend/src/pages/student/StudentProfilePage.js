import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile, changePassword } from '../../services/userService';
import './StudentProfilePage.module.css';

const StudentProfilePage = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
	const [msg, setMsg] = useState(null);

	useEffect(() => {
		const load = async () => {
			try {
				const data = await getMyProfile();
				setProfile(data);
			} catch (e) {
				setMsg(e.message || 'Không tải được hồ sơ');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const submitChange = async (e) => {
		e.preventDefault();
		setMsg(null);
		if (!pw.next || pw.next.length < 6) return setMsg('Mật khẩu mới tối thiểu 6 ký tự');
		if (pw.next !== pw.confirm) return setMsg('Xác nhận mật khẩu không khớp');
		try {
			await changePassword(pw.current, pw.next);
			setMsg('Đổi mật khẩu thành công');
			setPw({ current: '', next: '', confirm: '' });
		} catch (err) {
			setMsg(err.message || 'Đổi mật khẩu thất bại');
		}
	};

	return (
		<MainLayout title="Thông tin sinh viên">
			{loading ? (
				<div>Đang tải...</div>
			) : (
				<div className="student-profile">
					<div className="profile-actions" style={{display:'flex',justifyContent:'flex-start',marginBottom:'1rem'}}>
						<button type="button" className="btn back-btn" onClick={() => navigate('/student/subjects')}>
							<span aria-hidden>←</span> Quay lại Dashboard
						</button>
					</div>
					<div className="profile-grid">
						<section className="profile-card">
						<h2 style={{marginTop:0}}>Hồ sơ</h2>
							<dl className="profile-dl">
							<dt>Họ tên</dt><dd>{profile?.full_name || user?.fullName}</dd>
							<dt>Tài khoản</dt><dd>{profile?.username}</dd>
							<dt>Email</dt><dd>{profile?.email}</dd>
							<dt>Mã SV</dt><dd>{profile?.student_code || '-'}</dd>
							<dt>Khoa</dt><dd>{profile?.department_name || '-'}</dd>
							<dt>Ngành</dt><dd>{profile?.major_name || '-'}</dd>
							<dt>Lớp</dt><dd>{profile?.class_name || '-'}</dd>
						</dl>
					</section>

						<section className="profile-card">
						<h2 style={{marginTop:0}}>Đổi mật khẩu</h2>
						<form onSubmit={submitChange}>
								<div className="form-grid">
								<label>
									Mật khẩu hiện tại
									<input type="password" value={pw.current} onChange={e=>setPw({...pw,current:e.target.value})} required className="form-control" />
								</label>
								<label>
									Mật khẩu mới
									<input type="password" value={pw.next} onChange={e=>setPw({...pw,next:e.target.value})} required className="form-control" />
								</label>
								<label>
									Xác nhận mật khẩu
									<input type="password" value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} required className="form-control" />
								</label>
									<button type="submit" className="btn btn-primary update-btn">Cập nhật</button>
							</div>
						</form>
						{msg && <p style={{marginTop:10,color: msg.includes('thành công')? 'green':'#b00020'}}>{msg}</p>}
					</section>
					</div>
				</div>
			)}
		</MainLayout>
	);
};

export default StudentProfilePage;
