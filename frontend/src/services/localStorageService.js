// Service để lưu dữ liệu local (thay thế cho Next.js API route)
class LocalStorageService {
  /**
   * Lưu dữ liệu vào localStorage
   */
  static saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true, message: 'Data saved successfully' };
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Lấy dữ liệu từ localStorage
   */
  static getData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting data from localStorage:', error);
      return null;
    }
  }

  /**
   * Xóa dữ liệu từ localStorage
   */
  static removeData(key) {
    try {
      localStorage.removeItem(key);
      return { success: true, message: 'Data removed successfully' };
    } catch (error) {
      console.error('Error removing data from localStorage:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Lưu database mock vào localStorage (thay thế cho db.json)
   */
  static saveDatabase(data) {
    return this.saveData('mockDatabase', data);
  }

  /**
   * Lấy database mock từ localStorage
   */
  static getDatabase() {
    return this.getData('mockDatabase');
  }
}

export default LocalStorageService;
