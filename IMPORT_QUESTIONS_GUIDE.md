# HƯỚNG DẪN SỬ DỤNG FILE EXCEL IMPORT CÂU HỎI

## Cấu trúc file Excel:

### Cột bắt buộc:

- **question**: Nội dung câu hỏi
- **optionA**: Đáp án A
- **optionB**: Đáp án B
- **correctAnswer**: Đáp án đúng (A, B, C, D hoặc kết hợp ABC cho multiple choice)

### Cột tùy chọn:

- **type**: Loại câu hỏi (single_choice hoặc multiple_choice)
- **optionC**: Đáp án C
- **optionD**: Đáp án D

## Các tên cột được hỗ trợ (đa ngôn ngữ):

### Nội dung câu hỏi:

- `question` = `Câu hỏi` = `Question` = `content`

### Loại câu hỏi:

- `type` = `Loại` = `Type`

### Đáp án:

- `optionA` = `option_a` = `Đáp án A` = `A`
- `optionB` = `option_b` = `Đáp án B` = `B`
- `optionC` = `option_c` = `Đáp án C` = `C`
- `optionD` = `option_d` = `Đáp án D` = `D`

### Đáp án đúng:

- `correctAnswer` = `correct` = `Đáp án đúng` = `Correct`

## Cách đánh dấu đáp án đúng:

### Single Choice (1 đáp án đúng):

- `A` - Đáp án A đúng
- `B` - Đáp án B đúng
- `C` - Đáp án C đúng
- `D` - Đáp án D đúng

### Multiple Choice (nhiều đáp án đúng):

- `ABC` - Đáp án A, B, C đúng
- `AB` - Đáp án A, B đúng
- `CD` - Đáp án C, D đúng
- `ACD` - Đáp án A, C, D đúng

## Lưu ý quan trọng:

1. **Câu hỏi**: Không được để trống
2. **Tối thiểu**: Phải có ít nhất đáp án A và B
3. **Đáp án đúng**: Bắt buộc phải có
4. **File format**: Lưu dạng .xlsx hoặc .xls
5. **Encoding**: UTF-8 để hỗ trợ tiếng Việt

## Endpoint API:

```
POST /api/topics/{topicId}/import-questions-excel
Content-Type: multipart/form-data
File field: file
```

## Ví dụ sử dụng:

Xem file questions_import_template.csv để có dữ liệu mẫu.
