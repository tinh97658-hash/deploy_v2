const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const StudentController = require('../controllers/studentController');
const { ValidationMiddleware } = require('../middleware/validationMiddleware');

/* GET students listing. */
router.get('/', StudentController.getAllStudents);
router.get('/:id', StudentController.getStudentById);
router.get('/departments', StudentController.getDepartments);
router.get('/majors/:departmentId', StudentController.getMajorsByDepartment);
router.get('/classes/:majorId', StudentController.getClassesByMajor);

/* POST students */
router.post('/', ValidationMiddleware.validateAddStudent, StudentController.addStudent);
router.post('/import-excel', upload.single('file'), StudentController.importStudentsExcel);

/* PUT students */
router.put('/:id', ValidationMiddleware.validatePartialStudent, StudentController.updateStudent);
router.patch('/status/:id', StudentController.updateStudentStatus);

/* DELETE students */
router.delete('/:id', StudentController.deleteStudent);
router.post('/bulk-delete', StudentController.bulkDeleteStudents);

module.exports = router;