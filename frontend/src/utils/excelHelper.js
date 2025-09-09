import * as XLSX from 'xlsx';

// Create a sample Excel template for question import
export function createQuestionTemplateExcel() {
  // Sample data matching user's format
  const data = [
    {
      question: "Chủ tịch Hồ Chí Minh sinh năm nào?",
      optionA: "1890",
      optionB: "1889",
      optionC: "1891",
      optionD: "1892",
      correctOption: "A"
    },
    {
      question: "Câu hỏi với nhiều đáp án đúng?",
      optionA: "Đáp án A đúng",
      optionB: "Đáp án B đúng", 
      optionC: "Đáp án C sai",
      optionD: "Đáp án D sai",
      correctOption: "A,B"
    },
    {
      question: "Câu hỏi mẫu khác?",
      optionA: "Lựa chọn 1",
      optionB: "Lựa chọn 2",
      optionC: "Lựa chọn 3",
      optionD: "Lựa chọn 4",
      correctOption: "C"
    }
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add the sheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  
  // Create another sheet for instructions
  const wsInstructions = XLSX.utils.aoa_to_sheet([
    ["HƯỚNG DẪN IMPORT CÂU HỎI"],
    [""],
    ["1. Định dạng file:"],
    ["- File Excel (.xlsx hoặc .xls)"],
    ["- Sheet đầu tiên chứa dữ liệu câu hỏi"],
    [""],
    ["2. Cấu trúc dữ liệu bắt buộc:"],
    ["- question: Nội dung câu hỏi (bắt buộc)"],
    ["- optionA: Đáp án A (bắt buộc)"],
    ["- optionB: Đáp án B (bắt buộc)"],
    ["- optionC: Đáp án C (tùy chọn)"],
    ["- optionD: Đáp án D (tùy chọn)"],
    ["- correctOption: Đáp án đúng (A, B, C, D hoặc A,B cho nhiều đáp án)"],
    [""],
    ["3. Lưu ý quan trọng:"],
    ["- Mỗi hàng là một câu hỏi"],
    ["- Không để trống cột 'question'"],
    ["- Mỗi câu hỏi phải có ít nhất 2 phương án trả lời (optionA và optionB)"],
    ["- Đáp án đúng phải là A, B, C hoặc D"],
    ["- Đối với câu hỏi nhiều đáp án: A,B hoặc B,C,D (phân cách bằng dấu phẩy)"],
    ["- Nếu không có correctOption, đáp án A sẽ được chọn làm đáp án đúng"],
    [""],
    ["4. Ví dụ:"],
    ["question: 'Chủ tịch Hồ Chí Minh sinh năm nào?'"],
    ["optionA: '1890'"],
    ["optionB: '1889'"],
    ["optionC: '1891'"],
    ["optionD: '1892'"],
    ["correctOption: 'A'"],
    [""],
    ["5. Ví dụ câu hỏi nhiều đáp án:"],
    ["question: 'Những ngôn ngữ lập trình nào sau đây là hướng đối tượng?'"],
    ["optionA: 'Java'"],
    ["optionB: 'C++'"],
    ["optionC: 'Assembly'"],
    ["optionD: 'HTML'"],
    ["correctOption: 'A,B'"]
  ]);
  
  // Add the instructions sheet
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Hướng dẫn");
  
  // Generate array buffer
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  
  // Convert to blob and download
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  return blob;
}
