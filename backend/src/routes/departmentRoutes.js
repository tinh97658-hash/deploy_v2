const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { ValidationMiddleware } = require('../middleware/validationMiddleware');

// Middleware chung cho tất cả routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET routes
router.get('/', DepartmentController.getAllDepartments);
router.get('/stats', DepartmentController.getDepartmentStats);
router.get('/:id', DepartmentController.getDepartmentById);

// POST routes
router.post('/', ValidationMiddleware.validateAcademic, DepartmentController.createDepartment);

// PUT routes
router.put('/:id', ValidationMiddleware.validatePartialAcademic, DepartmentController.updateDepartment);

// DELETE routes
router.delete('/bulk', DepartmentController.bulkDeleteDepartments);
router.delete('/:id', DepartmentController.deleteDepartment);

module.exports = router;
