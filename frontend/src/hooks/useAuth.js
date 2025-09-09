import { useState, useEffect, createContext, useContext } from 'react';
import AuthService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Luôn gọi verify để dựa vào cookie httpOnly (nếu còn hợp lệ)
        const userData = await AuthService.verifyToken();
        if (userData) {
          setUser(userData);
        } else {
          // Hết hạn hoặc không có cookie
          await AuthService.logout();
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        await AuthService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const result = await AuthService.login(username, password);
      
      if (result.success) {
        setUser(result.data.user);
        return result.data;
      }
      
      throw new Error(result.message || 'Đăng nhập thất bại');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
