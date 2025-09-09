import { API_CONFIG, STORAGE_KEYS } from '../constants/appConfig';

class AuthService {
  /**
   * Đăng nhập người dùng
   */
  static async login(username, password) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      if (data.success && data.data) {
        // Chỉ lưu user profile (token ở httpOnly cookie)
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.data.user));
        return { success: true, data: data.data, message: data.message };
      }

      throw new Error(data.message || 'Đăng nhập thất bại');
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Không thể kết nối đến server');
    }
  }

  /**
   * Đăng xuất người dùng
   */
  static async logout() {
    try {
      // Gọi API logout (cookie sẽ bị xóa server-side)
      await fetch(`${API_CONFIG.BASE_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout API error:', error);
      // Không throw error để đảm bảo logout local luôn thành công
    } finally {
      // Xóa thông tin local
      localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }

  /**
   * Lấy thông tin user hiện tại
   */
  static getCurrentUser() {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Kiểm tra trạng thái đăng nhập
   */
  static isAuthenticated() {
  const user = this.getCurrentUser();
  // Không thể kiểm tra cookie httpOnly trực tiếp; tạm coi có user là đã đăng nhập
  return !!user;
  }

  /**
   * Lấy token
   */
  static getToken() {
  // Không còn dùng trực tiếp trên frontend
  return null;
  }

  /**
   * Refresh token
   */
  static async refreshToken() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Refresh token thất bại');
      }

      if (data.success && data.data) {
        return data.data.token; // token cũng đã set lại cookie
      }

      throw new Error(data.message || 'Refresh token thất bại');
    } catch (error) {
      console.error('Refresh token error:', error);
      // Nếu refresh thất bại, logout user
      this.logout();
      throw error;
    }
  }

  /**
   * Verify token
   */
  static async verifyToken() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/verify-token`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.data?.user) {
        // Cập nhật lại user lưu local để đồng bộ (token vẫn ở cookie)
        try {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.data.user));
        } catch (e) {
          console.warn('Cannot persist user to localStorage:', e);
        }
        return data.data.user;
      }
      return null;
    } catch (error) {
      console.error('Verify token error:', error);
      return null;
    }
  }
}

export default AuthService;
