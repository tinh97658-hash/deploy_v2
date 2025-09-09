import { API_CONFIG } from '../constants/appConfig';

export async function getMyProfile() {
	const res = await fetch(`${API_CONFIG.BASE_URL}/student/me`, { credentials: 'include' });
	const data = await res.json();
	if (!res.ok || !data.success) throw new Error(data.message || 'Không tải được hồ sơ');
	return data.data;
}

export async function changePassword(currentPassword, newPassword) {
	const res = await fetch(`${API_CONFIG.BASE_URL}/student/change-password`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ currentPassword, newPassword })
	});
	const data = await res.json();
	if (!res.ok || !data.success) throw new Error(data.message || 'Không đổi được mật khẩu');
	return true;
}
