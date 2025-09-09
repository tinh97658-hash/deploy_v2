const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/classController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { ValidationMiddleware } = require('../middleware/validationMiddleware');

// Middleware chung cho tất cả routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET routes
router.get('/', ClassController.getAllClasses);
router.get('/stats', ClassController.getClassStats);
router.get('/major/:majorId', ClassController.getClassesByMajor);
router.get('/:id', ClassController.getClassById);

// POST routes
router.post('/', ValidationMiddleware.validateClass, ClassController.createClass);
router.post('/transfer-students', ClassController.transferStudents);

// PUT routes
router.put('/:id', ValidationMiddleware.validatePartialClass, ClassController.updateClass);

// DELETE routes
router.delete('/bulk', ClassController.bulkDeleteClasses);
router.delete('/:id', ClassController.deleteClass);

module.exports = router;
