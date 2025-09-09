// MIGRATION SCRIPT - Thêm CASCADE DELETE vào database
-- 1. Backup dữ liệu trước khi chạy
CREATE TABLE Users_backup AS SELECT * FROM Users;
CREATE TABLE Students_backup AS SELECT * FROM Students;
CREATE TABLE Exams_backup AS SELECT * FROM Exams;
CREATE TABLE ExamAnswers_backup AS SELECT * FROM ExamAnswers;

-- 2. Drop các foreign key constraints cũ
ALTER TABLE Students DROP FOREIGN KEY Students_ibfk_1; -- user_id
ALTER TABLE Students DROP FOREIGN KEY Students_ibfk_2; -- class_id  
ALTER TABLE Exams DROP FOREIGN KEY Exams_ibfk_1; -- student_id
ALTER TABLE Exams DROP FOREIGN KEY Exams_ibfk_2; -- topic_id
ALTER TABLE ExamAnswers DROP FOREIGN KEY ExamAnswers_ibfk_1; -- exam_id
ALTER TABLE ExamAnswers DROP FOREIGN KEY ExamAnswers_ibfk_2; -- question_id
ALTER TABLE ExamAnswers DROP FOREIGN KEY ExamAnswers_ibfk_3; -- answer_id

-- 3. Thêm lại với CASCADE DELETE
ALTER TABLE Students 
  ADD CONSTRAINT fk_students_user_id 
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_students_class_id 
  FOREIGN KEY (class_id) REFERENCES Classes(id);

ALTER TABLE Exams 
  ADD CONSTRAINT fk_exams_student_id 
  FOREIGN KEY (student_id) REFERENCES Students(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_exams_topic_id 
  FOREIGN KEY (topic_id) REFERENCES Topics(id) ON DELETE CASCADE;

ALTER TABLE ExamAnswers 
  ADD CONSTRAINT fk_examanswers_exam_id 
  FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_examanswers_question_id 
  FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_examanswers_answer_id 
  FOREIGN KEY (answer_id) REFERENCES Answers(id) ON DELETE CASCADE;

-- 4. Thêm cascade cho Questions và Answers
ALTER TABLE Questions DROP FOREIGN KEY Questions_ibfk_1;
ALTER TABLE Questions 
  ADD CONSTRAINT fk_questions_topic_id 
  FOREIGN KEY (topic_id) REFERENCES Topics(id) ON DELETE CASCADE;

ALTER TABLE Answers DROP FOREIGN KEY Answers_ibfk_1;  
ALTER TABLE Answers 
  ADD CONSTRAINT fk_answers_question_id 
  FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE;

-- 5. Thêm cascade cho Schedules
ALTER TABLE Schedules DROP FOREIGN KEY Schedules_ibfk_1;
ALTER TABLE Schedules DROP FOREIGN KEY Schedules_ibfk_2;
ALTER TABLE Schedules DROP FOREIGN KEY Schedules_ibfk_3;
ALTER TABLE Schedules 
  ADD CONSTRAINT fk_schedules_topic_id 
  FOREIGN KEY (topic_id) REFERENCES Topics(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_schedules_major_id 
  FOREIGN KEY (major_id) REFERENCES Majors(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_schedules_department_id 
  FOREIGN KEY (department_id) REFERENCES Departments(id) ON DELETE CASCADE;

-- 6. Cascade cho academic structure (optional - có thể không cần)
ALTER TABLE Majors DROP FOREIGN KEY Majors_ibfk_1;
ALTER TABLE Majors 
  ADD CONSTRAINT fk_majors_department_id 
  FOREIGN KEY (department_id) REFERENCES Departments(id);

ALTER TABLE Classes DROP FOREIGN KEY Classes_ibfk_1;
ALTER TABLE Classes 
  ADD CONSTRAINT fk_classes_major_id 
  FOREIGN KEY (major_id) REFERENCES Majors(id);

-- 7. Kiểm tra kết quả
SHOW CREATE TABLE Students;
SHOW CREATE TABLE Exams;
SHOW CREATE TABLE ExamAnswers;
SHOW CREATE TABLE Questions;
SHOW CREATE TABLE Answers;
SHOW CREATE TABLE Schedules;
