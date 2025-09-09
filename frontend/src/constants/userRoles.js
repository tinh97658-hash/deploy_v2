// User Roles and Permissions
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT'
};

export const PERMISSIONS = {
  // Admin permissions
  MANAGE_TOPICS: 'manage_topics',
  MANAGE_QUESTIONS: 'manage_questions',
  MANAGE_STUDENTS: 'manage_students',
  VIEW_REPORTS: 'view_reports',
  MANAGE_EXAMS: 'manage_exams',
  MANAGE_SYSTEM: 'manage_system',
  
  // Student permissions
  TAKE_EXAM: 'take_exam',
  VIEW_RESULTS: 'view_results',
  VIEW_HISTORY: 'view_history',
  UPDATE_PROFILE: 'update_profile'
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_TOPICS,
    PERMISSIONS.MANAGE_QUESTIONS,
    PERMISSIONS.MANAGE_STUDENTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_EXAMS,
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.VIEW_RESULTS,
    PERMISSIONS.VIEW_HISTORY
  ],
  [USER_ROLES.STUDENT]: [
    PERMISSIONS.TAKE_EXAM,
    PERMISSIONS.VIEW_RESULTS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.UPDATE_PROFILE
  ]
};

// Helper function to check permissions
export const hasPermission = (userRole, permission) => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};
