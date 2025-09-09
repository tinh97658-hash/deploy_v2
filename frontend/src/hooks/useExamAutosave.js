import { useState, useEffect, useCallback, useRef } from 'react';
import ExamLocalStorageService from '../services/examLocalStorageService';

/**
 * Clean Hook quản lý autosave cho bài thi - LocalStorage only
 */
export const useExamAutosave = (examId, initialAnswers = {}, examMetadata = {}) => {
  const [answers, setAnswers] = useState(initialAnswers);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Enhanced state
  const [timeSpent, setTimeSpent] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [startTime] = useState(new Date());
  
  // Refs để tránh infinite loops
  const saveTimeoutRef = useRef(null);
  const lastSavedAnswersRef = useRef(initialAnswers);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  // Flag to fully disable autosave/timers after submit/clear
  const disabledRef = useRef(false);
  
  // Storage key
  const storageKey = examId ? `exam_progress_${examId}` : null;
  
  // Timer để track thời gian làm bài  
  useEffect(() => {
    if (!examId || disabledRef.current) return;
    
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examId]);
  
  // Load từ localStorage một lần khi mount
  useEffect(() => {
    if (!examId || !storageKey || disabledRef.current) return;
    
    const loadSavedProgress = async () => {
      try {
        // Try enhanced progress first
        const savedProgress = ExamLocalStorageService.getExamProgress(examId);
        
        if (savedProgress && savedProgress.answers && Object.keys(savedProgress.answers).length > 0) {
          console.log('Loaded enhanced progress from localStorage');
          setAnswers(savedProgress.answers);
          setTimeSpent(savedProgress.timeSpent || 0);
          setCurrentQuestion(savedProgress.currentQuestion || 0);
          setCurrentPage(savedProgress.currentPage || 0);
          lastSavedAnswersRef.current = savedProgress.answers;
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    };
    
    loadSavedProgress();
  }, [examId, storageKey]); // Include storageKey dependency
  
  // Removed server sync - using localStorage only
  const syncToServer = useCallback(async (answersToSave) => {
    if (!examId || !isMountedRef.current || disabledRef.current) return;
    
    // Simply mark as saved since we're using localStorage
    try {
      setIsSaving(true);
      
      // Simulate quick local save
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (isMountedRef.current) {
        lastSavedAnswersRef.current = { ...answersToSave };
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log('LocalStorage save completed');
      }
    } catch (error) {
      console.error('LocalStorage save error:', error);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [examId]);
  
  // Offline/Online detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Lưu localStorage mỗi khi answers thay đổi - SIMPLIFIED
  useEffect(() => {
    if (!examId || !storageKey || disabledRef.current) return;
    
    // Chỉ lưu localStorage, không trigger re-render
    try {
      ExamLocalStorageService.saveExamProgress(examId, {
        answers,
        timeSpent,
        currentQuestion,
        currentPage,
        startTime: startTime.toISOString(),
        ...examMetadata
      });
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Check unsaved changes
    const hasChanges = JSON.stringify(answers) !== JSON.stringify(lastSavedAnswersRef.current);
    setHasUnsavedChanges(hasChanges);
    
  }, [answers, examId, storageKey, timeSpent, currentQuestion, currentPage, startTime, examMetadata]); // Include all dependencies
  
  // Debounced autosave - chỉ khi có thay đổi
  useEffect(() => {
    if (!examId || !hasUnsavedChanges || disabledRef.current) return;
    
    // Clear timeout cũ
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set timeout mới
    saveTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        syncToServer(answers);
      }
    }, 5000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, examId, answers, syncToServer]); // Include all dependencies
  
  // Update answers function
  const updateAnswer = useCallback((questionId, selectedOptions) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: selectedOptions };
      return newAnswers;
    });
  }, []);
  
  // Force save
  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return syncToServer(answers);
  }, [answers, syncToServer]);
  
  // Clear saved data
  const clearSavedData = useCallback(() => {
    if (examId) {
      // Remove local data
      ExamLocalStorageService.clearExamProgress(examId);
      ExamLocalStorageService.clearOfflineExamState(examId);
    }
    // Hard-disable any further autosave or timer activity
    disabledRef.current = true;
    // Stop pending timers/timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Reset transient flags
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  }, [examId]);
  
  // Navigation helpers
  const updateNavigation = useCallback((questionIndex, pageIndex) => {
    setCurrentQuestion(questionIndex);
    if (pageIndex !== undefined) setCurrentPage(pageIndex);
  }, []);
  
  // Recovery helpers
  const getRecoveryData = useCallback(() => {
    if (!examId) return null;
    return ExamLocalStorageService.getExamProgress(examId);
  }, [examId]);
  
  const restoreFromSaved = useCallback((savedData) => {
    if (!savedData) return;
    
    setAnswers(savedData.answers || {});
    setTimeSpent(savedData.timeSpent || 0);
    setCurrentQuestion(savedData.currentQuestion || 0);
    setCurrentPage(savedData.currentPage || 0);
    lastSavedAnswersRef.current = savedData.answers || {};
  }, []);
  
  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  return {
    // Original returns
    answers,
    updateAnswer,
    forceSave,
    clearSavedData,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    
    // Enhanced returns
    timeSpent,
    setTimeSpent,
    currentQuestion,
    setCurrentQuestion,
    currentPage,
    setCurrentPage,
    isOffline,
    updateNavigation,
    getRecoveryData,
    restoreFromSaved
  };
};
