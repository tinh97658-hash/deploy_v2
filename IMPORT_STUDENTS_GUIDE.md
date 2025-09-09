# HƯỚNG DẪN SỬ DỤNG FILE EXCEL IMPORT SINH VIÊN

## Cấu trúc file Excel:

### Cột bắt buộc:

- studentCode: Mã sinh viên (VD: SV2025001)
- fullName: Họ và tên đầy đủ
- email: Địa chỉ email (phải duy nhất)
- dateOfBirth: Ngày sinh định dạng YYYY-MM-DD
- classId: ID của lớp (số nguyên)

### Cột tùy chọn:

- phone: Số điện thoại
- username: Tên đăng nhập (nếu không có sẽ dùng studentCode)

## Lưu ý quan trọng:

1. **Định dạng ngày**: Phải là YYYY-MM-DD (VD: 2005-01-15)
2. **Email**: Phải đúng định dạng và không trùng lặp
3. **classId**: Phải tồn tại trong hệ thống
4. **studentCode**: Không được trùng lặp
5. **File format**: Lưu dạng .xlsx hoặc .xls

## Mật khẩu mặc định:

- Sẽ được tạo từ ngày sinh theo định dạng dd/mm/yyyy
- VD: Ngày sinh 2005-01-15 → Mật khẩu: 15/01/2005

## Ví dụ dữ liệu:

Xem file students_import_template.csv để có dữ liệu mẫu.
