const express = require('express');
const router = express.Router();
const { getProjectsReport, getTasksReport } = require('../controllers/reportController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

router.use(authenticateUser);
router.use(requireAdmin);

// GET /api/reports/projects?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/projects', getProjectsReport);

// GET /api/reports/tasks?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/tasks', getTasksReport);

module.exports = router;


