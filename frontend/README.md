# VMU Quiz System - Frontend

## 📱 Hệ thống Trắc nghiệm Sinh hoạt Công dân

Frontend React application cho hệ thống quiz trắc nghiệm của Đại học Việt Minh.

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies:

```bash
npm install
```

### 2. Chạy development server:

```bash
npm start
```

### 3. Build production:

```bash
npm run build
```

## 🏗️ Cấu trúc Project

```
src/
├── pages/               # Các trang chính
│   ├── student/        # Trang dành cho sinh viên
│   │   ├── SubjectsPage.js     # Danh sách chuyên đề
│   │   ├── QuizPage.js         # Làm bài thi
│   │   ├── ProfilePage.js      # Thông tin cá nhân
│   │   └── HistoryPage.js      # Lịch sử thi
│   └── admin/          # Trang dành cho admin
│       ├── AdminDashboard.js   # Dashboard quản trị
│       ├── AdminSubjectsPage.js # Quản lý chuyên đề
│       └── AdminStudentsPage.js # Quản lý sinh viên
├── hooks/              # Custom React hooks
│   └── useAuth.js      # Authentication hook
├── services/           # API services
│   └── api.js          # Gọi API tới backend
├── components/         # Shared components
│   ├── Loading.js      # Loading components
│   └── Alert.js        # Alert/Toast components
└── utils/              # Utilities
    └── constants.js    # App constants
```

## 🔐 Authentication

Hệ thống sử dụng JWT token cho authentication:

- Token được lưu trong localStorage
- Tự động refresh token khi hết hạn
- Protected routes theo role (admin/student)

## 📱 Responsive Design

- Bootstrap 5 cho UI framework
- Bootstrap Icons cho iconography
- Responsive cho mobile và desktop

## 🎯 Chức năng chính

### Sinh viên:

- ✅ Đăng nhập
- ✅ Xem danh sách chuyên đề
- ✅ Làm bài thi trắc nghiệm
- ✅ Xem kết quả và lịch sử
- ✅ Quản lý profile

### Admin:

- ✅ Dashboard quản trị
- ✅ Quản lý chuyên đề (CRUD)
- ✅ Quản lý câu hỏi
- ✅ Xem tất cả bài thi
- ✅ Quản lý sinh viên

## 🔧 Configuration

Tạo file `.env` với nội dung:

```
PORT=3000
REACT_APP_API_URL=http://localhost:8081/api
REACT_APP_APP_NAME=VMU Quiz System
REACT_APP_VERSION=1.0.0
```

## 📦 Dependencies

- React 19.1.1
- React Router DOM 6.23.1
- Bootstrap 5.1.3 (CDN)
- Bootstrap Icons 1.7.2 (CDN)

## 🌐 Deployment

1. Build production:

```bash
npm run build
```

2. Deploy build folder to web server

## 🔍 Testing

```bash
npm test
```

## 📄 License

MIT License - VMU Development Team
