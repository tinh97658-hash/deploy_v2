const express = require('express');
const router = express.Router();
const MajorController = require('../controllers/majorController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { ValidationMiddleware } = require('../middleware/validationMiddleware');

// Middleware chung cho tất cả routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET routes
router.get('/', MajorController.getAllMajors);
router.get('/stats', MajorController.getMajorStats);
router.get('/department/:departmentId', MajorController.getMajorsByDepartment);
router.get('/:id', MajorController.getMajorById);

// POST routes
router.post('/', ValidationMiddleware.validateMajor, MajorController.createMajor);

// PUT routes
router.put('/:id', ValidationMiddleware.validatePartialMajor, MajorController.updateMajor);

// DELETE routes
router.delete('/bulk', MajorController.bulkDeleteMajors);
router.delete('/:id', MajorController.deleteMajor);

module.exports = router;
