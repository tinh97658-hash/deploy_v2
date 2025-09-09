import LocalStorageService from './localStorageService';

/**
 * Enhanced LocalStorageService với các method chuyên cho exam system
 * Mở rộng từ LocalStorageService cơ bản
 */
class ExamLocalStorageService extends LocalStorageService {
  
  /**
   * Lưu toàn bộ tiến trình exam (answers + metadata)
   * @param {string} examId - ID của exam
   * @param {Object} data - Dữ liệu tiến trình
   */
  static saveExamProgress(examId, data) {
    const key = `exam_progress_${examId}`;
    const progressData = {
      examId,
      answers: data.answers || {},
      timeSpent: data.timeSpent || 0,
      currentQuestion: data.currentQuestion || 0,
      currentPage: data.currentPage || 0,
      startTime: data.startTime || new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      completedQuestions: Object.keys(data.answers || {}).length,
      totalQuestions: data.totalQuestions || 0,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      timeLimit: data.timeLimit,
      ...data
    };
    return this.saveData(key, progressData);
  }
  
  /**
   * Load tiến trình exam
   * @param {string} examId - ID của exam
   */
  static getExamProgress(examId) {
    const key = `exam_progress_${examId}`;
    return this.getData(key);
  }
  
  /**
   * Xóa tiến trình exam khi hoàn thành
   * @param {string} examId - ID của exam
   */
  static clearExamProgress(examId) {
    const key = `exam_progress_${examId}`;
    const oldAnswersKey = `exam_${examId}_answers`; // Clear old format too
    
    this.removeData(key);
    this.removeData(oldAnswersKey);
    
    return { success: true };
  }
  
  /**
   * Lưu trạng thái tạm thời (offline mode)
   * @param {string} examId - ID của exam
   * @param {Object} state - Trạng thái exam
   */
  static saveOfflineExamState(examId, state) {
    const key = `offline_exam_${examId}`;
    return this.saveData(key, {
      ...state,
      isOffline: true,
      lastSync: new Date().toISOString(),
      offlineStartTime: new Date().toISOString()
    });
  }
  
  /**
   * Lấy trạng thái offline
   * @param {string} examId - ID của exam
   */
  static getOfflineExamState(examId) {
    const key = `offline_exam_${examId}`;
    return this.getData(key);
  }
  
  /**
   * Xóa trạng thái offline
   * @param {string} examId - ID của exam
   */
  static clearOfflineExamState(examId) {
    const key = `offline_exam_${examId}`;
    return this.removeData(key);
  }
  
  /**
   * Lấy danh sách các exam chưa hoàn thành
   */
  static getUnfinishedExams() {
    try {
      const allKeys = Object.keys(localStorage);
      const examKeys = allKeys.filter(key => key.startsWith('exam_progress_'));
      
      return examKeys.map(key => {
        const examId = key.replace('exam_progress_', '');
        const data = this.getData(key);
        
        if (!data) return null;
        
        return {
          examId: data.examId || examId,
          subjectId: data.subjectId,
          subjectName: data.subjectName || 'Unknown Subject',
          lastActivity: data.lastActivity,
          timeSpent: data.timeSpent || 0,
          completedQuestions: Object.keys(data.answers || {}).length,
          totalQuestions: data.totalQuestions || 0,
          startTime: data.startTime,
          currentQuestion: data.currentQuestion || 0,
          currentPage: data.currentPage || 0,
          progress: data.totalQuestions > 0 
            ? Math.round((Object.keys(data.answers || {}).length / data.totalQuestions) * 100)
            : 0
        };
      }).filter(Boolean);
    } catch (error) {
      console.error('Error getting unfinished exams:', error);
      return [];
    }
  }
  
  /**
   * Lưu exam settings (cấu hình làm bài)
   * @param {string} examId - ID của exam
   * @param {Object} settings - Cấu hình
   */
  static saveExamSettings(examId, settings) {
    const key = `exam_settings_${examId}`;
    return this.saveData(key, {
      ...settings,
      savedAt: new Date().toISOString()
    });
  }
  
  /**
   * Lấy exam settings
   * @param {string} examId - ID của exam
   */
  static getExamSettings(examId) {
    const key = `exam_settings_${examId}`;
    return this.getData(key);
  }
  
  /**
   * Lưu thống kê user (để analytics offline)
   * @param {Object} stats - Thống kê
   */
  static saveUserStats(stats) {
    const currentStats = this.getData('user_exam_stats') || {
      totalExams: 0,
      totalTimeSpent: 0,
      averageScore: 0,
      lastExamDate: null,
      examHistory: []
    };
    
    const updatedStats = {
      ...currentStats,
      ...stats,
      lastUpdated: new Date().toISOString()
    };
    
    return this.saveData('user_exam_stats', updatedStats);
  }
  
  /**
   * Lấy thống kê user
   */
  static getUserStats() {
    return this.getData('user_exam_stats');
  }
  
  /**
   * Cleanup old exam data (chạy định kỳ)
   * Xóa data cũ hơn 30 ngày
   */
  static cleanupOldExamData() {
    try {
      const allKeys = Object.keys(localStorage);
      const examKeys = allKeys.filter(key => 
        key.startsWith('exam_progress_') || 
        key.startsWith('offline_exam_') ||
        key.startsWith('exam_settings_')
      );
      
      let cleanedCount = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      examKeys.forEach(key => {
        const data = this.getData(key);
        if (data && data.lastActivity) {
          const lastActivity = new Date(data.lastActivity);
          if (lastActivity < thirtyDaysAgo) {
            this.removeData(key);
            cleanedCount++;
          }
        }
      });
      
      console.log(`Cleaned up ${cleanedCount} old exam data entries`);
      return { success: true, cleanedCount };
    } catch (error) {
      console.error('Error cleaning up exam data:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Export toàn bộ exam data (để backup)
   */
  static exportExamData() {
    try {
      const allKeys = Object.keys(localStorage);
      const examKeys = allKeys.filter(key => 
        key.startsWith('exam_') || 
        key.startsWith('offline_exam_') ||
        key.includes('exam')
      );
      
      const exportData = {};
      examKeys.forEach(key => {
        exportData[key] = this.getData(key);
      });
      
      return {
        success: true,
        data: exportData,
        exportedAt: new Date().toISOString(),
        keysCount: examKeys.length
      };
    } catch (error) {
      console.error('Error exporting exam data:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Import exam data (để restore)
   * @param {Object} data - Data để import
   */
  static importExamData(data) {
    try {
      let importedCount = 0;
      
      Object.keys(data).forEach(key => {
        if (key.includes('exam')) {
          this.saveData(key, data[key]);
          importedCount++;
        }
      });
      
      return { success: true, importedCount };
    } catch (error) {
      console.error('Error importing exam data:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ExamLocalStorageService;
