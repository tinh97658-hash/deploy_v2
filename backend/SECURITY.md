# Hệ thống Bảo mật SQL - VMU Quiz System

## Tổng quan

Hệ thống VMU Quiz System đã được cài đặt một hệ thống bảo mật toàn diện để bảo vệ khỏi các cuộc tấn công SQL Injection, XSS và các lỗ hổng bảo mật khác.

## Cấu trúc Bảo mật

### 1. InputValidator Class (`src/utils/InputValidator.js`)

**Chức năng chính:**

- Phát hiện và chặn các ký tự nguy hiểm
- Sanitize dữ liệu đầu vào
- Validate định dạng và độ dài
- Tích hợp với Express middleware

**Các method quan trọng:**

- `containsDangerousChars()`: Phát hiện SQL comments, keywords, script tags
- `sanitize()`: Làm sạch dữ liệu đầu vào
- `validateAndSanitize()`: Validate và sanitize đồng thời
- `middleware()`: Tạo Express middleware

### 2. ValidationMiddleware (`src/middleware/validationMiddleware.js`)

**Validation Rules được định nghĩa cho:**

- **Student**: studentId, fullName, email, password, departmentId, majorId, classId
- **Auth**: username, password, email, otp
- **Topic**: name, description, departmentId
- **Question**: content, questionType, answers, correctAnswer, topicId
- **Academic**: name, description, departmentId (cho department, major, class)

**Middleware functions:**

- `validateStudent()`: Validate dữ liệu sinh viên đầy đủ
- `validatePartialStudent()`: Validate dữ liệu sinh viên cập nhật
- `validateAuth()`: Validate dữ liệu đăng nhập
- `validateTopic()`: Validate dữ liệu topic
- `validateQuestion()`: Validate dữ liệu câu hỏi
- `validateAcademic()`: Validate dữ liệu academic structure

### 3. Tích hợp với Routes

Các routes đã được bảo vệ:

#### Student Routes:

```javascript
router.post(
  "/admin/students",
  ValidationMiddleware.validateStudent,
  StudentController.addStudent
);
router.put(
  "/admin/students/:id",
  ValidationMiddleware.validatePartialStudent,
  StudentController.updateStudent
);
```

#### Topic Routes:

```javascript
router.post(
  "/topics",
  ValidationMiddleware.validateTopic,
  TopicController.createTopic
);
router.put(
  "/topics/:id",
  ValidationMiddleware.validatePartialTopic,
  TopicController.updateTopic
);
```

#### Auth Routes:

```javascript
router.post(
  "/auth/login",
  ValidationMiddleware.validateAuth,
  AuthController.login
);
router.post(
  "/auth/request-reset",
  ValidationMiddleware.validateAuth,
  PasswordResetController.requestReset
);
```

#### Academic Structure Routes:

- Department Routes: `validateAcademic` cho create/update
- Major Routes: `validatePartialAcademic` cho update
- Class Routes: Tương tự department và major

## Cơ chế Phòng chống Tấn công

### 1. SQL Injection Protection

**Phát hiện các pattern nguy hiểm:**

```javascript
const sqlComments = [/--/g, /\/\*/g, /\*\//g];
const sqlKeywords = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi,
  /\b(OR|AND)\s+\d+\s*=\s*\d+/gi,
  /['"]\s*(OR|AND)/gi,
];
```

**Ví dụ input bị chặn:**

- `'; DROP TABLE students; --`
- `admin' OR '1'='1`
- `' UNION SELECT * FROM users --`

### 2. XSS Protection

**Phát hiện script tags và event handlers:**

```javascript
const scriptTags = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /on\w+\s*=/gi,
  /javascript:/gi,
];
```

**Ví dụ input bị chặn:**

- `<script>alert("XSS")</script>`
- `<img src="x" onerror="alert('XSS')">`
- `javascript:alert("XSS")`

### 3. Input Sanitization

**Sanitize process:**

```javascript
sanitize(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;')
    .trim();
}
```

## Validation Rules Chi tiết

### Student Validation:

```javascript
student: {
  studentId: { type: 'alphanumeric', options: { required: true, minLength: 6, maxLength: 20 }},
  fullName: { type: 'safeText', options: { required: true, minLength: 2, maxLength: 100 }},
  email: { type: 'email', options: { required: true }},
  password: { type: 'password', options: { required: true, minLength: 6 }},
  departmentId: { type: 'numeric', options: { required: true }},
  majorId: { type: 'numeric', options: { required: true }},
  classId: { type: 'numeric', options: { required: true }}
}
```

### Topic Validation:

```javascript
topic: {
  name: { type: 'safeText', options: { required: true, minLength: 2, maxLength: 200 }},
  description: { type: 'safeText', options: { required: false, maxLength: 1000 }},
  departmentId: { type: 'numeric', options: { required: true }}
}
```

## Testing

Để test hệ thống bảo mật, sử dụng file `test/security-test.js`:

```bash
cd backend
node test/security-test.js
```

File test bao gồm:

- SQL Injection test cases
- XSS test cases
- Dangerous characters test cases
- Authentication security tests

## Error Responses

Khi phát hiện input nguy hiểm, hệ thống trả về:

```json
{
  "success": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "errors": [
    {
      "field": "fullName",
      "message": "Chứa ký tự nguy hiểm không được phép"
    }
  ]
}
```

## Best Practices

1. **Luôn validate tất cả input từ client**
2. **Sử dụng parameterized queries trong database operations**
3. **Sanitize dữ liệu trước khi hiển thị**
4. **Log các attempt tấn công để monitoring**
5. **Regular update các pattern phát hiện**

## Monitoring và Logging

Hệ thống ghi log các attempt tấn công:

- IP address của attacker
- Loại tấn công (SQL Injection, XSS)
- Input data nguy hiểm
- Timestamp

## Cập nhật và Bảo trì

- Review và update validation rules định kỳ
- Monitor security logs
- Update dependencies để patch vulnerabilities
- Test security sau mọi thay đổi code

---

**Lưu ý**: Hệ thống bảo mật này là layer đầu tiên. Vẫn cần kết hợp với:

- Prepared statements trong database
- HTTPS encryption
- Rate limiting
- Authentication & authorization
- Regular security audits
