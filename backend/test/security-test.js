/**
 * Security Test Examples - SQL Injection & XSS Protection
 * 
 * Các ví dụ test bảo mật cho hệ thống VMU Quiz System
 * Bao gồm: SQL Injection, XSS, Input Validation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8081/api';

// Test cases for SQL Injection attempts
const sqlInjectionTests = [
  {
    name: 'SQL Injection in Student Name',
    data: {
      studentId: '2024001',
      fullName: "'; DROP TABLE students; --",
      email: 'test@example.com',
      password: 'password123',
      departmentId: 1,
      majorId: 1,
      classId: 1
    }
  },
  {
    name: 'SQL Injection in Email',
    data: {
      studentId: '2024002',
      fullName: 'Test Student',
      email: "admin@example.com' OR '1'='1",
      password: 'password123',
      departmentId: 1,
      majorId: 1,
      classId: 1
    }
  },
  {
    name: 'UNION SQL Injection',
    data: {
      studentId: '2024003',
      fullName: "Test' UNION SELECT * FROM users --",
      email: 'test3@example.com',
      password: 'password123',
      departmentId: 1,
      majorId: 1,
      classId: 1
    }
  }
];

// Test cases for XSS attempts
const xssTests = [
  {
    name: 'XSS Script Tag',
    data: {
      name: '<script>alert("XSS")</script>',
      description: 'Normal description',
      departmentId: 1
    }
  },
  {
    name: 'XSS with Event Handler',
    data: {
      name: '<img src="x" onerror="alert(\'XSS\')">',
      description: 'Test description',
      departmentId: 1
    }
  },
  {
    name: 'XSS with JavaScript',
    data: {
      name: 'javascript:alert("XSS")',
      description: 'Test description',
      departmentId: 1
    }
  }
];

// Test cases for Dangerous Characters
const dangerousCharacterTests = [
  {
    name: 'SQL Comments',
    data: {
      studentId: '2024004',
      fullName: 'Test Student -- comment',
      email: 'test4@example.com',
      password: 'password123',
      departmentId: 1,
      majorId: 1,
      classId: 1
    }
  },
  {
    name: 'Multiple SQL Keywords',
    data: {
      studentId: '2024005',
      fullName: 'SELECT * FROM users WHERE admin = 1',
      email: 'test5@example.com',
      password: 'password123',
      departmentId: 1,
      majorId: 1,
      classId: 1
    }
  }
];

// Function to test student creation with malicious data
async function testStudentSecurity() {
  console.log('\n=== TESTING STUDENT SECURITY ===\n');
  
  for (const test of sqlInjectionTests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/admin/students`, test.data, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with valid token
          'Content-Type': 'application/json'
        }
      });
      console.log(`❌ FAILED: ${test.name} - Request should have been blocked`);
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ PASSED: ${test.name} - Malicious input blocked`);
        console.log('Error:', error.response.data.message);
      } else {
        console.log(`⚠️  UNKNOWN: ${test.name} - ${error.message}`);
      }
    }
    console.log('---');
  }
}

// Function to test topic/department security
async function testTopicSecurity() {
  console.log('\n=== TESTING TOPIC/DEPARTMENT SECURITY ===\n');
  
  for (const test of xssTests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/topics`, test.data, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with valid token
          'Content-Type': 'application/json'
        }
      });
      console.log(`❌ FAILED: ${test.name} - Request should have been blocked`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ PASSED: ${test.name} - XSS attempt blocked`);
        console.log('Error:', error.response.data.message);
      } else {
        console.log(`⚠️  UNKNOWN: ${test.name} - ${error.message}`);
      }
    }
    console.log('---');
  }
}

// Function to test authentication security
async function testAuthSecurity() {
  console.log('\n=== TESTING AUTH SECURITY ===\n');
  
  const authTests = [
    {
      name: 'SQL Injection in Login',
      data: {
        username: "admin' OR '1'='1' --",
        password: 'password'
      }
    },
    {
      name: 'XSS in Username',
      data: {
        username: '<script>alert("XSS")</script>',
        password: 'password'
      }
    }
  ];
  
  for (const test of authTests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.post(`${BASE_URL}/auth/login`, test.data);
      console.log(`❌ FAILED: ${test.name} - Request should have been blocked`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ PASSED: ${test.name} - Malicious input blocked`);
        console.log('Error:', error.response.data.message);
      } else {
        console.log(`⚠️  UNKNOWN: ${test.name} - ${error.message}`);
      }
    }
    console.log('---');
  }
}

// Main test runner
async function runSecurityTests() {
  console.log('🔒 VMU Quiz System - Security Test Suite');
  console.log('=========================================');
  
  try {
    await testStudentSecurity();
    await testTopicSecurity();
    await testAuthSecurity();
    
    console.log('\n✅ Security tests completed!');
    console.log('Check results above to ensure all malicious inputs are blocked.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Export for use in other test files
module.exports = {
  runSecurityTests,
  testStudentSecurity,
  testTopicSecurity,
  testAuthSecurity,
  sqlInjectionTests,
  xssTests,
  dangerousCharacterTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runSecurityTests();
}
